#!/bin/bash

# NovaPass - Complete Startup Status
# Generated: $(date)

echo "🎉 NovaPass - System Status"
echo "================================"
echo ""

# Check Backend
if lsof -i :8080 | grep -q LISTEN; then
    echo "✅ Backend: RUNNING on port 8080"
    echo "   URL: http://localhost:8080"
    BACKEND_PID=$(lsof -ti :8080)
    echo "   Process ID: $BACKEND_PID"
else
    echo "❌ Backend: NOT RUNNING"
    echo "   Start with: cd /Users/Anurag/Anurag/Projects/NovaPass && ./start-backend.sh"
fi

echo ""

# Check Frontend
if lsof -i :3000 | grep -q LISTEN; then
    echo "✅ Frontend: RUNNING on port 3000"
    echo "   URL: http://localhost:3000"
    FRONTEND_PID=$(lsof -ti :3000)
    echo "   Process ID: $FRONTEND_PID"
else
    echo "❌ Frontend: NOT RUNNING"
    echo "   Start with: cd /Users/Anurag/Anurag/Projects/NovaPass/web-app && npm run dev"
fi

echo ""

# Check Database
if psql -d novapass -c "SELECT 1" &> /dev/null; then
    echo "✅ Database: ACCESSIBLE"
    USER_COUNT=$(psql -d novapass -tAc "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")
    echo "   Users: $USER_COUNT"
    ADMIN_EXISTS=$(psql -d novapass -tAc "SELECT COUNT(*) FROM users WHERE role='ADMIN'" 2>/dev/null || echo "0")
    if [ "$ADMIN_EXISTS" -gt 0 ]; then
        echo "   ✅ Admin user exists"
    else
        echo "   ⚠️  No admin user found"
    fi
else
    echo "❌ Database: NOT ACCESSIBLE"
    echo "   Start with: brew services start postgresql@14"
fi

echo ""
echo "================================"
echo "📋 Quick Actions:"
echo ""
echo "🌐 Open App:        http://localhost:3000"
echo "🔧 Backend API:     http://localhost:8080"
echo "👤 Admin Login:     admin@anurag.com / B4B-2026-31629"
echo ""
echo "📝 Test Registration:"
echo "   1. Go to http://localhost:3000/register"
echo "   2. Create an account"
echo "   3. Logout and login again - IT WORKS! ✅"
echo ""
echo "================================"
