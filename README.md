# NovaPass

A production-grade, zero-knowledge password manager.

**Stack:** Spring Boot · Next.js · PostgreSQL · Redis · Tauri (desktop) · WebAuthn

---

## Security Model

```
Master Password + Salt
        │
        │  PBKDF2-SHA256 (600,000 iterations) — browser only
        ▼
  512-bit stretched key
        ├── [0..255]   authKey       → sent to server → Argon2id hashed
        └── [256..511] encKey        → stays in memory → AES-256-GCM vault encryption
```

The server never sees the master password or encryption key. Vault items are encrypted before leaving the client.

---

## Features

- Zero-knowledge AES-256-GCM vault encryption
- PBKDF2-SHA256 (600k iterations) key derivation
- Argon2id server-side password hashing
- TOTP two-factor authentication (RFC 6238)
- Passkeys / WebAuthn (Face ID, Touch ID, Windows Hello)
- JWT auth with 15-minute access tokens + rotating refresh tokens
- Admin portal — user management, audit logs, system stats
- PWA support, dark mode, password strength meter

---

## Project Structure

```
NovaPass/
├── backend/                        Spring Boot REST API
│   └── src/main/
│       ├── java/com/novapass/
│       │   ├── config/             Security, CORS, rate limiting, admin init
│       │   ├── controller/         REST endpoints
│       │   ├── dto/                Request / response objects
│       │   ├── exception/          Global error handling
│       │   ├── model/              JPA entities
│       │   ├── repository/         Spring Data repositories
│       │   ├── security/           JWT filter + provider
│       │   ├── service/            Business logic
│       │   └── util/               SecurityUtils
│       └── resources/
│           ├── application.yml     Base config
│           ├── application-dev.yml H2 in-memory (local dev)
│           ├── application-prod.yml Production (PostgreSQL + Redis)
│           └── db/migration/       Flyway versioned migrations
│
├── web-app/                        Next.js frontend
│   └── src/
│       ├── app/                    Pages: login, register, vault, settings, admin
│       ├── components/             VaultItemCard, AddItemModal, EditItemModal, etc.
│       ├── lib/                    api.ts, crypto.ts, totp.ts
│       └── store/                  Zustand vault store
│
├── browser-extension/              Chrome/Firefox autofill scaffold
├── desktop/                        Tauri desktop wrapper (scaffold)
├── docker/                         docker-compose, Dockerfiles, nginx.conf
├── docs/
│   ├── architecture/               Architecture overview
│   └── database-schema/            schema-design.sql
├── scripts/
│   ├── setup.sh                    Install all dependencies
│   ├── run-backend.sh              Start backend
│   └── run-client.sh               Start web app
├── .env.example                    Environment variable template
└── railway.json                    Railway deployment config
```

---

## Running Locally

### Option A — H2 in-memory (quickest, no database needed)

```bash
cd backend
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
  mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

```bash
cd web-app && npm install && npm run dev
```

- Backend: http://localhost:8080
- Frontend: http://localhost:3000
- H2 console: http://localhost:8080/h2-console (`jdbc:h2:mem:novapass`, user `sa`, no password)

### Option B — PostgreSQL (data persists)

```bash
createdb novapass
```

Copy `.env.example` to `.env` and fill in the values, then:

```bash
./scripts/run-backend.sh   # Terminal 1
./scripts/run-client.sh    # Terminal 2
```

### Option C — Full stack with Docker

```bash
cp .env.example .env
# fill in JWT_SECRET, DB_PASSWORD, REDIS_PASSWORD

mkdir -p docker/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/certs/privkey.pem \
  -out docker/certs/fullchain.pem \
  -subj "/CN=localhost"

cd docker && docker-compose up -d
```

App available at https://localhost.

---

## Environment Variables

Copy `.env.example` to `.env`:

| Variable                  | Description                          | Required       |
|---------------------------|--------------------------------------|----------------|
| `SPRING_DATASOURCE_URL`   | JDBC PostgreSQL URL                  | ✅ Production  |
| `DB_USERNAME`             | Database user                        | ✅ Production  |
| `DB_PASSWORD`             | Database password                    | ✅ Production  |
| `JWT_SECRET`              | Random string, min 32 chars          | ✅ Production  |
| `REDIS_PASSWORD`          | Redis password                       | ✅ Production  |
| `CORS_ORIGINS`            | Allowed frontend origins             | ✅ Production  |
| `WEBAUTHN_RP_ID`          | Relying party domain (no protocol)   | ✅ Production  |
| `WEBAUTHN_RP_ORIGIN`      | Exact frontend origin URL            | ✅ Production  |
| `ADMIN_EMAIL`             | Creates admin account on first start | ⚠️ Optional   |
| `ADMIN_PASSWORD`          | Admin account password               | ⚠️ Optional   |

> In dev profile, `JWT_SECRET` is hardcoded in `application-dev.yml`. Never use that value in production.

Generate a secure JWT secret: `openssl rand -hex 32`

---

## API Reference

### Auth — `/api/auth`

| Method | Path             | Auth | Description                     |
|--------|------------------|------|---------------------------------|
| GET    | `/salt?email=`   | ❌   | Fetch salt for key derivation   |
| POST   | `/register`      | ❌   | Create account                  |
| POST   | `/login`         | ❌   | Login → JWT + refresh token     |
| POST   | `/refresh`       | ❌   | Rotate refresh token            |
| POST   | `/logout`        | ✅   | Invalidate refresh tokens       |
| POST   | `/2fa/setup`     | ✅   | Generate TOTP secret + QR URI   |
| POST   | `/2fa/confirm`   | ✅   | Enable 2FA                      |
| POST   | `/2fa/disable`   | ✅   | Disable 2FA                     |

### Passkeys — `/api/auth/passkey`

| Method | Path                  | Auth | Description                     |
|--------|-----------------------|------|---------------------------------|
| POST   | `/register/begin`     | ✅   | Start passkey registration      |
| POST   | `/register/complete`  | ✅   | Complete passkey registration   |
| POST   | `/login/begin`        | ❌   | Start passkey authentication    |
| POST   | `/login/complete`     | ❌   | Complete passkey authentication |
| GET    | `/`                   | ✅   | List passkeys                   |
| DELETE | `/{id}`               | ✅   | Delete a passkey                |
| PUT    | `/{id}/name`          | ✅   | Rename a passkey                |

### Vault — `/api/vault` (all require JWT)

| Method | Path     | Description                                        |
|--------|----------|----------------------------------------------------|
| GET    | `/`      | Get all vault items                                |
| GET    | `/{id}`  | Get single item                                    |
| POST   | `/`      | Create item (encrypted client-side)                |
| PUT    | `/{id}`  | Update item (optimistic locking via `version`)     |
| DELETE | `/{id}`  | Delete item                                        |
| POST   | `/sync`  | Delta sync since `lastSyncAt`                      |

### Admin — `/api/admin` (requires `ADMIN` role)

| Method | Path                    | Description              |
|--------|-------------------------|--------------------------|
| GET    | `/stats`                | System statistics        |
| GET    | `/users`                | Paginated user list      |
| GET    | `/users/{id}`           | User detail              |
| PUT    | `/users/{id}`           | Update role / active     |
| POST   | `/users/{id}/logout`    | Force logout             |
| DELETE | `/users/{id}`           | Delete user              |
| GET    | `/audit`                | Audit log viewer         |

### Health

| Method | Path           | Description    |
|--------|----------------|----------------|
| GET    | `/api/health`  | Liveness check |

---

## Architecture

```
Browser / Desktop (Tauri)
        │
        │  HTTPS (TLS 1.3)
        ▼
   NGINX (port 443)
   ├── /       → Next.js  (port 3000)
   └── /api/*  → Spring Boot (port 8080)
                    ├── PostgreSQL
                    └── Redis
```

---

## Prerequisites

| Tool             | Required        | Install                                        |
|------------------|-----------------|------------------------------------------------|
| Java 17+         | ✅ Backend      | https://adoptium.net                           |
| Maven 3.8+       | ✅ Backend      | `brew install maven`                           |
| Node 18+         | ✅ Web app      | https://nodejs.org                             |
| Docker Desktop   | ✅ Full stack   | https://www.docker.com/products/docker-desktop |
| Rust + Tauri CLI | ⚠️ Desktop only | `brew install rust && cargo install tauri-cli` |

---

## License

MIT
