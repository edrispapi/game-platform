# Quick PostgreSQL Setup Guide

## Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
./database/setup-postgres.sh
```

The script will:
1. Check for DATABASE_URL
2. Create the database schema
3. Import 100 seed games and all related data
4. Enable PostgreSQL in code
5. Configure wrangler.toml

## Option 2: Manual Setup

### 1. Get PostgreSQL Database

Choose a provider:
- **Neon** (Recommended): https://neon.tech - Free tier available
- **Supabase**: https://supabase.com - Free tier available
- **Railway**: https://railway.app
- **Render**: https://render.com

### 2. Set DATABASE_URL

For standard PostgreSQL:
```bash
export DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

For Neon HTTP API:
```bash
export DATABASE_URL="https://your-project.neon.tech"
export DATABASE_API_KEY="your-api-key"
```

### 3. Create Schema

```bash
psql $DATABASE_URL -f database/postgres-schema.sql
```

Or use your provider's SQL editor to paste the contents of `database/postgres-schema.sql`.

### 4. Import Seed Data

```bash
bun run database/import-seed-data.ts
```

This creates:
- 100 users
- 100 games
- 500 reviews
- 200 forum posts
- 500 forum replies
- 200 workshop items
- 300 friend relationships
- 100 orders

### 5. Enable PostgreSQL

Edit `worker/db/db-adapter.ts`:
```typescript
const USE_POSTGRES = true; // Change from false to true
```

### 6. Configure Worker

Add to `wrangler.toml`:
```toml
[vars]
DATABASE_URL = "postgresql://..."
```

Or use secrets (recommended for production):
```bash
wrangler secret put DATABASE_URL
```

### 7. Test

```bash
# Start dev server
bun dev

# Test API
curl http://localhost:8787/api/games | jq '.data.items | length'
# Should return 100
```

## Troubleshooting

### Import Script Fails

If using HTTP-based API (Neon, Supabase), the import script may need adjustment. Check:
1. DATABASE_URL format (should be HTTP endpoint)
2. DATABASE_API_KEY is set (if required)
3. API endpoint supports batch inserts

### Connection Issues

- Verify DATABASE_URL is correct
- Check database is accessible from your network
- For Cloudflare Workers, ensure database allows connections from Cloudflare IPs

### Schema Errors

- Make sure you're using PostgreSQL 12+ 
- Check all extensions are available (uuid-ossp)
- Verify user has CREATE TABLE permissions

## Next Steps

After setup:
1. ✅ Verify games load in the store page
2. ✅ Test user search functionality
3. ✅ Check forum posts display
4. ✅ Verify workshop items load

Your platform now has 100 games with full data! 🎮

