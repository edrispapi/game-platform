# Database Connection Information

## Local PostgreSQL Database

**Connection Details:**
- **Host:** localhost
- **Port:** 5454
- **Database:** game_platform
- **User:** gameuser
- **Password:** gamepass123

**DATABASE_URL:**
```
postgresql://gameuser:gamepass123@localhost:5454/game_platform
```

## Docker Commands

**Start database:**
```bash
docker start game-platform-postgres
```

**Stop database:**
```bash
docker stop game-platform-postgres
```

**View logs:**
```bash
docker logs game-platform-postgres
```

**Connect to database:**
```bash
psql postgresql://gameuser:gamepass123@localhost:5454/game_platform
```

**Or using docker:**
```bash
docker exec -it game-platform-postgres psql -U gameuser -d game_platform
```

## Verify Data

**Count games (should be 100):**
```bash
docker exec game-platform-postgres psql -U gameuser -d game_platform -c "SELECT COUNT(*) FROM games;"
```

**Count users (should be 100):**
```bash
docker exec game-platform-postgres psql -U gameuser -d game_platform -c "SELECT COUNT(*) FROM users;"
```

**List all tables:**
```bash
docker exec game-platform-postgres psql -U gameuser -d game_platform -c "\dt"
```

## Environment Variable

Add to your shell or `.env` file:
```bash
export DATABASE_URL="postgresql://gameuser:gamepass123@localhost:5454/game_platform"
```

Or add to `wrangler.toml`:
```toml
[vars]
DATABASE_URL = "postgresql://gameuser:gamepass123@localhost:5454/game_platform"
```

## Data Summary

After import, the database contains:
- ✅ 100 games
- ✅ 100 users
- ✅ 500 reviews
- ✅ 200 forum posts
- ✅ 500 forum replies
- ✅ 200 workshop items
- ✅ 300 friend relationships
- ✅ 100 orders

