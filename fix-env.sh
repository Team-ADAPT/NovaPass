#!/bin/bash

echo "🔧 Fixing NovaPass .env file..."
echo ""

# Backup current .env
cp .env .env.backup
echo "✓ Backed up current .env to .env.backup"

# Fix the JDBC URL
sed -i '' 's|SPRING_DATASOURCE_URL="jdbc:postgresql://postgres:REDACTED_DB_PASSWORD@|SPRING_DATASOURCE_URL="jdbc:postgresql://|' .env
echo "✓ Fixed JDBC URL format"

# Fix CORS for local development
sed -i '' 's|CORS_ORIGINS="https://app.novapass.io"|CORS_ORIGINS="http://localhost:3000"|' .env
echo "✓ Updated CORS for local development"

# Fix WebAuthn for local
sed -i '' 's|WEBAUTHN_RP_ID="app.novapass.io"|WEBAUTHN_RP_ID="localhost"|' .env 2>/dev/null || echo "# Adding WebAuthn config" >> .env
sed -i '' 's|WEBAUTHN_RP_ORIGIN="https://app.novapass.io"|WEBAUTHN_RP_ORIGIN="http://localhost:3000"|' .env 2>/dev/null || echo "WEBAUTHN_RP_ID=\"localhost\"" >> .env

echo ""
echo "✅ Fixed .env file!"
echo ""
echo "Current database URL:"
grep SPRING_DATASOURCE_URL .env
echo ""
echo "To run:"
echo "  Terminal 1: cd backend && export \$(cat ../.env | grep -v '^#' | xargs) && mvn spring-boot:run"
echo "  Terminal 2: cd web-app && npm run dev"
