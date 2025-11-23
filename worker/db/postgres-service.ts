// PostgreSQL Service Layer
// This replaces Durable Objects with PostgreSQL queries

interface Env {
  DATABASE_URL?: string;
  DATABASE_API_KEY?: string;
}

// For local development, use direct PostgreSQL connection
// For Cloudflare Workers, use HTTP-based PostgreSQL (Neon, Supabase, etc.)

let postgresClient: any = null;

async function getPostgresClient(dbUrl: string) {
  // Check if we're in a Node.js/Bun environment (local development)
  // @ts-ignore - process may not be defined in Cloudflare Workers
  const isNodeEnv = typeof process !== 'undefined' && (process.versions?.node || process.versions?.bun);
  if (isNodeEnv) {
    try {
      // Dynamic import for local development
      const postgres = await import('postgres');
      if (!postgresClient) {
        postgresClient = (postgres.default || postgres)(dbUrl, {
          max: 10,
          idle_timeout: 20,
          connect_timeout: 10,
        });
      }
      return postgresClient;
    } catch (error) {
      console.error('Failed to load postgres module:', error);
      throw new Error('PostgreSQL client not available. Install with: bun add postgres');
    }
  }
  return null;
}

export class PostgresService {
  private dbUrl: string;
  private apiKey?: string;
  private isLocalDev: boolean;
  
  constructor(env: Env) {
    this.dbUrl = env.DATABASE_URL || '';
    this.apiKey = env.DATABASE_API_KEY;
    // Check if we're in local development (Node.js/Bun environment)
    // @ts-ignore - process may not be defined in Cloudflare Workers
    this.isLocalDev = typeof process !== 'undefined' && !!(process.versions?.node || process.versions?.bun);
  }
  
  private async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    // For local development with postgresql:// URL, use HTTP bridge server
    // The bridge server runs locally (port 8788) and connects to PostgreSQL
    if (this.dbUrl.startsWith('postgresql://')) {
      // Use local bridge server
      const bridgeUrl = 'http://localhost:8788';
      try {
        const response = await fetch(`${bridgeUrl}/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sql, params }),
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(`Database query failed: ${error.error || response.statusText}`);
        }
        
        const data = await response.json() as { rows?: T[]; error?: string };
        if (data.error) {
          throw new Error(data.error);
        }
        return data.rows || [];
      } catch (error: any) {
        console.error('PostgreSQL bridge connection failed:', error?.message || error);
        throw error;
      }
    }
    
    // For Cloudflare Workers or HTTP-based connections (Neon, Supabase, etc.)
    if (this.dbUrl.startsWith('http://') || this.dbUrl.startsWith('https://')) {
      const response = await fetch(`${this.dbUrl}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({ query: sql, params }),
      });
      
      if (!response.ok) {
        throw new Error(`Database query failed: ${response.statusText}`);
      }
      
      const data = await response.json() as { rows?: T[] };
      return data.rows || [];
    }
    
    throw new Error('Invalid DATABASE_URL. Use postgresql:// for local dev (with bridge) or http:// for Cloudflare Workers.');
  }
  
  private async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }
  
  private async execute(sql: string, params: any[] = []): Promise<void> {
    // For local dev with postgres library, execute still uses query
    if (this.isLocalDev && this.dbUrl.startsWith('postgresql://')) {
      await this.query(sql, params);
      return;
    }
    await this.query(sql, params);
  }
  
  // User Methods
  async getUser(id: string) {
    return this.queryOne(
      `SELECT u.*, 
       (SELECT COUNT(*) FROM friends WHERE user_id = u.id) as friends_count,
       (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id AND unlocked = true) as achievements_count,
       (SELECT SUM(hours) FROM user_library WHERE user_id = u.id) as hours_played
       FROM users u WHERE u.id = $1`,
      [id]
    );
  }
  
  async getUserByUsername(username: string) {
    return this.queryOne(
      `SELECT u.*, 
       (SELECT COUNT(*) FROM friends WHERE user_id = u.id) as friends_count,
       (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id AND unlocked = true) as achievements_count,
       (SELECT SUM(hours_played) FROM user_library WHERE user_id = u.id) as hours_played
       FROM users u WHERE LOWER(u.username) = LOWER($1)`,
      [username]
    );
  }
  
  async searchUsers(query: string, limit: number = 10) {
    return this.query(
      `SELECT id, username, bio, avatar_url as avatar 
       FROM users 
       WHERE LOWER(username) LIKE LOWER($1) OR LOWER(bio) LIKE LOWER($1)
       LIMIT $2`,
      [`%${query}%`, limit]
    );
  }
  
  async updateUserStatus(userId: string, status: string, gameSlug?: string) {
    await this.execute(
      `UPDATE users 
       SET status = $1, current_game_slug = $2, last_seen = NOW() 
       WHERE id = $3`,
      [status, gameSlug || null, userId]
    );
    
    // Update friend statuses
    await this.execute(
      `UPDATE friends 
       SET status = $1, current_game_slug = $2, updated_at = NOW() 
       WHERE friend_id = $3`,
      [status, gameSlug || null, userId]
    );
  }
  
  // Game Methods
  async getGames(filters?: { 
    tag?: string; 
    search?: string; 
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    let sql = `SELECT g.id, g.slug, g.title, g.description, g.price, 
      g.cover_image_url, g.banner_image_url, g.created_at,
      COALESCE(AVG(gr.rating), 0) as avg_rating,
      COUNT(DISTINCT gr.id) as review_count
      FROM games g
      LEFT JOIN game_reviews gr ON g.id = gr.game_id
      WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters?.tag) {
      sql += ` AND EXISTS (SELECT 1 FROM game_tags gt2 WHERE gt2.game_id = g.id AND gt2.tag = $${paramIndex})`;
      params.push(filters.tag);
      paramIndex++;
    }
    
    if (filters?.search) {
      sql += ` AND (g.title ILIKE $${paramIndex} OR g.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    if (filters?.minPrice !== undefined) {
      sql += ` AND g.price >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }
    
    if (filters?.maxPrice !== undefined) {
      sql += ` AND g.price <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }
    
    sql += ' GROUP BY g.id, g.slug, g.title, g.description, g.price, g.cover_image_url, g.banner_image_url, g.created_at';
    
    switch (filters?.sort) {
      case 'price-asc':
        sql += ' ORDER BY g.price ASC';
        break;
      case 'price-desc':
        sql += ' ORDER BY g.price DESC';
        break;
      case 'rating':
        sql += ' ORDER BY avg_rating DESC';
        break;
      case 'newest':
        sql += ' ORDER BY g.created_at DESC';
        break;
      default:
        sql += ' ORDER BY review_count DESC, avg_rating DESC';
    }
    
    console.log('[PostgreSQL] Executing games query...');
    const games = await this.query(sql, params);
    console.log(`[PostgreSQL] Found ${games.length} games`);
    
    if (games.length === 0) {
      return [];
    }
    
    // Batch fetch tags and reviews for all games at once (much faster)
    const gameIds = games.map((g: any) => g.id);
    
    console.log('[PostgreSQL] Fetching tags and reviews for', gameIds.length, 'games...');
    
    // Fetch all tags at once
    const tagsSql = `SELECT game_id, tag FROM game_tags WHERE game_id = ANY($1)`;
    const allTags = await this.query(tagsSql, [gameIds]);
    
    // Fetch all reviews at once (limit to recent reviews per game for performance)
    const reviewsSql = `SELECT gr.id, gr.game_id, gr.user_id as userId, u.username, gr.rating, gr.comment, gr.created_at as createdAt
       FROM game_reviews gr
       JOIN users u ON gr.user_id = u.id
       WHERE gr.game_id = ANY($1)
       ORDER BY gr.created_at DESC`;
    const allReviews = await this.query(reviewsSql, [gameIds]);
    
    console.log('[PostgreSQL] Fetched', allTags.length, 'tags and', allReviews.length, 'reviews');
    
    // Group tags and reviews by game_id
    const tagsByGame = new Map<string, string[]>();
    allTags.forEach((t: any) => {
      if (!tagsByGame.has(t.game_id)) {
        tagsByGame.set(t.game_id, []);
      }
      tagsByGame.get(t.game_id)!.push(t.tag);
    });
    
    const reviewsByGame = new Map<string, any[]>();
    allReviews.forEach((r: any) => {
      if (!reviewsByGame.has(r.game_id)) {
        reviewsByGame.set(r.game_id, []);
      }
      reviewsByGame.get(r.game_id)!.push({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        rating: r.rating,
        comment: r.comment,
        createdAt: new Date(r.created_at).getTime(),
      });
    });
    
    // Transform games
    const transformedGames = games.map((game: any) => ({
      id: game.id,
      slug: game.slug,
      title: game.title,
      description: game.description || '',
      price: parseFloat(game.price),
      coverImage: game.cover_image_url || '/images/default-cover.svg',
      bannerImage: game.banner_image_url || '/images/default-banner.svg',
      tags: tagsByGame.get(game.id) || [],
      reviews: reviewsByGame.get(game.id) || [],
      videos: [], // Would need to fetch from game_videos table
      screenshots: [], // Would need to fetch from game_screenshots table
      requirements: {}, // Would need to fetch from game_requirements table
    }));
    
    console.log('[PostgreSQL] Returning', transformedGames.length, 'transformed games');
    return transformedGames;
  }
  
  async getGameBySlug(slug: string) {
    const game = await this.queryOne(
      `SELECT g.*, 
       array_agg(DISTINCT gt.tag) as tags,
       array_agg(DISTINCT gs.url ORDER BY gs.order_index) as screenshots,
       array_agg(DISTINCT gv.url) as videos
       FROM games g
       LEFT JOIN game_tags gt ON g.id = gt.game_id
       LEFT JOIN game_screenshots gs ON g.id = gs.game_id
       LEFT JOIN game_videos gv ON g.id = gv.game_id
       WHERE g.slug = $1
       GROUP BY g.id`,
      [slug]
    );
    
    if (game) {
      // Get requirements
      const requirements = await this.queryOne(
        'SELECT * FROM game_requirements WHERE game_id = $1',
        [game.id]
      );
      game.requirements = requirements || {};
      
      // Get reviews
      const reviews = await this.query(
        `SELECT gr.*, u.username 
         FROM game_reviews gr
         JOIN users u ON gr.user_id = u.id
         WHERE gr.game_id = $1
         ORDER BY gr.created_at DESC`,
        [game.id]
      );
      game.reviews = reviews;
    }
    
    return game;
  }
  
  // Friend Methods
  async getFriends(userId: string) {
    return this.query(
      `SELECT u.id, u.username, u.avatar_url as avatar, 
       f.status, f.current_game_slug as game
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1
       ORDER BY 
         CASE f.status 
           WHEN 'Online' THEN 1 
           WHEN 'In Game' THEN 2 
           ELSE 3 
         END,
         f.updated_at DESC`,
      [userId]
    );
  }
  
  async createFriendRequest(senderId: string, receiverUsername: string) {
    const receiver = await this.getUserByUsername(receiverUsername);
    if (!receiver) {
      throw new Error('User not found');
    }
    
    // Check if already friends
    const existing = await this.queryOne(
      'SELECT * FROM friends WHERE user_id = $1 AND friend_id = $2',
      [senderId, receiver.id]
    );
    if (existing) {
      throw new Error('Already friends');
    }
    
    // Check for existing request
    const existingRequest = await this.queryOne(
      'SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = $3',
      [senderId, receiver.id, 'pending']
    );
    if (existingRequest) {
      throw new Error('Friend request already sent');
    }
    
    const requestId = crypto.randomUUID();
    await this.execute(
      `INSERT INTO friend_requests (id, sender_id, receiver_id, status)
       VALUES ($1, $2, $3, 'pending')`,
      [requestId, senderId, receiver.id]
    );
    
    return {
      id: requestId,
      fromUserId: senderId,
      fromUsername: (await this.getUser(senderId))?.username,
      fromUserAvatar: (await this.getUser(senderId))?.avatar_url,
      status: 'pending',
    };
  }
  
  // Forum Methods
  async getForumPosts(gameSlug: string) {
    const posts = await this.query(
      `SELECT p.*, 
       u.username as author, 
       u.id as author_id,
       u.avatar_url as author_avatar
       FROM forum_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.game_slug = $1
       ORDER BY p.pinned DESC, p.created_at DESC`,
      [gameSlug]
    );
    
    // Transform to match ForumPost type
    return posts.map((p: any) => ({
      id: p.id,
      gameSlug: p.game_slug,
      title: p.title,
      content: p.content,
      author: p.author,
      authorId: p.author_id,
      authorAvatar: p.author_avatar,
      createdAt: new Date(p.created_at).getTime(),
      replies: p.replies_count || 0,
      views: p.views || 0,
      likes: p.likes || 0,
      tags: [], // Would need to join with forum_post_tags
      pinned: p.pinned || false,
    }));
  }
  
  async createForumPost(gameSlug: string, userId: string, title: string, content: string, tags: string[] = []) {
    const postId = crypto.randomUUID();
    await this.execute(
      `INSERT INTO forum_posts (id, game_slug, user_id, title, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [postId, gameSlug, userId, title, content]
    );
    
    // Add tags
    for (const tag of tags) {
      await this.execute(
        'INSERT INTO forum_post_tags (post_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [postId, tag]
      );
    }
    
    const post = await this.queryOne(
      `SELECT p.*, u.username as author, u.id as author_id, u.avatar_url as author_avatar
       FROM forum_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [postId]
    );
    
    if (!post) throw new Error('Failed to create post');
    
    return {
      id: post.id,
      gameSlug: post.game_slug,
      title: post.title,
      content: post.content,
      author: post.author,
      authorId: post.author_id,
      authorAvatar: post.author_avatar,
      createdAt: new Date(post.created_at).getTime(),
      replies: 0,
      views: 0,
      likes: 0,
      tags,
      pinned: false,
    };
  }
  
  async getForumReplies(postId: string) {
    const replies = await this.query(
      `SELECT r.*, u.username as author, u.id as author_id, u.avatar_url as author_avatar
       FROM forum_replies r
       JOIN users u ON r.user_id = u.id
       WHERE r.post_id = $1
       ORDER BY r.created_at ASC`,
      [postId]
    );
    
    return replies.map((r: any) => ({
      id: r.id,
      postId: r.post_id,
      content: r.content,
      author: r.author,
      authorId: r.author_id,
      authorAvatar: r.author_avatar,
      createdAt: new Date(r.created_at).getTime(),
      likes: r.likes || 0,
    }));
  }
  
  // Workshop Methods
  async getWorkshopItems(gameSlug: string, filters?: { type?: string; search?: string }) {
    let sql = `SELECT w.*, 
       u.username as author, 
       u.id as author_id,
       u.avatar_url as author_avatar,
       array_agg(DISTINCT wt.tag) as tags
       FROM workshop_items w
       JOIN users u ON w.user_id = u.id
       LEFT JOIN workshop_item_tags wt ON w.id = wt.item_id
       WHERE w.game_slug = $1`;
    const params: any[] = [gameSlug];
    let paramIndex = 2;
    
    if (filters?.type && filters.type !== 'all') {
      sql += ` AND w.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }
    
    if (filters?.search) {
      sql += ` AND (w.title ILIKE $${paramIndex} OR w.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    sql += ' GROUP BY w.id, u.id ORDER BY w.featured DESC, w.downloads DESC';
    
    return this.query(sql, params);
  }
}

