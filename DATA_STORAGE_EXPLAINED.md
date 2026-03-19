# 🔐 NovaPass Data Storage - Where Is Your Data Saved?

## ✅ YES - Account Details Are Saved in Your Supabase Database

All user data is stored in your **Supabase PostgreSQL database** with strong security measures.

---

## 🗄️ What Gets Stored Where

### 1. **User Accounts** (When you register/login)

**Stored in**: `users` table in Supabase PostgreSQL

**Location**: 
```
Host: db.egipktzspzkilfewxdzd.supabase.co
Database: postgres
Table: users
```

**What's stored**:

| Field | Example | Security |
|-------|---------|----------|
| `id` | `123` | Auto-generated ID |
| `username` | `john_doe` | Plain text |
| `email` | `john@example.com` | Plain text |
| `password_hash` | `$argon2id$v=19$m=65536...` | ✅ **Argon2id hash** |
| `master_key_hash` | `$argon2id$v=19$m=65536...` | ✅ **Argon2id hash** |
| `salt` | `a3f8c2d1e4b7...` | Random salt (hex) |
| `role` | `USER` or `ADMIN` | Plain text |
| `is_active` | `true` | Boolean |
| `two_factor_enabled` | `false` | Boolean |
| `two_factor_secret` | `JBSWY3DPEHPK3PXP` | Base32 encoded |
| `last_login` | `2026-03-19 16:30:00` | Timestamp |
| `created_at` | `2026-03-19 10:00:00` | Timestamp |

**Security Measures**:
- ✅ **Passwords NEVER stored in plain text**
- ✅ **Argon2id hashing** (industry standard, better than bcrypt)
- ✅ **Unique salt per user** (prevents rainbow table attacks)
- ✅ **Hashing parameters**: 
  - Memory: 65536 KB (64 MB)
  - Iterations: 3
  - Parallelism: 4

**What the backend actually stores for password**:
```
$argon2id$v=19$m=65536,t=3,p=4$abc123...salt...$hash123...
```
This is a **one-way hash** - impossible to reverse!

---

### 2. **Vault Items** (Your saved passwords/credentials)

**Stored in**: `vault_items` table in Supabase PostgreSQL

**What's stored**:

| Field | Example | Security |
|-------|---------|----------|
| `id` | `456` | Auto-generated ID |
| `user_id` | `123` | Links to user |
| `item_type` | `login`, `card`, `note` | Plain text |
| `title` | `Gmail Account` | Plain text |
| `url` | `https://gmail.com` | Plain text |
| `encrypted_data` | `YWJjMTIz...` | ✅ **AES-256-GCM encrypted** |
| `version` | `1` | Version tracking |
| `favorite` | `false` | Boolean |
| `created_at` | `2026-03-19 11:00:00` | Timestamp |

**Security Measures**:
- ✅ **Client-side encryption** (encryption happens in your browser)
- ✅ **AES-256-GCM** (military-grade encryption)
- ✅ **Server NEVER sees plaintext** (backend only stores encrypted blobs)
- ✅ **Encryption key NEVER sent to server** (stays in browser memory)

**What the backend sees**:
```json
{
  "title": "Gmail Account",
  "url": "https://gmail.com",
  "encrypted_data": "aGVsbG8ud29ybGQ=.c29tZXRoaW5n..."
}
```

**What the backend CANNOT see**:
- ❌ Your actual password
- ❌ Your username
- ❌ Any other sensitive data in the vault item

---

### 3. **Encryption Keys** (How your vault is secured)

**CRITICAL**: Encryption keys are **NEVER stored anywhere**!

**Key Derivation Flow**:

```
Step 1: User enters master password
        ↓
Step 2: Browser derives keys using PBKDF2 (600,000 iterations)
        masterPassword + salt → 512-bit key
        ↓
Step 3: Split into two keys:
        First 256 bits  → authKey  (for authentication)
        Second 256 bits → encKey   (for encryption)
        ↓
Step 4: authKey sent to server (hashed with Argon2id)
        encKey stays in browser memory
        ↓
Step 5: encKey used to encrypt/decrypt vault items
```

**Security Model**:
- ✅ **Zero-knowledge architecture** - Server never has encryption key
- ✅ **Client-side encryption** - Encryption happens in browser
- ✅ **Keys exist only in memory** - Never written to disk
- ✅ **Keys cleared on logout** - No persistence

**What this means**:
- ✅ Even if someone hacks the database, they **CANNOT** decrypt your vault
- ✅ Even the database administrator **CANNOT** read your passwords
- ✅ Even NovaPass developers **CANNOT** access your data
- ⚠️ If you forget your master password, **your data is unrecoverable**

---

### 4. **JWT Tokens** (Session management)

**Stored in**: `refresh_tokens` table + Browser storage

**Database** (`refresh_tokens` table):

| Field | Example | Security |
|-------|---------|----------|
| `id` | `789` | Auto-generated ID |
| `user_id` | `123` | Links to user |
| `token` | `abc123xyz...` | Random token (64 chars) |
| `expires_at` | `2026-03-26 10:00:00` | 7 days from creation |

**Browser Storage**:
- **Access Token** (JWT): Stored in `sessionStorage` (expires in 15 minutes)
- **Refresh Token**: Stored in `localStorage` (expires in 7 days)

**Security**:
- ✅ Access tokens are short-lived (15 min)
- ✅ Refresh tokens can be revoked (force logout)
- ✅ Tokens cleared on logout

---

### 5. **Passkeys** (WebAuthn credentials)

**Stored in**: `passkeys` table in Supabase PostgreSQL

**What's stored**:

| Field | Example | Security |
|-------|---------|----------|
| `id` | `101` | Auto-generated ID |
| `user_id` | `123` | Links to user |
| `credential_id` | `abc123xyz...` | Unique credential ID |
| `public_key_cose` | `pQECAyYg...` | ✅ **Public key only** |
| `sign_count` | `5` | Counter (prevents replay) |
| `name` | `MacBook Touch ID` | Device name |
| `created_at` | `2026-03-19 12:00:00` | Timestamp |

**Security**:
- ✅ **Only public key stored** (private key stays on device)
- ✅ **Private key NEVER leaves device** (stored in Secure Enclave/TPM)
- ✅ **Biometric authentication** (Touch ID, Face ID, Windows Hello)

**What this means**:
- ✅ Even if database is compromised, passkey cannot be stolen
- ✅ Private key is hardware-protected
- ✅ Phishing-resistant (domain-bound)

---

### 6. **2FA Secrets** (TOTP)

**Stored in**: `totp_secrets` table in Supabase PostgreSQL

**What's stored**:

| Field | Example | Security |
|-------|---------|----------|
| `id` | `202` | Auto-generated ID |
| `user_id` | `123` | Links to user |
| `encrypted_secret` | `aGVsbG8=.d29ybGQ=` | ✅ **Encrypted secret** |
| `created_at` | `2026-03-19 13:00:00` | Timestamp |

**Security**:
- ✅ **Secret is encrypted** (not stored in plain text)
- ✅ Uses same client-side encryption as vault items
- ✅ Server cannot generate 2FA codes

---

### 7. **Audit Logs** (System activity tracking)

**Stored in**: `audit_logs` table in Supabase PostgreSQL

**What's stored**:

| Field | Example | Security |
|-------|---------|----------|
| `id` | `303` | Auto-generated ID |
| `user_id` | `123` | Links to user |
| `action` | `LOGIN`, `VAULT_CREATE` | Action type |
| `details` | `{"ip": "192.168.1.1"}` | JSON metadata |
| `created_at` | `2026-03-19 14:00:00` | Timestamp |

**What's logged**:
- ✅ Login/logout events
- ✅ Vault operations (add/edit/delete)
- ✅ 2FA events
- ✅ Passkey events
- ✅ Admin actions

**What's NOT logged**:
- ❌ Actual passwords
- ❌ Vault item contents
- ❌ Encryption keys

---

## 🔒 Security Summary

| Data Type | Storage Location | Encryption | Server Can See? |
|-----------|-----------------|------------|-----------------|
| **Email** | Supabase DB | ❌ Plain text | ✅ Yes |
| **Password** | Supabase DB | ✅ Argon2id hash | ❌ No (only hash) |
| **Master Key** | Supabase DB | ✅ Argon2id hash | ❌ No (only hash) |
| **Vault Items** | Supabase DB | ✅ AES-256-GCM | ❌ No (encrypted) |
| **Encryption Key** | Browser memory | ✅ Never stored | ❌ Never sent |
| **2FA Secret** | Supabase DB | ✅ Encrypted | ❌ No (encrypted) |
| **Passkey Private Key** | Your device | ✅ Hardware-protected | ❌ Never leaves device |
| **Passkey Public Key** | Supabase DB | ❌ Public key only | ✅ Yes (public) |
| **JWT Access Token** | Browser session | ❌ Signed token | ✅ Yes (signs it) |
| **JWT Refresh Token** | Supabase DB + Browser | ❌ Random string | ✅ Yes (stores it) |

---

## 🎯 What This Means for You

### ✅ **Secure**:
1. Your passwords are **never stored in plain text**
2. Vault items are **encrypted client-side** before being sent to server
3. Even database administrators **cannot** decrypt your vault
4. Encryption keys **never leave your browser**
5. Strong hashing (Argon2id) protects against brute-force attacks

### ⚠️ **Important**:
1. If you forget your master password, **your vault is unrecoverable**
2. Backup your 2FA recovery codes
3. Keep your passkeys on trusted devices only
4. Don't share your master password with anyone

### 🗄️ **Where to View**:
1. **Supabase Dashboard**: https://supabase.com → Your Project → Table Editor
2. **psql Command**:
   ```bash
   psql "postgresql://postgres:w0EtuhVv2zQhh5b3@db.egipktzspzkilfewxdzd.supabase.co:5432/postgres"
   
   -- View users
   SELECT id, email, role, is_active, created_at FROM users;
   
   -- View vault items (encrypted)
   SELECT id, user_id, title, url, created_at FROM vault_items;
   
   -- View audit logs
   SELECT id, user_id, action, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;
   ```

3. **Database Client** (TablePlus, DBeaver):
   - Host: `db.egipktzspzkilfewxdzd.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: `w0EtuhVv2zQhh5b3`

---

## 🔐 Technical Details

### Password Storage (Argon2id)

**Configuration**:
```java
Argon2Factory.createAdvanced(Argon2Factory.Argon2Types.ARGON2id)
Memory: 65536 KB (64 MB)
Iterations: 3
Parallelism: 4
```

**Hash Format**:
```
$argon2id$v=19$m=65536,t=3,p=4$[salt]$[hash]
```

**Why Argon2id?**
- ✅ Winner of Password Hashing Competition (2015)
- ✅ Resistant to GPU/ASIC attacks
- ✅ Recommended by OWASP
- ✅ Better than bcrypt, scrypt, PBKDF2

### Vault Encryption (AES-256-GCM)

**Algorithm**: AES-256-GCM (Galois/Counter Mode)

**Features**:
- ✅ 256-bit key (strongest AES)
- ✅ Authenticated encryption (AEAD)
- ✅ Random 96-bit IV per item
- ✅ Integrity protection (detects tampering)

**Format**:
```
[IV in base64].[Ciphertext in base64]
Example: "YWJjMTIz.ZGVmNDU2"
```

### Key Derivation (PBKDF2)

**Parameters**:
```javascript
Algorithm: PBKDF2-SHA256
Iterations: 600,000
Key Length: 512 bits
Salt: 256 bits (random, unique per user)
```

**Output**:
```
512-bit key split into:
- First 256 bits: authKey (for authentication)
- Last 256 bits: encKey (for encryption)
```

---

## 📊 Database Tables Summary

```
users           - User accounts, passwords, roles
vault_items     - Encrypted password entries
passkeys        - WebAuthn credentials
totp_secrets    - 2FA secrets (encrypted)
refresh_tokens  - JWT refresh tokens
audit_logs      - System activity logs
```

**Total storage per user** (approximate):
- User account: ~500 bytes
- Vault item: ~1 KB per item
- Passkey: ~500 bytes per passkey
- 2FA: ~200 bytes
- Audit logs: ~100 bytes per event

---

## ✅ Summary

**YES**, your account details are saved in your Supabase PostgreSQL database with:

1. ✅ **Strong encryption** (AES-256-GCM for vault)
2. ✅ **Secure hashing** (Argon2id for passwords)
3. ✅ **Zero-knowledge architecture** (server cannot decrypt vault)
4. ✅ **Industry best practices** (OWASP recommended)

**Your data is secure even if the database is compromised** because:
- Passwords are hashed (irreversible)
- Vault items are encrypted client-side
- Encryption keys never leave your browser
- Passkey private keys never leave your device

**You can view your data** in Supabase Dashboard or using psql/database clients.
