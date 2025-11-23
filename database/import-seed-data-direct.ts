// Import seed data into PostgreSQL using direct connection
// Run with: DATABASE_URL="postgresql://..." bun run database/import-seed-data-direct.ts

import { generateAllSeedData } from './generate-seed-data';
import { execSync } from 'child_process';

interface DatabaseConfig {
  url: string;
}

function executeSQL(sql: string, params: any[], config: DatabaseConfig): void {
  // Parse DATABASE_URL
  const urlMatch = config.url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!urlMatch) {
    throw new Error(`Invalid DATABASE_URL format: ${config.url}`);
  }
  
  const [, user, password, host, port, dbName] = urlMatch;
  
  // Replace $1, $2, etc. with actual values
  let finalSql = sql;
  params.forEach((param, index) => {
    const placeholder = `$${index + 1}`;
    let value: string;
    
    if (param === null || param === undefined) {
      value = 'NULL';
    } else if (typeof param === 'string') {
      // Escape single quotes and backslashes for PostgreSQL
      const escaped = param.replace(/\\/g, '\\\\').replace(/'/g, "''");
      value = `'${escaped}'`;
    } else if (typeof param === 'number' || typeof param === 'boolean') {
      value = String(param);
    } else if (param instanceof Date) {
      value = `'${param.toISOString()}'`;
    } else {
      value = `'${JSON.stringify(param).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
    }
    
    finalSql = finalSql.replace(new RegExp(`\\$${index + 1}\\b`, 'g'), value);
  });
  
  // Execute using docker exec for local databases
  if (host === 'localhost' || host === '127.0.0.1') {
    try {
      // Use PGPASSWORD environment variable to avoid password prompt
      execSync(
        `docker exec -e PGPASSWORD=${password} game-platform-postgres psql -U ${user} -d ${dbName} -c "${finalSql.replace(/"/g, '\\"')}"`,
        { stdio: 'pipe' }
      );
    } catch (error: any) {
      // Ignore errors for ON CONFLICT DO NOTHING
      if (!sql.includes('ON CONFLICT DO NOTHING')) {
        const errorMsg = error.stderr?.toString() || error.message || '';
        // Only throw if it's not a duplicate key error or foreign key constraint (user might not exist yet)
        if (!errorMsg.includes('duplicate key') && 
            !errorMsg.includes('already exists') &&
            !errorMsg.includes('violates foreign key constraint')) {
          console.error(`SQL Error: ${errorMsg}`);
          throw error;
        }
      }
    }
  } else {
    // For remote databases, use psql directly
    try {
      execSync(
        `PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${user} -d ${dbName} -c "${finalSql.replace(/"/g, '\\"')}"`,
        { stdio: 'pipe' }
      );
    } catch (error: any) {
      if (!sql.includes('ON CONFLICT DO NOTHING')) {
        const errorMsg = error.stderr?.toString() || error.message || '';
        if (!errorMsg.includes('duplicate key') && !errorMsg.includes('already exists')) {
          console.error(`SQL Error: ${errorMsg}`);
          throw error;
        }
      }
    }
  }
}

async function importData(config: DatabaseConfig) {
  console.log('Starting data import...\n');
  
  const data = generateAllSeedData();
  
  try {
    // Import Users
    console.log('Importing users...');
    for (const user of data.users) {
      executeSQL(
        `INSERT INTO users (id, username, email, bio, avatar_url, hours_played, achievements_count, friends_count, status, current_game_slug, last_seen, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.username, user.email, user.bio, user.avatar_url, user.hours_played, user.achievements_count, user.friends_count, user.status, user.current_game_slug, user.last_seen, user.created_at],
        config
      );
      
      // Insert user settings
      executeSQL(
        `INSERT INTO user_settings (user_id, profile_public, email_notifications)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, true, true],
        config
      );
    }
    console.log(`✅ Imported ${data.users.length} users\n`);
    
    // Import Games
    console.log('Importing games...');
    for (const game of data.games) {
      executeSQL(
        `INSERT INTO games (id, slug, title, description, price, cover_image_url, banner_image_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [game.id, game.slug, game.title, game.description, game.price, game.cover_image_url, game.banner_image_url, game.created_at],
        config
      );
      
      // Insert game tags
      for (const tag of game.tags) {
        executeSQL(
          `INSERT INTO game_tags (game_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [game.id, tag.tag],
          config
        );
      }
    }
    console.log(`✅ Imported ${data.games.length} games\n`);
    
    // Import Reviews
    console.log('Importing reviews...');
    for (const review of data.reviews) {
      executeSQL(
        `INSERT INTO game_reviews (id, game_id, user_id, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (game_id, user_id) DO NOTHING`,
        [review.id, review.game_id, review.user_id, review.rating, review.comment, review.created_at],
        config
      );
    }
    console.log(`✅ Imported ${data.reviews.length} reviews\n`);
    
    // Import Forum Posts
    console.log('Importing forum posts...');
    for (const post of data.forumPosts) {
      executeSQL(
        `INSERT INTO forum_posts (id, game_slug, user_id, title, content, views, likes, replies_count, pinned, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [post.id, post.game_slug, post.user_id, post.title, post.content, post.views, post.likes, post.replies_count, post.pinned, post.created_at],
        config
      );
    }
    console.log(`✅ Imported ${data.forumPosts.length} forum posts\n`);
    
    // Import Forum Replies
    console.log('Importing forum replies...');
    for (const reply of data.forumReplies) {
      executeSQL(
        `INSERT INTO forum_replies (id, post_id, user_id, content, likes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [reply.id, reply.post_id, reply.user_id, reply.content, reply.likes, reply.created_at],
        config
      );
    }
    console.log(`✅ Imported ${data.forumReplies.length} forum replies\n`);
    
    // Import Workshop Items
    console.log('Importing workshop items...');
    for (const item of data.workshopItems) {
      executeSQL(
        `INSERT INTO workshop_items (id, game_slug, user_id, title, description, type, image_url, file_url, downloads, rating, featured, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [item.id, item.game_slug, item.user_id, item.title, item.description, item.type, item.image_url, item.file_url, item.downloads, item.rating, item.featured, item.created_at],
        config
      );
    }
    console.log(`✅ Imported ${data.workshopItems.length} workshop items\n`);
    
    // Import Friends
    console.log('Importing friends...');
    for (const friend of data.friends) {
      executeSQL(
        `INSERT INTO friends (id, user_id, friend_id, status, current_game_slug, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, friend_id) DO NOTHING`,
        [friend.id, friend.user_id, friend.friend_id, friend.status, friend.current_game_slug, friend.created_at],
        config
      );
    }
    console.log(`✅ Imported ${data.friends.length} friend relationships\n`);
    
    // Import Orders
    console.log('Importing orders...');
    for (const order of data.orders) {
      executeSQL(
        `INSERT INTO orders (id, user_id, total, status, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [order.id, order.user_id, order.total, order.status, order.created_at],
        config
      );
      
      // Insert order items
      for (const item of order.items) {
        executeSQL(
          `INSERT INTO order_items (id, order_id, game_id, title, price, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [item.id, order.id, item.game_id, item.title, item.price, item.quantity],
          config
        );
      }
    }
    console.log(`✅ Imported ${data.orders.length} orders\n`);
    
    console.log('✅ Data import completed successfully!');
    console.log('\nSummary:');
    console.log(`- ${data.users.length} users`);
    console.log(`- ${data.games.length} games`);
    console.log(`- ${data.reviews.length} reviews`);
    console.log(`- ${data.forumPosts.length} forum posts`);
    console.log(`- ${data.forumReplies.length} forum replies`);
    console.log(`- ${data.workshopItems.length} workshop items`);
    console.log(`- ${data.friends.length} friend relationships`);
    console.log(`- ${data.orders.length} orders`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.main) {
  const config: DatabaseConfig = {
    url: process.env.DATABASE_URL || '',
  };
  
  if (!config.url) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.log('Usage: DATABASE_URL=postgresql://... bun run database/import-seed-data-direct.ts');
    process.exit(1);
  }
  
  importData(config).catch(console.error);
}

export { importData };

