# PostgreSQL Setup Commands

## Quick Start Commands

### Option 1: Local PostgreSQL with Docker (Recommended for Development)

```bash
# 1. Create local PostgreSQL database
./database/setup-local-postgres.sh

# 2. Run automated setup (creates schema + imports data)
DATABASE_URL="postgresql://gameuser:gamepass123@localhost:5432/game_platform" ./database/setup-postgres.sh

# 3. Enable PostgreSQL in code
sed -i 's/const USE_POSTGRES = false/const USE_POSTGRES = true/' worker/db/db-adapter.ts

# 4. Start the platform
bun dev
```

### Option 2: Cloud PostgreSQL (Neon, Supabase, etc.)

```bash
# 1. Get DATABASE_URL from your provider
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 2. Run automated setup
./database/setup-postgres.sh

# 3. Enable PostgreSQL in code
sed -i 's/const USE_POSTGRES = false/const USE_POSTGRES = true/' worker/db/db-adapter.ts

# 4. Start the platform
bun dev
```

## Manual Step-by-Step Commands

### Step 1: Create Database

**Local with Docker:**
```bash
./database/setup-local-postgres.sh
```

**Or manually:**
```bash
docker run -d \
  --name game-platform-postgres \
  -e POSTGRES_DB=game_platform \
  -e POSTGRES_USER=gameuser \
  -e POSTGRES_PASSWORD=gamepass123 \
  -p 5432:5432 \
  -v game-platform-postgres-data:/var/lib/postgresql/data \
  postgres:15-alpine
```

**Cloud Provider:**
- Create database at Neon, Supabase, Railway, etc.
- Copy connection string

### Step 2: Set DATABASE_URL

```bash
# Local
export DATABASE_URL="postgresql://gameuser:gamepass123@localhost:5432/game_platform"

# Cloud (replace with your actual connection string)
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

### Step 3: Create Schema

```bash
psql $DATABASE_URL -f database/postgres-schema.sql
```

### Step 4: Import Seed Data

```bash
bun run database/import-seed-data.ts
```

### Step 5: Enable PostgreSQL

```bash
# Linux/Mac
sed -i 's/const USE_POSTGRES = false/const USE_POSTGRES = true/' worker/db/db-adapter.ts

# Or manually edit worker/db/db-adapter.ts
# Change: const USE_POSTGRES = false
# To:     const USE_POSTGRES = true
```

### Step 6: Start Platform

```bash
bun dev
```

## Docker Commands Reference

```bash
# Start database
docker start game-platform-postgres

# Stop database
docker stop game-platform-postgres

# View logs
docker logs game-platform-postgres

# Connect to database
psql $DATABASE_URL

# Remove database (WARNING: deletes all data)
docker stop game-platform-postgres
docker rm game-platform-postgres
docker volume rm game-platform-postgres-data
```

## Verification Commands

```bash
# Check if database is running
docker ps | grep game-platform-postgres

# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Count games (should be 100 after import)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM games;"

# Count users (should be 100 after import)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Test API
curl http://localhost:8787/api/games | jq '.data.items | length'
```

## Troubleshooting

### Database connection fails
```bash
# Check if container is running
docker ps | grep postgres

# Check logs
docker logs game-platform-postgres

# Restart container
docker restart game-platform-postgres
```

### Import script fails
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check if schema exists
psql $DATABASE_URL -c "\dt"
```

### Port already in use
```bash
# Find what's using port 5432
lsof -i :5432

# Use different port
docker run -p 5433:5432 ...
export DATABASE_URL="postgresql://gameuser:gamepass123@localhost:5433/game_platform"
```

