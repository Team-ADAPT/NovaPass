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
for var in JWT_SECRET SPRING_DATASOURCE_URL DB_USERNAME DB_PASSWORD; do
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

# Start backend
echo "🚀 Starting backend..."
cd "$SCRIPT_DIR/backend"
mvn spring-boot:run -Dspring-boot.run.profiles=dev &
BACKEND_PID=$!

# Start frontend
echo "🌐 Starting frontend..."
cd "$SCRIPT_DIR/web-app"
[ -d "node_modules" ] || npm install
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend  → http://localhost:8080"
echo "Frontend → http://localhost:3000"
echo "Press Ctrl+C to stop both."
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
