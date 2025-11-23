// Database Adapter - Allows switching between Durable Objects and PostgreSQL
import type { Env } from '../core-utils';
import { PostgresService } from './postgres-service';
import { GameEntity, UserEntity, FriendEntity, OrderEntity, NotificationEntity, FriendRequestEntity, AchievementEntity, ChatMessageEntity, ForumPostEntity, ForumReplyEntity, WorkshopItemEntity } from '../entities';
import type { Game, UserProfile, Friend, Order, Notification, FriendRequest, Achievement, ChatMessage, ForumPost, ForumReply, WorkshopItem } from '@shared/types';

// Feature flag to switch between DO and PostgreSQL
// Set to false to use Durable Objects (for development/testing without PostgreSQL)
const USE_POSTGRES = true; // Set to true to use PostgreSQL (requires DATABASE_URL)

export class DatabaseAdapter {
  private postgres?: PostgresService;
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
    if (USE_POSTGRES && env.DATABASE_URL) {
      this.postgres = new PostgresService(env);
    }
  }
  
  // Games
  async getGames(filters?: { tag?: string; search?: string; sort?: string; minPrice?: number; maxPrice?: number }): Promise<{ items: Game[] }> {
    if (USE_POSTGRES && this.postgres) {
      try {
        const games = await this.postgres.getGames(filters);
        console.log(`[PostgreSQL] Retrieved ${games.length} games`);
        return { items: games as any[] };
      } catch (error: any) {
        console.error('[PostgreSQL] Query failed, falling back to Durable Objects:', error?.message || error);
        // Fall through to Durable Objects
      }
    }
    
    // Fallback to Durable Objects
    console.log('[Durable Objects] Using fallback data');
    await GameEntity.ensureSeed(this.env);
    const page = await GameEntity.list(this.env);
    return page;
  }
  
  async getGameBySlug(slug: string): Promise<Game | null> {
    if (USE_POSTGRES && this.postgres) {
      return await this.postgres.getGameBySlug(slug) as any;
    }
    
    // Fallback to Durable Objects
    await GameEntity.ensureSeed(this.env);
    const { items } = await GameEntity.list(this.env);
    return items.find(g => g.slug === slug) || null;
  }
  
  // Users
  async getUser(id: string): Promise<UserProfile | null> {
    if (USE_POSTGRES && this.postgres) {
      return await this.postgres.getUser(id) as any;
    }
    
    // Fallback to Durable Objects
    const user = new UserEntity(this.env, id);
    if (await user.exists()) {
      return await user.getState();
    }
    return null;
  }
  
  async getUserByUsername(username: string): Promise<UserProfile | null> {
    if (USE_POSTGRES && this.postgres) {
      return await this.postgres.getUserByUsername(username) as any;
    }
    
    // Fallback - would need to search through all users
    await UserEntity.ensureSeed(this.env);
    const { items } = await UserEntity.list(this.env);
    return items.find(u => u.username === username) || null;
  }
  
  async searchUsers(query: string, limit: number = 10): Promise<UserProfile[]> {
    if (USE_POSTGRES && this.postgres) {
      return await this.postgres.searchUsers(query, limit) as any[];
    }
    
    // Fallback to Durable Objects
    await UserEntity.ensureSeed(this.env);
    const { items } = await UserEntity.list(this.env);
    const lowerQuery = query.toLowerCase();
    return items
      .filter(u => 
        u.username.toLowerCase().includes(lowerQuery) ||
        u.bio.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }
  
  async updateUserStatus(userId: string, status: string, gameSlug?: string): Promise<void> {
    if (USE_POSTGRES && this.postgres) {
      await this.postgres.updateUserStatus(userId, status, gameSlug);
      return;
    }
    
    // Fallback to Durable Objects
    await FriendEntity.ensureSeed(this.env);
    const { items: allFriends } = await FriendEntity.list(this.env);
    for (const friendEntry of allFriends) {
      if (friendEntry.id === userId) {
        const friend = new FriendEntity(this.env, friendEntry.id);
        if (await friend.exists()) {
          await friend.patch({ 
            status: status as any,
            game: status === 'In Game' && gameSlug ? gameSlug : undefined
          });
        }
      }
    }
  }
  
  // Friends
  async getFriends(userId: string = 'user-1'): Promise<{ items: Friend[] }> {
    if (USE_POSTGRES && this.postgres) {
      const friends = await this.postgres.getFriends(userId);
      return { items: friends as any[] };
    }
    
    // Fallback to Durable Objects
    await FriendEntity.ensureSeed(this.env);
    const page = await FriendEntity.list(this.env);
    return page;
  }
  
  // Forum Posts
  async getForumPosts(gameSlug: string): Promise<ForumPost[]> {
    if (USE_POSTGRES && this.postgres) {
      return await this.postgres.getForumPosts(gameSlug) as any[];
    }
    
    // Fallback to Durable Objects
    await ForumPostEntity.ensureSeed(this.env);
    const { items } = await ForumPostEntity.list(this.env);
    return items.filter(p => p.gameSlug === gameSlug);
  }
  
  async createForumPost(gameSlug: string, userId: string, title: string, content: string, tags: string[] = []): Promise<ForumPost> {
    if (USE_POSTGRES && this.postgres) {
      return await this.postgres.createForumPost(gameSlug, userId, title, content, tags) as any;
    }
    
    // Fallback to Durable Objects
    const postId = crypto.randomUUID();
    const newPost: ForumPost = {
      id: postId,
      gameSlug,
      author: 'user', // Would need to fetch from user
      authorId: userId,
      authorAvatar: '',
      title,
      content,
      createdAt: Date.now(),
      replies: 0,
      views: 0,
      likes: 0,
      tags,
      pinned: false,
    };
    await ForumPostEntity.create(this.env, newPost);
    return newPost;
  }
  
  // Forum Replies
  async getForumReplies(postId: string): Promise<ForumReply[]> {
    if (USE_POSTGRES && this.postgres) {
      return await this.postgres.getForumReplies?.(postId) as any[] || [];
    }
    
    // Fallback to Durable Objects
    await ForumReplyEntity.ensureSeed(this.env);
    const { items } = await ForumReplyEntity.list(this.env);
    return items.filter(r => r.postId === postId);
  }
  
  // Workshop Items
  async getWorkshopItems(gameSlug: string, filters?: { type?: string; search?: string }): Promise<WorkshopItem[]> {
    if (USE_POSTGRES && this.postgres) {
      return await this.postgres.getWorkshopItems(gameSlug, filters) as any[];
    }
    
    // Fallback to Durable Objects
    await WorkshopItemEntity.ensureSeed(this.env);
    const { items } = await WorkshopItemEntity.list(this.env);
    return items.filter(i => i.gameSlug === gameSlug);
  }
  
  // Chat Messages
  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    if (USE_POSTGRES && this.postgres) {
      // Would need to implement in PostgresService
      return [];
    }
    
    // Fallback to Durable Objects
    await ChatMessageEntity.ensureSeed(this.env);
    const { items } = await ChatMessageEntity.list(this.env);
    return items.filter(m => m.chatId === chatId).sort((a, b) => a.ts - b.ts);
  }
  
  async createChatMessage(chatId: string, userId: string, text: string): Promise<ChatMessage> {
    if (USE_POSTGRES && this.postgres) {
      // Would need to implement in PostgresService
      throw new Error('Not implemented in PostgreSQL yet');
    }
    
    // Fallback to Durable Objects
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      chatId,
      userId,
      text,
      ts: Date.now(),
    };
    await ChatMessageEntity.create(this.env, message);
    return message;
  }
  
  // Friend Requests
  async getFriendRequests(): Promise<{ items: FriendRequest[] }> {
    if (USE_POSTGRES && this.postgres) {
      // Would need to implement
      return { items: [] };
    }
    
    // Fallback to Durable Objects
    await FriendRequestEntity.ensureSeed(this.env);
    const { items } = await FriendRequestEntity.list(this.env);
    const pending = items.filter(req => req.status === 'pending');
    return { items: pending };
  }
  
  async createFriendRequest(senderId: string, receiverUsername: string): Promise<FriendRequest> {
    if (USE_POSTGRES && this.postgres) {
      return await this.postgres.createFriendRequest(senderId, receiverUsername) as any;
    }
    
    // Fallback to Durable Objects
    const sender = new UserEntity(this.env, senderId);
    const senderProfile = await sender.getState();
    const newRequest: FriendRequest = {
      id: crypto.randomUUID(),
      fromUserId: senderProfile.id,
      fromUsername: senderProfile.username,
      fromUserAvatar: senderProfile.avatar,
      status: 'pending',
    };
    await FriendRequestEntity.create(this.env, newRequest);
    return newRequest;
  }
}

