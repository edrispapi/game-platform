// Populate missing game details (screenshots, videos, requirements)
// Run with: DATABASE_URL="postgresql://..." bun run database/populate-missing-game-details.ts

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

const DEFAULT_SCREENSHOTS = [
  'https://cdn.mobygames.com/screenshots/120/721925-monster-hunter-world-windows.jpg',
  'https://cdn.mobygames.com/screenshots/120/656607-the-witcher-3-wild-hunt-windows.jpg',
  'https://cdn.mobygames.com/screenshots/18227866-elden-ring-windows-a-lot-of-great-views-to-take-in.jpg',
  'https://cdn.mobygames.com/screenshots/192/997001-baldurs-gate-3-windows.jpg',
  'https://cdn.mobygames.com/screenshots/120/730339-hades-windows.jpg',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800',
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800',
];

const DEFAULT_VIDEOS = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
];

const DEFAULT_REQUIREMENTS = {
  os: 'Windows 10 64-bit',
  processor: 'Intel Core i5-8400 / AMD Ryzen 5 2600',
  memory: '8 GB RAM',
  graphics: 'NVIDIA GTX 1060 6GB / AMD RX 580 8GB',
  storage: '50 GB available space',
};

async function populateMissingDetails() {
  const env = resolveEnv();
  const db = new PostgresService(env);

  console.log('Populating missing game details...\n');

  // Get all games
  const games = await db.query<{ id: string; slug: string; title: string }>(
    'SELECT id, slug, title FROM games ORDER BY title'
  );

  let updated = 0;
  const errors: string[] = [];

  for (const game of games) {
    try {
      // Check screenshots
      const screenshotCount = await db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM game_screenshots WHERE game_id = $1',
        [game.id]
      );

      if (screenshotCount?.count === 0) {
        // Add 3-5 random screenshots
        const numScreenshots = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < numScreenshots; i++) {
          const screenshotUrl = DEFAULT_SCREENSHOTS[Math.floor(Math.random() * DEFAULT_SCREENSHOTS.length)];
          await db.execute(
            'INSERT INTO game_screenshots (id, game_id, url, order_index) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [crypto.randomUUID(), game.id, screenshotUrl, i]
          );
        }
        console.log(`✅ Added screenshots for ${game.title}`);
      }

      // Check videos
      const videoCount = await db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM game_videos WHERE game_id = $1',
        [game.id]
      );

      if (videoCount?.count === 0) {
        // Add 1-2 videos
        const numVideos = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numVideos; i++) {
          const videoUrl = DEFAULT_VIDEOS[Math.floor(Math.random() * DEFAULT_VIDEOS.length)];
          await db.execute(
            'INSERT INTO game_videos (id, game_id, url) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [crypto.randomUUID(), game.id, videoUrl]
          );
        }
        console.log(`✅ Added videos for ${game.title}`);
      }

      // Check requirements
      const requirements = await db.queryOne<{ game_id: string }>(
        'SELECT game_id FROM game_requirements WHERE game_id = $1',
        [game.id]
      );

      if (!requirements) {
        await db.execute(
          `INSERT INTO game_requirements (game_id, os, processor, memory, graphics, storage)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (game_id) DO NOTHING`,
          [
            game.id,
            DEFAULT_REQUIREMENTS.os,
            DEFAULT_REQUIREMENTS.processor,
            DEFAULT_REQUIREMENTS.memory,
            DEFAULT_REQUIREMENTS.graphics,
            DEFAULT_REQUIREMENTS.storage,
          ]
        );
        console.log(`✅ Added requirements for ${game.title}`);
      }

      updated++;
    } catch (error: any) {
      const errorMsg = `Failed to update ${game.title}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log('\n==========================================');
  console.log('Game Details Population Complete!');
  console.log('==========================================');
  console.log(`✅ Updated: ${updated} games`);
  console.log(`📦 Total games: ${games.length}`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
  }
}

populateMissingDetails().catch(console.error);

