// Test database connection
import { DatabaseAdapter } from './worker/db/db-adapter';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://gameuser:gamepass123@localhost:5432/game_platform';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));
    
    const db = new DatabaseAdapter({ DATABASE_URL });
    
    // Test simple query
    const result = await db.query('SELECT COUNT(*) as count FROM games');
    console.log('✅ Database connection successful!');
    console.log('Games count:', result[0]?.count);
    
    // Test games query
    const games = await db.query('SELECT id, slug, title FROM games LIMIT 5');
    console.log('✅ Games query successful!');
    console.log('Sample games:', games);
    
  } catch (error: any) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testConnection();

