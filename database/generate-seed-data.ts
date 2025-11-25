// Generate 100 seed data entries for PostgreSQL import
import type { Game, UserProfile, Friend, GameReview, ForumPost, ForumReply, WorkshopItem } from '../shared/types';

const GAME_TITLES = [
  'Cyberpunk 2077', 'The Witcher 3', 'Elden Ring', 'Baldur\'s Gate 3', 'Red Dead Redemption 2',
  'God of War', 'Horizon Zero Dawn', 'Assassin\'s Creed Valhalla', 'Call of Duty: Modern Warfare',
  'Fortnite', 'Apex Legends', 'Valorant', 'Counter-Strike 2', 'Dota 2', 'League of Legends',
  'Minecraft', 'Terraria', 'Stardew Valley', 'Hades', 'Dead Cells', 'Hollow Knight',
  'Celeste', 'Ori and the Blind Forest', 'Cuphead', 'Among Us', 'Fall Guys',
  'Genshin Impact', 'Honkai: Star Rail', 'Final Fantasy XIV', 'World of Warcraft',
  'Destiny 2', 'Warframe', 'Path of Exile', 'Diablo IV', 'Grim Dawn',
  'Dark Souls III', 'Sekiro: Shadows Die Twice', 'Bloodborne', 'Demon\'s Souls',
  'Resident Evil 4', 'Resident Evil Village', 'The Last of Us', 'Uncharted 4',
  'Spider-Man', 'Spider-Man: Miles Morales', 'Ghost of Tsushima', 'Death Stranding',
  'Control', 'Alan Wake 2', 'Returnal', 'Ratchet & Clank: Rift Apart',
  'Doom Eternal', 'Doom (2016)', 'Wolfenstein II', 'Titanfall 2',
  'Mass Effect Legendary Edition', 'Dragon Age: Inquisition', 'Star Wars Jedi: Fallen Order',
  'Star Wars Jedi: Survivor', 'Marvel\'s Guardians of the Galaxy', 'Marvel\'s Spider-Man 2',
  'Hogwarts Legacy', 'Starfield', 'The Elder Scrolls V: Skyrim', 'Fallout 4',
  'Fallout: New Vegas', 'The Outer Worlds', 'Bioshock Infinite', 'Prey',
  'Dishonored 2', 'Deathloop', 'Hitman 3', 'Metal Gear Solid V',
  'Persona 5 Royal', 'Yakuza: Like a Dragon', 'Nier: Automata', 'Nier: Replicant',
  'Final Fantasy VII Remake', 'Final Fantasy XVI', 'Octopath Traveler', 'Triangle Strategy',
  'Fire Emblem: Three Houses', 'Xenoblade Chronicles 3', 'Monster Hunter: World',
  'Monster Hunter Rise', 'Sekiro: Shadows Die Twice', 'Elden Ring', 'Dark Souls Remastered',
  'Demon\'s Souls Remake', 'Bloodborne', 'Lies of P', 'Wo Long: Fallen Dynasty',
  'Nioh 2', 'Code Vein', 'Remnant 2', 'Returnal', 'Dead Space Remake',
  'The Callisto Protocol', 'Amnesia: The Bunker', 'Outlast 2', 'Phasmophobia',
  'Lethal Company', 'Baldur\'s Gate 3', 'Divinity: Original Sin 2', 'Pillars of Eternity II',
  'Pathfinder: Wrath of the Righteous', 'Wasteland 3', 'XCOM 2', 'Civilization VI',
  'Total War: Warhammer III', 'Crusader Kings III', 'Europa Universalis IV', 'Hearts of Iron IV'
];

const USERNAMES = [
  'CyberNinja', 'ShadowHunter', 'NeonRider', 'VoidWalker', 'QuantumGamer',
  'PixelWarrior', 'CodeBreaker', 'DigitalDragon', 'TechTitan', 'GameMaster',
  'NightStalker', 'FireStorm', 'IceBlade', 'ThunderBolt', 'LightningStrike',
  'DarkKnight', 'SilverArrow', 'GoldenEagle', 'CrimsonWolf', 'AzurePhoenix',
  'MysticMage', 'ArcaneWizard', 'SoulReaper', 'BloodHunter', 'GhostRider',
  'SteelFist', 'IronShield', 'TitanSlayer', 'DragonLord', 'DemonHunter',
  'AngelWings', 'Celestial', 'Stellar', 'Nebula', 'Cosmic',
  'StarDust', 'MoonBeam', 'SunFlare', 'Eclipse', 'Aurora',
  'FrostBite', 'Blaze', 'Inferno', 'Volcano', 'Tsunami',
  'Hurricane', 'Tornado', 'Cyclone', 'Tempest', 'Storm',
  'Thunder', 'Lightning', 'Spark', 'Flame', 'Ember',
  'Ash', 'Smoke', 'Mist', 'Fog', 'Cloud',
  'Rain', 'Snow', 'Ice', 'Frost', 'Freeze',
  'Chill', 'Cool', 'Breeze', 'Wind', 'Gale',
  'Zephyr', 'Squall', 'Blizzard', 'Avalanche', 'Glacier',
  'Crystal', 'Diamond', 'Ruby', 'Sapphire', 'Emerald',
  'Amber', 'Topaz', 'Pearl', 'Opal', 'Jade',
  'Onyx', 'Obsidian', 'Granite', 'Marble', 'Quartz',
  'Basalt', 'Limestone', 'Sandstone', 'Shale', 'Slate'
];

const GAME_TAGS = ['Action', 'RPG', 'Strategy', 'Indie', 'Shooter', 'Adventure'] as const;
const WORKSHOP_TYPES = ['mod', 'skin', 'map', 'tool'] as const;

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate 100 games
export function generateGames(): any[] {
  const games = [];
  const startDate = new Date('2020-01-01');
  const endDate = new Date();
  const slugCounts = new Map<string, number>();
  
  for (let i = 0; i < 100; i++) {
    const baseTitle = GAME_TITLES[i % GAME_TITLES.length];
    const baseSlug = baseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const currentCount = slugCounts.get(baseSlug) ?? 0;
    const nextCount = currentCount + 1;
    slugCounts.set(baseSlug, nextCount);
    
    const slug = nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`;
    const title = nextCount === 1 ? baseTitle : `${baseTitle} ${nextCount}`;
    const tags = Array.from({ length: randomInt(2, 4) }, () => randomElement(GAME_TAGS));
    const price = parseFloat((randomFloat(9.99, 79.99)).toFixed(2));
    const encodedTitle = encodeURIComponent(title);
    const coverImage = `https://dummyimage.com/600x800/050505/ff0000&text=${encodedTitle}`;
    const bannerImage = `https://dummyimage.com/1600x900/050505/ff0000&text=${encodedTitle}+Banner`;
    
    games.push({
      id: generateUUID(),
      slug,
      title,
      description: `Experience the ultimate ${title} adventure. Immerse yourself in a world of ${tags[0].toLowerCase()} gameplay, stunning graphics, and endless possibilities.`,
      price,
      cover_image_url: coverImage,
      banner_image_url: bannerImage,
      created_at: randomDate(startDate, endDate).toISOString(),
      tags: tags.map(tag => ({ game_id: null, tag })), // Will be set after game creation
    });
  }
  
  return games;
}

// Generate 100 users
export function generateUsers(): any[] {
  const users = [];
  const startDate = new Date('2020-01-01');
  const endDate = new Date();
  
  for (let i = 0; i < 100; i++) {
    const username = USERNAMES[i % USERNAMES.length] + (i > USERNAMES.length ? i : '');
    const email = `${username.toLowerCase()}@example.com`;
    const status = randomElement(['Online', 'Offline', 'In Game'] as const);
    
    users.push({
      id: generateUUID(),
      username,
      email,
      bio: `Passionate gamer who loves ${randomElement(GAME_TAGS).toLowerCase()} games. Always looking for the next great adventure!`,
      avatar_url: `https://i.pravatar.cc/150?u=${username}`,
      hours_played: randomInt(50, 5000),
      achievements_count: randomInt(0, 50),
      friends_count: randomInt(0, 100),
      status,
      current_game_slug: status === 'In Game' ? `game-${randomInt(1, 100)}` : null,
      last_seen: new Date().toISOString(),
      created_at: randomDate(startDate, endDate).toISOString(),
    });
  }
  
  return users;
}

// Generate 500 reviews (5 per game on average)
export function generateReviews(users: any[], games: any[]): any[] {
  const reviews = [];
  
  for (let i = 0; i < 500; i++) {
    const game = randomElement(games);
    const user = randomElement(users);
    const rating = randomInt(1, 5);
    const comments = [
      'Amazing game! Highly recommend.',
      'Great gameplay and story.',
      'Good but could be better.',
      'Not my cup of tea.',
      'Absolutely fantastic!',
      'Worth every penny.',
      'Solid game with minor issues.',
      'One of the best games I\'ve played.',
      'Decent game, nothing special.',
      'Incredible experience!',
    ];
    
    reviews.push({
      id: generateUUID(),
      game_id: game.id,
      user_id: user.id,
      rating,
      comment: randomElement(comments),
      created_at: randomDate(new Date(game.created_at), new Date()).toISOString(),
    });
  }
  
  return reviews;
}

// Generate 200 forum posts
export function generateForumPosts(users: any[], games: any[]): any[] {
  const posts = [];
  const titles = [
    'Best build for this game?',
    'Tips for beginners',
    'How to beat the final boss',
    'Multiplayer strategies',
    'Best weapons and gear',
    'Story discussion',
    'Performance optimization',
    'Mod recommendations',
    'Achievement guide',
    'Speedrun tips',
  ];
  
  for (let i = 0; i < 200; i++) {
    const game = randomElement(games);
    const user = randomElement(users);
    const title = randomElement(titles);
    
    posts.push({
      id: generateUUID(),
      game_slug: game.slug,
      user_id: user.id,
      title,
      content: `I've been playing ${game.title} for a while now and wanted to share my thoughts on ${title.toLowerCase()}. What do you all think?`,
      views: randomInt(10, 10000),
      likes: randomInt(0, 500),
      replies_count: randomInt(0, 50),
      pinned: Math.random() < 0.05, // 5% pinned
      created_at: randomDate(new Date(game.created_at), new Date()).toISOString(),
    });
  }
  
  return posts;
}

// Generate 500 forum replies
export function generateForumReplies(users: any[], posts: any[]): any[] {
  const replies = [];
  
  for (let i = 0; i < 500; i++) {
    const post = randomElement(posts);
    const user = randomElement(users);
    const comments = [
      'Great post! I agree completely.',
      'Thanks for sharing this.',
      'I had a different experience.',
      'This helped me a lot!',
      'Interesting perspective.',
      'I\'ll try this out.',
      'Can you explain more?',
      'This is exactly what I needed.',
      'I disagree with this.',
      'Awesome tip!',
    ];
    
    replies.push({
      id: generateUUID(),
      post_id: post.id,
      user_id: user.id,
      content: randomElement(comments),
      likes: randomInt(0, 100),
      created_at: randomDate(new Date(post.created_at), new Date()).toISOString(),
    });
  }
  
  return replies;
}

// Generate 200 workshop items
export function generateWorkshopItems(users: any[], games: any[]): any[] {
  const items = [];
  const titles = [
    'HD Texture Pack',
    'Ultra Graphics Mod',
    'New Character Skin',
    'Custom Map Pack',
    'Weapon Mod',
    'Quality of Life Improvements',
    'UI Enhancement',
    'Sound Pack',
    'Character Customization',
    'Gameplay Overhaul',
  ];
  
  for (let i = 0; i < 200; i++) {
    const game = randomElement(games);
    const user = randomElement(users);
      const type = randomElement(WORKSHOP_TYPES);
    
    items.push({
      id: generateUUID(),
      game_slug: game.slug,
      user_id: user.id,
      title: randomElement(titles),
      description: `A ${type} for ${game.title} that enhances your gaming experience.`,
      type,
      image_url: `https://dummyimage.com/800x600/050505/ff0000&text=${encodeURIComponent(game.title + ' Workshop')}`,
      file_url: `https://workshop.example.com/files/${generateUUID()}.zip`,
      downloads: randomInt(0, 10000),
      rating: parseFloat((randomFloat(3.0, 5.0)).toFixed(2)),
      featured: Math.random() < 0.1, // 10% featured
      created_at: randomDate(new Date(game.created_at), new Date()).toISOString(),
    });
  }
  
  return items;
}

// Generate 300 friends relationships
export function generateFriends(users: any[]): any[] {
  const friends = [];
  const usedPairs = new Set<string>();
  
  for (let i = 0; i < 300; i++) {
    let user1, user2, pairKey: string;
    
    while (true) {
      user1 = randomElement(users);
      user2 = randomElement(users);
      if (user1.id === user2.id) {
        continue;
      }
      pairKey = [user1.id, user2.id].sort().join('-');
      if (usedPairs.has(pairKey)) {
        continue;
      }
      usedPairs.add(pairKey);
      break;
    }
    
    const status = randomElement(['Online', 'Offline', 'In Game'] as const);
    
    friends.push({
      id: generateUUID(),
      user_id: user1.id,
      friend_id: user2.id,
      status,
      current_game_slug: status === 'In Game' ? `game-${randomInt(1, 100)}` : null,
      created_at: randomDate(new Date('2020-01-01'), new Date()).toISOString(),
    });
  }
  
  return friends;
}

// Generate 100 orders
export function generateOrders(users: any[], games: any[]): any[] {
  const orders = [];
  
  for (let i = 0; i < 100; i++) {
    const user = randomElement(users);
    const gameCount = randomInt(1, 5);
    const gamesInOrder = Array.from({ length: gameCount }, () => randomElement(games));
    const total = gamesInOrder.reduce((sum, g) => sum + parseFloat(g.price), 0);
    
    orders.push({
      id: generateUUID(),
      user_id: user.id,
      total: parseFloat(total.toFixed(2)),
      status: randomElement(['pending', 'completed', 'cancelled'] as const),
      created_at: randomDate(new Date('2020-01-01'), new Date()).toISOString(),
      items: gamesInOrder.map(game => ({
        id: generateUUID(),
        order_id: null, // Will be set after order creation
        game_id: game.id,
        title: game.title,
        price: parseFloat(game.price),
        quantity: 1,
      })),
    });
  }
  
  return orders;
}

// Main export function
export function generateAllSeedData() {
  console.log('Generating seed data...');
  
  const users = generateUsers();
  console.log(`Generated ${users.length} users`);
  
  const games = generateGames();
  console.log(`Generated ${games.length} games`);
  
  // Set game IDs in tags
  games.forEach(game => {
    game.tags = game.tags.map((tag: any) => ({ ...tag, game_id: game.id }));
  });
  
  const reviews = generateReviews(users, games);
  console.log(`Generated ${reviews.length} reviews`);
  
  const forumPosts = generateForumPosts(users, games);
  console.log(`Generated ${forumPosts.length} forum posts`);
  
  const forumReplies = generateForumReplies(users, forumPosts);
  console.log(`Generated ${forumReplies.length} forum replies`);
  
  const workshopItems = generateWorkshopItems(users, games);
  console.log(`Generated ${workshopItems.length} workshop items`);
  
  const friends = generateFriends(users);
  console.log(`Generated ${friends.length} friend relationships`);
  
  const orders = generateOrders(users, games);
  console.log(`Generated ${orders.length} orders`);
  
  return {
    users,
    games,
    reviews,
    forumPosts,
    forumReplies,
    workshopItems,
    friends,
    orders,
  };
}

