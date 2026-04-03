#!/bin/bash
set -e

export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null) || {
  echo "Java 17 not found. Install from https://adoptium.net"
  exit 1
}

cd "$(dirname "$0")/../backend"

# Load .env from project root if present
[ -f "../.env" ] && export $(grep -v '^#' ../.env | grep -v '^$' | xargs)

echo "Starting backend on http://localhost:8080 ..."
mvn spring-boot:run
