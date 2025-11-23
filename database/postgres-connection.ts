// PostgreSQL Connection Utility for Cloudflare Workers
// Note: Cloudflare Workers don't support direct PostgreSQL connections
// You'll need to use a connection pooler like PgBouncer or a REST API wrapper

import { Pool } from '@neondatabase/serverless'; // or use @vercel/postgres, @planetscale/database, etc.

export interface DatabaseConfig {
  connectionString: string;
  ssl?: boolean;
  max?: number;
}

let pool: Pool | null = null;

export function getDatabase(config: DatabaseConfig): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl ?? true,
      max: config.max ?? 20,
    });
  }
  return pool;
}

// Alternative: Use HTTP-based PostgreSQL (like Neon Serverless or Supabase)
export async function queryViaHTTP(
  query: string,
  params: any[],
  config: { url: string; apiKey: string }
): Promise<any> {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ query, params }),
  });
  
  if (!response.ok) {
    throw new Error(`Database query failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Example usage with Neon Serverless or similar
export class PostgresClient {
  private config: { url: string; apiKey: string };
  
  constructor(config: { url: string; apiKey: string }) {
    this.config = config;
  }
  
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return queryViaHTTP(sql, params, this.config);
  }
  
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }
  
  async execute(sql: string, params: any[] = []): Promise<{ rowCount: number }> {
    await this.query(sql, params);
    return { rowCount: 1 }; // Simplified
  }
}

