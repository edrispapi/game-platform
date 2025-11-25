export interface DatabaseEnv {
  DATABASE_URL?: string;
  DATABASE_API_KEY?: string;
  DEFAULT_USER_ID?: string;
}

export function resolveEnv(partial?: DatabaseEnv): Required<Pick<DatabaseEnv, 'DATABASE_URL'>> & DatabaseEnv {
  const DATABASE_URL = partial?.DATABASE_URL || process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required to use the API server.');
  }
  return {
    DATABASE_URL,
    DATABASE_API_KEY: partial?.DATABASE_API_KEY || process.env.DATABASE_API_KEY,
    DEFAULT_USER_ID: partial?.DEFAULT_USER_ID || process.env.DEFAULT_USER_ID,
  };
}

