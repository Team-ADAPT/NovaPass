# 🧹 NovaPass Codebase Cleanup Summary

## ✅ Cleanup Completed

### Files & Directories Removed

| Item | Reason | Status |
|------|--------|--------|
| `desktop-client/` | Legacy JavaFX app (superseded by Tauri) | ✅ Deleted |
| `docs/api-specification/` | Empty placeholder | ✅ Deleted |
| `docs/project-report/` | Empty placeholder | ✅ Deleted |
| `docs/architecture/data-flow-diagrams/` | Empty placeholder | ✅ Deleted |
| `docs/architecture/sequence-diagrams/` | Empty placeholder | ✅ Deleted |
| `docs/DEPLOYMENT.md` | Duplicate (kept root-level file) | ✅ Deleted |
| `web-app/src/app/vault/new/` | Empty directory | ✅ Deleted |
| `web-app/src/hooks/` | Empty directory | ✅ Deleted |

### Updated Files

| File | Changes |
|------|---------|
| `.gitignore` | Added `.env.local`, `.h2.db`, `.copilot/` |
| `LOCAL_SETUP.md` | **NEW** - Complete local setup guide |

---

## 📊 Codebase Status

### Build Artifacts (Not in Git)

These directories are properly ignored and should NOT be committed:

| Directory | Size | Status |
|-----------|------|--------|
| `backend/target/` | 644 KB | ✅ In .gitignore |
| `web-app/.next/` | 149 MB | ✅ In .gitignore |
| `web-app/node_modules/` | 312 MB | ✅ In .gitignore |

**Action**: Run `mvn clean` and `rm -rf web-app/.next` before committing.

---

## 📁 Current Project Structure

```
NovaPass/
├── backend/                      ✅ Spring Boot backend
│   ├── src/main/
│   │   ├── java/com/novapass/   ✅ All backend code
│   │   └── resources/
│   │       ├── application.yml           ✅ Base config
│   │       ├── application-dev.yml       ✅ Dev (H2)
│   │       ├── application-prod.yml      ✅ Production
│   │       └── db/migration/             ✅ Flyway migrations
│   ├── src/test/                ⚠️ No tests yet
│   └── pom.xml                  ✅ Dependencies
│
├── web-app/                      ✅ Next.js frontend
│   ├── src/
│   │   ├── app/                 ✅ Pages (login, vault, admin)
│   │   ├── components/          ✅ React components
│   │   └── lib/                 ✅ API client, crypto, auth
│   └── package.json             ✅ Dependencies
│
├── browser-extension/            ⚠️ Scaffold only (optional)
├── desktop/                      ✅ Tauri desktop app
├── docker/                       ✅ Docker configs
│   ├── Dockerfile-backend       ✅ Backend container
│   ├── docker-compose.yml       ✅ Local development
│   └── nginx.conf               ✅ Reverse proxy
│
├── docs/                         ✅ Documentation
│   ├── architecture/            ✅ Architecture docs
│   └── database-schema/         ✅ Schema design
│
├── scripts/                      ✅ Utility scripts
│   ├── pre-deploy-check.sh      ✅ Pre-deployment validation
│   └── deploy-interactive.sh    ✅ Interactive deployment
│
└── [Root Documentation]
    ├── README.md                ✅ Project overview
    ├── LOCAL_SETUP.md          ✅ NEW - Local development guide
    ├── QUICK_START.md           ✅ 5-min deployment
    ├── DEPLOYMENT.md            ✅ Complete deployment guide
    ├── DEPLOYMENT_SUMMARY.md    ✅ Config reference
    ├── CONFIGURATION_ANALYSIS.md ✅ Deep dive
    ├── DEPLOYMENT_FILES.md      ✅ File reference
    └── TODO.md                  ✅ Known issues & roadmap
```

---

## 🗄️ Database Setup (Automated!)

### No Manual SQL Required ✅

Flyway migrations automatically create all tables on first backend startup:

1. **`V1__initial_schema.sql`** - Creates 6 tables:
   - `users` (with role column for admin)
   - `vault_items`
   - `passkeys`
   - `totp_secrets`
   - `refresh_tokens`
   - `audit_logs`

2. **`V2__add_audit_details.sql`** - Adds audit details column

**Location**: `backend/src/main/resources/db/migration/`

---

## 🚀 How to Run Locally

### Quick Start (H2 In-Memory - No Database Setup)

**Terminal 1 - Backend**:
```bash
cd backend
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Terminal 2 - Frontend**:
```bash
cd web-app
npm install  # First time only
npm run dev
```

**Access**: http://localhost:3000

### Full Setup (PostgreSQL)

**1. Create Database**:
```bash
# Using PostgreSQL
createdb novapass

# OR using Docker
docker run -d \
  --name novapass-postgres \
  -e POSTGRES_DB=novapass \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:14-alpine
```

**2. Set Environment Variables**:

Create `backend/.env.local`:
```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/novapass
DB_USERNAME=postgres
DB_PASSWORD=postgres
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=http://localhost:3000
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=NovaPass
WEBAUTHN_RP_ORIGIN=http://localhost:3000
ADMIN_EMAIL=admin@novapass.local
ADMIN_PASSWORD=AdminPass123!
```

Create `web-app/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**3. Run**:

Terminal 1 (Backend):
```bash
cd backend
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
source .env.local  # Load environment variables
mvn spring-boot:run
```

Terminal 2 (Frontend):
```bash
cd web-app
npm run dev
```

---

## ✅ Verification Checklist

### Backend Health
```bash
curl http://localhost:8080/api/health
# Should return: {"status":"UP","timestamp":"..."}
```

### Database
```bash
# PostgreSQL
psql -U postgres -d novapass -c "\dt"
# Should show: users, vault_items, passkeys, totp_secrets, refresh_tokens, audit_logs

# H2 (dev mode)
# Open: http://localhost:8080/h2-console
# JDBC URL: jdbc:h2:mem:novapass
# Username: sa, Password: (empty)
```

### Frontend
```
Open http://localhost:3000
Should see NovaPass login page
```

---

## 🔐 Database Connection Details

### Development (H2 In-Memory)

**Automatic Configuration** when using `-Dspring-boot.run.profiles=dev`:
- Database: H2 in-memory
- URL: `jdbc:h2:mem:novapass`
- Username: `sa`
- Password: (empty)
- Console: http://localhost:8080/h2-console

**Pros**:
- ✅ No setup required
- ✅ Fast startup
- ✅ Perfect for testing

**Cons**:
- ❌ Data lost on restart
- ❌ Not production-like

### Production-like (PostgreSQL)

**Manual Setup Required**:
```bash
# 1. Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# 2. Create database
createdb novapass

# 3. Set environment variables
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/novapass
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
```

**Connection Details**:
- Host: `localhost`
- Port: `5432`
- Database: `novapass`
- URL Format: `jdbc:postgresql://localhost:5432/novapass`

**Pros**:
- ✅ Data persists
- ✅ Production-like
- ✅ Better for development

**Cons**:
- ❌ Requires PostgreSQL installation
- ❌ Slightly slower startup

### Docker PostgreSQL (Recommended)

```bash
# Start PostgreSQL in Docker
docker run -d \
  --name novapass-postgres \
  -e POSTGRES_DB=novapass \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:14-alpine

# Connect backend
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/novapass
export DB_USERNAME=postgres
export DB_PASSWORD=postgres

# Stop database
docker stop novapass-postgres

# Start again (data persists)
docker start novapass-postgres

# View logs
docker logs novapass-postgres
```

**Pros**:
- ✅ No local PostgreSQL installation needed
- ✅ Data persists in Docker volume
- ✅ Easy to reset (delete container)
- ✅ Production-like

**Cons**:
- ❌ Requires Docker

---

## 🐛 Common Issues & Solutions

### Issue 1: Backend won't start - "Port 8080 already in use"

```bash
# Find process using port 8080
lsof -i :8080

# Kill it
kill -9 <PID>

# OR run backend on different port
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
```

### Issue 2: "Cannot find symbol class Lombok"

```bash
cd backend
mvn clean package -DskipTests
mvn spring-boot:run
```

### Issue 3: "JWT_SECRET must be set"

```bash
export JWT_SECRET=$(openssl rand -hex 32)
mvn spring-boot:run
```

### Issue 4: Frontend shows "Failed to fetch"

**Check**:
1. Backend is running: `curl http://localhost:8080/api/health`
2. Frontend .env.local has correct API URL: `NEXT_PUBLIC_API_URL=http://localhost:8080`
3. CORS is configured to allow `http://localhost:3000`

### Issue 5: Passkeys don't work

**Requirements**:
- Must use HTTPS OR localhost (WebAuthn security requirement)
- `WEBAUTHN_RP_ID=localhost` (no port, no protocol)
- `WEBAUTHN_RP_ORIGIN=http://localhost:3000` (exact match with frontend)
- Use Chrome/Edge (best WebAuthn support)

---

## 📝 Next Steps

1. **Read**: `LOCAL_SETUP.md` for detailed setup instructions
2. **Test locally**: Follow quick start above
3. **Try all features**:
   - Register account
   - Login
   - Add vault items
   - Enable 2FA (Settings → Security)
   - Add passkey (Settings → Passkeys)
   - Login as admin (see dashboard)
4. **For deployment**: See `DEPLOYMENT.md` or `QUICK_START.md`

---

## 📊 Cleanup Summary

| Metric | Before | After |
|--------|--------|-------|
| Empty directories | 6 | 0 |
| Duplicate files | 2 | 0 |
| Documentation files | Scattered | Organized |
| .gitignore coverage | Partial | Complete |

**Result**: ✅ Clean, organized codebase ready for local development and deployment!

---

For complete local setup instructions, see **`LOCAL_SETUP.md`**.
For deployment to Railway + Vercel, see **`DEPLOYMENT.md`** or **`QUICK_START.md`**.
