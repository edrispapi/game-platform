export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// Minimal real-world chat example types (shared by frontend and worker)
export interface User {
  id: string;
  name: string;
}
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number; // epoch millis
}
// Crimson Grid specific types
export type GameTag = 'Action' | 'RPG' | 'Strategy' | 'Indie' | 'Shooter' | 'Adventure';
export interface GameReview {
  id: string;
  userId: string;
  username: string;
  rating: number; // 1-5
  comment: string;
  createdAt: number;
}
export interface Game {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  coverImage: string; // URL for card
  bannerImage: string; // URL for detail page hero
  tags: GameTag[];
  screenshots: string[];
  videos: string[];
  reviews: GameReview[];
  requirements: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  };
}
export interface UserProfile {
  id: string;
  username: string;
  bio: string;
  avatar: string;
  hoursPlayed: number;
  achievementsCount: number;
  friendsCount: number;
  favoriteGames: string[]; // array of game slugs
  settings: {
    profilePublic: boolean;
    emailNotifications: boolean;
  };
}
export type FriendStatus = 'Online' | 'Offline' | 'In Game';
export interface Friend {
  id: string;
  username: string;
  avatar: string;
  status: FriendStatus;
  game?: string; // slug of the game they are playing
}
export interface OrderItem {
  gameId: string;
  title: string;
  price: number;
  quantity: number;
}
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  createdAt: number; // timestamp
}
export interface Notification {
  id: string;
  type: 'friend-request' | 'achievement' | 'system' | 'gift';
  message: string;
  read: boolean;
  createdAt: number; // timestamp
}
export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromUserAvatar: string;
  status: 'pending' | 'accepted' | 'rejected';
}
export type AchievementRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: AchievementRarity;
    progress: number; // 0-100
    unlocked: boolean;
}
export interface ForumPost {
  id: string;
  gameSlug: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  createdAt: number;
  replies: number;
  views: number;
  likes: number;
  tags: string[];
  pinned?: boolean;
}
export interface ForumReply {
  id: string;
  postId: string;
  content: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  createdAt: number;
  likes: number;
}
export interface WorkshopItem {
  id: string;
  gameSlug: string;
  title: string;
  description: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  createdAt: number;
  downloads: number;
  rating: number;
  tags: string[];
  type: 'mod' | 'skin' | 'map' | 'tool';
  image: string;
  featured?: boolean;
}
export interface UserHoursByGenre {
  genre: GameTag;
  hours: number;
}