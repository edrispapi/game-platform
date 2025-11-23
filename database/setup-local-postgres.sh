#!/bin/bash

# Local PostgreSQL Setup with Docker
# This script creates a local PostgreSQL database using Docker

set -e

echo "=== Local PostgreSQL Setup with Docker ==="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo "✅ Docker is available and running"
echo ""

# Database configuration
DB_NAME="game_platform"
DB_USER="gameuser"
DB_PASSWORD="gamepass123"
DB_PORT="5432"
CONTAINER_NAME="game-platform-postgres"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "⚠️  Container ${CONTAINER_NAME} already exists"
    read -p "Do you want to remove it and create a new one? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping and removing existing container..."
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
    else
        echo "Using existing container..."
        docker start ${CONTAINER_NAME} 2>/dev/null || true
        DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
        export DATABASE_URL
        echo ""
        echo "✅ Using existing database"
        echo "DATABASE_URL=${DATABASE_URL}"
        echo ""
        echo "Run the setup script:"
        echo "  ./database/setup-postgres.sh"
        exit 0
    fi
fi

# Create PostgreSQL container
echo "Creating PostgreSQL container..."
docker run -d \
  --name ${CONTAINER_NAME} \
  -e POSTGRES_DB=${DB_NAME} \
  -e POSTGRES_USER=${DB_USER} \
  -e POSTGRES_PASSWORD=${DB_PASSWORD} \
  -p ${DB_PORT}:5432 \
  -v game-platform-postgres-data:/var/lib/postgresql/data \
  postgres:15-alpine

echo "Waiting for PostgreSQL to start..."
sleep 5

# Wait for PostgreSQL to be ready
until docker exec ${CONTAINER_NAME} pg_isready -U ${DB_USER} > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 1
done

echo "✅ PostgreSQL container is running"
echo ""

# Set DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
export DATABASE_URL

echo "=== Database Created ==="
echo ""
echo "Container: ${CONTAINER_NAME}"
echo "Database: ${DB_NAME}"
echo "User: ${DB_USER}"
echo "Password: ${DB_PASSWORD}"
echo "Port: ${DB_PORT}"
echo ""
echo "DATABASE_URL=${DATABASE_URL}"
echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Create the schema:"
echo "   psql \$DATABASE_URL -f database/postgres-schema.sql"
echo ""
echo "2. Import seed data:"
echo "   DATABASE_URL=\"${DATABASE_URL}\" bun run database/import-seed-data.ts"
echo ""
echo "3. Enable PostgreSQL in code:"
echo "   Edit worker/db/db-adapter.ts and set USE_POSTGRES = true"
echo ""
echo "Or run the automated setup:"
echo "   DATABASE_URL=\"${DATABASE_URL}\" ./database/setup-postgres.sh"
echo ""
echo "=== Useful Commands ==="
echo ""
echo "Stop database:"
echo "  docker stop ${CONTAINER_NAME}"
echo ""
echo "Start database:"
echo "  docker start ${CONTAINER_NAME}"
echo ""
echo "View logs:"
echo "  docker logs ${CONTAINER_NAME}"
echo ""
echo "Connect to database:"
echo "  psql \$DATABASE_URL"
echo ""
echo "Remove database (WARNING: deletes all data):"
echo "  docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME} && docker volume rm game-platform-postgres-data"

