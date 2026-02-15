#!/bin/bash

echo "🚀 Starting NovaPass Backend..."

cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
