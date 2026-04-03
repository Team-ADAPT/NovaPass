#!/bin/bash
# One-time setup: verify prerequisites and install dependencies.
set -e

command -v java  >/dev/null 2>&1 || { echo "Java 17+ required. Install from https://adoptium.net"; exit 1; }
command -v mvn   >/dev/null 2>&1 || { echo "Maven required. Run: brew install maven"; exit 1; }
command -v node  >/dev/null 2>&1 || { echo "Node 18+ required. Install from https://nodejs.org"; exit 1; }

echo "Installing backend dependencies..."
cd "$(dirname "$0")/../backend" && mvn dependency:resolve -q

echo "Installing frontend dependencies..."
cd "../web-app" && npm install

echo ""
echo "Setup complete."
echo "  Start backend : ./scripts/run-backend.sh"
echo "  Start frontend: ./scripts/run-client.sh"
