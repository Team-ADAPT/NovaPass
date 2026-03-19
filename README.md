# NovaPass — Secure Password Manager

A production-grade, zero-knowledge password manager with a Spring Boot backend, Next.js web app, and Tauri desktop client.

---

## Project Status

| Layer | Status | Notes |
|---|---|---|
| Backend (Spring Boot) | ✅ Complete | Auth, Vault CRUD, 2FA, JWT, Passkeys/WebAuthn, rate limiting |
| Web App (Next.js) | ✅ Complete | Login, Register, Vault UI, Settings, 2FA Setup, Passkey Setup, client-side crypto |
| Desktop App (Tauri) | ✅ Scaffold | Wraps web app, system tray — needs Rust to build |
| Browser Extension | ✅ Scaffold | Autofill content script exists |
| Docker / NGINX | ✅ Complete | Full stack compose with TLS config |
| Database Schema | ✅ Complete | PostgreSQL schema with indexes |

---

## Features

### Security
- 🔐 **Zero-knowledge encryption** — Master password never sent to server
- 🔑 **AES-256-GCM** — Client-side vault encryption
- 🔒 **PBKDF2-SHA256** — 600,000 iterations for key derivation
- 🛡️ **Argon2id** — Server-side password hashing
- 📱 **TOTP 2FA** — RFC 6238 compliant authenticator support
- 🔏 **Passkeys/WebAuthn** — Passwordless authentication with Face ID/Touch ID

### User Experience
- 🌙 **Dark mode** — System preference detection + manual toggle
- 📱 **PWA support** — Installable on mobile and desktop
- 🔍 **Search & filter** — Find credentials quickly
- ⭐ **Favorites** — Quick access to frequently used items
- 🔄 **Password generator** — Customizable length and character sets
- 📊 **Password strength meter** — Visual strength indicator

---

## Prerequisites

| Tool | Required | Install |
|---|---|---|
| Java 17+ | ✅ Backend | [temurin](https://adoptium.net) |
| Maven 3.8+ | ✅ Backend | `brew install maven` |
| Node 18+ | ✅ Web app | [nodejs.org](https://nodejs.org) |
| Docker Desktop | ✅ Full stack | [docker.com](https://www.docker.com/products/docker-desktop) |
| Rust + Tauri CLI | ⚠️ Desktop only | `brew install rust && cargo install tauri-cli` |

---

## Running Locally

### Option A — Backend only (no Docker, no Postgres needed)

Uses H2 in-memory database. Fastest way to test the API.

```bash
# 1. Install Maven
brew install maven

# 2. Run backend with dev profile (H2 in-memory DB, Redis disabled)
#    JAVA_HOME override is needed because Homebrew Maven bundles Java 25,
#    but this project targets Java 17.
cd backend
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home \
  mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Backend starts at **http://localhost:8080**
H2 console available at **http://localhost:8080/h2-console** (JDBC URL: `jdbc:h2:mem:novapass`)

### Option B — Web app only

```bash
cd web-app
npm install
npm run dev
```

Web app starts at **http://localhost:3000**
> Set `NEXT_PUBLIC_API_URL=http://localhost:8080` (default) to point at the backend.

### Option C — Full stack with Docker

```bash
# 1. Copy and fill in secrets
cp .env.example .env

# 2. Add TLS certs (or use self-signed for local testing)
mkdir -p docker/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/certs/privkey.pem \
  -out docker/certs/fullchain.pem \
  -subj "/CN=localhost"

# 3. Start everything
cd docker
docker-compose up -d
```

App available at **https://localhost** (accept the self-signed cert warning locally).

---

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Description | Required |
|---|---|---|
| `JWT_SECRET` | Random string, min 32 chars | ✅ Production |
| `DB_PASSWORD` | PostgreSQL password | ✅ Production |
| `REDIS_PASSWORD` | Redis password | ✅ Production |
| `CORS_ORIGINS` | Allowed frontend origins | ✅ Production |

> In dev profile, `JWT_SECRET` is hardcoded in `application-dev.yml`. Never use that value in production.

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/salt?email=` | ❌ | Fetch salt for key derivation |
| POST | `/register` | ❌ | Create account |
| POST | `/login` | ❌ | Login, returns JWT + refresh token |
| POST | `/refresh` | ❌ | Rotate refresh token |
| POST | `/logout` | ✅ | Invalidate refresh tokens |
| POST | `/2fa/setup` | ✅ | Generate TOTP secret + QR URI |
| POST | `/2fa/confirm` | ✅ | Enable 2FA after verifying code |
| POST | `/2fa/disable` | ✅ | Disable 2FA |

### Passkeys — `/api/auth/passkey`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register/begin` | ✅ | Start passkey registration |
| POST | `/register/complete` | ✅ | Complete passkey registration |
| POST | `/login/begin` | ❌ | Start passkey authentication |
| POST | `/login/complete` | ❌ | Complete passkey authentication |
| GET | `/` | ✅ | List user's passkeys |
| DELETE | `/{id}` | ✅ | Delete a passkey |
| PUT | `/{id}/name` | ✅ | Rename a passkey |

### Vault — `/api/vault` (all require JWT)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Get all vault items |
| GET | `/{id}` | Get single item |
| POST | `/` | Create item (encrypted client-side) |
| PUT | `/{id}` | Update item (with version for conflict detection) |
| DELETE | `/{id}` | Delete item |
| POST | `/sync` | Delta sync since `lastSyncAt` |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness check |

---

## Security Model

```
Master Password
      │
      │  PBKDF2-SHA256 (600,000 iterations) — runs in browser/client only
      ▼
 512-bit stretched key
      ├── [0..255]  authKey  → sent to server → Argon2id hashed and stored
      └── [256..511] encKey  → stays in memory → encrypts vault with AES-256-GCM
```

- The server **never sees** the master password or the encryption key
- Vault items are encrypted **before** leaving the client
- JWT access tokens expire in **15 minutes**; refresh tokens rotate on every use
- Optimistic locking on vault items prevents silent data loss on concurrent edits

---

## What Still Needs To Be Done

### Must-do before production

- [ ] **Maven install** — `brew install maven` (required to build backend)
- [ ] **Docker Desktop** — start it before running `docker-compose`
- [ ] **TLS certificates** — replace self-signed certs with Let's Encrypt in production
- [ ] **Strong `JWT_SECRET`** — generate with `openssl rand -hex 32`
- [ ] **`application-prod.yml`** — add Redis password and proper DB URL

### Nice-to-have / future work

- [ ] Vault item **edit UI** (currently only add/delete in web app)
- [ ] **Settings page** (change master password, enable 2FA from UI)
- [ ] **Breach detection** (HaveIBeenPwned API integration)
- [ ] **Secure sharing** between users
- [ ] **Mobile app** (React Native or Flutter)
- [ ] **Tauri desktop build** — needs Rust installed (`brew install rust`)
- [ ] **CI/CD pipeline** — update `.github/workflows/ci.yml` with actual test + build steps
- [ ] **Flyway migrations** — replace `ddl-auto: update` with proper versioned migrations for prod
- [ ] **OpenAPI spec** — `docs/api-specification/openapi.yaml` is empty

---

## Project Structure

```
NovaPass/
├── backend/                  # Spring Boot REST API
│   └── src/main/java/com/novapass/
│       ├── model/            # JPA entities
│       ├── repository/       # Spring Data repositories
│       ├── service/          # Business logic
│       ├── controller/       # REST endpoints
│       ├── security/         # JWT filter + provider
│       ├── config/           # Security, CORS, rate limiting
│       ├── dto/              # Request/response objects
│       └── exception/        # Global error handling
├── web-app/                  # Next.js frontend
│   └── src/
│       ├── app/              # Pages (login, register, vault)
│       ├── components/       # VaultItemCard, AddItemModal
│       ├── lib/              # crypto.ts, api.ts
│       └── store/            # Zustand vault store
├── desktop/                  # Tauri desktop wrapper
│   └── src-tauri/            # Rust shell (tray, native OS)
├── browser-extension/        # Chrome/Firefox autofill extension
├── docker/                   # docker-compose, Dockerfiles, nginx.conf
├── docs/                     # Architecture, schema, deployment guide
└── .env.example              # Environment variable template
```

---

## Architecture

```
Browser / Desktop (Tauri)
         │
         │  HTTPS (TLS 1.3)
         ▼
    NGINX (port 443)
    ├── /        → Next.js web app  (port 3000)
    └── /api/*   → Spring Boot API  (port 8080)
                      ├── PostgreSQL  (primary store)
                      └── Redis       (session cache)
```

---

## License

MIT
