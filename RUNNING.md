# Running NovaPass Locally

## What you need installed

| Tool | Check | Install |
|---|---|---|
| Java 17 | `java -version` | [adoptium.net](https://adoptium.net) |
| Maven | `mvn -version` | `brew install maven` |
| Node 18+ | `node --version` | [nodejs.org](https://nodejs.org) |
| PostgreSQL 15 | `pg_isready` | `brew install postgresql@15` |
| Docker Desktop | (open the app) | [docker.com](https://www.docker.com/products/docker-desktop) — only for Option 3 |

---

## Option 1 — Backend + Postgres (recommended, data persists)

**One-time setup:**
```bash
# Install and start Postgres
brew install postgresql@15
brew services start postgresql@15

# Create the database and apply schema
createdb novapass
psql -d novapass -f docs/database-schema/schema-design.sql
```

Open **two terminals:**

**Terminal 1 — Backend**
```bash
cd backend
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home \
  mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Terminal 2 — Web app**
```bash
cd web-app
npm install   # first time only
npm run dev
```

Open **http://localhost:3000**

> Data survives backend restarts. Postgres runs as your macOS user — no password needed locally.

---

## Option 2 — Backend with H2 (no Postgres, data resets on restart)

Switch `application-dev.yml` datasource back to H2:
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:novapass;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: create-drop
```

Then run the same commands as Option 1. H2 console at **http://localhost:8080/h2-console**.

---

## Option 3 — Full stack with Docker

Requires Docker Desktop to be running.

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET, DB_PASSWORD, REDIS_PASSWORD

mkdir -p docker/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/certs/privkey.pem \
  -out docker/certs/fullchain.pem \
  -subj "/CN=localhost"

cd docker && docker-compose up -d
```

Open **https://localhost**

---

## Verify everything is working

```bash
# Backend health
curl http://localhost:8080/api/health
# → {"status":"UP","timestamp":"..."}

# Check what's in the database
psql -d novapass -c "SELECT id, username, email FROM users;"
```

---

## Database overview

| Mode | DB | Data persists? | When to use |
|---|---|---|---|
| `dev` profile (current) | PostgreSQL 15 (local) | ✅ Yes | Local development |
| `dev` profile (H2 fallback) | H2 in-memory | ❌ Resets on restart | Quick testing, no Postgres |
| Docker Compose | PostgreSQL in container | ✅ Yes (volume) | Full stack / staging |
| Production | PostgreSQL (RDS/Cloud) | ✅ Yes | Deployment |

---

## Common issues

| Problem | Fix |
|---|---|
| `mvn: command not found` | `brew install maven` |
| Backend crashes with Java version error | Add `JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home` before `mvn` |
| `connection refused` on port 5432 | `brew services start postgresql@15` |
| `database "novapass" does not exist` | `createdb novapass && psql -d novapass -f docs/database-schema/schema-design.sql` |
| `npm run dev` fails | Run `npm install` first |
| Port 8080 in use | `lsof -ti:8080 \| xargs kill` |
| Port 3000 in use | `lsof -ti:3000 \| xargs kill` |
