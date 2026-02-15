#!/bin/bash

echo "🚀 Setting up NovaPass..."

# Check Java installation
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install Java 17 or higher."
    exit 1
fi

# Check Maven installation
if ! command -v mvn &> /dev/null; then
    echo "❌ Maven is not installed. Please install Maven 3.8+."
    exit 1
fi

echo "✅ Java and Maven are installed"

# Install dependencies
echo "📦 Installing dependencies..."
mvn clean install -DskipTests

echo "✅ Setup complete!"
echo ""
echo "To run the backend: ./scripts/run-backend.sh"
echo "To run the desktop client: ./scripts/run-client.sh"
echo "To run with Docker: docker-compose -f docker/docker-compose.yml up"
