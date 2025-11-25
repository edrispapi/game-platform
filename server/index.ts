import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { userRoutes } from '../worker/user-routes';
import type { DatabaseEnv } from '../worker/db/types';

const PORT = Number(process.env.API_PORT || 8787);

const buildEnv = (): DatabaseEnv => ({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_API_KEY: process.env.DATABASE_API_KEY,
  DEFAULT_USER_ID: process.env.DEFAULT_USER_ID,
});

const app = new Hono<{ Bindings: DatabaseEnv }>();

app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

userRoutes(app);

app.get('/api/health', (c) =>
  c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  })
);

type ServerOptions = Parameters<typeof Bun.serve>[0];

const serverOptions: ServerOptions = {
  port: PORT,
  fetch: (req, server) => app.fetch(req, buildEnv()),
};

const server = Bun.serve(serverOptions);

console.log(`🚀 API server ready on http://localhost:${server.port}`);
console.log(`📦 Connected using DATABASE_URL=${process.env.DATABASE_URL ? 'configured' : 'missing'}`);
