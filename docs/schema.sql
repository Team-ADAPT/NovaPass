-- NovaPass Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,  -- Argon2id hash of auth key
    master_key_hash VARCHAR(255) NOT NULL, -- Argon2id hash for verification
    salt VARCHAR(255) NOT NULL,            -- Hex-encoded salt for client-side key derivation
    role VARCHAR(20) NOT NULL DEFAULT 'USER', -- USER or ADMIN
    is_active BOOLEAN DEFAULT TRUE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(64),         -- TOTP secret (encrypted at rest)
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- VAULT ITEMS TABLE
-- ============================================
CREATE TABLE vault_items (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL DEFAULT 'login',  -- login, card, note, identity
    title VARCHAR(255) NOT NULL,
    encrypted_data TEXT NOT NULL,          -- AES-256-GCM encrypted JSON blob
    url VARCHAR(2048),                     -- Stored unencrypted for quick search
    favorite BOOLEAN DEFAULT FALSE,
    version BIGINT DEFAULT 0,              -- For optimistic locking
    deleted BOOLEAN DEFAULT FALSE,         -- Soft delete for sync
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX idx_vault_items_user_type ON vault_items(user_id, item_type);
CREATE INDEX idx_vault_items_user_updated ON vault_items(user_id, updated_at);
CREATE INDEX idx_vault_items_user_deleted ON vault_items(user_id, deleted);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================
-- PASSKEYS TABLE (WebAuthn)
-- ============================================
CREATE TABLE passkeys (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id VARCHAR(512) NOT NULL UNIQUE,  -- Base64url encoded
    public_key_cose TEXT NOT NULL,               -- Base64 encoded COSE key
    sign_count BIGINT NOT NULL DEFAULT 0,
    name VARCHAR(255),                           -- User-friendly name
    transports VARCHAR(255),                     -- JSON array of transports
    aaguid VARCHAR(36),                          -- Authenticator AAGUID
    user_handle VARCHAR(255) NOT NULL,           -- Base64url encoded user handle
    attestation_format VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_passkeys_user_id ON passkeys(user_id);
CREATE INDEX idx_passkeys_credential_id ON passkeys(credential_id);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,           -- LOGIN, LOGOUT, VAULT_CREATE, etc.
    resource_type VARCHAR(50),             -- user, vault_item, passkey
    resource_id BIGINT,
    ip_address VARCHAR(45),                -- IPv6 compatible
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);

-- ============================================
-- SHARED VAULT ITEMS (Future feature)
-- ============================================
CREATE TABLE shared_vault_items (
    id BIGSERIAL PRIMARY KEY,
    vault_item_id BIGINT NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    shared_with_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL,           -- Item key encrypted with recipient's public key
    permissions VARCHAR(20) DEFAULT 'read', -- read, write
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vault_item_id, shared_with_user_id)
);

CREATE INDEX idx_shared_items_recipient ON shared_vault_items(shared_with_user_id);
CREATE INDEX idx_shared_items_owner ON shared_vault_items(shared_by_user_id);

-- ============================================
-- TRIGGER: Update updated_at on row change
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_items_updated_at
    BEFORE UPDATE ON vault_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CLEANUP: Delete expired refresh tokens (run via cron)
-- ============================================
-- DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP;

-- ============================================
-- SAMPLE DATA (for development only, remove in production)
-- ============================================
-- INSERT INTO users (username, email, password_hash, master_key_hash, salt)
-- VALUES ('testuser', 'test@example.com', '$argon2id$...', '$argon2id$...', 'abcdef1234567890');
