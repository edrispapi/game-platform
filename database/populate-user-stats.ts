// Populate user stats (hours played, achievements, friends) for testing
// Run with: DATABASE_URL="postgresql://..." bun run database/populate-user-stats.ts

import { PostgresService } from '../worker/db/postgres-service';
import type { DatabaseEnv } from '../worker/db/types';

function resolveEnv(partial?: DatabaseEnv): Required<Pick<DatabaseEnv, 'DATABASE_URL'>> & DatabaseEnv {
  const DATABASE_URL = partial?.DATABASE_URL || process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  return {
    DATABASE_URL,
    DATABASE_API_KEY: partial?.DATABASE_API_KEY || process.env.DATABASE_API_KEY,
    DEFAULT_USER_ID: partial?.DEFAULT_USER_ID || process.env.DEFAULT_USER_ID,
  };
}

async function populateUserStats() {
  const env = resolveEnv();
  const db = new PostgresService(env);

  console.log('Populating user stats...\n');

  // Get all users
  const users = await db.query<{ id: string; username: string }>('SELECT id, username FROM users ORDER BY created_at ASC');

  if (users.length === 0) {
    console.log('No users found in database.');
    return;
  }

  let updated = 0;

  for (const user of users) {
    try {
      // Add some playtime hours by genre
      const genres = ['Action', 'RPG', 'Strategy', 'Indie', 'Shooter', 'Adventure'];
      for (const genre of genres) {
        const hours = Math.floor(Math.random() * 50) + 10; // 10-60 hours per genre
        await db.execute(
          `INSERT INTO user_playtime_by_genre (user_id, genre, hours)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, genre) DO UPDATE SET hours = EXCLUDED.hours`,
          [user.id, genre, hours]
        );
      }

      // Add some achievements
      const achievements = await db.query<{ id: string }>('SELECT id FROM achievements LIMIT 5');
      for (const achievement of achievements) {
        await db.execute(
          `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id, achievement_id) DO NOTHING`,
          [user.id, achievement.id]
        );
      }

      // Create some friend relationships (only for first few users to avoid duplicates)
      if (users.indexOf(user) < Math.min(5, users.length)) {
        const otherUsers = users.filter(u => u.id !== user.id).slice(0, 3);
        for (const friend of otherUsers) {
          // Check if friendship already exists
          const existing = await db.queryOne<{ id: string }>(
            'SELECT id FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
            [user.id, friend.id]
          );
          if (!existing) {
            await db.execute(
              `INSERT INTO friends (user_id, friend_id, status)
               VALUES ($1, $2, 'Offline')
               ON CONFLICT DO NOTHING`,
              [user.id, friend.id]
            );
          }
        }
      }

      updated++;
      console.log(`✅ ${user.username}: Added stats`);
    } catch (error: any) {
      console.error(`❌ Failed for ${user.username}: ${error.message}`);
    }
  }

  console.log('\n==========================================');
  console.log('User Stats Population Complete!');
  console.log('==========================================');
  console.log(`✅ Updated: ${updated} users`);
  console.log(`📊 Each user now has:`);
  console.log(`   - Hours played across genres`);
  console.log(`   - Achievements unlocked`);
  console.log(`   - Friend connections`);
}

populateUserStats().catch(console.error);

