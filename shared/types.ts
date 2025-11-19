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