import type { User, Chat, ChatMessage, Game, UserProfile, Friend, Notification, FriendRequest, Achievement, GameReview, Order } from './types';

const baseTimestamp = Date.now();
const minutesAgo = (minutes: number) => baseTimestamp - minutes * 60 * 1000;
const seedReview = (id: string, rating: number, comment: string, minutes: number): GameReview => ({
  id,
  userId: 'user-1',
  username: 'shadcn',
  rating,
  comment,
  createdAt: minutesAgo(minutes),
});
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'User A' },
  { id: 'u2', name: 'User B' }
];
export const MOCK_CHATS: Chat[] = [
  { id: 'c1', title: 'General' },
];
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'm1', chatId: 'c1', userId: 'u1', text: 'Hello', ts: Date.now() },
  // Seed some messages for friend chats (using friend IDs as chatIds)
  { id: 'friend-1-msg-1', chatId: 'friend-1', userId: 'friend-1', text: 'Hey, up for a game of Cyberpunk later?', ts: Date.now() - 1000 * 60 * 30 },
  { id: 'friend-1-msg-2', chatId: 'friend-1', userId: 'user-1', text: "Yeah, definitely! I'll be on around 8 PM.", ts: Date.now() - 1000 * 60 * 29 },
  { id: 'friend-1-msg-3', chatId: 'friend-1', userId: 'friend-1', text: 'Sounds good. See you then!', ts: Date.now() - 1000 * 60 * 28 },
  { id: 'friend-1-msg-4', chatId: 'friend-1', userId: 'user-1', text: '👍', ts: Date.now() - 1000 * 60 * 27 },
  { id: 'friend-3-msg-1', chatId: 'friend-3', userId: 'friend-3', text: 'Just escaped the Underworld again!', ts: Date.now() - 1000 * 60 * 15 },
  { id: 'friend-3-msg-2', chatId: 'friend-3', userId: 'user-1', text: 'Nice! What weapon did you use?', ts: Date.now() - 1000 * 60 * 14 },
];
export const MOCK_GAMES: Game[] = [
  {
    id: 'g1',
    slug: 'cyberpunk-2077',
    title: 'Cyberpunk 2077',
    description: 'An open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.',
    price: 59.99,
    coverImage: '/images/cyberpunk-cover.svg',
    bannerImage: '/images/cyberpunk-banner.svg',
    tags: ['Action', 'RPG', 'Shooter'],
    screenshots: [
      '/images/cyberpunk-shot1.svg',
      '/images/cyberpunk-shot2.svg',
      '/images/cyberpunk-shot3.svg',
    ],
    videos: ['https://www.youtube.com/watch?v=8X2kIfS6fb8'],
    reviews: [
      seedReview('cyberpunk-review-1', 5, 'Night City feels alive on Crimson Grid!', 45),
      seedReview('cyberpunk-review-2', 4, 'Ray tracing looks great even in the browser demo.', 120),
      seedReview('cyberpunk-review-3', 3, 'Needs a few more performance tweaks but still fun.', 240),
    ],
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
    coverImage: '/images/witcher-cover.svg',
    bannerImage: '/images/witcher-banner.svg',
    tags: ['Action', 'RPG', 'Adventure'],
    screenshots: [
      '/images/witcher-shot1.svg',
      '/images/witcher-shot2.svg',
      '/images/witcher-shot3.svg',
    ],
    videos: ['https://www.youtube.com/watch?v=c0i88t0Kacs'],
    reviews: [
      seedReview('witcher-review-1', 5, 'Best RPG library experience here.', 75),
      seedReview('witcher-review-2', 4, 'Gwent deck builder UI is slick.', 300),
    ],
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
    coverImage: '/images/hades-cover.svg',
    bannerImage: '/images/hades-banner.svg',
    tags: ['Action', 'Indie', 'RPG'],
    screenshots: [
        '/images/hades-shot1.svg',
        '/images/hades-shot2.svg',
        '/images/hades-shot3.svg',
    ],
    videos: ['https://www.youtube.com/watch?v=mD8x5gV7_1Q'],
    reviews: [
        seedReview('hades-review-1', 5, 'Fast loading and smooth controls.', 30),
        seedReview('hades-review-2', 4, 'Leaderboards update instantly.', 140),
    ],
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
    description: "You've inherited your grandfather's old farm plot in Stardew Valley. Armed with hand-me-down tools and a few coins, you set out to begin your new life.",
    price: 14.99,
    coverImage: '/images/stardew-cover.svg',
    bannerImage: '/images/stardew-banner.svg',
    tags: ['Indie', 'RPG', 'Strategy'],
    screenshots: [
        '/images/stardew-shot1.svg',
        '/images/stardew-shot2.svg',
        '/images/stardew-shot3.svg',
    ],
    videos: ['https://www.youtube.com/watch?v=ot7uXNQskhs'],
    reviews: [
        seedReview('stardew-review-1', 5, 'Farming at 144fps, what a treat.', 55),
        seedReview('stardew-review-2', 4, 'Photo mode for crops is hilarious.', 260),
    ],
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
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'friend-request',
    message: 'CyberNinja sent you a friend request.',
    read: false,
    createdAt: Date.now() - 1000 * 60 * 5, // 5 minutes ago
  },
  {
    id: 'notif-2',
    type: 'achievement',
    message: 'You unlocked the "Night City Legend" achievement in Cyberpunk 2077.',
    read: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
  },
  {
    id: 'notif-3',
    type: 'system',
    message: 'Welcome to Crimson Grid! Explore the store to find your next favorite game.',
    read: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
  },
];
export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: 'fr-1',
    fromUserId: 'user-4',
    fromUsername: 'StardewFarmer',
    fromUserAvatar: 'https://i.pravatar.cc/150?u=request1',
    status: 'pending',
  },
  {
    id: 'fr-2',
    fromUserId: 'user-5',
    fromUsername: 'ValorantPro',
    fromUserAvatar: 'https://i.pravatar.cc/150?u=request2',
    status: 'pending',
  },
];
export const MOCK_ACHIEVEMENTS: Achievement[] = [
    {
        id: 'ach-1',
        name: 'Night City Legend',
        description: 'Complete the main story of Cyberpunk 2077.',
        icon: 'https://img.icons8.com/plasticine/100/cyberpunk-2077.png',
        rarity: 'Epic',
        progress: 100,
        unlocked: true,
    },
    {
        id: 'ach-2',
        name: 'Master Farmer',
        description: 'Earn 1,000,000g in Stardew Valley.',
        icon: 'https://img.icons8.com/plasticine/100/stardew-valley.png',
        rarity: 'Rare',
        progress: 75,
        unlocked: false,
    },
    {
        id: 'ach-3',
        name: 'Escapist',
        description: 'Successfully escape the underworld in Hades for the first time.',
        icon: 'https://img.icons8.com/plasticine/100/hades-symbol.png',
        rarity: 'Common',
        progress: 100,
        unlocked: true,
    },
    {
        id: 'ach-4',
        name: 'Gwent Master',
        description: 'Collect all Gwent cards in The Witcher 3.',
        icon: 'https://img.icons8.com/plasticine/100/playing-cards.png',
        rarity: 'Legendary',
        progress: 20,
        unlocked: false,
    },
    {
        id: 'ach-5',
        name: 'First Purchase',
        description: 'Buy your first game on Crimson Grid.',
        icon: 'https://img.icons8.com/plasticine/100/shopping-cart-loaded.png',
        rarity: 'Common',
        progress: 100,
        unlocked: true,
    },
];
export const MOCK_ORDERS: Order[] = [
  {
    id: 'order-1',
    userId: 'user-1',
    items: [
      { gameId: 'g1', title: 'Cyberpunk 2077', price: 59.99, quantity: 1 },
    ],
    total: 59.99,
    createdAt: minutesAgo(15),
  },
  {
    id: 'order-2',
    userId: 'user-1',
    items: [
      { gameId: 'g2', title: 'The Witcher 3', price: 39.99, quantity: 1 },
      { gameId: 'g4', title: 'Stardew Valley', price: 14.99, quantity: 1 },
    ],
    total: 54.98,
    createdAt: minutesAgo(180),
  },
  {
    id: 'order-3',
    userId: 'user-1',
    items: [
      { gameId: 'g3', title: 'Hades', price: 24.99, quantity: 2 },
    ],
    total: 49.98,
    createdAt: minutesAgo(720),
  },
];