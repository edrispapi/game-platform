#!/bin/bash

# Start Game Platform Servers with Database Configuration

set -e

echo "=========================================="
echo "Starting Game Platform Servers"
echo "=========================================="

# Database configuration
export DATABASE_URL="postgresql://gameuser:gamepass123@localhost:5454/game_platform"
export API_PORT=8877

# Check if database container is running
if ! docker ps | grep -q game-platform-postgres; then
    echo "Starting database container..."
    docker start game-platform-postgres
    sleep 3
fi

echo "✅ Database: $DATABASE_URL"
echo "✅ API Port: $API_PORT"
echo ""

# Kill existing servers
echo "Stopping existing servers..."
pkill -f "bun.*api" 2>/dev/null || true
pkill -f "bun.*dev" 2>/dev/null || true
sleep 2

# Start API server
echo "Starting API server on port $API_PORT..."
cd "$(dirname "$0")"
DATABASE_URL="$DATABASE_URL" API_PORT=$API_PORT bun run api > /tmp/api-server.log 2>&1 &
API_PID=$!
echo "API server PID: $API_PID"

# Wait for API to start
sleep 3

# Test API health
if curl -s http://localhost:$API_PORT/api/health > /dev/null; then
    echo "✅ API server is running"
else
    echo "❌ API server failed to start. Check /tmp/api-server.log"
    exit 1
fi

# Start frontend
echo "Starting frontend on port 3001..."
VITE_API_PORT=$API_PORT PORT=3001 bun run dev > /tmp/frontend-server.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 3

echo ""
echo "=========================================="
echo "✅ Servers Started Successfully!"
echo "=========================================="
echo ""
echo "Frontend: http://localhost:3001"
echo "API: http://localhost:$API_PORT"
echo "API Proxy: http://localhost:3001/api"
echo ""
echo "To stop servers:"
echo "  pkill -f 'bun.*api'"
echo "  pkill -f 'bun.*dev'"
echo ""
echo "Logs:"
echo "  API: tail -f /tmp/api-server.log"
echo "  Frontend: tail -f /tmp/frontend-server.log"

