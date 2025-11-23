# Database Migration Guide: Durable Objects → PostgreSQL

## Overview
This guide outlines the migration from Cloudflare Durable Objects to PostgreSQL for persistent data storage.

## Architecture Changes

### Current (Durable Objects)
- Data stored in Durable Objects (in-memory with persistence)
- Each entity type has its own Durable Object class
- Seed data on first access
- No relationships between entities

### Target (PostgreSQL)
- Relational database with proper foreign keys
- ACID transactions
- Complex queries and joins
- Better scalability
- Data persistence guaranteed

## Migration Steps

### 1. Set Up PostgreSQL Database

#### Option A: Neon (Serverless PostgreSQL)
```bash
# Install Neon CLI or use web interface
# Create database and get connection string
```

#### Option B: Supabase
```bash
# Create project at supabase.com
# Get connection string from project settings
```

#### Option C: Railway/Render
```bash
# Deploy PostgreSQL instance
# Get connection string
```

### 2. Run Schema Migration

```bash
# Run the schema SQL file
psql $DATABASE_URL -f database/postgres-schema.sql
```

### 3. Update Worker Configuration

Add PostgreSQL connection to `wrangler.toml` or environment variables:

```toml
[vars]
DATABASE_URL = "postgresql://user:pass@host:5432/dbname"
```

### 4. Create Database Service Layer

Create `worker/db/postgres-service.ts`:

```typescript
import { PostgresClient } from '../../database/postgres-connection';

export class PostgresService {
  private db: PostgresClient;
  
  constructor(env: Env) {
    this.db = new PostgresClient({
      url: env.DATABASE_URL,
      apiKey: env.DATABASE_API_KEY, // If using HTTP wrapper
    });
  }
  
  // User methods
  async getUser(id: string) {
    return this.db.queryOne(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
  }
  
  async updateUserStatus(id: string, status: string, gameSlug?: string) {
    return this.db.execute(
      'UPDATE users SET status = $1, current_game_slug = $2, last_seen = NOW() WHERE id = $3',
      [status, gameSlug, id]
    );
  }
  
  // Game methods
  async getGames(filters?: { tag?: string; search?: string; sort?: string }) {
    let query = 'SELECT g.*, 
      COALESCE(AVG(gr.rating), 0) as avg_rating,
      COUNT(gr.id) as review_count
      FROM games g
      LEFT JOIN game_reviews gr ON g.id = gr.game_id
      WHERE 1=1';
    const params: any[] = [];
    
    if (filters?.tag) {
      query += ' AND EXISTS (SELECT 1 FROM game_tags gt WHERE gt.game_id = g.id AND gt.tag = $' + (params.length + 1) + ')';
      params.push(filters.tag);
    }
    
    if (filters?.search) {
      query += ' AND (g.title ILIKE $' + (params.length + 1) + ' OR g.description ILIKE $' + (params.length + 1) + ')';
      params.push(`%${filters.search}%`);
    }
    
    query += ' GROUP BY g.id';
    
    if (filters?.sort === 'price-asc') {
      query += ' ORDER BY g.price ASC';
    } else if (filters?.sort === 'price-desc') {
      query += ' ORDER BY g.price DESC';
    } else if (filters?.sort === 'rating') {
      query += ' ORDER BY avg_rating DESC';
    } else {
      query += ' ORDER BY review_count DESC';
    }
    
    return this.db.query(query, params);
  }
  
  // Friend methods
  async getFriends(userId: string) {
    return this.db.query(
      `SELECT u.id, u.username, u.avatar_url as avatar, 
       f.status, f.current_game_slug as game
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1
       ORDER BY f.updated_at DESC`,
      [userId]
    );
  }
  
  async updateFriendStatus(friendId: string, status: string, gameSlug?: string) {
    return this.db.execute(
      'UPDATE friends SET status = $1, current_game_slug = $2, updated_at = NOW() WHERE friend_id = $3',
      [status, gameSlug, friendId]
    );
  }
  
  // Forum methods
  async getForumPosts(gameSlug: string) {
    return this.db.query(
      `SELECT p.*, u.username as author, u.avatar_url as author_avatar
       FROM forum_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.game_slug = $1
       ORDER BY p.pinned DESC, p.created_at DESC`,
      [gameSlug]
    );
  }
  
  // Workshop methods
  async getWorkshopItems(gameSlug: string, filters?: { type?: string; search?: string }) {
    let query = `SELECT w.*, u.username as author, u.avatar_url as author_avatar
       FROM workshop_items w
       JOIN users u ON w.user_id = u.id
       WHERE w.game_slug = $1`;
    const params: any[] = [gameSlug];
    
    if (filters?.type) {
      query += ' AND w.type = $' + (params.length + 1);
      params.push(filters.type);
    }
    
    if (filters?.search) {
      query += ' AND (w.title ILIKE $' + (params.length + 1) + ' OR w.description ILIKE $' + (params.length + 1) + ')';
      params.push(`%${filters.search}%`);
    }
    
    query += ' ORDER BY w.featured DESC, w.downloads DESC';
    
    return this.db.query(query, params);
  }
}
```

### 5. Update API Routes

Replace Durable Object calls with PostgreSQL queries:

```typescript
// Before (Durable Objects)
const game = new GameEntity(c.env, gameId);
const gameData = await game.getState();

// After (PostgreSQL)
const db = new PostgresService(c.env);
const gameData = await db.getGame(gameId);
```

### 6. Data Migration Script

Create `database/migrate-data.ts` to migrate existing data:

```typescript
// Script to migrate data from Durable Objects to PostgreSQL
// Run this once to transfer all existing data
```

## S3/R2 Setup for File Storage

### Cloudflare R2 (Recommended for Cloudflare Workers)

1. Create R2 bucket in Cloudflare dashboard
2. Add binding to `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "game-platform-assets"
```

3. Use in worker:
```typescript
async function uploadToR2(env: Env, key: string, file: ArrayBuffer) {
  await env.R2_BUCKET.put(key, file);
  return `https://pub-xxxxx.r2.dev/${key}`;
}
```

### AWS S3 (Alternative)

1. Create S3 bucket
2. Set up IAM user with S3 permissions
3. Use AWS SDK or REST API

## Environment Variables

Add to `.env` or `wrangler.toml`:

```toml
[vars]
DATABASE_URL = "postgresql://..."
DATABASE_API_KEY = "..." # If using HTTP wrapper
S3_ENDPOINT = "https://s3.amazonaws.com"
S3_BUCKET = "game-platform-assets"
S3_ACCESS_KEY = "..."
S3_SECRET_KEY = "..."
```

## Benefits of Migration

1. **Relational Data**: Proper foreign keys and relationships
2. **Complex Queries**: JOINs, aggregations, filtering
3. **Transactions**: ACID guarantees
4. **Scalability**: Better for large datasets
5. **Backup**: Easy database backups
6. **File Storage**: S3/R2 for images and files
7. **Real-time Updates**: Better support for status updates

## Rollback Plan

Keep Durable Objects code as fallback:
- Feature flag to switch between DO and PostgreSQL
- Gradual migration per entity type
- Dual-write during transition

