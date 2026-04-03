# 🚀 NovaPass - Local Development Setup

Complete guide to running NovaPass on your local machine.

---

## 📋 Prerequisites

### Required Software

1. **Java 17** (Temurin JDK recommended)
   ```bash
   # macOS (Homebrew)
   brew install --cask temurin17
   
   # Verify installation
   java -version
   # Should show: openjdk version "17.0.x"
   ```

2. **Maven 3.8+**
   ```bash
   # macOS
   brew install maven
   
   # Verify
   mvn -version
   ```

3. **Node.js 18+** (LTS recommended)
   ```bash
   # macOS (using nvm - recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   
   # OR using Homebrew
   brew install node@18
   
   # Verify
   node -v  # Should be v18.x.x or higher
   npm -v
   ```

4. **PostgreSQL 14+** (or use H2 in-memory for quick start)
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   
   # Create database
   createdb novapass
   
   # OR use Docker
   docker run -d \
     --name novapass-postgres \
     -e POSTGRES_DB=novapass \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     postgres:14-alpine
   ```

### Optional (for full features)

- **Redis** (for session management in production mode)
  ```bash
  # macOS
  brew install redis
  brew services start redis
  
  # OR Docker
  docker run -d --name novapass-redis -p 6379:6379 redis:7-alpine
  ```

---

## 🗄️ Database Configuration

### Option 1: PostgreSQL (Recommended for Production-like Setup)

1. **Create database**:
   ```bash
   createdb novapass
   ```

2. **Set environment variables**:
   ```bash
   export DB_USERNAME=postgres
   export DB_PASSWORD=postgres
   export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/novapass
   ```

3. **Schema auto-created**: Flyway will create all tables on first backend startup ✅

### Option 2: H2 In-Memory (Quick Start)

1. **No setup required** - just run backend with `dev` profile
2. Database created in memory automatically
3. Data lost when backend stops (good for testing)

---

## ⚙️ Environment Setup

### Backend Environment

Create `backend/.env.local` (or export in terminal):

```bash
# Database (PostgreSQL)
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/novapass
DB_USERNAME=postgres
DB_PASSWORD=postgres

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)  # generate your own

# CORS (allow frontend)
CORS_ORIGINS=http://localhost:3000

# WebAuthn (Passkeys)
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=NovaPass
WEBAUTHN_RP_ORIGIN=http://localhost:3000

# Admin Account (optional - creates admin on startup)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<your-strong-password>
ADMIN_USERNAME=admin

# Redis (optional - only for production mode)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Frontend Environment

Create `web-app/.env.local`:

```bash
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 🚀 Running the Application

### Method 1: Quick Start (H2 In-Memory Database)

**Terminal 1 - Backend**:
```bash
cd backend

# Set JAVA_HOME if needed
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home

# Run with dev profile (uses H2 in-memory)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# With admin creation
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=<your-strong-password> \
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Terminal 2 - Frontend**:
```bash
cd web-app

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Access**: Open http://localhost:3000

### Method 2: Full Setup (PostgreSQL)

**Terminal 1 - Backend**:
```bash
cd backend

# Set environment variables
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/novapass
export JWT_SECRET=$(openssl rand -hex 32)
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD=<your-strong-password>

# Set JAVA_HOME
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home

# Run backend
mvn spring-boot:run

# Backend will:
# 1. Connect to PostgreSQL
# 2. Run Flyway migrations (create all tables)
# 3. Create admin user
# 4. Start on http://localhost:8080
```

**Terminal 2 - Frontend**:
```bash
cd web-app

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev

# Frontend available at http://localhost:3000
```

---

## ✅ Verification

### 1. Check Backend Health

```bash
curl http://localhost:8080/api/health
```

**Expected response**:
```json
{
  "status": "UP",
  "timestamp": "2026-03-19T16:40:00.000Z"
}
```

### 2. Test Frontend

Open browser: http://localhost:3000

You should see the NovaPass login page.

### 3. Register Account

1. Click **Register**
2. Enter:
   - Email: `user@example.com`
   - Password: `Password123!`
3. Submit
4. You should be redirected to vault

### 4. Test Admin Portal

1. **Logout** (if logged in)
2. **Login** with admin credentials:
   - Email: `admin@example.com`
   - Password: `<your-strong-password>`
3. Click **Admin** button in vault
4. Should see admin dashboard

---

## 🗄️ Database Schema

### Auto-Created Tables (via Flyway)

When backend starts for the first time, Flyway creates:

1. **`users`**
   - User accounts
   - Password hashes (Argon2id)
   - Roles (USER, ADMIN)
   - 2FA settings

2. **`vault_items`**
   - Encrypted vault entries
   - Website URLs
   - Metadata

3. **`passkeys`**
   - WebAuthn credentials
   - Public keys
   - Credential IDs

4. **`totp_secrets`**
   - 2FA TOTP secrets
   - Encrypted

5. **`refresh_tokens`**
   - JWT refresh tokens
   - Expiry tracking

6. **`audit_logs`**
   - System audit trail
   - User actions
   - Admin actions

### View Database

**PostgreSQL**:
```bash
psql -U postgres -d novapass

# List tables
\dt

# View users
SELECT id, email, role, is_active FROM users;

# View audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

**H2 In-Memory** (dev profile):
- Access H2 console: http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:mem:novapass`
- Username: `sa`
- Password: (empty)

---

## 🐛 Troubleshooting

### Backend won't start

**Error**: `Cannot find symbol class Lombok`

**Fix**:
```bash
# Lombok annotation processor issue
# Rebuild with clean
cd backend
mvn clean package -DskipTests
mvn spring-boot:run
```

---

**Error**: `Port 8080 already in use`

**Fix**:
```bash
# Find process using port 8080
lsof -i :8080

# Kill it
kill -9 <PID>

# OR run backend on different port
mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
```

---

**Error**: `JWT_SECRET must be set`

**Fix**:
```bash
# Generate and set JWT secret
export JWT_SECRET=$(openssl rand -hex 32)
mvn spring-boot:run
```

---

**Error**: `Connection to localhost:5432 refused`

**Fix**:
```bash
# PostgreSQL not running
brew services start postgresql@14

# OR use H2 instead
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

---

### Frontend won't start

**Error**: `Cannot find module`

**Fix**:
```bash
# Dependencies not installed
cd web-app
rm -rf node_modules package-lock.json
npm install
```

---

**Error**: `NEXT_PUBLIC_API_URL is not defined`

**Fix**:
```bash
# Create .env.local in web-app/
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > web-app/.env.local
```

---

**Error**: `Failed to fetch` (in browser)

**Fix**:
1. Check backend is running: `curl http://localhost:8080/api/health`
2. Check CORS settings in backend (should allow `http://localhost:3000`)
3. Check browser console for specific error

---

### CORS errors

**Symptom**: API calls fail with CORS policy errors

**Fix**:
```bash
# Ensure CORS_ORIGINS includes frontend URL
export CORS_ORIGINS=http://localhost:3000
mvn spring-boot:run

# Should see in backend logs:
# "CORS configuration: [http://localhost:3000]"
```

---

### Passkeys not working

**Symptom**: "Passkey registration failed"

**Fix**:
1. **Use HTTPS or localhost** (WebAuthn requires secure context)
2. Check WEBAUTHN_RP_ID=`localhost` (no port, no protocol)
3. Check WEBAUTHN_RP_ORIGIN=`http://localhost:3000` (exact match)
4. **Use Chrome/Edge** (best WebAuthn support)

---

## 📊 Project Structure

```
NovaPass/
├── backend/                      # Spring Boot backend
│   ├── src/main/
│   │   ├── java/com/novapass/
│   │   │   ├── controller/      # REST API controllers
│   │   │   ├── service/         # Business logic
│   │   │   ├── repository/      # Database access
│   │   │   ├── model/           # Entity models
│   │   │   ├── dto/             # Data transfer objects
│   │   │   ├── security/        # JWT, auth config
│   │   │   └── config/          # Spring configuration
│   │   └── resources/
│   │       ├── application.yml           # Base config
│   │       ├── application-dev.yml       # Dev profile (H2)
│   │       ├── application-prod.yml      # Production profile
│   │       └── db/migration/             # Flyway migrations
│   │           ├── V1__initial_schema.sql
│   │           └── V2__add_audit_details.sql
│   └── pom.xml                  # Maven dependencies
│
├── web-app/                     # Next.js frontend
│   ├── src/
│   │   ├── app/                 # App router pages
│   │   │   ├── login/           # Login page
│   │   │   ├── register/        # Register page
│   │   │   ├── vault/           # Vault dashboard
│   │   │   ├── settings/        # Settings (2FA, passkeys)
│   │   │   └── admin/           # Admin portal
│   │   ├── components/          # React components
│   │   └── lib/                 # Utilities
│   │       ├── api.ts           # API client (Axios)
│   │       ├── crypto.ts        # Client-side encryption
│   │       └── auth.ts          # Auth helpers
│   ├── public/                  # Static assets
│   └── package.json             # npm dependencies
│
├── browser-extension/           # Chrome extension (optional)
├── desktop/                     # Tauri desktop app (optional)
│
├── docs/                        # Documentation
│   ├── architecture/            # Architecture docs
│   └── database-schema/         # Database design
│
└── scripts/                     # Utility scripts
    ├── pre-deploy-check.sh      # Pre-deployment validation
    └── deploy-interactive.sh    # Interactive deployment
```

---

## 🔐 Security Notes

### Local Development

- **JWT Secret**: Use a random secret (generated with `openssl rand -hex 32`)
- **Admin Password**: Use a strong password even in dev
- **HTTPS**: Not required for localhost (WebAuthn allows it)
- **Database**: Flyway creates schema - no manual SQL needed

### Client-Side Encryption

- Vault items are encrypted in browser before sending to backend
- Backend only stores encrypted blobs
- Encryption key derived from master password (never sent to server)
- Uses AES-256-GCM with Argon2id key derivation

---

## 🧪 Testing

### Manual Testing

1. **Register**: Create account → Should redirect to vault
2. **Login**: Login → Should see vault
3. **Vault**: Add item → Edit → Delete
4. **2FA**: Settings → Enable 2FA → Scan QR → Verify
5. **Passkeys**: Settings → Add Passkey → Use biometric
6. **Admin**: Login as admin → Click Admin button → See dashboard

### API Testing (with curl)

```bash
# Health check
curl http://localhost:8080/api/health

# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","encKey":"test-key","username":"testuser"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# Get vault (requires JWT from login response)
curl http://localhost:8080/api/vault \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📝 Quick Reference

### Start Backend (Dev Mode - H2)
```bash
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Start Backend (PostgreSQL)
```bash
cd backend && \
export DB_USERNAME=postgres DB_PASSWORD=postgres && \
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/novapass && \
mvn spring-boot:run
```

### Start Frontend
```bash
cd web-app && npm run dev
```

### Generate JWT Secret
```bash
openssl rand -hex 32
```

### Reset Database (PostgreSQL)
```bash
dropdb novapass && createdb novapass
# Restart backend - Flyway recreates schema
```

### View Logs
```bash
# Backend logs in terminal where mvn is running
# Frontend logs in terminal where npm is running
# Browser console for client-side errors
```

---

## 🎯 Next Steps

1. **Read the code**: Start with `backend/src/main/java/com/novapass/controller/`
2. **Try all features**: 2FA, passkeys, vault, admin portal
3. **Customize**: Add your own features or modify UI
4. **Deploy**: See `DEPLOYMENT.md` for production deployment

---

## 🆘 Need Help?

1. Check **Troubleshooting** section above
2. Review backend logs for errors
3. Check browser console (F12) for frontend errors
4. Verify all environment variables are set
5. Ensure PostgreSQL is running (if not using H2)

---

**Happy Coding! 🚀**
