# Database Migration and Seed Data

## Quick Start

### 1. Set up PostgreSQL Database

Choose a provider:
- **Neon** (Recommended): https://neon.tech
- **Supabase**: https://supabase.com
- **Railway**: https://railway.app
- **Render**: https://render.com

Get your connection string: `postgresql://user:pass@host:5432/dbname`

### 2. Create Schema

```bash
psql $DATABASE_URL -f database/postgres-schema.sql
```

Or use your database provider's SQL editor.

### 3. Generate and Import Seed Data

```bash
# Set environment variable
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Run import script
bun run database/import-seed-data.ts
```

This will create:
- 100 users
- 100 games
- 500 reviews
- 200 forum posts
- 500 forum replies
- 200 workshop items
- 300 friend relationships
- 100 orders

### 4. Enable PostgreSQL in Code

Edit `worker/db/db-adapter.ts`:

```typescript
const USE_POSTGRES = true; // Enable PostgreSQL
```

### 5. Configure Worker

Add to `wrangler.toml`:

```toml
[vars]
DATABASE_URL = "postgresql://user:pass@host:5432/dbname"
DATABASE_API_KEY = "your-api-key"  # If using HTTP wrapper
```

## Files

- `postgres-schema.sql` - Complete database schema
- `generate-seed-data.ts` - Generates 100+ seed data entries
- `import-seed-data.ts` - Imports data into PostgreSQL
- `postgres-connection.ts` - Database connection utilities
- `postgres-service.ts` - PostgreSQL service layer
- `migrate-to-postgres.md` - Detailed migration guide

## Testing

After import, test the API:

```bash
# Start the worker
bun dev

# Test endpoints
curl http://localhost:8787/api/games
curl http://localhost:8787/api/users/search?q=test
curl http://localhost:8787/api/friends
```

## Troubleshooting

See `migrate-to-postgres.md` for detailed troubleshooting.

