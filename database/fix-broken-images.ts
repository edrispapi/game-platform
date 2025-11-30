// Fix broken image URLs by using YouTube thumbnails as fallbacks
// Run with: DATABASE_URL="postgresql://..." bun run database/fix-broken-images.ts

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

function getYoutubeThumbnail(videoUrl: string): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (match) {
    return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
  }
  return null;
}

async function fixBrokenImages() {
  const env = resolveEnv();
  const db = new PostgresService(env);

  console.log('Checking for broken images and updating with YouTube thumbnails...\n');

  // Get all games with screenshots and videos
  const games = await db.query<{
    id: string;
    slug: string;
    title: string;
    screenshot_url: string;
    video_url: string;
  }>(
    `SELECT DISTINCT 
      g.id, g.slug, g.title,
      gs.url as screenshot_url,
      gv.url as video_url
    FROM games g
    LEFT JOIN game_screenshots gs ON gs.game_id = g.id
    LEFT JOIN game_videos gv ON gv.game_id = g.id AND gv.type = 'trailer'
    WHERE gs.url IS NOT NULL OR gv.url IS NOT NULL
    ORDER BY g.title`
  );

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const game of games) {
    if (!game.screenshot_url && game.video_url) {
      // If screenshot is missing but video exists, add YouTube thumbnail
      const thumbnail = getYoutubeThumbnail(game.video_url);
      if (thumbnail) {
        try {
          // Check if thumbnail screenshot already exists
          const existing = await db.queryOne<{ id: string }>(
            'SELECT id FROM game_screenshots WHERE game_id = $1 AND url = $2',
            [game.id, thumbnail]
          );

          if (!existing) {
            await db.execute(
              'INSERT INTO game_screenshots (game_id, url, order_index) VALUES ($1, $2, $3)',
              [game.id, thumbnail, 0]
            );
            console.log(`✅ ${game.title}: Added YouTube thumbnail as screenshot`);
            updated++;
          }
        } catch (error: any) {
          const errorMsg = `Failed to update ${game.title}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    } else {
      skipped++;
    }
  }

  console.log('\n==========================================');
  console.log('Fix Complete!');
  console.log('==========================================');
  console.log(`✅ Updated: ${updated} games`);
  console.log(`⚠️  Skipped: ${skipped} games`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.forEach(err => console.log(`   - ${err}`));
  }
}

fixBrokenImages().catch(console.error);

