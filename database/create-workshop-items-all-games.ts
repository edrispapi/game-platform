// Create workshop items for all games with diverse content types
// Run with: DATABASE_URL="postgresql://..." bun run database/create-workshop-items-all-games.ts

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

const WORKSHOP_ITEMS = [
  // Mods
  { type: 'mod', title: 'Enhanced Graphics Mod', description: 'Improves textures, lighting, and overall visual quality. Compatible with all DLCs.', tags: ['Graphics', 'Visual', 'Enhancement'] },
  { type: 'mod', title: 'Ultra Performance Pack', description: 'Optimizes game performance for lower-end systems while maintaining visual quality.', tags: ['Performance', 'Optimization'] },
  { type: 'mod', title: 'Quality of Life Improvements', description: 'Adds convenient features and UI improvements for better gameplay experience.', tags: ['QoL', 'UI', 'Convenience'] },
  { type: 'mod', title: 'Hardcore Difficulty Mod', description: 'Increases challenge with enhanced AI, limited resources, and permadeath mode.', tags: ['Difficulty', 'Challenge', 'Hardcore'] },
  { type: 'mod', title: 'New Game Plus Expansion', description: 'Adds new game plus mode with enhanced enemies and exclusive rewards.', tags: ['Gameplay', 'NG+', 'Content'] },
  
  // Skins
  { type: 'skin', title: 'Neon City Skin Pack', description: 'A collection of vibrant neon-themed skins for weapons and vehicles.', tags: ['Cosmetic', 'Neon', 'Collection'] },
  { type: 'skin', title: 'Retro Pixel Art Pack', description: 'Classic pixel art style skins for a nostalgic gaming experience.', tags: ['Retro', 'Pixel', 'Nostalgia'] },
  { type: 'skin', title: 'Dark Fantasy Collection', description: 'Gothic and dark fantasy themed skins with intricate designs.', tags: ['Dark', 'Fantasy', 'Gothic'] },
  { type: 'skin', title: 'Cyberpunk Aesthetic Pack', description: 'Futuristic cyberpunk-themed skins with glowing accents.', tags: ['Cyberpunk', 'Futuristic', 'Glow'] },
  { type: 'skin', title: 'Nature & Wildlife Pack', description: 'Organic nature-inspired skins with animal and plant motifs.', tags: ['Nature', 'Wildlife', 'Organic'] },
  
  // Maps
  { type: 'map', title: 'Custom Arena Map', description: 'A competitive multiplayer arena with multiple levels and strategic positions.', tags: ['Arena', 'Multiplayer', 'Competitive'] },
  { type: 'map', title: 'Exploration Paradise', description: 'Massive open world map with hidden secrets and beautiful landscapes.', tags: ['Exploration', 'Open World', 'Secrets'] },
  { type: 'map', title: 'Survival Challenge Zone', description: 'Intense survival map with limited resources and dangerous enemies.', tags: ['Survival', 'Challenge', 'Intense'] },
  { type: 'map', title: 'Racing Circuit', description: 'High-speed racing track with multiple routes and obstacles.', tags: ['Racing', 'Speed', 'Track'] },
  { type: 'map', title: 'Puzzle Dungeon', description: 'Complex puzzle-based dungeon with multiple solutions and rewards.', tags: ['Puzzle', 'Dungeon', 'Brain Teaser'] },
  
  // Tools
  { type: 'tool', title: 'Save Game Editor', description: 'Advanced save game editor with multiple customization options.', tags: ['Editor', 'Save', 'Customization'] },
  { type: 'tool', title: 'Resource Manager', description: 'Manage and organize game resources efficiently.', tags: ['Management', 'Resources', 'Organization'] },
  { type: 'tool', title: 'Performance Monitor', description: 'Real-time performance monitoring and optimization suggestions.', tags: ['Performance', 'Monitor', 'Optimization'] },
  { type: 'tool', title: 'Asset Extractor', description: 'Extract and convert game assets for modding purposes.', tags: ['Extraction', 'Assets', 'Modding'] },
  { type: 'tool', title: 'Config Generator', description: 'Generate optimized configuration files for your setup.', tags: ['Config', 'Generator', 'Setup'] },
];

const IMAGE_URLS = [
  'https://cdn.mobygames.com/screenshots/120/721925-monster-hunter-world-windows.jpg',
  'https://cdn.mobygames.com/screenshots/120/656607-the-witcher-3-wild-hunt-windows.jpg',
  'https://cdn.mobygames.com/screenshots/18227866-elden-ring-windows-a-lot-of-great-views-to-take-in.jpg',
  'https://cdn.mobygames.com/screenshots/192/997001-baldurs-gate-3-windows.jpg',
  'https://cdn.mobygames.com/screenshots/120/730339-hades-windows.jpg',
];

const FILE_TYPES = [
  'https://storage.example.com/files/mod-v1.2.3.zip',
  'https://storage.example.com/files/skin-pack.fbx',
  'https://storage.example.com/files/map-assets.obj',
  'https://storage.example.com/files/tool-installer.exe',
  'https://storage.example.com/files/asset-pack.zip',
];

async function createWorkshopItems() {
  const env = resolveEnv();
  const db = new PostgresService(env);

  console.log('Creating workshop items for all games...\n');

  // Get all games
  const games = await db.query<{ id: string; slug: string; title: string }>(
    'SELECT id, slug, title FROM games ORDER BY title'
  );

  // Get a user to assign items to
  const user = await db.queryOne<{ id: string; username: string }>(
    'SELECT id, username FROM users ORDER BY created_at ASC LIMIT 1'
  );

  if (!user) {
    throw new Error('No users found in database');
  }

  let created = 0;
  const errors: string[] = [];

  for (const game of games) {
    // Create 3-5 items per game
    const itemsPerGame = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < itemsPerGame; i++) {
      const template = WORKSHOP_ITEMS[Math.floor(Math.random() * WORKSHOP_ITEMS.length)];
      const imageUrl = IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)];
      const fileUrl = FILE_TYPES[Math.floor(Math.random() * FILE_TYPES.length)];
      
      const itemId = crypto.randomUUID();
      const title = `${template.title} - ${game.title}`;
      const description = `${template.description} Specifically designed for ${game.title}.`;
      const downloads = Math.floor(Math.random() * 10000) + 100;
      const rating = Number((Math.random() * 2 + 3).toFixed(2)); // 3.0 - 5.0
      const featured = Math.random() < 0.1; // 10% chance to be featured

      try {
        await db.execute(
          `INSERT INTO workshop_items (id, game_slug, user_id, title, description, type, image_url, file_url, downloads, rating, featured)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [itemId, game.slug, user.id, title, description, template.type, imageUrl, fileUrl, downloads, rating, featured]
        );

        // Add tags
        for (const tag of template.tags) {
          await db.execute(
            'INSERT INTO workshop_item_tags (item_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [itemId, tag]
          );
        }

        created++;
      } catch (error: any) {
        const errorMsg = `Failed to create item for ${game.title}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
  }

  console.log('\n==========================================');
  console.log('Workshop Items Creation Complete!');
  console.log('==========================================');
  console.log(`✅ Created: ${created} workshop items`);
  console.log(`📦 Games: ${games.length}`);
  console.log(`📊 Average: ${(created / games.length).toFixed(1)} items per game`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
  }
}

createWorkshopItems().catch(console.error);

