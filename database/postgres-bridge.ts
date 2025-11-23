// PostgreSQL HTTP Bridge Server
// This runs locally and bridges Cloudflare Workers to PostgreSQL
// Run with: DATABASE_URL="postgresql://..." bun run database/postgres-bridge.ts

import postgres from 'postgres';

const PORT = 8788;
const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

console.log('✅ Connected to PostgreSQL');
console.log(`🌐 Starting bridge server on http://localhost:${PORT}`);

// Simple HTTP server using Bun's built-in server
Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/sql' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { query, params } = body;
        
        if (!query) {
          return new Response(JSON.stringify({ error: 'Query is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        // Execute query with parameters
        const result = await sql.unsafe(query, params || []);
        
        return new Response(JSON.stringify({ rows: result }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (error: any) {
        console.error('Query error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', database: 'connected' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`✅ PostgreSQL Bridge Server running on http://localhost:${PORT}`);
console.log('   Workers can connect via: http://localhost:8788/sql');

