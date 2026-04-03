#!/bin/bash
set -e

cd "$(dirname "$0")/../web-app"

[ -f "node_modules/.bin/next" ] || npm install

echo "Starting web app on http://localhost:3000 ..."
npm run dev
