// Update system requirements for games from PDF data
// Run with: DATABASE_URL="postgresql://..." bun run database/update-system-requirements.ts

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

// System requirements from PDF
const SYSTEM_REQUIREMENTS: Record<string, {
  os: string;
  processor: string;
  memory: string;
  graphics: string;
  storage: string;
}> = {
  'age-of-empires-iv': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-4460 @3.2 GHz or AMD FX-8350',
    memory: '8 GB',
    graphics: 'NVIDIA GTX 760 or AMD RX 560 with 2 GB VRAM',
    storage: '50 GB SSD'
  },
  'amnesia-the-bunker': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-2400 or AMD FX-8350',
    memory: '4 GB',
    graphics: 'NVIDIA GTX 570 or AMD Radeon HD 7750',
    storage: '35 GB HDD'
  },
  'among-us': {
    os: 'Windows 7 SP1+',
    processor: 'SSE2 instruction set CPU (any dual-core)',
    memory: '1 GB',
    graphics: 'DirectX 10 GPU (integrated Intel HD graphics suffice)',
    storage: '250 MB'
  },
  'apex-legends': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i3-6300 3.8 GHz or AMD FX-4350',
    memory: '6 GB',
    graphics: 'NVIDIA GeForce GTX 640 or AMD Radeon HD 7730',
    storage: '56 GB'
  },
  'assassins-creed-syndicate': {
    os: 'Windows 7 64-bit',
    processor: 'Intel Core i5-2400 @3.1 GHz or AMD FX-6350',
    memory: '6 GB',
    graphics: 'NVIDIA GeForce GTX 660 or AMD Radeon R9 270',
    storage: '50 GB'
  },
  'assassins-creed-unity': {
    os: 'Windows 7 SP1 64-bit',
    processor: 'Intel Core i5-2500K @3.3 GHz or AMD FX-8350',
    memory: '6 GB',
    graphics: 'NVIDIA GeForce GTX 680 or AMD Radeon HD 7970',
    storage: '50 GB'
  },
  'assassin-s-creed-valhalla': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-4460 @3.2 GHz or AMD Ryzen 3 1200',
    memory: '8 GB',
    graphics: 'NVIDIA GeForce GTX 960 or AMD R9 380',
    storage: '50 GB SSD'
  },
  'atomic-heart': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-4460 / AMD FX-8310',
    memory: '8 GB',
    graphics: 'NVIDIA GeForce GTX 960 or AMD R9 380 (4 GB VRAM)',
    storage: '90 GB'
  },
  'batman-arkham-knight': {
    os: 'Windows 7 SP1 64-bit',
    processor: 'Intel Core i5-750 or AMD Phenom II X4 965',
    memory: '6 GB',
    graphics: 'NVIDIA GeForce GTX 660 or AMD Radeon HD 7870',
    storage: '45 GB'
  },
  'beamng-drive': {
    os: 'Windows 7 64-bit',
    processor: 'Intel Core i3-6300 or AMD FX-6300',
    memory: '8 GB',
    graphics: 'NVIDIA GeForce GTX 550 Ti or AMD Radeon HD 6750',
    storage: '35 GB'
  },
  'bloodstained-ritual-of-the-night': {
    os: 'Windows 7 SP1 64-bit',
    processor: 'Intel Core i5-4460 or AMD FX-4350',
    memory: '4 GB',
    graphics: 'NVIDIA GeForce GTX 760 or AMD R7 370',
    storage: '10 GB'
  },
  'call-of-duty-4-modern-warfare': {
    os: 'Windows XP/Vista',
    processor: 'Intel Pentium 4 @2.4 GHz or AMD Athlon 64 2800+',
    memory: '512 MB',
    graphics: 'NVIDIA GeForce 6600 or ATI Radeon 9800 Pro',
    storage: '8 GB'
  },
  'cuphead': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core2 Duo E8400 @3.0 GHz',
    memory: '4 GB',
    graphics: '2 GB VRAM DX11-compatible GPU',
    storage: '2 GB'
  },
  'counter-strike-2': {
    os: 'Windows 10 64-bit',
    processor: '4-core CPU (Intel Core i5-750 or higher)',
    memory: '8 GB',
    graphics: '1 GB VRAM, DirectX 11 GPU (Shader Model 5.0 support)',
    storage: '85 GB'
  },
  'crysis-remastered': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-3450 or AMD Ryzen 3 1200',
    memory: '8 GB',
    graphics: 'NVIDIA GeForce GTX 1050 Ti or AMD Radeon 470',
    storage: '20 GB'
  },
  'darkest-dungeon-ii': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-4460 or AMD FX-4300',
    memory: '8 GB',
    graphics: 'NVIDIA GeForce GTX 950 or AMD Radeon R7 370',
    storage: '6 GB'
  },
  'days-gone': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-2500K or AMD FX-6300',
    memory: '8 GB',
    graphics: 'NVIDIA GeForce GTX 780 or AMD R9 290',
    storage: '70 GB'
  },
  'dead-space-2023': {
    os: 'Windows 10 64-bit',
    processor: 'Ryzen 5 2600X or Core i5-8600',
    memory: '16 GB',
    graphics: 'AMD RX 5700 or NVIDIA GTX 1070',
    storage: '50 GB SSD'
  },
  'deathloop': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-8400 or AMD Ryzen 5 1600',
    memory: '12 GB',
    graphics: 'NVIDIA GeForce GTX 1060 or AMD Radeon RX 580',
    storage: '30 GB'
  },
  'detroit-become-human': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-2400 @3.1 GHz or AMD FX-8350',
    memory: '8 GB',
    graphics: 'NVIDIA GeForce GTX 780 or AMD R9 380',
    storage: '55 GB'
  },
  'the-witcher-3': {
    os: 'Windows 7/8.1 64-bit',
    processor: 'Intel Core i5-2500K or AMD Phenom II X4 940',
    memory: '6 GB',
    graphics: 'NVIDIA GeForce GTX 660 or AMD Radeon HD 7870',
    storage: '35 GB'
  },
  'cyberpunk-2077': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-3570K or AMD FX-8310',
    memory: '8 GB',
    graphics: 'NVIDIA GTX 780 or AMD Radeon RX 470',
    storage: '70 GB SSD'
  },
  'elden-ring': {
    os: 'Windows 10 64-bit',
    processor: 'Intel Core i5-8400 or AMD Ryzen 3 3300X',
    memory: '12 GB',
    graphics: 'NVIDIA GeForce GTX 1060 3GB or AMD Radeon RX 580 4GB',
    storage: '60 GB'
  },
  'hades': {
    os: 'Windows 7 SP1',
    processor: 'Dual Core 2.4 GHz',
    memory: '4 GB',
    graphics: '1GB VRAM / DirectX 10+ support',
    storage: '15 GB'
  },
  'baldur-s-gate-3': {
    os: 'Windows 10 64-bit',
    processor: 'Intel I5 4690 / AMD FX 8350',
    memory: '8 GB',
    graphics: 'Nvidia GTX 970 / RX 480 (4GB+ VRAM)',
    storage: '150 GB SSD'
  }
};

async function updateSystemRequirements() {
  const env = resolveEnv();
  const db = new PostgresService(env);

  console.log('Updating system requirements for games...\n');

  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (const [slug, requirements] of Object.entries(SYSTEM_REQUIREMENTS)) {
    try {
      // Find game by slug
      const game = await db.queryOne<{ id: string }>('SELECT id FROM games WHERE slug = $1', [slug]);
      
      if (!game) {
        console.log(`⚠️  Game not found: ${slug}`);
        notFound++;
        continue;
      }

      // Check if requirements already exist
      const existing = await db.queryOne<{ game_id: string }>(
        'SELECT game_id FROM game_requirements WHERE game_id = $1',
        [game.id]
      );

      if (existing) {
        // Update existing
        await db.execute(
          `UPDATE game_requirements 
           SET os = $1, processor = $2, memory = $3, graphics = $4, storage = $5
           WHERE game_id = $6`,
          [requirements.os, requirements.processor, requirements.memory, requirements.graphics, requirements.storage, game.id]
        );
      } else {
        // Insert new
        await db.execute(
          `INSERT INTO game_requirements (game_id, os, processor, memory, graphics, storage)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [game.id, requirements.os, requirements.processor, requirements.memory, requirements.graphics, requirements.storage]
        );
      }

      updated++;
      console.log(`✅ ${slug}: Updated requirements`);
    } catch (error: any) {
      const errorMsg = `Failed to update ${slug}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log('\n==========================================');
  console.log('System Requirements Update Complete!');
  console.log('==========================================');
  console.log(`✅ Updated: ${updated} games`);
  console.log(`⚠️  Not found: ${notFound} games`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
  }
}

updateSystemRequirements().catch(console.error);

