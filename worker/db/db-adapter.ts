import { PostgresService } from './postgres-service';
import { resolveEnv, type DatabaseEnv } from './types';

export class DatabaseAdapter {
  private static cachedDefaultUserId: string | null = null;
  private readonly service: PostgresService;
  private readonly env: ReturnType<typeof resolveEnv>;

  constructor(env: DatabaseEnv) {
    this.env = resolveEnv(env);
    this.service = new PostgresService(this.env);
  }

  query<T = any>(sql: string, params: any[] = []) {
    return this.service.query<T>(sql, params);
  }

  queryOne<T = any>(sql: string, params: any[] = []) {
    return this.service.queryOne<T>(sql, params);
  }

  execute(sql: string, params: any[] = []) {
    return this.service.execute(sql, params);
  }

  get databaseUrl() {
    return this.env.DATABASE_URL;
  }

  get defaultUserIdFromEnv() {
    return this.env.DEFAULT_USER_ID;
  }

  async getDefaultUserId() {
    if (this.env.DEFAULT_USER_ID) {
      return this.env.DEFAULT_USER_ID;
    }

    if (DatabaseAdapter.cachedDefaultUserId) {
      return DatabaseAdapter.cachedDefaultUserId;
    }

    const row = await this.queryOne<{ id: string }>(
      'SELECT id FROM users ORDER BY created_at ASC LIMIT 1'
    );

    if (!row?.id) {
      throw new Error('No users exist in the database. Seed data before using the API.');
    }

    DatabaseAdapter.cachedDefaultUserId = row.id;
    return row.id;
  }
}
