import { Hono } from "hono";
import type { Env } from './core-utils';
import { GameEntity, UserEntity, FriendEntity, OrderEntity, NotificationEntity, FriendRequestEntity, AchievementEntity } from "./entities";
import { ok, notFound, bad } from './core-utils';
import { FriendRequest, Order, UserProfile } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // GAMES
  app.get('/api/games', async (c) => {
    await GameEntity.ensureSeed(c.env);
    const page = await GameEntity.list(c.env);
    return ok(c, page);
  });
  app.get('/api/games/:slug', async (c) => {
    const slug = c.req.param('slug');
    await GameEntity.ensureSeed(c.env);
    const { items } = await GameEntity.list(c.env);
    const game = items.find(g => g.slug === slug);
    if (!game) {
      return notFound(c, 'Game not found');
    }
    return ok(c, game);
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
  // FRIENDS
  app.get('/api/friends', async (c) => {
    await FriendEntity.ensureSeed(c.env);
    const page = await FriendEntity.list(c.env);
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
    await req.patch({ status: 'accepted' });
    // In a real app, you would also add the user to the friends list
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
  // ACHIEVEMENTS
  app.get('/api/achievements', async (c) => {
    await AchievementEntity.ensureSeed(c.env);
    const page = await AchievementEntity.list(c.env);
    return ok(c, page);
  });
  // ORDERS
  app.get('/api/orders', async (c) => {
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
}