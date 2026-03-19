# 🗄️ NovaPass Database Setup - YOUR SPECIFIC CONFIGURATION

## ✅ Your Current Setup: Supabase PostgreSQL

You're already using a **cloud PostgreSQL database on Supabase** - no local database needed!

### Your Database Details

From your `.env` file:

```bash
SPRING_DATASOURCE_URL="postgresql://postgres:w0EtuhVv2zQhh5b3@db.egipktzspzkilfewxdzd.supabase.co:5432/postgres"
DB_USERNAME="postgres"
DB_PASSWORD="w0EtuhVv2zQhh5b3"
```

**Connection Details**:
- **Host**: `db.egipktzspzkilfewxdzd.supabase.co`
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: `w0EtuhVv2zQhh5b3`

---

## 🚀 How to Run with Your Supabase Database

### Step 1: Fix the Database URL Format

**CRITICAL**: Your `.env` has PostgreSQL format, but Spring Boot needs **JDBC format**.

**Current** (in `.env`):
```bash
SPRING_DATASOURCE_URL="postgresql://postgres:w0EtuhVv2zQhh5b3@db.egipktzspzkilfewxdzd.supabase.co:5432/postgres"
```

**Required** (for Spring Boot):
```bash
SPRING_DATASOURCE_URL="jdbc:postgresql://db.egipktzspzkilfewxdzd.supabase.co:5432/postgres"
```

**Change**: Add `jdbc:` prefix and remove username/password from URL (they're in separate variables)

### Step 2: Update Your `.env` File

```bash
cd /Users/Anurag/Anurag/Projects/NovaPass
```

Edit `.env` to:

```bash
# Supabase PostgreSQL Database
SPRING_DATASOURCE_URL="jdbc:postgresql://db.egipktzspzkilfewxdzd.supabase.co:5432/postgres"
DB_USERNAME="postgres"
DB_PASSWORD="w0EtuhVv2zQhh5b3"

# JWT Secret (already correct)
JWT_SECRET="379ea6f5f55119399a2d73286d88df365f10a56b8d40a5576b4613ce56207104"

# CORS - for local development
CORS_ORIGINS="http://localhost:3000"

# WebAuthn - for local development
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_RP_NAME="NovaPass"
WEBAUTHN_RP_ORIGIN="http://localhost:3000"

# Admin Account (optional - creates admin on first startup)
ADMIN_EMAIL="admin@novapass.local"
ADMIN_PASSWORD="AdminPass123!"

# Spring Profile
SPRING_PROFILES_ACTIVE="prod"
```

### Step 3: Run Backend

**Terminal 1 - Backend**:
```bash
cd backend

# Set JAVA_HOME
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home

# Load environment variables from .env
export $(cat ../.env | grep -v '^#' | xargs)

# Run backend
mvn spring-boot:run

# Backend will:
# 1. Connect to Supabase PostgreSQL
# 2. Run Flyway migrations (create tables if they don't exist)
# 3. Start on http://localhost:8080
```

**Terminal 2 - Frontend**:
```bash
cd web-app

# Install dependencies (first time only)
npm install

# Create .env.local if it doesn't exist
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local

# Start frontend
npm run dev
```

**Access**: http://localhost:3000

---

## 🗄️ Accessing Your Supabase Database

### Option 1: Supabase Dashboard

1. Go to https://supabase.com
2. Login to your account
3. Select your project
4. Click **Table Editor** or **SQL Editor**
5. You can:
   - View tables
   - Run SQL queries
   - See data

### Option 2: psql Command Line

**Correct command for Supabase**:

```bash
psql "postgresql://postgres:w0EtuhVv2zQhh5b3@db.egipktzspzkilfewxdzd.supabase.co:5432/postgres"
```

**OR with separate parameters**:

```bash
PGPASSWORD=w0EtuhVv2zQhh5b3 psql \
  -h db.egipktzspzkilfewxdzd.supabase.co \
  -U postgres \
  -d postgres \
  -p 5432
```

**View tables**:
```sql
\dt
```

**View users**:
```sql
SELECT id, email, role, is_active FROM users;
```

**View audit logs**:
```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

### Option 3: Database Client (Recommended)

Use a GUI client like:
- **TablePlus** (macOS): https://tableplus.com
- **DBeaver** (cross-platform): https://dbeaver.io
- **pgAdmin** (cross-platform): https://www.pgadmin.org

**Connection details**:
- Host: `db.egipktzspzkilfewxdzd.supabase.co`
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: `w0EtuhVv2zQhh5b3`

---

## 🔄 Alternative: Use Local Database Instead

If you prefer to use a local database for development:

### Option 1: Docker PostgreSQL (Easiest)

```bash
# Start local PostgreSQL
docker run -d \
  --name novapass-local \
  -e POSTGRES_DB=novapass \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5433:5432 \
  postgres:14-alpine

# Note: Using port 5433 to not conflict with any local PostgreSQL
```

**Update `.env`**:
```bash
SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5433/novapass"
DB_USERNAME="postgres"
DB_PASSWORD="postgres"
# ... rest of config
```

### Option 2: H2 In-Memory (No Setup)

**Just run with dev profile**:
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

No `.env` needed - everything auto-configured!

---

## ✅ Verification

### 1. Check Backend Health

```bash
curl http://localhost:8080/api/health
```

**Expected**:
```json
{
  "status": "UP",
  "timestamp": "2026-03-19T16:50:00.000Z"
}
```

### 2. Check Database Tables

**Via psql**:
```bash
psql "postgresql://postgres:w0EtuhVv2zQhh5b3@db.egipktzspzkilfewxdzd.supabase.co:5432/postgres" -c "\dt"
```

**Expected output**:
```
              List of relations
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+----------
 public | audit_logs        | table | postgres
 public | flyway_schema_... | table | postgres
 public | passkeys          | table | postgres
 public | refresh_tokens    | table | postgres
 public | totp_secrets      | table | postgres
 public | users             | table | postgres
 public | vault_items       | table | postgres
```

If tables don't exist yet, they'll be created automatically when backend starts! ✅

---

## 🐛 Common Issues

### Issue: "role postgres does not exist"

**Cause**: Trying to connect to local PostgreSQL instead of Supabase

**Solution**: Use full connection string:
```bash
psql "postgresql://postgres:PASSWORD@db.egipktzspzkilfewxdzd.supabase.co:5432/postgres"
```

### Issue: Backend won't connect to Supabase

**Symptoms**:
- Backend logs show connection timeout
- "Connection refused"

**Fixes**:
1. Check Supabase project is active (not paused)
2. Check firewall/network allows outbound connections to Supabase
3. Verify connection string is correct

### Issue: "JDBC format error"

**Cause**: Missing `jdbc:` prefix in `SPRING_DATASOURCE_URL`

**Solution**:
```bash
# Wrong:
postgresql://host:5432/db

# Correct:
jdbc:postgresql://host:5432/db
```

---

## 📊 Summary

### Your Current Setup ✅

| Component | Details |
|-----------|---------|
| **Database** | Supabase PostgreSQL (cloud) |
| **Host** | db.egipktzspzkilfewxdzd.supabase.co |
| **Database Name** | postgres |
| **User** | postgres |
| **Schema** | Auto-created by Flyway ✅ |

### To Run Locally

1. **Fix `.env`**: Add `jdbc:` prefix to `SPRING_DATASOURCE_URL`
2. **Run backend**: 
   ```bash
   cd backend
   export $(cat ../.env | grep -v '^#' | xargs)
   mvn spring-boot:run
   ```
3. **Run frontend**: 
   ```bash
   cd web-app
   npm run dev
   ```
4. **Access**: http://localhost:3000

### No Local Database Setup Needed!

You're already using Supabase (cloud PostgreSQL). Just fix the JDBC URL format and you're ready to go! 🚀

---

## 🆘 Need Help?

If you encounter issues:
1. Check backend logs for specific error
2. Verify Supabase dashboard shows database is active
3. Test connection with: `psql "postgresql://postgres:PASSWORD@db.egipktzspzkilfewxdzd.supabase.co:5432/postgres"`
4. Ensure firewall allows connection to Supabase

---

**Your database is already set up! Just fix the JDBC URL format and run the backend.** ✅
