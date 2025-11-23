// Database Adapter - PostgreSQL only
import { PostgresService } from './postgres-service';
import type { Game, UserProfile, Friend, Order, Notification, FriendRequest, Achievement, ChatMessage, ForumPost, ForumReply, WorkshopItem } from '@shared/types';

interface Env {
  DATABASE_URL?: string;
  DATABASE_API_KEY?: string;
}

export class DatabaseAdapter {
  private postgres: PostgresService;
  
  constructor(env: Env) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }
    this.postgres = new PostgresService(env);
  }
  
  // Games
  async getGames(filters?: { tag?: string; search?: string; sort?: string; minPrice?: number; maxPrice?: number }): Promise<{ items: Game[] }> {
    const games = await this.postgres.getGames(filters);
    console.log(`[PostgreSQL] Retrieved ${games.length} games`);
    return { items: games as any[] };
  }
  
  async getGameBySlug(slug: string): Promise<Game | null> {
    return await this.postgres.getGameBySlug(slug) as any;
  }
  
  // Users
  async getUser(id: string): Promise<UserProfile | null> {
    return await this.postgres.getUser(id) as any;
  }
  
  async getUserByUsername(username: string): Promise<UserProfile | null> {
    return await this.postgres.getUserByUsername(username) as any;
  }
  
  async searchUsers(query: string, limit: number = 10): Promise<UserProfile[]> {
    return await this.postgres.searchUsers(query, limit) as any[];
  }
  
  async updateUserStatus(userId: string, status: string, gameSlug?: string): Promise<void> {
    await this.postgres.updateUserStatus(userId, status, gameSlug);
  }
  
  // Friends
  async getFriends(userId: string = 'user-1'): Promise<{ items: Friend[] }> {
    const friends = await this.postgres.getFriends(userId);
    return { items: friends as any[] };
  }
  
  // Forum Posts
  async getForumPosts(gameSlug: string): Promise<ForumPost[]> {
    return await this.postgres.getForumPosts(gameSlug) as any[];
  }
  
  async createForumPost(gameSlug: string, userId: string, title: string, content: string, tags: string[] = []): Promise<ForumPost> {
    return await this.postgres.createForumPost(gameSlug, userId, title, content, tags) as any;
  }
  
  // Forum Replies
  async getForumReplies(postId: string): Promise<ForumReply[]> {
    return await this.postgres.getForumReplies?.(postId) as any[] || [];
  }
  
  // Workshop Items
  async getWorkshopItems(gameSlug: string, filters?: { type?: string; search?: string }): Promise<WorkshopItem[]> {
    return await this.postgres.getWorkshopItems(gameSlug, filters) as any[];
  }
  
  // Chat Messages
  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    // TODO: Implement in PostgresService
    return [];
  }
  
  async createChatMessage(chatId: string, userId: string, text: string): Promise<ChatMessage> {
    // TODO: Implement in PostgresService
    throw new Error('Chat messages not implemented in PostgreSQL yet');
  }
  
  // Friend Requests
  async getFriendRequests(): Promise<{ items: FriendRequest[] }> {
    // TODO: Implement in PostgresService
    return { items: [] };
  }
  
  async createFriendRequest(senderId: string, receiverUsername: string): Promise<FriendRequest> {
    return await this.postgres.createFriendRequest(senderId, receiverUsername) as any;
  }
}
