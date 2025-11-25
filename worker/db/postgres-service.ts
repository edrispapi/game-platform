import type { DatabaseEnv } from './types';

const LOCAL_CLIENTS = new Map<string, any>();

async function getLocalClient(dbUrl: string) {
  if (!LOCAL_CLIENTS.has(dbUrl)) {
    const postgresModule = await import('postgres');
    const postgres = postgresModule.default || (postgresModule as any);
    LOCAL_CLIENTS.set(dbUrl, postgres(dbUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    }));
  }
  return LOCAL_CLIENTS.get(dbUrl);
}

const isHttpUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://');
const isPostgresUrl = (url: string) => url.startsWith('postgres://') || url.startsWith('postgresql://');

export class PostgresService {
  private readonly dbUrl: string;
  private readonly apiKey?: string;

  constructor(env: DatabaseEnv) {
    if (!env?.DATABASE_URL) {
      throw new Error('DATABASE_URL is required to use the PostgreSQL service.');
    }
    this.dbUrl = env.DATABASE_URL;
    this.apiKey = env.DATABASE_API_KEY;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (isPostgresUrl(this.dbUrl)) {
      const client = await getLocalClient(this.dbUrl);
      return client.unsafe(sql, params);
    }

    if (isHttpUrl(this.dbUrl)) {
      const response = await fetch(`${this.dbUrl}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({ query: sql, params }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Database query failed: ${message}`);
      }

      const data = (await response.json()) as { rows?: T[]; error?: string };
      if (data.error) {
        throw new Error(data.error);
      }
      return data.rows || [];
    }

    throw new Error('Invalid DATABASE_URL. Use postgresql:// for local dev or https:// for serverless providers.');
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] || null;
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    await this.query(sql, params);
  }
}
