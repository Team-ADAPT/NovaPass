#!/bin/bash

# NovaPass — start backend + frontend together
# Usage: ./dev.sh
# Ctrl+C stops both

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Load .env
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "❌ .env file not found"
  exit 1
fi
set -a; source "$SCRIPT_DIR/.env"; set +a

# Validate required vars
for var in JWT_SECRET SPRING_DATASOURCE_URL DB_USERNAME; do
  [ -z "${!var}" ] && echo "❌ $var not set in .env" && exit 1
done

echo "✅ Environment loaded"

# Kill both processes on Ctrl+C
cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo "Done."
}
trap cleanup INT TERM

# Check if Database is accessible
echo "🔍 Checking database connection..."
if ! psql -d novapass -c "SELECT 1" &> /dev/null; then
  echo "❌ Local database 'novapass' is not accessible."
  echo "   Make sure PostgreSQL is running: brew services start postgresql@15"
  exit 1
fi
echo "✅ Database is accessible"

# Start backend
echo "🚀 Starting backend with local database..."
cd "$SCRIPT_DIR/backend"
mvn spring-boot:run -Dspring-boot.run.profiles=dev &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to be healthy..."
while ! curl -s http://localhost:8080/api/health > /dev/null; do
  sleep 1
done
echo "✅ Backend is UP"

# Start frontend
echo "🌐 Starting frontend..."
cd "$SCRIPT_DIR/web-app"
export NEXT_PUBLIC_API_URL="http://localhost:8080"
[ -d "node_modules" ] || npm install
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend  → http://localhost:8080"
echo "Frontend → http://localhost:3000"
echo "Press Ctrl+C to stop both."
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
