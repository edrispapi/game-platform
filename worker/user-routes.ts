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
    const slug = c.req.param('slug');
    const { items } = await GameEntity.list(c.env);
    const game = items.find(g => g.slug === slug);
    if (!game) {
      return notFound(c, 'Game not found');
    }
    // In a real app, reviews would be their own entity. For demo, they are on the game object.
    return ok(c, { items: game.reviews.sort((a, b) => b.createdAt - a.createdAt) });
  });
  app.post('/api/games/:slug/reviews', async (c) => {
    const slug = c.req.param('slug');
    const { rating, comment } = await c.req.json<{ rating: number; comment: string }>();
    if (!rating || !comment) {
      return bad(c, 'Rating and comment are required');
    }
    const { items } = await GameEntity.list(c.env);
    const gameData = items.find(g => g.slug === slug);
    if (!gameData) {
      return notFound(c, 'Game not found');
    }
    const game = new GameEntity(c.env, gameData.id);
    const newReview: GameReview = {
      id: crypto.randomUUID(),
      userId: 'user-1', // Mocked user
      username: 'shadcn', // Mocked user
      rating,
      comment,
      createdAt: Date.now(),
    };
    await game.mutate(g => ({
      ...g,
      reviews: [newReview, ...g.reviews],
    }));
    return ok(c, newReview);
  });
  // USER PROFILE
  // For this demo, we'll assume a single user 'user-1'
  app.get('/api/profile', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const user = new UserEntity(c.env, 'user-1');
    if (!(await user.exists())) {
      return notFound(c, 'User profile not found');
    }
    return ok(c, await user.getState());
  });
  app.post('/api/profile', async (c) => {
    const { username, bio } = (await c.req.json()) as Partial<UserProfile>;
    if (!username || bio === undefined) return bad(c, 'Invalid profile payload');
    const user = new UserEntity(c.env, 'user-1');
    if (!(await user.exists())) {
      return notFound(c, 'User profile not found');
    }
    await user.patch({ username, bio });
    return ok(c, { success: true });
  });
  app.get('/api/user/:username', async (c) => {
    const username = c.req.param('username');
    await UserEntity.ensureSeed(c.env);
    const { items } = await UserEntity.list(c.env);
    const user = items.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return notFound(c, 'User not found');
    }
    return ok(c, user);
  });
  app.get('/api/users/search', async (c) => {
    const query = c.req.query('q') || '';
    if (!query || query.length < 2) {
      return ok(c, { items: [] });
    }
    const env = getEnv(c);
    const db = new DatabaseAdapter(env);
    const items = await db.searchUsers(query, 10);
    return ok(c, { items });
  });
  app.post('/api/profile/settings', async (c) => {
    const settings = (await c.req.json()) as UserProfile['settings'];
    if (!settings) return bad(c, 'Invalid settings payload');
    const user = new UserEntity(c.env, 'user-1');
    if (!(await user.exists())) {
      return notFound(c, 'User profile not found');
    }
    await user.mutate(s => ({ ...s, settings }));
    return ok(c, { success: true });
  });
  // USER STATUS - Real-time status updates
  app.post('/api/users/:userId/status', async (c) => {
    const userId = c.req.param('userId');
    const { status, gameSlug } = await c.req.json<{ status: FriendStatus; gameSlug?: string }>();
    if (!status || !['Online', 'Offline', 'In Game'].includes(status)) {
      return bad(c, 'Invalid status');
    }
    
    const env = getEnv(c);
    const db = new DatabaseAdapter(env);
    await db.updateUserStatus(userId, status, gameSlug);
    
    return ok(c, { success: true });
  });
  app.get('/api/users/:userId/status', async (c) => {
    const userId = c.req.param('userId');
    await FriendEntity.ensureSeed(c.env);
    const friend = new FriendEntity(c.env, userId);
    if (await friend.exists()) {
      const friendData = await friend.getState();
      return ok(c, { status: friendData.status, game: friendData.game });
    }
    return ok(c, { status: 'Offline', game: undefined });
  });
  // FRIENDS
  app.get('/api/friends', async (c) => {
    const env = getEnv(c);
    const db = new DatabaseAdapter(env);
    const page = await db.getFriends('user-1'); // TODO: Get from auth context
    return ok(c, page);
  });
  // FRIEND REQUESTS
  app.get('/api/friend-requests', async (c) => {
    await FriendRequestEntity.ensureSeed(c.env);
    const { items } = await FriendRequestEntity.list(c.env);
    // Filter for pending requests
    const pending = items.filter(req => req.status === 'pending');
    return ok(c, { items: pending });
  });
  app.post('/api/friend-requests/add', async (c) => {
    const { username } = await c.req.json<{ username: string }>();
    if (!username) {
      return bad(c, 'Username is required');
    }
    // In a real app, you'd look up the target user, check for existing requests, etc.
    // For this demo, we'll just create a request from our main user 'shadcn'.
    await UserEntity.ensureSeed(c.env);
    const sender = new UserEntity(c.env, 'user-1');
    const senderProfile = await sender.getState();
    const newRequest: FriendRequest = {
      id: crypto.randomUUID(),
      fromUserId: senderProfile.id,
      fromUsername: senderProfile.username,
      fromUserAvatar: senderProfile.avatar,
      status: 'pending',
    };
    await FriendRequestEntity.create(c.env, newRequest);
    return ok(c, newRequest);
  });
  app.post('/api/friend-requests/:id/accept', async (c) => {
    const id = c.req.param('id');
    const req = new FriendRequestEntity(c.env, id);
    if (!(await req.exists())) {
      return notFound(c, 'Friend request not found');
    }
    const requestData = await req.getState();
    if (requestData.status !== 'pending') {
      return bad(c, 'Friend request already processed');
    }
    await req.patch({ status: 'accepted' });
    // Add the friend to the friends list
    // Check if friend already exists to preserve their current status
    const existingFriend = new FriendEntity(c.env, requestData.fromUserId);
    let friendStatus: FriendStatus = 'Offline'; // Default to Offline since we don't know actual status
    
    if (await existingFriend.exists()) {
      // Friend already exists, preserve their current status
      const existingFriendData = await existingFriend.getState();
      friendStatus = existingFriendData.status;
    }
    
    const newFriend: Friend = {
      id: requestData.fromUserId,
      username: requestData.fromUsername,
      avatar: requestData.fromUserAvatar,
      status: friendStatus,
    };
    
    // Create or update the friend entity
    if (await existingFriend.exists()) {
      // Update existing friend with latest info (preserving status)
      await existingFriend.patch({
        username: requestData.fromUsername,
        avatar: requestData.fromUserAvatar,
      });
    } else {
      // Create new friend with default Offline status
      await FriendEntity.create(c.env, newFriend);
    }
    return ok(c, { success: true });
  });
  app.post('/api/friend-requests/:id/reject', async (c) => {
    const id = c.req.param('id');
    const req = new FriendRequestEntity(c.env, id);
    if (!(await req.exists())) {
      return notFound(c, 'Friend request not found');
    }
    await req.patch({ status: 'rejected' });
    return ok(c, { success: true });
  });
  // BLOCK USER
  app.post('/api/users/block', async (c) => {
    const { userId } = await c.req.json<{ userId: string }>();
    if (!userId) {
      return bad(c, 'User ID is required');
    }
    // In a real app, you'd store blocked users in a separate entity
    // For now, we'll just return success
    return ok(c, { success: true, message: 'User blocked successfully' });
  });
  app.get('/api/users/blocked', async (c) => {
    // In a real app, you'd fetch blocked users from a BlockedUserEntity
    return ok(c, { items: [] });
  });
  app.post('/api/users/unblock', async (c) => {
    const { userId } = await c.req.json<{ userId: string }>();
    if (!userId) {
      return bad(c, 'User ID is required');
    }
    // In a real app, you'd remove the user from BlockedUserEntity
    return ok(c, { success: true, message: 'User unblocked successfully' });
  });
  // ACHIEVEMENTS
  app.get('/api/achievements', async (c) => {
    await AchievementEntity.ensureSeed(c.env);
    const page = await AchievementEntity.list(c.env);
    return ok(c, page);
  });
  // ORDERS
  app.get('/api/orders', async (c) => {
    await OrderEntity.ensureSeed(c.env);
    const page = await OrderEntity.list(c.env);
    // In a real app, you'd filter by userId
    return ok(c, page);
  });
  app.post('/api/orders', async (c) => {
    const { items, total } = await c.req.json<{ items: Order['items'], total: number }>();
    if (!items || items.length === 0 || total === undefined) {
      return bad(c, 'Invalid order payload');
    }
    const order: Order = {
      id: crypto.randomUUID(),
      userId: 'user-1', // Mocked user ID
      items,
      total,
      createdAt: Date.now(),
    };
    await OrderEntity.create(c.env, order);
    return ok(c, order);
  });
  // NOTIFICATIONS
  app.get('/api/notifications', async (c) => {
    await NotificationEntity.ensureSeed(c.env);
    const page = await NotificationEntity.list(c.env);
    return ok(c, page);
  });
  app.post('/api/notifications/:id/read', async (c) => {
    const id = c.req.param('id');
    const notification = new NotificationEntity(c.env, id);
    if (!(await notification.exists())) {
      return notFound(c, 'Notification not found');
    }
    await notification.patch({ read: true });
    return ok(c, { success: true });
  });
  // CHAT MESSAGES
  app.get('/api/chats/:chatId/messages', async (c) => {
    const chatId = c.req.param('chatId');
    await ChatMessageEntity.ensureSeed(c.env);
    const { items } = await ChatMessageEntity.list(c.env);
    // Filter messages by chatId and sort by timestamp
    const messages = items
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => a.ts - b.ts);
    return ok(c, messages);
  });
  app.post('/api/chats/:chatId/messages', async (c) => {
    const chatId = c.req.param('chatId');
    const { userId, text } = await c.req.json<{ userId: string; text: string }>();
    if (!userId || !text?.trim()) {
      return bad(c, 'userId and text are required');
    }
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      chatId,
      userId,
      text: text.trim(),
      ts: Date.now(),
    };
    await ChatMessageEntity.create(c.env, newMessage);
    return ok(c, newMessage);
  });
  // FORUM POSTS
  app.get('/api/games/:slug/forum/posts', async (c) => {
    const slug = c.req.param('slug');
    const env = getEnv(c);
    const db = new DatabaseAdapter(env);
    const posts = await db.getForumPosts(slug);
    return ok(c, { items: posts });
  });
  app.post('/api/games/:slug/forum/posts', async (c) => {
    const slug = c.req.param('slug');
    const { title, content, tags } = await c.req.json<{ title: string; content: string; tags?: string[] }>();
    if (!title || !content) {
      return bad(c, 'Title and content are required');
    }
    const env = getEnv(c);
    const db = new DatabaseAdapter(env);
    const newPost = await db.createForumPost(slug, 'user-1', title.trim(), content.trim(), tags); // TODO: Get from auth context
    return ok(c, newPost);
  });
  app.get('/api/forum/posts/:postId', async (c) => {
    const postId = c.req.param('postId');
    const post = new ForumPostEntity(c.env, postId);
    if (!(await post.exists())) {
      return notFound(c, 'Post not found');
    }
    // Increment views
    await post.mutate(p => ({ ...p, views: p.views + 1 }));
    return ok(c, await post.getState());
  });
  app.post('/api/forum/posts/:postId/like', async (c) => {
    const postId = c.req.param('postId');
    const post = new ForumPostEntity(c.env, postId);
    if (!(await post.exists())) {
      return notFound(c, 'Post not found');
    }
    await post.mutate(p => ({ ...p, likes: p.likes + 1 }));
    return ok(c, { success: true });
  });
  // FORUM REPLIES
  app.get('/api/forum/posts/:postId/replies', async (c) => {
    const postId = c.req.param('postId');
    const env = getEnv(c);
    const db = new DatabaseAdapter(env);
    const replies = await db.getForumReplies(postId);
    return ok(c, { items: replies });
  });
  app.post('/api/forum/posts/:postId/replies', async (c) => {
    const postId = c.req.param('postId');
    const { content } = await c.req.json<{ content: string }>();
    if (!content || !content.trim()) {
      return bad(c, 'Reply content is required');
    }
    await UserEntity.ensureSeed(c.env);
    const user = new UserEntity(c.env, 'user-1');
    const userProfile = await user.getState();
    const newReply: ForumReply = {
      id: crypto.randomUUID(),
      postId,
      content: content.trim(),
      author: userProfile.username,
      authorId: userProfile.id,
      authorAvatar: userProfile.avatar,
      createdAt: Date.now(),
      likes: 0,
    };
    await ForumReplyEntity.create(c.env, newReply);
    // Increment reply count on post
    const post = new ForumPostEntity(c.env, postId);
    if (await post.exists()) {
      await post.mutate(p => ({ ...p, replies: p.replies + 1 }));
    }
    return ok(c, newReply);
  });
  app.post('/api/forum/replies/:replyId/like', async (c) => {
    const replyId = c.req.param('replyId');
    const reply = new ForumReplyEntity(c.env, replyId);
    if (!(await reply.exists())) {
      return notFound(c, 'Reply not found');
    }
    await reply.mutate(r => ({ ...r, likes: r.likes + 1 }));
    return ok(c, { success: true });
  });
  // WORKSHOP ITEMS
  app.get('/api/games/:slug/workshop/items', async (c) => {
    const slug = c.req.param('slug');
    const type = c.req.query('type');
    const search = c.req.query('search');
    const env = getEnv(c);
    const db = new DatabaseAdapter(env);
    const workshopItems = await db.getWorkshopItems(slug, { type: type || undefined, search: search || undefined });
    return ok(c, { items: workshopItems });
  });
  app.post('/api/games/:slug/workshop/items', async (c) => {
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
    await UserEntity.ensureSeed(c.env);
    const user = new UserEntity(c.env, 'user-1');
    const userProfile = await user.getState();
    const newItem: WorkshopItem = {
      id: crypto.randomUUID(),
      gameSlug: slug,
      title: title.trim(),
      description: description.trim(),
      author: userProfile.username,
      authorId: userProfile.id,
      authorAvatar: userProfile.avatar,
      createdAt: Date.now(),
      downloads: 0,
      rating: 0,
      tags: tags || [],
      type,
      image: image || '/images/default-workshop.svg',
    };
    await WorkshopItemEntity.create(c.env, newItem);
    return ok(c, newItem);
  });
  app.post('/api/workshop/items/:itemId/download', async (c) => {
    const itemId = c.req.param('itemId');
    const item = new WorkshopItemEntity(c.env, itemId);
    if (!(await item.exists())) {
      return notFound(c, 'Item not found');
    }
    await item.mutate(i => ({ ...i, downloads: i.downloads + 1 }));
    return ok(c, { success: true });
  });
  // USER HOURS BY GENRE
  app.get('/api/profile/hours-by-genre', async (c) => {
    // In a real app, this would calculate from actual playtime data
    // For now, return mock data structure
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