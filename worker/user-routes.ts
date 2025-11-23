import { Hono } from "hono";
import type { Context } from 'hono';
import { DatabaseAdapter } from './db/db-adapter';
import { FriendRequest, GameReview, Order, UserProfile, Friend, ChatMessage, FriendStatus, ForumPost, ForumReply, WorkshopItem } from "@shared/types";

// Simple response helpers
function ok(c: Context, data: any) {
  return c.json({ success: true, data }, 200);
}

function notFound(c: Context, message: string) {
  return c.json({ success: false, error: message }, 404);
}

function bad(c: Context, message: string) {
  return c.json({ success: false, error: message }, 400);
}

interface Env {
  DATABASE_URL?: string;
  DATABASE_API_KEY?: string;
}

export function userRoutes(app: Hono) {
  // Get environment from context (will be set by server)
  const getEnv = (c: Context): Env => {
    return (c.env as any) || {
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_API_KEY: process.env.DATABASE_API_KEY,
    };
  };

  // GAMES
  app.get('/api/games', async (c) => {
    try {
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const query = c.req.query('q');
      const tag = c.req.query('tag');
      const sort = c.req.query('sort');
      const minPrice = c.req.query('minPrice') ? parseFloat(c.req.query('minPrice')!) : undefined;
      const maxPrice = c.req.query('maxPrice') ? parseFloat(c.req.query('maxPrice')!) : undefined;
      
      const page = await db.getGames({ 
        search: query, 
        tag: tag || undefined, 
        sort: sort as any,
        minPrice,
        maxPrice,
      });
      return ok(c, page);
    } catch (error: any) {
      console.error('Error loading games:', error);
      return c.json({ 
        success: false, 
        error: 'Failed to load games. Please try again later.',
        data: { items: [] }
      }, 500);
    }
  });

  app.get('/api/games/:slug', async (c) => {
    try {
      const slug = c.req.param('slug');
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const game = await db.getGameBySlug(slug);
      if (!game) {
        return notFound(c, 'Game not found');
      }
      return ok(c, game);
    } catch (error: any) {
      console.error('Error loading game:', error);
      return c.json({ 
        success: false, 
        error: 'Failed to load game. Please try again later.',
        data: undefined
      }, 500);
    }
  });

  // GAME REVIEWS
  app.get('/api/games/:slug/reviews', async (c) => {
    try {
      const slug = c.req.param('slug');
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const game = await db.getGameBySlug(slug);
      if (!game) {
        return notFound(c, 'Game not found');
      }
      // Reviews are included in the game object from PostgreSQL
      return ok(c, { items: (game.reviews || []).sort((a: any, b: any) => b.createdAt - a.createdAt) });
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      return c.json({ success: false, error: 'Failed to load reviews' }, 500);
    }
  });

  app.post('/api/games/:slug/reviews', async (c) => {
    try {
      const slug = c.req.param('slug');
      const { rating, comment } = await c.req.json<{ rating: number; comment: string }>();
      if (!rating || !comment) {
        return bad(c, 'Rating and comment are required');
      }
      // TODO: Implement review creation in PostgresService
      const newReview: GameReview = {
        id: crypto.randomUUID(),
        userId: 'user-1', // TODO: Get from auth context
        username: 'user', // TODO: Get from auth context
        rating,
        comment,
        createdAt: Date.now(),
      };
      return ok(c, newReview);
    } catch (error: any) {
      console.error('Error creating review:', error);
      return c.json({ success: false, error: 'Failed to create review' }, 500);
    }
  });

  // USER PROFILE
  app.get('/api/profile', async (c) => {
    try {
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const user = await db.getUser('user-1'); // TODO: Get from auth context
      if (!user) {
        return notFound(c, 'User profile not found');
      }
      return ok(c, user);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      return c.json({ success: false, error: 'Failed to load profile' }, 500);
    }
  });

  app.post('/api/profile', async (c) => {
    try {
      const { username, bio } = (await c.req.json()) as Partial<UserProfile>;
      if (!username || bio === undefined) return bad(c, 'Invalid profile payload');
      // TODO: Implement profile update in PostgresService
      return ok(c, { success: true });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return c.json({ success: false, error: 'Failed to update profile' }, 500);
    }
  });

  app.get('/api/user/:username', async (c) => {
    try {
      const username = c.req.param('username');
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const user = await db.getUserByUsername(username);
      if (!user) {
        return notFound(c, 'User not found');
      }
      return ok(c, user);
    } catch (error: any) {
      console.error('Error loading user:', error);
      return c.json({ success: false, error: 'Failed to load user' }, 500);
    }
  });

  app.get('/api/users/search', async (c) => {
    try {
      const query = c.req.query('q') || '';
      if (!query || query.length < 2) {
        return ok(c, { items: [] });
      }
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const items = await db.searchUsers(query, 10);
      return ok(c, { items });
    } catch (error: any) {
      console.error('Error searching users:', error);
      return c.json({ success: false, error: 'Failed to search users' }, 500);
    }
  });

  app.post('/api/profile/settings', async (c) => {
    try {
      const settings = (await c.req.json()) as UserProfile['settings'];
      if (!settings) return bad(c, 'Invalid settings payload');
      // TODO: Implement settings update in PostgresService
      return ok(c, { success: true });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      return c.json({ success: false, error: 'Failed to update settings' }, 500);
    }
  });

  // USER STATUS
  app.post('/api/users/:userId/status', async (c) => {
    try {
      const userId = c.req.param('userId');
      const { status, gameSlug } = await c.req.json<{ status: FriendStatus; gameSlug?: string }>();
      if (!status || !['Online', 'Offline', 'In Game'].includes(status)) {
        return bad(c, 'Invalid status');
      }
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      await db.updateUserStatus(userId, status, gameSlug);
      return ok(c, { success: true });
    } catch (error: any) {
      console.error('Error updating status:', error);
      return c.json({ success: false, error: 'Failed to update status' }, 500);
    }
  });

  app.get('/api/users/:userId/status', async (c) => {
    try {
      const userId = c.req.param('userId');
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const user = await db.getUser(userId);
      if (user) {
        // TODO: Get status from user or friends table
        return ok(c, { status: 'Offline', game: undefined });
      }
      return ok(c, { status: 'Offline', game: undefined });
    } catch (error: any) {
      console.error('Error getting status:', error);
      return ok(c, { status: 'Offline', game: undefined });
    }
  });

  // FRIENDS
  app.get('/api/friends', async (c) => {
    try {
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const page = await db.getFriends('user-1'); // TODO: Get from auth context
      return ok(c, page);
    } catch (error: any) {
      console.error('Error loading friends:', error);
      return c.json({ success: false, error: 'Failed to load friends' }, 500);
    }
  });

  // FRIEND REQUESTS
  app.get('/api/friend-requests', async (c) => {
    try {
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const requests = await db.getFriendRequests();
      return ok(c, requests);
    } catch (error: any) {
      console.error('Error loading friend requests:', error);
      return c.json({ success: false, error: 'Failed to load friend requests' }, 500);
    }
  });

  app.post('/api/friend-requests/add', async (c) => {
    try {
      const { username } = await c.req.json<{ username: string }>();
      if (!username) {
        return bad(c, 'Username is required');
      }
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const newRequest = await db.createFriendRequest('user-1', username); // TODO: Get from auth context
      return ok(c, newRequest);
    } catch (error: any) {
      console.error('Error creating friend request:', error);
      return c.json({ success: false, error: error.message || 'Failed to create friend request' }, 500);
    }
  });

  app.post('/api/friend-requests/:id/accept', async (c) => {
    try {
      const id = c.req.param('id');
      // TODO: Implement friend request acceptance in PostgresService
      return ok(c, { success: true });
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      return c.json({ success: false, error: 'Failed to accept friend request' }, 500);
    }
  });

  app.post('/api/friend-requests/:id/reject', async (c) => {
    try {
      const id = c.req.param('id');
      // TODO: Implement friend request rejection in PostgresService
      return ok(c, { success: true });
    } catch (error: any) {
      console.error('Error rejecting friend request:', error);
      return c.json({ success: false, error: 'Failed to reject friend request' }, 500);
    }
  });

  // BLOCK USER
  app.post('/api/users/block', async (c) => {
    const { userId } = await c.req.json<{ userId: string }>();
    if (!userId) {
      return bad(c, 'User ID is required');
    }
    // TODO: Implement in PostgresService
    return ok(c, { success: true, message: 'User blocked successfully' });
  });

  app.get('/api/users/blocked', async (c) => {
    // TODO: Implement in PostgresService
    return ok(c, { items: [] });
  });

  app.post('/api/users/unblock', async (c) => {
    const { userId } = await c.req.json<{ userId: string }>();
    if (!userId) {
      return bad(c, 'User ID is required');
    }
    // TODO: Implement in PostgresService
    return ok(c, { success: true, message: 'User unblocked successfully' });
  });

  // ACHIEVEMENTS
  app.get('/api/achievements', async (c) => {
    // TODO: Implement in PostgresService
    return ok(c, { items: [] });
  });

  // ORDERS
  app.get('/api/orders', async (c) => {
    // TODO: Implement in PostgresService
    return ok(c, { items: [] });
  });

  app.post('/api/orders', async (c) => {
    try {
      const { items, total } = await c.req.json<{ items: Order['items'], total: number }>();
      if (!items || items.length === 0 || total === undefined) {
        return bad(c, 'Invalid order payload');
      }
      // TODO: Implement order creation in PostgresService
      const order: Order = {
        id: crypto.randomUUID(),
        userId: 'user-1', // TODO: Get from auth context
        items,
        total,
        createdAt: Date.now(),
      };
      return ok(c, order);
    } catch (error: any) {
      console.error('Error creating order:', error);
      return c.json({ success: false, error: 'Failed to create order' }, 500);
    }
  });

  // NOTIFICATIONS
  app.get('/api/notifications', async (c) => {
    // TODO: Implement in PostgresService
    return ok(c, { items: [] });
  });

  app.post('/api/notifications/:id/read', async (c) => {
    const id = c.req.param('id');
    // TODO: Implement in PostgresService
    return ok(c, { success: true });
  });

  // CHAT MESSAGES
  app.get('/api/chats/:chatId/messages', async (c) => {
    try {
      const chatId = c.req.param('chatId');
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const messages = await db.getChatMessages(chatId);
      return ok(c, messages);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      return c.json({ success: false, error: 'Failed to load messages' }, 500);
    }
  });

  app.post('/api/chats/:chatId/messages', async (c) => {
    try {
      const chatId = c.req.param('chatId');
      const { userId, text } = await c.req.json<{ userId: string; text: string }>();
      if (!userId || !text?.trim()) {
        return bad(c, 'userId and text are required');
      }
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const newMessage = await db.createChatMessage(chatId, userId, text.trim());
      return ok(c, newMessage);
    } catch (error: any) {
      console.error('Error creating message:', error);
      return c.json({ success: false, error: error.message || 'Failed to create message' }, 500);
    }
  });

  // FORUM POSTS
  app.get('/api/games/:slug/forum/posts', async (c) => {
    try {
      const slug = c.req.param('slug');
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const posts = await db.getForumPosts(slug);
      return ok(c, { items: posts });
    } catch (error: any) {
      console.error('Error loading forum posts:', error);
      return c.json({ success: false, error: 'Failed to load forum posts' }, 500);
    }
  });

  app.post('/api/games/:slug/forum/posts', async (c) => {
    try {
      const slug = c.req.param('slug');
      const { title, content, tags } = await c.req.json<{ title: string; content: string; tags?: string[] }>();
      if (!title || !content) {
        return bad(c, 'Title and content are required');
      }
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const newPost = await db.createForumPost(slug, 'user-1', title.trim(), content.trim(), tags); // TODO: Get from auth context
      return ok(c, newPost);
    } catch (error: any) {
      console.error('Error creating forum post:', error);
      return c.json({ success: false, error: 'Failed to create forum post' }, 500);
    }
  });

  app.get('/api/forum/posts/:postId', async (c) => {
    try {
      const postId = c.req.param('postId');
      // TODO: Implement in PostgresService
      return notFound(c, 'Post not found');
    } catch (error: any) {
      console.error('Error loading post:', error);
      return c.json({ success: false, error: 'Failed to load post' }, 500);
    }
  });

  app.post('/api/forum/posts/:postId/like', async (c) => {
    try {
      const postId = c.req.param('postId');
      // TODO: Implement in PostgresService
      return ok(c, { success: true });
    } catch (error: any) {
      console.error('Error liking post:', error);
      return c.json({ success: false, error: 'Failed to like post' }, 500);
    }
  });

  // FORUM REPLIES
  app.get('/api/forum/posts/:postId/replies', async (c) => {
    try {
      const postId = c.req.param('postId');
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const replies = await db.getForumReplies(postId);
      return ok(c, { items: replies });
    } catch (error: any) {
      console.error('Error loading replies:', error);
      return c.json({ success: false, error: 'Failed to load replies' }, 500);
    }
  });

  app.post('/api/forum/posts/:postId/replies', async (c) => {
    try {
      const postId = c.req.param('postId');
      const { content } = await c.req.json<{ content: string }>();
      if (!content || !content.trim()) {
        return bad(c, 'Reply content is required');
      }
      // TODO: Implement reply creation in PostgresService
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const user = await db.getUser('user-1'); // TODO: Get from auth context
      if (!user) {
        return bad(c, 'User not found');
      }
      const newReply: ForumReply = {
        id: crypto.randomUUID(),
        postId,
        content: content.trim(),
        author: user.username,
        authorId: user.id,
        authorAvatar: user.avatar,
        createdAt: Date.now(),
        likes: 0,
      };
      return ok(c, newReply);
    } catch (error: any) {
      console.error('Error creating reply:', error);
      return c.json({ success: false, error: 'Failed to create reply' }, 500);
    }
  });

  app.post('/api/forum/replies/:replyId/like', async (c) => {
    try {
      const replyId = c.req.param('replyId');
      // TODO: Implement in PostgresService
      return ok(c, { success: true });
    } catch (error: any) {
      console.error('Error liking reply:', error);
      return c.json({ success: false, error: 'Failed to like reply' }, 500);
    }
  });

  // WORKSHOP ITEMS
  app.get('/api/games/:slug/workshop/items', async (c) => {
    try {
      const slug = c.req.param('slug');
      const type = c.req.query('type');
      const search = c.req.query('search');
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const workshopItems = await db.getWorkshopItems(slug, { type: type || undefined, search: search || undefined });
      return ok(c, { items: workshopItems });
    } catch (error: any) {
      console.error('Error loading workshop items:', error);
      return c.json({ success: false, error: 'Failed to load workshop items' }, 500);
    }
  });

  app.post('/api/games/:slug/workshop/items', async (c) => {
    try {
      const slug = c.req.param('slug');
      const { title, description, type, tags, image } = await c.req.json<{ 
        title: string; 
        description: string; 
        type: 'mod' | 'skin' | 'map' | 'tool';
        tags?: string[];
        image?: string;
      }>();
      if (!title || !description || !type) {
        return bad(c, 'Title, description, and type are required');
      }
      // TODO: Implement workshop item creation in PostgresService
      const env = getEnv(c);
      const db = new DatabaseAdapter(env);
      const user = await db.getUser('user-1'); // TODO: Get from auth context
      if (!user) {
        return bad(c, 'User not found');
      }
      const newItem: WorkshopItem = {
        id: crypto.randomUUID(),
        gameSlug: slug,
        title: title.trim(),
        description: description.trim(),
        author: user.username,
        authorId: user.id,
        authorAvatar: user.avatar,
        createdAt: Date.now(),
        downloads: 0,
        rating: 0,
        tags: tags || [],
        type,
        image: image || '/images/default-workshop.svg',
      };
      return ok(c, newItem);
    } catch (error: any) {
      console.error('Error creating workshop item:', error);
      return c.json({ success: false, error: 'Failed to create workshop item' }, 500);
    }
  });

  app.post('/api/workshop/items/:itemId/download', async (c) => {
    try {
      const itemId = c.req.param('itemId');
      // TODO: Implement in PostgresService
      return ok(c, { success: true });
    } catch (error: any) {
      console.error('Error recording download:', error);
      return c.json({ success: false, error: 'Failed to record download' }, 500);
    }
  });

  // USER HOURS BY GENRE
  app.get('/api/profile/hours-by-genre', async (c) => {
    // TODO: Calculate from actual playtime data in PostgreSQL
    return ok(c, {
      items: [
        { genre: 'RPG', hours: 450 },
        { genre: 'Action', hours: 300 },
        { genre: 'Shooter', hours: 150 },
        { genre: 'Indie', hours: 200 },
        { genre: 'Strategy', hours: 80 },
        { genre: 'Adventure', hours: 120 },
      ]
    });
  });
}
