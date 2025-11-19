import { Hono } from "hono";
import type { Env } from './core-utils';
import { GameEntity, UserEntity, FriendEntity } from "./entities";
import { ok, notFound, bad } from './core-utils';
import { UserProfile } from "@shared/types";
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
}