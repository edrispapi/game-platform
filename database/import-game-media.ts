// Import game screenshots and videos from PDF data
// Run with: DATABASE_URL="postgresql://..." bun run database/import-game-media.ts

import { PostgresService } from '../worker/db/postgres-service';
import type { DatabaseEnv } from '../worker/db/types';

// Game data from PDF - mapping title to slug, trailer, and screenshot
const GAME_MEDIA: Array<{
  title: string;
  slug: string;
  trailer: string;
  screenshot: string;
}> = [
  { title: 'Cuphead', slug: 'cuphead', trailer: 'https://www.youtube.com/watch?v=NN-9SQXoi50', screenshot: 'https://cdn.mobygames.com/screenshots/16289654-cuphead-windows-never-make-deals-with-thedevil.png' },
  { title: 'Ghost of Tsushima', slug: 'ghost-of-tsushima', trailer: 'https://www.youtube.com/watch?v=be8JVKLY4wk', screenshot: 'https://images.launchbox-app.com/c9181193-f70c-4969-a566-63f8b4948cd7.png' },
  { title: 'Titanfall 2', slug: 'titanfall-2', trailer: 'https://www.youtube.com/watch?v=5GKJAqpnT24', screenshot: 'https://cdn.mobygames.com/screenshots/12351688-titanfall-2-playstation-4-regular-infantry-is-no-match-for-a-tit.jpg' },
  { title: 'Among Us', slug: 'among-us', trailer: 'https://www.youtube.com/watch?v=0YKjFoGxbec', screenshot: 'https://cdn.mobygames.com/screenshots/16840371-among-us-windows-the-room-where-players-join-before-the-game-sta.png' },
  { title: 'Counter-Strike 2', slug: 'counter-strike-2', trailer: 'https://www.youtube.com/watch?v=nSE38xjMLqE', screenshot: 'https://developer.valvesoftware.com/w/images/f/ff/Counter-Strike_2_-_de_dust2_1.png' },
  { title: 'Elden Ring', slug: 'elden-ring', trailer: 'https://www.youtube.com/watch?v=K_03kFqWfqs', screenshot: 'https://cdn.mobygames.com/screenshots/18227866-elden-ring-windows-a-lot-of-great-views-to-take-in.jpg' },
  { title: 'Final Fantasy XVI', slug: 'final-fantasy-xvi', trailer: 'https://www.youtube.com/watch?v=aPT26Dd3OzE', screenshot: 'https://images.launchbox-app.com/0194d67d-c014-4869-9ec4-a0a7533d6030.jpg' },
  { title: 'Bloodborne', slug: 'bloodborne', trailer: 'https://www.youtube.com/watch?v=iTDvYvlyPaE', screenshot: 'https://images.launchbox-app.com/e05deeb7-160b-47f9-9003-3d1e42ee4648.jpg' },
  { title: 'Fall Guys', slug: 'fall-guys', trailer: 'https://www.youtube.com/watch?v=Wj3dUvGLjNQ', screenshot: 'https://images.launchbox-app.com/f3067eec-0b1e-4349-9190-f40b5b0058e9.jpg' },
  { title: 'Final Fantasy XIV', slug: 'final-fantasy-xiv', trailer: 'https://www.youtube.com/watch?v=zTTtd6bnhFs', screenshot: 'https://images.launchbox-app.com/d4defe71-94e6-46b9-9561-7c2d93c49820.jpg' },
  { title: 'Nioh 2', slug: 'nioh-2', trailer: 'https://www.youtube.com/watch?v=QccheiQ7c34', screenshot: 'https://store-images.s-microsoft.com/image/apps.50282.14162631971750685.9cb0b999-5ed5-4bb8-8281-cc4e2e2410ec' },
  { title: 'Alan Wake 2', slug: 'alan-wake-2', trailer: 'https://www.youtube.com/watch?v=dlQ3FeNu5Yw', screenshot: 'https://cdn.mobygames.com/screenshots/17974077-alan-wake-ii-windows-wake-watches-part-of-a-documentary-of-his-w.png' },
  { title: 'Amnesia: The Bunker', slug: 'amnesia-the-bunker', trailer: 'https://www.youtube.com/watch?v=5V3Si-MbUao', screenshot: 'https://cdn.mobygames.com/screenshots/22303865-amnesia-the-bunker-windows-inventory-read-the-diaries-you-come-a.jpg' },
  { title: 'Cyberpunk 2077', slug: 'cyberpunk-2077', trailer: 'https://www.youtube.com/watch?v=F1nxEGme7e8', screenshot: 'https://images.alphacoders.com/101/1019627.jpg' },
  { title: 'Dark Souls III', slug: 'dark-souls-iii', trailer: 'https://www.youtube.com/watch?v=-XwhYVzN_a0', screenshot: 'https://cdn.mobygames.com/screenshots/117/580924-dark-souls-iii-windows.jpg' },
  { title: 'Death Stranding', slug: 'death-stranding', trailer: 'https://www.youtube.com/watch?v=XcuFJXgU6cA', screenshot: 'https://cdn.mobygames.com/screenshots/120/570598-death-stranding-playstation-4.jpg' },
  { title: 'Doom (2016)', slug: 'doom-2016', trailer: 'https://www.youtube.com/watch?v=ybo30QlSk64', screenshot: 'https://cdn.mobygames.com/screenshots/120/556696-doom-windows.jpg' },
  { title: 'Dota 2', slug: 'dota-2', trailer: 'https://www.youtube.com/watch?v=-cSFPIwMEq4', screenshot: 'https://cdn.mobygames.com/screenshots/120/557083-dota-2-windows.jpg' },
  { title: 'Fire Emblem: Three Houses', slug: 'fire-emblem-three-houses', trailer: 'https://www.youtube.com/watch?v=JsyMcZ-u5gE', screenshot: 'https://cdn.mobygames.com/screenshots/120/655556-fire-emblem-three-houses-nintendoswitch.jpg' },
  { title: 'Grim Dawn', slug: 'grim-dawn', trailer: 'https://www.youtube.com/watch?v=3CLuFDE3Z7w', screenshot: 'https://cdn.mobygames.com/screenshots/120/579251-grim-dawn-windows.jpg' },
  { title: 'Hades', slug: 'hades', trailer: 'https://www.youtube.com/watch?v=591nGY1ZI1w', screenshot: 'https://cdn.mobygames.com/screenshots/120/730339-hades-windows.jpg' },
  { title: "Marvel's Guardians of the Galaxy", slug: 'marvels-guardians-of-the-galaxy', trailer: 'https://www.youtube.com/watch?v=3GJcPH8sE_w', screenshot: 'https://cdn.mobygames.com/screenshots/120/893683-marvels-guardians-of-the-galaxywindows.jpg' },
  { title: 'Monster Hunter: World', slug: 'monster-hunter-world', trailer: 'https://www.youtube.com/watch?v=Ro6r15wzp2o', screenshot: 'https://cdn.mobygames.com/screenshots/120/721925-monster-hunter-world-windows.jpg' },
  { title: 'Nier: Replicant', slug: 'nier-replicant', trailer: 'https://www.youtube.com/watch?v=XKA3Ti7O2Fs', screenshot: 'https://cdn.mobygames.com/screenshots/120/782151-nier-replicant-ver122474487139-windows.jpg' },
  { title: 'Resident Evil 4', slug: 'resident-evil-4', trailer: 'https://www.youtube.com/watch?v=G3RY4M46I48', screenshot: 'https://cdn.mobygames.com/screenshots/120/583263-resident-evil-4-windows.jpg' },
  { title: 'Resident Evil Village', slug: 'resident-evil-village', trailer: 'https://www.youtube.com/watch?v=JW_CKut0H4w', screenshot: 'https://cdn.mobygames.com/screenshots/120/835528-resident-evil-village-windows.jpg' },
  { title: 'Sekiro: Shadows Die Twice', slug: 'sekiro-shadows-die-twice', trailer: 'https://www.youtube.com/watch?v=rXMX4YJ7Lks', screenshot: 'https://cdn.mobygames.com/screenshots/120/699259-sekiro-shadows-die-twice-windows.jpg' },
  { title: 'Stardew Valley', slug: 'stardew-valley', trailer: 'https://www.youtube.com/watch?v=ot7uXNQskhs', screenshot: 'https://cdn.mobygames.com/screenshots/120/647708-stardew-valley-windows.jpg' },
  { title: 'Terraria', slug: 'terraria', trailer: 'https://www.youtube.com/watch?v=Q4Gpc9jog3w', screenshot: 'https://cdn.mobygames.com/screenshots/120/595443-terraria-windows.jpg' },
  { title: 'Warframe', slug: 'warframe', trailer: 'https://www.youtube.com/watch?v=0vuJitrbTFY', screenshot: 'https://cdn.mobygames.com/screenshots/120/661210-warframe-windows.jpg' },
  { title: 'Dead Cells', slug: 'dead-cells', trailer: 'https://www.youtube.com/watch?v=G6HZlpHLp74', screenshot: 'https://cdn.mobygames.com/screenshots/120/742384-dead-cells-windows.jpg' },
  { title: 'Destiny 2', slug: 'destiny-2', trailer: 'https://www.youtube.com/watch?v=ZJLAJVmggt0', screenshot: 'https://cdn.mobygames.com/screenshots/120/736498-destiny-2-windows.jpg' },
  { title: 'Fortnite', slug: 'fortnite', trailer: 'https://www.youtube.com/watch?v=2gUtfBmw86Y', screenshot: 'https://cdn.mobygames.com/screenshots/120/675748-fortnite-windows.jpg' },
  { title: 'God of War', slug: 'god-of-war', trailer: 'https://www.youtube.com/watch?v=K0u_kAWLJOA', screenshot: 'https://cdn.mobygames.com/screenshots/120/1013151-god-of-war-playstation-4.jpg' },
  { title: 'Nier: Automata', slug: 'nier-automata', trailer: 'https://www.youtube.com/watch?v=ARHVKZ5K1b0', screenshot: 'https://cdn.mobygames.com/screenshots/120/633611-nier-automata-windows.jpg' },
  { title: 'Path of Exile', slug: 'path-of-exile', trailer: 'https://www.youtube.com/watch?v=J4XqZv5nW4E', screenshot: 'https://cdn.mobygames.com/screenshots/120/557083-dota-2-windows.jpg' },
  { title: 'Persona 5 Royal', slug: 'persona-5-royal', trailer: 'https://www.youtube.com/watch?v=68QzCPBnJpI', screenshot: 'https://cdn.mobygames.com/screenshots/120/1063676-persona-5-royal-windows.jpg' },
  { title: 'Prey', slug: 'prey', trailer: 'https://www.youtube.com/watch?v=Nwm46hiFNBQ', screenshot: 'https://cdn.mobygames.com/screenshots/120/637709-prey-windows.jpg' },
  { title: 'Ratchet & Clank: Rift Apart', slug: 'ratchet-clank-rift-apart', trailer: 'https://www.youtube.com/watch?v=9p_gg9UW9k4', screenshot: 'https://cdn.mobygames.com/screenshots/192/1000242-ratchet-clank-rift-apartwindows.jpg' },
  { title: 'Red Dead Redemption 2', slug: 'red-dead-redemption-2', trailer: 'https://www.youtube.com/watch?v=gmA6MrX81z4', screenshot: 'https://cdn.mobygames.com/screenshots/120/1013151-god-of-war-playstation-4.jpg' },
  { title: 'Returnal', slug: 'returnal', trailer: 'https://www.youtube.com/watch?v=ovDR0cu8W3c', screenshot: 'https://cdn.mobygames.com/screenshots/192/1044960-returnal-windows.jpg' },
  { title: 'Spider-Man', slug: 'spider-man', trailer: 'https://www.youtube.com/watch?v=q4GdJVvdxss', screenshot: 'https://cdn.mobygames.com/screenshots/120/1013151-god-of-war-playstation-4.jpg' },
  { title: 'The Last of Us', slug: 'the-last-of-us', trailer: 'https://www.youtube.com/watch?v=W2Wnvvj33Wo', screenshot: 'https://cdn.mobygames.com/screenshots/120/1013151-god-of-war-playstation-4.jpg' },
  { title: 'The Witcher 3', slug: 'the-witcher-3', trailer: 'https://www.youtube.com/watch?v=ehjJ614QfeM', screenshot: 'https://cdn.mobygames.com/screenshots/120/656607-the-witcher-3-wild-hunt-windows.jpg' },
  { title: 'Baldur\'s Gate 3', slug: 'baldur-s-gate-3', trailer: 'https://www.youtube.com/watch?v=UuO6W4d4Zk4', screenshot: 'https://cdn.mobygames.com/screenshots/192/997001-baldurs-gate-3-windows.jpg' },
  { title: 'Celeste', slug: 'celeste', trailer: 'https://www.youtube.com/watch?v=io7dYpzGAc4', screenshot: 'https://cdn.mobygames.com/screenshots/120/721867-celeste-nintendo-switch.jpg' },
  { title: 'Control', slug: 'control', trailer: 'https://www.youtube.com/watch?v=Fdg3UsIxeE0', screenshot: 'https://cdn.mobygames.com/screenshots/120/797299-control-windows.jpg' },
  { title: 'Demon\'s Souls', slug: 'demons-souls', trailer: 'https://www.youtube.com/watch?v=RsdFlar5KAM', screenshot: 'https://cdn.mobygames.com/screenshots/120/966880-demons-souls-playstation-5.jpg' },
  { title: 'Dragon Age: Inquisition', slug: 'dragon-age-inquisition', trailer: 'https://www.youtube.com/watch?v=jJqxfkgSUog', screenshot: 'https://cdn.mobygames.com/screenshots/120/484256-dragon-age-inquisition-windows.jpg' },
  { title: 'Hitman 3', slug: 'hitman-3', trailer: 'https://www.youtube.com/watch?v=PTYKk1r4ZOU', screenshot: 'https://cdn.mobygames.com/screenshots/120/964248-hitman-3-windows.jpg' },
  { title: 'Horizon Zero Dawn', slug: 'horizon-zero-dawn', trailer: 'https://www.youtube.com/watch?v=u4-FCsiF5x4', screenshot: 'https://cdn.mobygames.com/screenshots/120/785769-horizon-zero-dawn-complete-edition-windows.jpg' },
  { title: 'League of Legends', slug: 'league-of-legends', trailer: 'https://www.youtube.com/watch?v=BGtROJeMPeE', screenshot: 'https://cdn.mobygames.com/screenshots/120/728558-league-of-legends-windows.jpg' },
  { title: 'Lies of P', slug: 'lies-of-p', trailer: 'https://www.youtube.com/watch?v=6ALU97EnQB0', screenshot: 'https://cdn.mobygames.com/screenshots/192/1160261-lies-of-p-windows.jpg' },
  { title: 'Monster Hunter Rise', slug: 'monster-hunter-rise', trailer: 'https://www.youtube.com/watch?v=tj_Ykehs2wY', screenshot: 'https://cdn.mobygames.com/screenshots/192/934320-monster-hunter-rise-windows.jpg' },
  { title: 'Wolfenstein II', slug: 'wolfenstein-ii', trailer: 'https://www.youtube.com/watch?v=xHht8480cEo', screenshot: 'https://cdn.mobygames.com/screenshots/120/734776-wolfenstein-ii-the-new-colossus-windows.jpg' },
  { title: 'Xenoblade Chronicles 3', slug: 'xenoblade-chronicles-3', trailer: 'https://www.youtube.com/watch?v=RtPtUOQvOus', screenshot: 'https://cdn.mobygames.com/screenshots/192/932254-xenoblade-chronicles-3-nintendo-switch.jpg' },
  { title: 'Assassin\'s Creed Valhalla', slug: 'assassins-creed-valhalla', trailer: 'https://www.youtube.com/watch?v=ssrNcwxALS4', screenshot: 'https://cdn.mobygames.com/screenshots/192/864968-assassins-creed-valhalla-windows.jpg' },
  { title: 'Dead Space Remake', slug: 'dead-space-remake', trailer: 'https://www.youtube.com/watch?v=l5WeBNfX-og', screenshot: 'https://cdn.mobygames.com/screenshots/192/958584-dead-space-windows.jpg' },
  { title: 'Dishonored 2', slug: 'dishonored-2', trailer: 'https://www.youtube.com/watch?v=UYbQDYrKXsc', screenshot: 'https://cdn.mobygames.com/screenshots/120/603989-dishonored-2-windows.jpg' },
  { title: 'Doom Eternal', slug: 'doom-eternal', trailer: 'https://www.youtube.com/watch?v=_UuktemkCFI', screenshot: 'https://cdn.mobygames.com/screenshots/120/797928-doom-eternal-windows.jpg' },
  { title: 'Marvel\'s Spider-Man 2', slug: 'marvels-spider-man-2', trailer: 'https://www.youtube.com/watch?v=uL3CDpwHf9c', screenshot: 'https://cdn.mobygames.com/screenshots/192/1172925-marvels-spider-man-2-playstation-5.jpg' },
  { title: 'Ori and the Blind Forest', slug: 'ori-and-the-blind-forest', trailer: 'https://www.youtube.com/watch?v=cklw-Yu3moE', screenshot: 'https://cdn.mobygames.com/screenshots/120/591868-ori-and-the-blind-forest-windows.jpg' },
  { title: 'Outlast 2', slug: 'outlast-2', trailer: 'https://www.youtube.com/watch?v=ZgqYvnlvMzA', screenshot: 'https://cdn.mobygames.com/screenshots/120/629801-outlast-ii-windows.jpg' },
  { title: 'Star Wars Jedi: Survivor', slug: 'star-wars-jedi-survivor', trailer: 'https://www.youtube.com/watch?v=VRaobDJjiec', screenshot: 'https://cdn.mobygames.com/screenshots/192/1084372-star-wars-jedi-survivor-windows.jpg' },
  { title: 'Call of Duty: Modern Warfare', slug: 'call-of-duty-modern-warfare', trailer: 'https://www.youtube.com/watch?v=bH1lHCirCGI', screenshot: 'https://cdn.mobygames.com/screenshots/120/1001927-call-of-duty-modern-warfarewindows.jpg' },
  { title: 'Code Vein', slug: 'code-vein', trailer: 'https://www.youtube.com/watch?v=4BrxrFoSupE', screenshot: 'https://cdn.mobygames.com/screenshots/120/931195-code-vein-windows.jpg' },
  { title: 'Hogwarts Legacy', slug: 'hogwarts-legacy', trailer: 'https://www.youtube.com/watch?v=BtyBjOW8sGY', screenshot: 'https://cdn.mobygames.com/screenshots/192/1133510-hogwarts-legacy-windows.jpg' },
  { title: 'Metal Gear Solid V', slug: 'metal-gear-solid-v', trailer: 'https://www.youtube.com/watch?v=UMyoCr2MnpM', screenshot: 'https://cdn.mobygames.com/screenshots/120/682569-metal-gear-solid-v-the-phantom-painwindows.jpg' },
];

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

async function importGameMedia() {
  const env = resolveEnv();
  const db = new PostgresService(env);

  console.log('Importing game screenshots and videos...\n');

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const gameMedia of GAME_MEDIA) {
    try {
      // Find game by slug
      const game = await db.queryOne<{ id: string; slug: string; title: string }>(
        'SELECT id, slug, title FROM games WHERE slug = $1',
        [gameMedia.slug]
      );

      if (!game) {
        console.log(`⚠️  Game not found: ${gameMedia.title} (slug: ${gameMedia.slug})`);
        skipped++;
        continue;
      }

      // Check if screenshot already exists
      const existingScreenshot = await db.queryOne<{ id: string }>(
        'SELECT id FROM game_screenshots WHERE game_id = $1 AND url = $2',
        [game.id, gameMedia.screenshot]
      );

      if (!existingScreenshot && gameMedia.screenshot) {
        await db.execute(
          'INSERT INTO game_screenshots (game_id, url, order_index) VALUES ($1, $2, $3)',
          [game.id, gameMedia.screenshot, 0]
        );
      }

      // Check if video already exists
      const existingVideo = await db.queryOne<{ id: string }>(
        'SELECT id FROM game_videos WHERE game_id = $1 AND url = $2',
        [game.id, gameMedia.trailer]
      );

      if (!existingVideo && gameMedia.trailer) {
        await db.execute(
          'INSERT INTO game_videos (game_id, url, type) VALUES ($1, $2, $3)',
          [game.id, gameMedia.trailer, 'trailer']
        );
      }

      console.log(`✅ ${game.title}: Added screenshot and trailer`);
      imported++;
    } catch (error: any) {
      const errorMsg = `Failed to import ${gameMedia.title}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log('\n==========================================');
  console.log('Import Complete!');
  console.log('==========================================');
  console.log(`✅ Imported: ${imported} games`);
  console.log(`⚠️  Skipped: ${skipped} games (not found in database)`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    errors.forEach(err => console.log(`   - ${err}`));
  }
}

importGameMedia().catch(console.error);

