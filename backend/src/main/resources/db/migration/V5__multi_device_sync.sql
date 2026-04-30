-- Multi-device sync support

-- Track active devices/sessions per user
CREATE TABLE device_session (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- 'web', 'desktop', 'mobile', 'extension'
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id),
    CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_device_session_user_id ON device_session(user_id);
CREATE INDEX idx_device_session_last_sync ON device_session(user_id, last_sync_at DESC);

-- Track sync operations for audit (optional, for debugging conflicts)
CREATE TABLE sync_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    operation VARCHAR(50), -- 'CREATE', 'UPDATE', 'DELETE', 'CONFLICT_RESOLVED'
    vault_item_id BIGINT,
    conflict_detected BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sync_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_log_user ON sync_log(user_id);
CREATE INDEX idx_sync_log_vault_item ON sync_log(vault_item_id);
CREATE INDEX idx_sync_log_created_at ON sync_log(created_at DESC);

-- Add device tracking to vault items
ALTER TABLE vault_items
ADD COLUMN IF NOT EXISTS device_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(64);

-- Track last successful sync per user (for efficient delta queries)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX idx_vault_items_updated_at ON vault_items(updated_at DESC);
