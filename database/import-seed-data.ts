// Import seed data into PostgreSQL
// Run with: bun run database/import-seed-data.ts

import { generateAllSeedData } from './generate-seed-data';

interface DatabaseConfig {
  url: string;
  apiKey?: string;
}

async function executeSQL(sql: string, params: any[], config: DatabaseConfig): Promise<any> {
  // For Neon HTTP API or similar
  const response = await fetch(`${config.url}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
    },
    body: JSON.stringify({ query: sql, params }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Database query failed: ${error}`);
  }
  
  return response.json();
}

async function importData(config: DatabaseConfig) {
  console.log('Starting data import...\n');
  
  const data = generateAllSeedData();
  
  try {
    // Import Users
    console.log('Importing users...');
    for (const user of data.users) {
      await executeSQL(
        `INSERT INTO users (id, username, email, bio, avatar_url, hours_played, achievements_count, friends_count, status, current_game_slug, last_seen, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.username, user.email, user.bio, user.avatar_url, user.hours_played, user.achievements_count, user.friends_count, user.status, user.current_game_slug, user.last_seen, user.created_at],
        config
      );
      
      // Insert user settings
      await executeSQL(
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
      await executeSQL(
        `INSERT INTO games (id, slug, title, description, price, cover_image_url, banner_image_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [game.id, game.slug, game.title, game.description, game.price, game.cover_image_url, game.banner_image_url, game.created_at],
        config
      );
      
      // Insert game tags
      for (const tag of game.tags) {
        await executeSQL(
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
      await executeSQL(
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
      await executeSQL(
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
      await executeSQL(
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
      await executeSQL(
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
      await executeSQL(
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
      await executeSQL(
        `INSERT INTO orders (id, user_id, total, status, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [order.id, order.user_id, order.total, order.status, order.created_at],
        config
      );
      
      // Insert order items
      for (const item of order.items) {
        await executeSQL(
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
    apiKey: process.env.DATABASE_API_KEY,
  };
  
  if (!config.url) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.log('Usage: DATABASE_URL=postgresql://... bun run database/import-seed-data.ts');
    process.exit(1);
  }
  
  importData(config).catch(console.error);
}

export { importData };

