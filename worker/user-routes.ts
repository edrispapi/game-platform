import { Hono } from "hono";
import type { Env } from './core-utils';
import { GameEntity } from "./entities";
import { ok, notFound } from './core-utils';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Ensure games are seeded and list all games
  app.get('/api/games', async (c) => {
    await GameEntity.ensureSeed(c.env);
    const page = await GameEntity.list(c.env);
    return ok(c, page);
  });
  // Get a single game by slug
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
}