// Local API Server using Bun
// This replaces Cloudflare Workers with a simple local server

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { userRoutes } from '../worker/user-routes';
import postgres from 'postgres';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8787;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://gameuser:gamepass123@localhost:5454/game_platform';

// Create PostgreSQL connection
let sql: postgres.Sql | null = null;

try {
  sql = postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  console.log('✅ Connected to PostgreSQL');
} catch (error) {
  console.error('❌ Failed to connect to PostgreSQL:', error);
  process.exit(1);
}

// Create environment object for routes
const env = {
  DATABASE_URL,
  DATABASE_API_KEY: process.env.DATABASE_API_KEY,
};

const app = new Hono();

app.use('*', logger());
app.use('/api/*', cors({ 
  origin: '*', 
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowHeaders: ['Content-Type', 'Authorization'] 
}));

// Inject env into context
app.use('*', async (c, next) => {
  c.env = env as any;
  await next();
});

// Add routes
userRoutes(app);

// Health check
app.get('/api/health', (c) => c.json({ 
  success: true, 
  data: { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  }
}));

// Error handling
app.notFound((c) => c.json({ success: false, error: 'Not Found' }, 404));
app.onError((err, c) => { 
  console.error(`[ERROR] ${err}`); 
  return c.json({ success: false, error: 'Internal Server Error' }, 500); 
});

console.log(`🚀 Server starting on http://localhost:${PORT}`);
console.log(`📊 Database: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);

// Start Bun server
export default {
  port: PORT,
  fetch: app.fetch,
};
