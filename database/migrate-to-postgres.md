# Migration Guide: Durable Objects → PostgreSQL

## Overview
This guide explains how to migrate from Durable Objects to PostgreSQL and import 100 seed data entries.

## Prerequisites

1. **PostgreSQL Database**:
   - Set up a PostgreSQL database (Neon, Supabase, Railway, etc.)
   - Get connection string

2. **Environment Variables**:
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   DATABASE_API_KEY=your-api-key  # If using HTTP wrapper
   ```

## Step 1: Create Database Schema

```bash
# Run the schema SQL file
psql $DATABASE_URL -f database/postgres-schema.sql
```

Or use your database provider's SQL editor to run `database/postgres-schema.sql`.

## Step 2: Generate and Import Seed Data

### Option A: Using TypeScript Script (Recommended)

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export DATABASE_API_KEY="your-api-key"  # If needed

# Run import script
bun run database/import-seed-data.ts
```

### Option B: Manual Import

1. Generate data:
   ```bash
   bun run -e "import { generateAllSeedData } from './database/generate-seed-data.ts'; console.log(JSON.stringify(generateAllSeedData(), null, 2))" > seed-data.json
   ```

2. Import using your database tool or custom script

## Step 3: Update Worker Configuration

Add to `wrangler.toml`:

```toml
[vars]
DATABASE_URL = "postgresql://user:pass@host:5432/dbname"
DATABASE_API_KEY = "your-api-key"  # If using HTTP wrapper
```

## Step 4: Enable PostgreSQL in Code

The migration is controlled by a feature flag in `worker/db/db-adapter.ts`:

```typescript
const USE_POSTGRES = true; // Set to true to use PostgreSQL
```

When `USE_POSTGRES` is `true` and `DATABASE_URL` is set, the system will use PostgreSQL. Otherwise, it falls back to Durable Objects.

## Step 5: Test Migration

1. **Start the worker**:
   ```bash
   bun dev
   ```

2. **Test endpoints**:
   - `GET /api/games` - Should return games from PostgreSQL
   - `GET /api/users/:id` - Should return user from PostgreSQL
   - `GET /api/friends` - Should return friends from PostgreSQL

3. **Verify data**:
   - Check that you see 100 games, 100 users, etc.
   - Verify relationships (reviews, forum posts, etc.)

## Step 6: Remove Durable Objects (Optional)

Once PostgreSQL is working correctly:

1. Set `USE_POSTGRES = true` permanently
2. Remove Durable Objects code:
   - `worker/entities.ts` (or keep as fallback)
   - Durable Object bindings from `wrangler.toml`
3. Update all routes to use `DatabaseAdapter` directly

## Data Summary

After import, you'll have:
- **100 users** with profiles and settings
- **100 games** with tags and metadata
- **500 reviews** (5 per game average)
- **200 forum posts** across games
- **500 forum replies**
- **200 workshop items**
- **300 friend relationships**
- **100 orders** with items

## Troubleshooting

### Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible from your network
- For HTTP wrappers, verify API key

### Import Errors
- Check foreign key constraints
- Verify all referenced IDs exist
- Check data types match schema

### Performance
- Ensure indexes are created (included in schema)
- Consider connection pooling
- Monitor query performance

## Rollback Plan

If issues occur:
1. Set `USE_POSTGRES = false` in `db-adapter.ts`
2. System will fall back to Durable Objects
3. Fix issues and try again

## Next Steps

1. **Monitor Performance**: Check query times and optimize as needed
2. **Add Caching**: Consider Redis for frequently accessed data
3. **Backup Strategy**: Set up regular database backups
4. **Scaling**: Plan for read replicas if needed

