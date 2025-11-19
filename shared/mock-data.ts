import type { User, Chat, ChatMessage, Game, UserProfile, Friend } from './types';
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'User A' },
  { id: 'u2', name: 'User B' }
];
export const MOCK_CHATS: Chat[] = [
  { id: 'c1', title: 'General' },
];
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'm1', chatId: 'c1', userId: 'u1', text: 'Hello', ts: Date.now() },
];
export const MOCK_GAMES: Game[] = [
  {
    id: 'g1',
    slug: 'cyberpunk-2077',
    title: 'Cyberpunk 2077',
    description: 'An open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.',
    price: 59.99,
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6vi1.jpg',
    tags: ['Action', 'RPG', 'Shooter'],
    screenshots: [
      'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6vi2.jpg',
      'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6vi3.jpg',
      'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6vi4.jpg',
    ],
    videos: ['https://www.youtube.com/watch?v=8X2kIfS6fb8'],
    reviews: [],
    requirements: {
      os: 'Windows 10 64-bit',
      processor: 'Intel Core i7-6700 or AMD Ryzen 5 1600',
      memory: '12 GB RAM',
      graphics: 'NVIDIA GeForce GTX 1060 6GB or AMD Radeon RX 580 8GB',
      storage: '70 GB available space',
    },
  },
  {
    id: 'g2',
    slug: 'the-witcher-3',
    title: 'The Witcher 3: Wild Hunt',
    description: 'As Geralt of Rivia, a monster slayer for hire, you must find the Child of Prophecy, a living weapon that can alter the shape of the world.',
    price: 39.99,
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wz4.jpg',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6w5x.jpg',
    tags: ['Action', 'RPG', 'Adventure'],
    screenshots: [
      'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6w5w.jpg',
      'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6w5v.jpg',
      'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6w5u.jpg',
    ],
    videos: ['https://www.youtube.com/watch?v=c0i88t0Kacs'],
    reviews: [],
    requirements: {
      os: 'Windows 7/8/8.1/10 64-bit',
      processor: 'Intel CPU Core i5-2500K 3.3GHz / AMD CPU Phenom II X4 940',
      memory: '6 GB RAM',
      graphics: 'Nvidia GPU GeForce GTX 660 / AMD GPU Radeon HD 7870',
      storage: '35 GB available space',
    },
  },
  {
    id: 'g3',
    slug: 'hades',
    title: 'Hades',
    description: 'Defy the god of the dead as you hack and slash out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion and Transistor.',
    price: 24.99,
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2852.jpg',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6qwv.jpg',
    tags: ['Action', 'Indie', 'RPG'],
    screenshots: [
        'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6qwu.jpg',
        'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6qwt.jpg',
        'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6qws.jpg',
    ],
    videos: ['https://www.youtube.com/watch?v=mD8x5gV7_1Q'],
    reviews: [],
    requirements: {
      os: 'Windows 7 SP1',
      processor: 'Dual Core 2.4 GHz',
      memory: '4 GB RAM',
      graphics: '1GB VRAM / DirectX 10+ support',
      storage: '15 GB available space',
    },
  },
  {
    id: 'g4',
    slug: 'stardew-valley',
    title: 'Stardew Valley',
    description: 'You\'ve inherited your grandfather\'s old farm plot in Stardew Valley. Armed with hand-me-down tools and a few coins, you set out to begin your new life.',
    price: 14.99,
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co292w.jpg',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6qxt.jpg',
    tags: ['Indie', 'RPG', 'Strategy'],
    screenshots: [
        'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6qxs.jpg',
        'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6qxr.jpg',
        'https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6qxq.jpg',
    ],
    videos: ['https://www.youtube.com/watch?v=ot7uXNQskhs'],
    reviews: [],
    requirements: {
      os: 'Windows Vista or greater',
      processor: '2 Ghz',
      memory: '2 GB RAM',
      graphics: '256 mb video memory, shader model 3.0+',
      storage: '500 MB available space',
    },
  },
];
export const MOCK_USER_PROFILES: UserProfile[] = [
  {
    id: 'user-1',
    username: 'shadcn',
    bio: 'Building beautiful things.',
    avatar: 'https://github.com/shadcn.png',
    hoursPlayed: 1234,
    achievementsCount: 88,
    friendsCount: 123,
    favoriteGames: ['cyberpunk-2077', 'hades'],
    settings: {
      profilePublic: true,
      emailNotifications: true,
    },
  },
];
export const MOCK_FRIENDS: Friend[] = [
  { id: 'friend-1', username: 'CyberNinja', status: 'Online', game: 'cyberpunk-2077', avatar: 'https://i.pravatar.cc/150?u=friend1' },
  { id: 'friend-2', username: 'WitcherFan', status: 'Offline', avatar: 'https://i.pravatar.cc/150?u=friend2' },
  { id: 'friend-3', username: 'HadesPlayer', status: 'In Game', game: 'hades', avatar: 'https://i.pravatar.cc/150?u=friend3' },
];