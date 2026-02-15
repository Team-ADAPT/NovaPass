# NovaPass System Architecture

## Overview

NovaPass is a secure password management system built with a zero-knowledge architecture, ensuring that the server never has access to unencrypted user data.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Desktop Client (JavaFX)  │  Browser Extension  │  Mobile App   │
│  - Local Encryption       │  - Auto-fill        │  (Future)     │
│  - Master Password        │  - Form Detection   │               │
│  - Biometric Auth         │  - Sync             │               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              │ JWT Authentication
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Spring Boot Backend                                             │
│  - JWT Authentication                                            │
│  - Rate Limiting                                                 │
│  - CORS Protection                                               │
│  - Request Validation                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  AuthService  │  VaultService  │  EncryptionService  │  Sync    │
│  - Login      │  - CRUD Ops    │  - AES-256-GCM     │  Service │
│  - Register   │  - Search      │  - Key Derivation  │          │
│  - 2FA        │  - Categories  │  - TOTP            │          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Access Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Spring Data JPA Repositories                                    │
│  - UserRepository                                                │
│  - VaultRepository                                               │
│  - DeviceRepository                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                             │
│  - Users (with Argon2 hashed passwords)                         │
│  - Vault Items (AES-256 encrypted)                              │
│  - Devices & Sessions                                            │
│  - Audit Logs                                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Zero-Knowledge Architecture

1. **Client-Side Encryption**: All vault data is encrypted on the client before transmission
2. **Master Password**: Never leaves the client device
3. **Key Derivation**: PBKDF2/Argon2 used to derive encryption keys from master password
4. **Server Storage**: Server only stores encrypted blobs

### Authentication Flow

1. User enters master password
2. Client derives authentication key using Argon2
3. Client sends authentication request with derived key
4. Server validates and returns JWT token
5. Client derives encryption key (different from auth key)
6. Client uses encryption key for vault operations

### Encryption Layers

- **Transport**: TLS 1.3
- **Authentication**: JWT with HMAC-SHA256
- **Password Hashing**: Argon2id
- **Data Encryption**: AES-256-GCM
- **Key Derivation**: PBKDF2-HMAC-SHA256 (100,000 iterations)

## Technology Stack

### Backend
- **Framework**: Spring Boot 3.2
- **Security**: Spring Security + JWT
- **Database**: PostgreSQL 15
- **ORM**: Hibernate/JPA
- **Build**: Maven

### Desktop Client
- **Framework**: JavaFX 21
- **HTTP Client**: OkHttp
- **JSON**: Gson
- **Build**: Maven

### Browser Extension
- **Manifest**: V3
- **APIs**: Chrome Extension APIs
- **Storage**: chrome.storage.local

## Deployment Architecture

```
┌──────────────────┐
│   Load Balancer  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ App 1 │ │ App 2 │  (Spring Boot instances)
└───┬───┘ └──┬────┘
    │         │
    └────┬────┘
         │
    ┌────▼────┐
    │   DB    │  (PostgreSQL with replication)
    └─────────┘
```

## Future Enhancements

- Mobile applications (iOS/Android)
- Hardware key support (YubiKey)
- Passkey/WebAuthn integration
- Secure sharing between users
- Emergency access
- Password breach monitoring
