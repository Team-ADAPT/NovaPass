# NovaPass — Issues & TODO

## Bugs Fixed (in this session)

| # | Bug | Root Cause | Fix Applied |
|---|---|---|---|
| 1 | Register/Login silently fails | `NEXT_PUBLIC_API_URL` was `undefined` at runtime — all API calls went to `undefined/api/...` | Hardcoded fallback to `http://localhost:8080` in `api.ts` |
| 2 | Register button appears frozen for ~3s | PBKDF2 with 600k iterations blocks the main thread with no feedback | Added `loading` state + "Creating account…" button text |
| 3 | Backend wouldn't compile | Lombok annotation processor not configured in Maven | Added `annotationProcessorPaths` to `maven-compiler-plugin` in `pom.xml` |
| 4 | Backend crashed on startup | `QrDataFactory()` no-arg constructor doesn't exist in totp 1.7.1 | Fixed `TotpService` to use `new QrDataFactory(HashingAlgorithm.SHA1, 6, 30)` |
| 5 | Dev profile crashed | `application-dev.yml` missing JWT secret, CORS, and Redis config | Added all required keys; disabled Redis autoconfiguration in dev |
| 6 | H2 not available at runtime | H2 was `test` scope only | Changed to `runtime` scope in `pom.xml` |
| 7 | Next.js wouldn't start | Missing `tsconfig.json`, `tailwind.config.js`, `postcss.config.js` | Created all three |

---

## What's Working Now

- ✅ Backend starts with `mvn spring-boot:run -Dspring-boot.run.profiles=dev`
- ✅ `GET /api/health` returns `{"status":"UP"}`
- ✅ `POST /api/auth/register` works
- ✅ `POST /api/auth/login` works
- ✅ All vault CRUD endpoints work
- ✅ 2FA setup and verification endpoints work
- ✅ Passkey/WebAuthn registration and authentication work
- ✅ Web app starts with `npm run dev`
- ✅ Register and Login pages load and submit correctly
- ✅ Vault page with add/edit/delete items
- ✅ Settings page with 2FA and Passkey management
- ✅ Dark mode toggle
- ✅ PWA manifest and service worker
- ✅ Password strength meter
- ✅ **Admin Portal** with dashboard, user management, and audit logs

---

## Recently Implemented Features

| Feature | Status | Description |
|---|---|---|
| Passkey/WebAuthn Backend | ✅ Done | Model, repository, service, controller for passkey auth |
| Edit Vault Item | ✅ Done | Full edit modal with all fields |
| Password Strength Meter | ✅ Done | Visual entropy-based strength indicator |
| Settings Page | ✅ Done | 2FA setup, passkey management, dark mode toggle |
| 2FA Setup UI | ✅ Done | QR code display, secret backup, verification flow |
| Passkey Setup UI | ✅ Done | Register/delete passkeys with WebAuthn browser API |
| Dark Mode | ✅ Done | Tailwind dark mode with localStorage persistence |
| PWA Support | ✅ Done | manifest.json, service worker, offline caching |
| **Admin Portal** | ✅ Done | Dashboard, user management, audit logs |
| **Flyway Migrations** | ✅ Done | Database schema versioning |
| **Role-based Access** | ✅ Done | USER and ADMIN roles with JWT claims |

---

## Admin Portal Features

### Admin Dashboard (`/admin`)
- System statistics (total users, active users, 2FA adoption, vault items, passkeys)
- Login/registration activity charts (last 30 days)
- Quick action buttons

### User Management (`/admin/users`)
- Paginated user list with search
- Enable/disable user accounts
- Promote/demote admin role
- Force logout (revoke all tokens)
- Delete user (with safeguards)
- View security status (2FA, passkeys)

### Audit Logs (`/admin/audit`)
- Filterable audit log viewer
- Action type filtering
- Paginated with timestamps
- Tracks: LOGIN, LOGOUT, REGISTER, VAULT_*, 2FA_*, PASSKEY_*, ADMIN_*

### Admin Setup
Set environment variables on first startup:
```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_USERNAME=admin
```

---

## What Still Needs Work

### 🟡 Missing features (app works without these, but incomplete)

| # | What | Where | Details |
|---|---|---|---|
| 1 | Vault item icons | `VaultItemCard.tsx` | Cards/Notes show generic text, no visual differentiation by type |
| 2 | Breach detection | `web-app` | No HaveIBeenPwned API integration |
| 3 | Secure sharing | `backend` + `web-app` | No way to share a vault item with another user |
| 4 | Export vault | `web-app` | No export/backup functionality |

### 🟠 Production blockers (fine for local dev, broken in prod)

| # | What | Where | Details |
|---|---|---|---|
| 5 | No real JWT secret | `.env.example` | Generate with `openssl rand -hex 32` and set in `.env` before deploying. |
| 6 | Self-signed TLS cert | `docker/certs/` | Replace with Let's Encrypt cert before going live. |
| 7 | Redis not used in dev | `application-dev.yml` | Redis autoconfiguration is disabled in dev. In prod, rate limiting should be Redis-backed. |
| 8 | `application-prod.yml` incomplete | `backend/src/main/resources/` | Missing `spring.datasource.url`, `spring.data.redis.password`, and `cors.allowed-origins`. |

### ⚪ Nice to have

| # | What | Details |
|---|---|---|
| 9 | Tauri desktop build | Needs `brew install rust` then `cd desktop && npm run build` |
| 10 | OpenAPI spec | `docs/api-specification/` is empty |
| 11 | CI/CD pipeline | `.github/workflows/ci.yml` is a placeholder — no actual build/test steps |
| 12 | Unit tests | Backend has no tests in `src/test` |

---

## How to run right now

```bash
# Terminal 1 — backend (with admin user creation)
cd backend
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home \
  ADMIN_EMAIL=admin@novapass.local \
  ADMIN_PASSWORD=REDACTED_ADMIN_PASSWORD \
  mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 2 — web app
cd web-app && npm run dev
```

Open http://localhost:3000

**Admin Portal**: Log in with admin credentials, then click the **Admin** button in the vault toolbar.
