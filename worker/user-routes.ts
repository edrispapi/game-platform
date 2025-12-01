import { Hono } from 'hono';
import type { Context } from 'hono';
import { DatabaseAdapter } from './db/db-adapter';
import type { DatabaseEnv } from './db/types';
import type {
  Achievement,
  ChatMessage,
  Friend,
  FriendRequest,
  FriendStatus,
  Game,
  GameReview,
  GameTag,
  Notification,
  Order,
  UserHoursByGenre,
  UserProfile,
  WorkshopItem,
  ForumPost,
  ForumReply,
} from '@shared/types';

const DEMO_AVATAR = '/images/avatars/default.svg';

function ok(c: Context, data: any) {
  return c.json({ success: true, data }, 200);
}

function notFound(c: Context, message: string) {
  return c.json({ success: false, error: message }, 404);
}

function bad(c: Context, message: string) {
  return c.json({ success: false, error: message }, 400);
}

const getEnv = (c: Context): DatabaseEnv => ({
  ...(c.env as DatabaseEnv),
  DATABASE_URL: (c.env as DatabaseEnv)?.DATABASE_URL ?? process.env.DATABASE_URL,
  DATABASE_API_KEY: (c.env as DatabaseEnv)?.DATABASE_API_KEY ?? process.env.DATABASE_API_KEY,
  DEFAULT_USER_ID: (c.env as DatabaseEnv)?.DEFAULT_USER_ID ?? process.env.DEFAULT_USER_ID,
});

const getAdapter = (c: Context) => new DatabaseAdapter(getEnv(c));

async function resolveUserId(c: Context, db: DatabaseAdapter): Promise<string> {
  const explicitId = c.req.header('x-user-id') || c.req.query('userId') || db.defaultUserIdFromEnv;
  if (explicitId) return explicitId;
  return db.getDefaultUserId();
}

const mapGameListRow = (row: any, tags: Map<string, string[]>, reviews: Map<string, GameReview[]>): Game => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description || '',
  price: Number(row.price) || 0,
  coverImage: row.cover_image_url || '/images/default-cover.svg',
  bannerImage: row.banner_image_url || '/images/default-banner.svg',
  tags: (tags.get(row.id) || []) as GameTag[],
  screenshots: row.screenshots ?? [],
  videos: row.videos ?? [],
  reviews: reviews.get(row.id) || [],
  requirements: row.requirements || {},
});

async function fetchGames(db: DatabaseAdapter, filters: Record<string, string | undefined>) {
  const params: any[] = [];
  let idx = 1;
  let sql = `SELECT g.id, g.slug, g.title, g.description, g.price, g.cover_image_url, g.banner_image_url
             FROM games g WHERE 1=1`;

  if (filters.tag) {
    sql += ` AND EXISTS (SELECT 1 FROM game_tags gt WHERE gt.game_id = g.id AND gt.tag = $${idx})`;
    params.push(filters.tag);
    idx++;
  }

  if (filters.search) {
    sql += ` AND (g.title ILIKE $${idx} OR g.description ILIKE $${idx})`;
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.minPrice) {
    sql += ` AND g.price >= $${idx}`;
    params.push(Number(filters.minPrice));
    idx++;
  }

  if (filters.maxPrice) {
    sql += ` AND g.price <= $${idx}`;
    params.push(Number(filters.maxPrice));
    idx++;
  }

  switch (filters.sort) {
    case 'price-asc':
      sql += ' ORDER BY g.price ASC';
      break;
    case 'price-desc':
      sql += ' ORDER BY g.price DESC';
      break;
    case 'rating':
      sql += ' ORDER BY g.updated_at DESC';
      break;
    case 'newest':
      sql += ' ORDER BY g.created_at DESC';
      break;
    default:
      sql += ' ORDER BY g.title ASC';
  }

  const rows = await db.query(sql, params);
  if (!rows.length) return [];

  const gameIds = rows.map((row: any) => row.id);
  const tagsRows = await db.query<{ game_id: string; tag: string }>('SELECT game_id, tag FROM game_tags WHERE game_id = ANY($1)', [gameIds]);
  const tagsByGame = new Map<string, string[]>();
  tagsRows.forEach(({ game_id, tag }) => {
    const bucket = tagsByGame.get(game_id) || [];
    bucket.push(tag);
    tagsByGame.set(game_id, bucket);
  });

  const reviewRows = await db.query<any>(
    `SELECT gr.id, gr.game_id, gr.user_id, u.username, gr.rating, gr.comment, gr.created_at
     FROM game_reviews gr
     JOIN users u ON gr.user_id = u.id
     WHERE gr.game_id = ANY($1)
     ORDER BY gr.created_at DESC`,
    [gameIds]
  );
  const reviewsByGame = new Map<string, GameReview[]>();
  reviewRows.forEach((row) => {
    const bucket = reviewsByGame.get(row.game_id) || [];
    bucket.push({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      rating: row.rating,
      comment: row.comment,
      createdAt: new Date(row.created_at).getTime(),
    });
    reviewsByGame.set(row.game_id, bucket);
  });

  return rows.map((row: any) => mapGameListRow(row, tagsByGame, reviewsByGame));
}

async function fetchGameBySlug(db: DatabaseAdapter, slug: string): Promise<Game | null> {
  const row = await db.queryOne<any>(
    `SELECT g.*, COALESCE(json_agg(DISTINCT gt.tag) FILTER (WHERE gt.tag IS NOT NULL), '[]') as tag_list
     FROM games g
     LEFT JOIN game_tags gt ON gt.game_id = g.id
     WHERE g.slug = $1
     GROUP BY g.id`,
    [slug]
  );

  if (!row) return null;

  const screenshots = await db.query<{ url: string }>('SELECT url FROM game_screenshots WHERE game_id = $1 ORDER BY order_index ASC', [row.id]);
  const videos = await db.query<{ url: string }>('SELECT url FROM game_videos WHERE game_id = $1', [row.id]);
  const requirements = await db.queryOne<any>('SELECT * FROM game_requirements WHERE game_id = $1', [row.id]);
  const reviews = await db.query<any>(
    `SELECT gr.id, gr.user_id, u.username, gr.rating, gr.comment, gr.created_at
     FROM game_reviews gr JOIN users u ON gr.user_id = u.id
     WHERE gr.game_id = $1 ORDER BY gr.created_at DESC`,
    [row.id]
  );

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description || '',
    price: Number(row.price) || 0,
    coverImage: row.cover_image_url || '/images/default-cover.svg',
    bannerImage: row.banner_image_url || '/images/default-banner.svg',
    tags: row.tag_list || [],
    screenshots: screenshots.map((s) => s.url),
    videos: videos.map((v) => v.url),
    reviews: reviews.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      rating: r.rating,
      comment: r.comment,
      createdAt: new Date(r.created_at).getTime(),
    })),
    requirements: requirements || {
      os: '', processor: '', memory: '', graphics: '', storage: '',
    },
  };
}

async function fetchUserProfile(db: DatabaseAdapter, userId: string): Promise<UserProfile | null> {
  const row = await db.queryOne<any>(
    `SELECT u.*,
            COALESCE(s.profile_public, true) AS profile_public,
            COALESCE(s.email_notifications, true) AS email_notifications,
            COALESCE(s.hide_online_status, false) AS hide_online_status,
            COALESCE(s.two_factor_enabled, false) AS two_factor_enabled
     FROM users u
     LEFT JOIN user_settings s ON s.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (!row) return null;

  const favorites = await db.query<{ game_slug: string }>('SELECT game_slug FROM user_favorite_games WHERE user_id = $1', [userId]);

  // Calculate hours played from user_playtime_by_genre
  const hoursPlayedResult = await db.queryOne<{ total_hours: number }>(
    'SELECT COALESCE(SUM(hours), 0) as total_hours FROM user_playtime_by_genre WHERE user_id = $1',
    [userId]
  );
  const hoursPlayed = hoursPlayedResult?.total_hours || row.hours_played || 0;

  // Calculate achievements count from user_achievements
  const achievementsResult = await db.queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1',
    [userId]
  );
  const achievementsCount = achievementsResult?.count || row.achievements_count || 0;

  // Calculate friends count from friends table (bidirectional relationship)
  const friendsResult = await db.queryOne<{ count: number }>(
    `SELECT COUNT(DISTINCT CASE 
        WHEN user_id = $1 THEN friend_id 
        WHEN friend_id = $1 THEN user_id 
      END) as count 
     FROM friends 
     WHERE user_id = $1 OR friend_id = $1`,
    [userId]
  );
  const friendsCount = friendsResult?.count || row.friends_count || 0;

  // For the profile view we trust the explicit status flag written by use-user-status.
  // Friends lists still do their own last_seen-based computation separately.
  const computedStatus: FriendStatus = (row.status as FriendStatus) || 'Offline';

  return {
    id: row.id,
    username: row.username,
    bio: row.bio || '',
    avatar: row.avatar_url || DEMO_AVATAR,
    email: row.email,
    status: computedStatus,
    hoursPlayed: Number(hoursPlayed),
    achievementsCount: Number(achievementsCount),
    friendsCount: Number(friendsCount),
    favoriteGames: favorites.map((f) => f.game_slug),
    settings: {
      profilePublic: row.profile_public,
      emailNotifications: row.email_notifications,
      hideOnlineStatus: row.hide_online_status || false,
      twoFactorEnabled: row.two_factor_enabled || false,
    },
  };
}

export function userRoutes(app: Hono) {
  app.get('/api/games', async (c) => {
    try {
      const db = getAdapter(c);
      const items = await fetchGames(db, {
        search: c.req.query('q') || undefined,
        tag: c.req.query('tag') || undefined,
        sort: c.req.query('sort') || undefined,
        minPrice: c.req.query('minPrice') || undefined,
        maxPrice: c.req.query('maxPrice') || undefined,
      });
      return ok(c, { items });
    } catch (error) {
      console.error('[games:list] failed', error);
      return c.json({ success: false, error: 'Failed to load games' }, 500);
    }
  });

  app.get('/api/games/:slug', async (c) => {
    try {
      const db = getAdapter(c);
      const game = await fetchGameBySlug(db, c.req.param('slug'));
      if (!game) {
        return notFound(c, 'Game not found');
      }
      return ok(c, game);
    } catch (error) {
      console.error('[games:detail] failed', error);
      return c.json({ success: false, error: 'Failed to load game' }, 500);
    }
  });

  app.get('/api/games/:slug/reviews', async (c) => {
    const db = getAdapter(c);
    const slug = c.req.param('slug');
    const reviews = await db.query<any>(
      `SELECT gr.id, gr.rating, gr.comment, gr.created_at, gr.user_id, u.username, u.avatar_url
       FROM game_reviews gr
       JOIN games g ON g.id = gr.game_id
       JOIN users u ON u.id = gr.user_id
       WHERE g.slug = $1
       ORDER BY gr.created_at DESC`,
      [slug]
    );
    return ok(c, {
      items: reviews.map((review) => ({
        id: review.id,
        userId: review.user_id,
        username: review.username,
        avatar: review.avatar_url || DEMO_AVATAR,
        rating: review.rating,
        comment: review.comment,
        createdAt: new Date(review.created_at + 'Z').getTime(), // Ensure UTC interpretation
      })),
    });
  });

  app.post('/api/games/:slug/reviews', async (c) => {
    const db = getAdapter(c);
    const slug = c.req.param('slug');
    const { rating, comment } = await c.req.json<{ rating: number; comment: string }>();
    if (!rating || !comment) {
      return bad(c, 'Rating and comment are required');
    }
    const userId = await resolveUserId(c, db);
    const gameRow = await db.queryOne<{ id: string }>('SELECT id FROM games WHERE slug = $1', [slug]);
    if (!gameRow) {
      return notFound(c, 'Game not found');
    }
    const reviewId = crypto.randomUUID();
    // Allow multiple reviews per (game,user) by using a simple INSERT without ON CONFLICT.
    await db.execute(
      `INSERT INTO game_reviews (id, game_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [reviewId, gameRow.id, userId, rating, comment.trim()]
    );
    // Fetch the actual created_at timestamp from database
    const reviewRow = await db.queryOne<{ created_at: Date; username: string; avatar_url: string }>(
      `SELECT gr.created_at, u.username, u.avatar_url
       FROM game_reviews gr
       JOIN users u ON u.id = gr.user_id
       WHERE gr.id = $1`,
      [reviewId]
    );
    return ok(c, {
      id: reviewId,
      userId,
      username: reviewRow?.username || 'player',
      avatar: reviewRow?.avatar_url || DEMO_AVATAR,
      rating,
      comment: comment.trim(),
      createdAt: reviewRow ? new Date(reviewRow.created_at).getTime() : Date.now(),
    });
  });

  app.get('/api/profile', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const profile = await fetchUserProfile(db, userId);
    if (!profile) {
      return notFound(c, 'User profile not found');
    }
    return ok(c, profile);
  });

  app.post('/api/profile', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const payload = (await c.req.json()) as Partial<UserProfile>;
    if (!payload.username || payload.bio === undefined) {
      return bad(c, 'Invalid profile payload');
    }
    await db.execute('UPDATE users SET username = $1, bio = $2, updated_at = NOW() WHERE id = $3', [payload.username.trim(), payload.bio, userId]);
    return ok(c, { success: true });
  });

  app.get('/api/user/:username', async (c) => {
    const db = getAdapter(c);
    const currentUserId = await resolveUserId(c, db).catch(() => null);
    const username = c.req.param('username');
    
    const profile = await db.queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    if (!profile) {
      return notFound(c, 'User not found');
    }
    
    const result = await fetchUserProfile(db, profile.id);
    if (!result) {
      return notFound(c, 'User profile not found');
    }
    
    // Check if user has hidden their online status (only hide from other users, not themselves)
    if (currentUserId && currentUserId !== profile.id) {
      const settings = await db.queryOne<{ hide_online_status: boolean }>(
        'SELECT hide_online_status FROM user_settings WHERE user_id = $1',
        [profile.id]
      );
      if (settings?.hide_online_status) {
        result.status = 'Offline'; // Hide status from other users
      }
    }
    
    return ok(c, result);
  });

  app.get('/api/users/search', async (c) => {
    const query = c.req.query('q') || '';
    if (query.length < 2) {
      return ok(c, { items: [] });
    }
    const db = getAdapter(c);
    const items = await db.query<any>(
      `SELECT id, username, bio, avatar_url FROM users WHERE username ILIKE $1 OR bio ILIKE $1 LIMIT 10`,
      [`%${query}%`]
    );
    return ok(c, { items: items.map((item) => ({
      id: item.id,
      username: item.username,
      bio: item.bio,
      avatar: item.avatar_url || DEMO_AVATAR,
    })) });
  });

  app.post('/api/profile/settings', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const settings = (await c.req.json()) as UserProfile['settings'];
    if (!settings) {
      return bad(c, 'Invalid settings payload');
    }
    await db.execute(
      `INSERT INTO user_settings (user_id, profile_public, email_notifications, hide_online_status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET 
         profile_public = EXCLUDED.profile_public, 
         email_notifications = EXCLUDED.email_notifications,
         hide_online_status = EXCLUDED.hide_online_status,
         updated_at = NOW()`,
      [userId, settings.profilePublic, settings.emailNotifications, settings.hideOnlineStatus || false]
    );
    return ok(c, { success: true });
  });

  // Update avatar for current user
  app.post('/api/profile/avatar', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const { avatarUrl } = await c.req.json<{ avatarUrl: string }>();
    if (!avatarUrl) {
      return bad(c, 'avatarUrl is required');
    }
    await db.execute('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, userId]);
    return ok(c, { success: true });
  });

  app.post('/api/profile/change-password', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const { currentPassword, newPassword } = await c.req.json<{ currentPassword: string; newPassword: string }>();
    
    if (!currentPassword || !newPassword) {
      return bad(c, 'Current password and new password are required');
    }
    
    if (newPassword.length < 8) {
      return bad(c, 'New password must be at least 8 characters');
    }
    
    // In a real app, you would verify current password against hashed password in database
    // For now, we'll just update it (in production, use bcrypt or similar)
    const user = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) {
      return notFound(c, 'User not found');
    }
    
    // In production: hash the new password with bcrypt
    // For now, we'll just return success (NOT SECURE - for demo only)
    return ok(c, { success: true, message: 'Password changed successfully' });
  });

  app.post('/api/profile/two-factor', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const { enabled } = await c.req.json<{ enabled: boolean }>();
    
    // In production, generate a real 2FA secret and QR code
    // For demo, we'll return a placeholder
    if (enabled) {
      // Generate a mock secret (in production, use a library like speakeasy)
      const secret = 'JBSWY3DPEHPK3PXP'; // Base32 encoded secret
      const username = await db.queryOne<{ username: string }>('SELECT username FROM users WHERE id = $1', [userId]);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/CrimsonGrid:${username?.username || userId}?secret=${secret}&issuer=CrimsonGrid`;
      
      // Store 2FA secret in database
      await db.execute(
        `INSERT INTO user_settings (user_id, two_factor_enabled, two_factor_secret)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET 
           two_factor_enabled = EXCLUDED.two_factor_enabled,
           two_factor_secret = EXCLUDED.two_factor_secret,
           updated_at = NOW()`,
        [userId, true, secret]
      );
      
      return ok(c, { 
        success: true, 
        qrCode: qrCodeUrl,
        secret: secret
      });
    } else {
      await db.execute(
        `UPDATE user_settings SET two_factor_enabled = false, two_factor_secret = NULL WHERE user_id = $1`,
        [userId]
      );
      return ok(c, { success: true });
    }
  });

  // Demo login endpoint: resolves a user by email (no real password check).
  app.post('/api/login-demo', async (c) => {
    const db = getAdapter(c);
    const { email } = await c.req.json<{ email: string }>();
    if (!email) {
      return bad(c, 'Email is required');
    }
    const user = await db.queryOne<{ id: string; username: string; email: string }>(
      'SELECT id, username, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (!user) {
      return bad(c, 'User not found');
    }
    return ok(c, { id: user.id, username: user.username, email: user.email });
  });

  app.post('/api/register', async (c) => {
    const db = getAdapter(c);
    const { username, email, password } = await c.req.json<{ username: string; email: string; password: string }>();
    
    if (!username || !email || !password) {
      return bad(c, 'Username, email, and password are required');
    }
    
    if (password.length < 8) {
      return bad(c, 'Password must be at least 8 characters');
    }
    
    // Check if username or email already exists
    const existingUser = await db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [username, email]
    );
    
    if (existingUser) {
      return bad(c, 'Username or email already exists');
    }
    
    // Create user (in production, hash password with bcrypt)
    const userId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO users (id, username, email, password_hash, status)
       VALUES ($1, $2, $3, $4, 'Offline')`,
      [userId, username.trim(), email.trim().toLowerCase(), password] // In production: hash password
    );
    
    // Create default settings
    await db.execute(
      `INSERT INTO user_settings (user_id, profile_public, email_notifications)
       VALUES ($1, true, true)`,
      [userId]
    );
    
    return ok(c, { 
      success: true, 
      userId,
      message: 'Account created successfully'
    });
  });

  app.post('/api/users/:userId/status', async (c) => {
    const db = getAdapter(c);
    const userId = c.req.param('userId');
    const { status, gameSlug } = await c.req.json<{ status: FriendStatus; gameSlug?: string }>();
    if (!status || !['Online', 'Offline', 'In Game'].includes(status)) {
      return bad(c, 'Invalid status');
    }
    await db.execute(
      `UPDATE users SET status = $1, current_game_slug = $2, last_seen = NOW() WHERE id = $3`,
      [status, gameSlug || null, userId]
    );
    await db.execute('UPDATE friends SET status = $1, current_game_slug = $2, updated_at = NOW() WHERE friend_id = $3', [status, gameSlug || null, userId]);
    return ok(c, { success: true });
  });

  app.get('/api/users/:userId/status', async (c) => {
    const db = getAdapter(c);
    const status = await db.queryOne<{ status: FriendStatus; current_game_slug?: string }>(
      'SELECT status, current_game_slug FROM users WHERE id = $1',
      [c.req.param('userId')]
    );
    if (!status) {
      return ok(c, { status: 'Offline', game: undefined });
    }
    return ok(c, { status: status.status, game: status.current_game_slug || undefined });
  });

  app.get('/api/friends', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    // Get friends from both directions (bidirectional relationship)
    const rows = await db.query<any>(
      `SELECT DISTINCT u.id, u.username, u.avatar_url, u.status, u.current_game_slug, u.last_seen
       FROM friends f
       JOIN users u ON (u.id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END)
       WHERE (f.user_id = $1 OR f.friend_id = $1) AND u.id != $1
       ORDER BY u.status DESC, u.last_seen DESC`,
      [userId]
    );
    
    // Compute status based on last_seen
    return ok(c, { 
      items: rows.map((row) => {
        let computedStatus: FriendStatus = row.status || 'Offline';
        if (row.last_seen) {
          const lastSeenDate = new Date(row.last_seen);
          const minutesAgo = (Date.now() - lastSeenDate.getTime()) / (1000 * 60);
          if (row.status === 'Online' || minutesAgo <= 5) {
            computedStatus = row.status === 'In Game' ? 'In Game' : 'Online';
          } else if (minutesAgo <= 30) {
            computedStatus = 'Offline';
          } else {
            computedStatus = 'Offline';
          }
        }
        return {
          id: row.id,
          username: row.username,
          avatar: row.avatar_url || DEMO_AVATAR,
          status: computedStatus,
          game: row.current_game_slug || undefined,
        };
      })
    });
  });

  app.post('/api/friends/remove', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const { userId: targetUserId } = await c.req.json() as { userId: string };
    
    if (!targetUserId) {
      return bad(c, 'User ID is required');
    }
    
    // Remove friendship from both directions
    await db.execute(
      `DELETE FROM friends 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, targetUserId]
    );
    
    return ok(c, { success: true });
  });

  app.get('/api/friend-requests', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const rows = await db.query<any>(
      `SELECT fr.id, fr.status, fr.sender_id, u.username, u.avatar_url
       FROM friend_requests fr
       JOIN users u ON u.id = fr.sender_id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    return ok(c, { items: rows.map((row) => ({
      id: row.id,
      fromUserId: row.sender_id,
      fromUsername: row.username,
      fromUserAvatar: row.avatar_url || DEMO_AVATAR,
      status: row.status,
    })) });
  });

  app.post('/api/friend-requests/add', async (c) => {
    const { username } = await c.req.json<{ username: string }>();
    if (!username) {
      return bad(c, 'Username is required');
    }
    const db = getAdapter(c);
    const senderId = await resolveUserId(c, db);
    const receiver = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (!receiver) {
      return notFound(c, 'User not found');
    }
    const existing = await db.queryOne(
      `SELECT id FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [senderId, receiver.id]
    );
    if (existing) {
      return bad(c, 'Friend request already sent');
    }
    const requestId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO friend_requests (id, sender_id, receiver_id, status) VALUES ($1, $2, $3, 'pending')`,
      [requestId, senderId, receiver.id]
    );

    const senderProfile = await fetchUserProfile(db, senderId);

    // Create a notification for the receiver so it appears in /notifications
    await db.execute(
      `INSERT INTO notifications (id, user_id, type, message)
       VALUES ($1, $2, 'friend-request', $3)`,
      [
        crypto.randomUUID(),
        receiver.id,
        `${senderProfile?.username || 'A player'} sent you a friend request`,
      ]
    );

    return ok(c, {
      id: requestId,
      fromUserId: senderId,
      fromUsername: senderProfile?.username || 'player',
      fromUserAvatar: senderProfile?.avatar || DEMO_AVATAR,
      status: 'pending',
    } satisfies FriendRequest);
  });

  app.post('/api/friend-requests/:id/accept', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const requestId = c.req.param('id');
    const request = await db.queryOne<any>(
      `SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2`,
      [requestId, userId]
    );
    if (!request) {
      return notFound(c, 'Friend request not found');
    }
    if (request.status !== 'pending') {
      return bad(c, 'Friend request already processed');
    }
    await db.execute(`UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1`, [requestId]);
    const insertFriend = `INSERT INTO friends (id, user_id, friend_id, status, current_game_slug)
                          VALUES ($1, $2, $3, 'Online', NULL)
                          ON CONFLICT (user_id, friend_id) DO NOTHING`;
    await db.execute(insertFriend, [crypto.randomUUID(), userId, request.sender_id]);
    await db.execute(insertFriend, [crypto.randomUUID(), request.sender_id, userId]);
    return ok(c, { success: true });
  });

  app.post('/api/friend-requests/:id/reject', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const requestId = c.req.param('id');
    const request = await db.queryOne<any>(
      `SELECT id FROM friend_requests WHERE id = $1 AND receiver_id = $2`,
      [requestId, userId]
    );
    if (!request) {
      return notFound(c, 'Friend request not found');
    }
    await db.execute(`UPDATE friend_requests SET status = 'rejected', updated_at = NOW() WHERE id = $1`, [requestId]);
    return ok(c, { success: true });
  });

  app.post('/api/users/block', async (c) => {
    const { userId: targetId } = await c.req.json<{ userId: string }>();
    if (!targetId) {
      return bad(c, 'User ID is required');
    }
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    await db.execute(
      `INSERT INTO blocked_users (id, user_id, blocked_user_id) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, blocked_user_id) DO NOTHING`,
      [crypto.randomUUID(), userId, targetId]
    );
    return ok(c, { success: true, message: 'User blocked successfully' });
  });

  app.get('/api/users/blocked', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const rows = await db.query<any>(
      `SELECT bu.blocked_user_id as id, u.username, u.avatar_url
       FROM blocked_users bu
       JOIN users u ON u.id = bu.blocked_user_id
       WHERE bu.user_id = $1`,
      [userId]
    );
    return ok(c, { items: rows.map((row) => ({ id: row.id, username: row.username, avatar: row.avatar_url || DEMO_AVATAR })) });
  });

  // Get sent friend requests (requests from current user to others)
  app.get('/api/friend-requests/sent', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const rows = await db.query<any>(
      `SELECT fr.id, fr.receiver_id, fr.status, u.username
       FROM friend_requests fr
       JOIN users u ON u.id = fr.receiver_id
       WHERE fr.sender_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    return ok(c, { items: rows.map((row) => ({
      id: row.id,
      receiverId: row.receiver_id,
      receiverUsername: row.username,
      status: row.status,
    })) });
  });

  app.get('/api/users/recommended', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db).catch(() => null);
    
    // Get all users except current user, friends, and blocked users
    const excludeClause = userId ? `
      AND u.id != $1
      AND u.id NOT IN (SELECT friend_id FROM friends WHERE user_id = $1)
      AND u.id NOT IN (SELECT blocked_user_id FROM blocked_users WHERE user_id = $1)
      AND u.id NOT IN (SELECT user_id FROM blocked_users WHERE blocked_user_id = $1)
    ` : '';
    
    const pendingCheck = userId ? `EXISTS (
                SELECT 1 FROM friend_requests fr 
                WHERE fr.sender_id = $1 AND fr.receiver_id = u.id AND fr.status = 'pending'
              )` : 'false';
    
    const params = userId ? [userId] : [];
    const rows = await db.query<any>(
      `SELECT u.id, u.username, u.bio, u.avatar_url, u.status,
              COALESCE(u.hours_played, 0) as hours_played,
              COALESCE(u.friends_count, 0) as friends_count,
              ${pendingCheck} as has_pending_request
       FROM users u
       WHERE 1=1 ${excludeClause}
       ORDER BY hours_played DESC, friends_count DESC
       LIMIT 50`
    , params);
    
    return ok(c, {
      items: rows.map((row) => ({
        id: row.id,
        username: row.username,
        bio: row.bio || '',
        avatar: row.avatar_url || DEMO_AVATAR,
        hoursPlayed: Number(row.hours_played) || 0,
        friendsCount: Number(row.friends_count) || 0,
        hasPendingRequest: Boolean(row.has_pending_request),
        status: row.status || 'Offline',
      })),
    });
  });

  app.get('/api/users/all', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db).catch(() => null);
    const { limit = '100', offset = '0' } = c.req.query();
    
    // Get all users except current user, friends, and blocked users
    const excludeClause = userId ? `
      AND u.id != $1
      AND u.id NOT IN (SELECT friend_id FROM friends WHERE user_id = $1)
      AND u.id NOT IN (SELECT blocked_user_id FROM blocked_users WHERE user_id = $1)
      AND u.id NOT IN (SELECT user_id FROM blocked_users WHERE blocked_user_id = $1)
    ` : '';
    
    const pendingCheck = userId ? `EXISTS (
                SELECT 1 FROM friend_requests fr 
                WHERE fr.sender_id = $1 AND fr.receiver_id = u.id AND fr.status = 'pending'
              )` : 'false';
    
    const params = userId ? [userId, limit, offset] : [limit, offset];
    const paramOffset = userId ? 1 : 0;
    
    const rows = await db.query<any>(
      `SELECT u.id, u.username, u.bio, u.avatar_url, u.status,
              COALESCE(u.hours_played, 0) as hours_played,
              COALESCE(u.friends_count, 0) as friends_count,
              ${pendingCheck} as has_pending_request
       FROM users u
       WHERE 1=1 ${excludeClause}
       ORDER BY u.username ASC
       LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}`
    , params);
    
    return ok(c, {
      items: rows.map((row) => ({
        id: row.id,
        username: row.username,
        bio: row.bio || '',
        avatar: row.avatar_url || DEMO_AVATAR,
        hoursPlayed: Number(row.hours_played) || 0,
        friendsCount: Number(row.friends_count) || 0,
        hasPendingRequest: Boolean(row.has_pending_request),
        status: row.status || 'Offline',
      })),
    });
  });

  app.post('/api/users/unblock', async (c) => {
    const { userId: targetId } = await c.req.json<{ userId: string }>();
    if (!targetId) {
      return bad(c, 'User ID is required');
    }
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    await db.execute('DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2', [userId, targetId]);
    return ok(c, { success: true, message: 'User unblocked successfully' });
  });

  app.get('/api/achievements', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const rows = await db.query<any>(
      `SELECT a.id, a.name, a.description, a.icon_url, a.rarity,
              COALESCE(ua.progress, 0) AS progress,
              COALESCE(ua.unlocked, false) AS unlocked
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       ORDER BY a.name ASC`,
      [userId]
    );
    return ok(c, {
      items: rows.map(
        (row): Achievement => ({
          id: row.id,
          name: row.name,
          description: row.description,
          icon: row.icon_url || '/images/achievements/default.svg',
          rarity: row.rarity,
          progress: row.progress,
          unlocked: row.unlocked,
        })
      ),
    });
  });

  app.get('/api/orders', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const orders = await db.query<any>(
      `SELECT id, total, status, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    if (!orders.length) {
      return ok(c, { items: [] });
    }
    const orderIds = orders.map((o: any) => o.id);
    const items = await db.query<any>(
      `SELECT order_id, game_id, title, price, quantity FROM order_items WHERE order_id = ANY($1)`,
      [orderIds]
    );
    const itemsByOrder = new Map<string, Order['items']>();
    items.forEach((item) => {
      const bucket = itemsByOrder.get(item.order_id) || [];
      bucket.push({
        gameId: item.game_id,
        title: item.title,
        price: Number(item.price),
        quantity: item.quantity,
      });
      itemsByOrder.set(item.order_id, bucket);
    });
    return ok(c, {
      items: orders.map(
        (order): Order => ({
          id: order.id,
          userId,
          items: itemsByOrder.get(order.id) || [],
          total: Number(order.total),
          createdAt: new Date(order.created_at).getTime(),
        })
      ),
    });
  });

  app.post('/api/orders', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const { items, total } = await c.req.json<{ items: Order['items']; total: number }>();
    if (!items?.length || total === undefined) {
      return bad(c, 'Invalid order payload');
    }
    const orderId = crypto.randomUUID();
    await db.execute('INSERT INTO orders (id, user_id, total, status) VALUES ($1, $2, $3, $4)', [orderId, userId, total, 'completed']);
    for (const item of items) {
      await db.execute(
        `INSERT INTO order_items (id, order_id, game_id, title, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), orderId, item.gameId, item.title, item.price, item.quantity]
      );
    }
    return ok(c, {
      id: orderId,
      userId,
      items,
      total,
      createdAt: Date.now(),
    } satisfies Order);
  });

  app.get('/api/notifications', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const rows = await db.query<any>(
      `SELECT id, type, message, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return ok(c, {
      items: rows.map(
        (row): Notification => ({
          id: row.id,
          type: row.type,
          message: row.message,
          read: row.read,
          createdAt: new Date(row.created_at).getTime(),
        })
      ),
    });
  });

  app.post('/api/notifications/:id/read', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const notificationId = c.req.param('id');
    await db.execute('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [notificationId, userId]);
    return ok(c, { success: true });
  });

  app.get('/api/chats/:chatId/messages', async (c) => {
    const db = getAdapter(c);
    const rows = await db.query<any>(
      `SELECT id, user_id, text, created_at FROM chat_messages WHERE chat_id = $1 ORDER BY created_at ASC`,
      [c.req.param('chatId')]
    );
    return ok(c, rows.map((row): ChatMessage => ({
      id: row.id,
      chatId: c.req.param('chatId'),
      userId: row.user_id,
      text: row.text,
      ts: new Date(row.created_at).getTime(),
    })));
  });

  app.post('/api/chats/:chatId/messages', async (c) => {
    const db = getAdapter(c);
    const chatId = c.req.param('chatId');
    const { userId, text } = await c.req.json<{ userId: string; text: string }>();
    if (!userId || !text?.trim()) {
      return bad(c, 'userId and text are required');
    }
    const messageId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO chat_messages (id, chat_id, user_id, text) VALUES ($1, $2, $3, $4)`,
      [messageId, chatId, userId, text.trim()]
    );
    return ok(c, { id: messageId, chatId, userId, text: text.trim(), ts: Date.now() } satisfies ChatMessage);
  });

  app.get('/api/games/:slug/forum/posts', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db).catch(() => null);
    const rows = await db.query<any>(
      `SELECT p.*, u.username, u.avatar_url, COUNT(r.id) AS reply_count
       FROM forum_posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN forum_replies r ON r.post_id = p.id
       WHERE p.game_slug = $1
       GROUP BY p.id, u.id
       ORDER BY p.pinned DESC, p.created_at DESC`,
      [c.req.param('slug')]
    );
    
    // Get liked posts for current user
    const likedPostIds = userId && rows.length > 0 ? await db.query<{ post_id: string }>(
      'SELECT post_id FROM forum_post_likes WHERE user_id = $1 AND post_id = ANY($2)',
      [userId, rows.map(r => r.id)]
    ) : [];
    const likedSet = new Set(likedPostIds.map(l => l.post_id));
    
    // Get tags for all posts
    const postTags = rows.length > 0 ? await db.query<{ post_id: string; tag: string }>(
      'SELECT post_id, tag FROM forum_post_tags WHERE post_id = ANY($1)',
      [rows.map(r => r.id)]
    ) : [];
    const tagsByPost = new Map<string, string[]>();
    postTags.forEach(pt => {
      const existing = tagsByPost.get(pt.post_id) || [];
      existing.push(pt.tag);
      tagsByPost.set(pt.post_id, existing);
    });
    
    return ok(c, {
      items: rows.map(
        (row): ForumPost => ({
          id: row.id,
          gameSlug: row.game_slug,
          title: row.title,
          content: row.content,
          author: row.username,
          authorId: row.user_id,
          authorAvatar: row.avatar_url || DEMO_AVATAR,
          createdAt: new Date(row.created_at).getTime(),
          replies: Number(row.reply_count) || 0,
          views: Number(row.views) || 0,
          likes: Number(row.likes) || 0,
          isLiked: likedSet.has(row.id),
          tags: tagsByPost.get(row.id) || [],
          pinned: row.pinned,
        })
      ),
    });
  });

  app.post('/api/games/:slug/forum/posts', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const { title, content, tags } = await c.req.json<{ title: string; content: string; tags?: string[] }>();
    if (!title || !content) {
      return bad(c, 'Title and content are required');
    }
    const postId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO forum_posts (id, game_slug, user_id, title, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [postId, c.req.param('slug'), userId, title.trim(), content.trim()]
    );
    if (tags?.length) {
      for (const tag of tags) {
        await db.execute('INSERT INTO forum_post_tags (post_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, tag]);
      }
    }
    // Fetch the actual created_at timestamp from database
    const postRow = await db.queryOne<{ created_at: Date; username: string; avatar_url: string }>(
      `SELECT p.created_at, u.username, u.avatar_url
       FROM forum_posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [postId]
    );
    return ok(c, {
      id: postId,
      gameSlug: c.req.param('slug'),
      title: title.trim(),
      content: content.trim(),
      author: postRow?.username || 'player',
      authorId: userId,
      authorAvatar: postRow?.avatar_url || DEMO_AVATAR,
      createdAt: postRow ? new Date(postRow.created_at).getTime() : Date.now(),
      replies: 0,
      views: 0,
      likes: 0,
      tags: tags || [],
    } satisfies ForumPost);
  });

  app.get('/api/forum/posts/:postId', async (c) => {
    const db = getAdapter(c);
    const postId = c.req.param('postId');
    const userId = await resolveUserId(c, db).catch(() => null);
    
    const post = await db.queryOne<any>(
      `SELECT p.*, u.username, u.avatar_url,
              (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id) AS reply_count
       FROM forum_posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [postId]
    );
    if (!post) {
      return notFound(c, 'Post not found');
    }
    
    // Increment views only if user hasn't viewed this post recently (prevent spam)
    // For simplicity, we'll increment on each view, but in production you'd track per-user views
    await db.execute('UPDATE forum_posts SET views = views + 1 WHERE id = $1', [postId]);
    
    // Get tags for this post
    const postTags = await db.query<{ tag: string }>(
      'SELECT tag FROM forum_post_tags WHERE post_id = $1',
      [postId]
    );
    
    return ok(c, {
      id: post.id,
      gameSlug: post.game_slug,
      title: post.title,
      content: post.content,
      author: post.username,
      authorId: post.user_id,
      authorAvatar: post.avatar_url || DEMO_AVATAR,
      createdAt: new Date(post.created_at).getTime(),
      replies: Number(post.reply_count) || 0,
      views: (post.views || 0) + 1,
      likes: post.likes || 0,
      tags: postTags.map(pt => pt.tag),
      pinned: post.pinned,
    } satisfies ForumPost);
  });

  app.post('/api/forum/posts/:postId/like', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const postId = c.req.param('postId');
    
    // Check if already liked
    const existing = await db.queryOne<{ user_id: string }>(
      'SELECT user_id FROM forum_post_likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );
    
    if (existing) {
      // Unlike
      await db.execute('DELETE FROM forum_post_likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      await db.execute('UPDATE forum_posts SET likes = GREATEST(likes - 1, 0) WHERE id = $1', [postId]);
      return ok(c, { success: true, liked: false });
    } else {
      // Like
      await db.execute('INSERT INTO forum_post_likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, postId]);
      await db.execute('UPDATE forum_posts SET likes = likes + 1 WHERE id = $1', [postId]);
      return ok(c, { success: true, liked: true });
    }
  });

  app.get('/api/forum/posts/:postId/replies', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db).catch(() => null);
    const rows = await db.query<any>(
      `SELECT r.*, u.username, u.avatar_url FROM forum_replies r
       JOIN users u ON u.id = r.user_id WHERE r.post_id = $1 ORDER BY r.created_at ASC`,
      [c.req.param('postId')]
    );
    
    // Get liked replies for current user
    const likedReplyIds = userId && rows.length > 0 ? await db.query<{ reply_id: string }>(
      'SELECT reply_id FROM forum_reply_likes WHERE user_id = $1 AND reply_id = ANY($2)',
      [userId, rows.map(r => r.id)]
    ) : [];
    const likedSet = new Set(likedReplyIds.map(l => l.reply_id));
    
    return ok(c, {
      items: rows.map(
        (row): ForumReply => ({
          id: row.id,
          postId: row.post_id,
          content: row.content,
          author: row.username,
          authorId: row.user_id,
          authorAvatar: row.avatar_url || DEMO_AVATAR,
          createdAt: new Date(row.created_at).getTime(),
          likes: row.likes || 0,
          isLiked: likedSet.has(row.id),
        })
      ),
    });
  });

  app.post('/api/forum/posts/:postId/replies', async (c) => {
    const db = getAdapter(c);
    const postId = c.req.param('postId');
    const { content } = await c.req.json<{ content: string }>();
    if (!content?.trim()) {
      return bad(c, 'Reply content is required');
    }
    const userId = await resolveUserId(c, db);
    const replyId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO forum_replies (id, post_id, user_id, content) VALUES ($1, $2, $3, $4)`,
      [replyId, postId, userId, content.trim()]
    );
    await db.execute('UPDATE forum_posts SET replies_count = replies_count + 1 WHERE id = $1', [postId]);
    // Fetch the actual created_at timestamp from database
    const replyRow = await db.queryOne<{ created_at: Date; username: string; avatar_url: string }>(
      `SELECT r.created_at, u.username, u.avatar_url
       FROM forum_replies r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1`,
      [replyId]
    );
    return ok(c, {
      id: replyId,
      postId,
      content: content.trim(),
      author: replyRow?.username || 'player',
      authorId: userId,
      authorAvatar: replyRow?.avatar_url || DEMO_AVATAR,
      createdAt: replyRow ? new Date(replyRow.created_at).getTime() : Date.now(),
      likes: 0,
    } satisfies ForumReply);
  });

  app.post('/api/forum/replies/:replyId/like', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const replyId = c.req.param('replyId');
    
    // Check if already liked
    const existing = await db.queryOne<{ user_id: string }>(
      'SELECT user_id FROM forum_reply_likes WHERE user_id = $1 AND reply_id = $2',
      [userId, replyId]
    );
    
    if (existing) {
      // Unlike
      await db.execute('DELETE FROM forum_reply_likes WHERE user_id = $1 AND reply_id = $2', [userId, replyId]);
      await db.execute('UPDATE forum_replies SET likes = GREATEST(likes - 1, 0) WHERE id = $1', [replyId]);
      return ok(c, { success: true, liked: false });
    } else {
      // Like
      await db.execute('INSERT INTO forum_reply_likes (user_id, reply_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, replyId]);
      await db.execute('UPDATE forum_replies SET likes = likes + 1 WHERE id = $1', [replyId]);
      return ok(c, { success: true, liked: true });
    }
  });

  app.get('/api/games/:slug/workshop/items', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db).catch(() => null);
    const rows = await db.query<any>(
      `SELECT w.*, u.username, u.avatar_url,
              COALESCE(array_agg(DISTINCT wt.tag) FILTER (WHERE wt.tag IS NOT NULL), '{}') AS tags,
              COUNT(DISTINCT wf.user_id) as favorites_count,
              EXISTS(SELECT 1 FROM workshop_favorites wf2 WHERE wf2.item_id = w.id AND wf2.user_id = $2) as is_favorited
       FROM workshop_items w
       JOIN users u ON u.id = w.user_id
       LEFT JOIN workshop_item_tags wt ON wt.item_id = w.id
       LEFT JOIN workshop_favorites wf ON wf.item_id = w.id
       WHERE w.game_slug = $1
       GROUP BY w.id, u.id
       ORDER BY w.featured DESC, w.downloads DESC`,
      [c.req.param('slug'), userId || '']
    );
    return ok(c, {
      items: rows.map(
        (row): WorkshopItem => ({
          id: row.id,
          gameSlug: row.game_slug,
          title: row.title,
          description: row.description,
          author: row.username,
          authorId: row.user_id,
          authorAvatar: row.avatar_url || DEMO_AVATAR,
          createdAt: new Date(row.created_at).getTime(),
          downloads: row.downloads || 0,
          rating: Number(row.rating) || 0,
          tags: row.tags || [],
          type: row.type,
          image: row.image_url || '/images/default-workshop.svg',
          fileUrl: row.file_url || undefined,
          featured: row.featured,
          favorited: row.is_favorited || false,
          favoritesCount: Number(row.favorites_count) || 0,
        })
      ),
    });
  });

  app.post('/api/games/:slug/workshop/items', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const slug = c.req.param('slug');
    const { title, description, type, tags, image, fileUrl } = await c.req.json<{
      title: string;
      description: string;
      type: 'mod' | 'skin' | 'map' | 'tool';
      tags?: string[];
      image?: string;
      fileUrl?: string; // URL to uploaded file (3D model, asset, etc.)
    }>();
    if (!title || !description || !type) {
      return bad(c, 'Title, description, and type are required');
    }
    const itemId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO workshop_items (id, game_slug, user_id, title, description, type, image_url, file_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [itemId, slug, userId, title.trim(), description.trim(), type, image || '/images/default-workshop.svg', fileUrl || null]
    );
    if (tags?.length) {
      for (const tag of tags) {
        await db.execute('INSERT INTO workshop_item_tags (item_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING', [itemId, tag]);
      }
    }
    const author = await db.queryOne<{ username: string; avatar_url: string }>('SELECT username, avatar_url FROM users WHERE id = $1', [userId]);
    return ok(c, {
      id: itemId,
      gameSlug: slug,
      title: title.trim(),
      description: description.trim(),
      author: author?.username || 'player',
      authorId: userId,
      authorAvatar: author?.avatar_url || DEMO_AVATAR,
      createdAt: Date.now(),
      downloads: 0,
      rating: 0,
      tags: tags || [],
      type,
      image: image || '/images/default-workshop.svg',
      fileUrl: fileUrl || undefined,
    } satisfies WorkshopItem);
  });

  app.post('/api/workshop/items/:itemId/download', async (c) => {
    const db = getAdapter(c);
    const itemId = c.req.param('itemId');
    const item = await db.queryOne<{ file_url: string; title: string }>(
      'SELECT file_url, title FROM workshop_items WHERE id = $1',
      [itemId]
    );
    if (!item) {
      return notFound(c, 'Workshop item not found');
    }
    await db.execute('UPDATE workshop_items SET downloads = downloads + 1 WHERE id = $1', [itemId]);
    
    // Return download URL
    return ok(c, { 
      success: true, 
      downloadUrl: item.file_url || item.title,
      filename: item.title
    });
  });
  
  app.get('/api/workshop/items/:itemId/file', async (c) => {
    const db = getAdapter(c);
    const itemId = c.req.param('itemId');
    const item = await db.queryOne<{ file_url: string; image_url: string; title: string }>(
      'SELECT file_url, image_url, title FROM workshop_items WHERE id = $1',
      [itemId]
    );
    if (!item) {
      return notFound(c, 'Workshop item not found');
    }
    // Redirect to file URL or return it
    const fileUrl = item.file_url || item.image_url;
    if (fileUrl && fileUrl.startsWith('http')) {
      return c.redirect(fileUrl);
    }
    return ok(c, { url: fileUrl });
  });

  app.post('/api/workshop/items/:itemId/favorite', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const itemId = c.req.param('itemId');
    
    // Check if already favorited
    const existing = await db.queryOne<{ user_id: string }>(
      'SELECT user_id FROM workshop_favorites WHERE user_id = $1 AND item_id = $2',
      [userId, itemId]
    );
    
    if (existing) {
      // Unfavorite
      await db.execute('DELETE FROM workshop_favorites WHERE user_id = $1 AND item_id = $2', [userId, itemId]);
      return ok(c, { favorited: false });
    } else {
      // Favorite
      await db.execute('INSERT INTO workshop_favorites (user_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, itemId]);
      return ok(c, { favorited: true });
    }
  });

  app.get('/api/workshop/items/:itemId/favorite', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db).catch(() => null);
    if (!userId) {
      return ok(c, { favorited: false });
    }
    const favorited = await db.queryOne<{ user_id: string }>(
      'SELECT user_id FROM workshop_favorites WHERE user_id = $1 AND item_id = $2',
      [userId, c.req.param('itemId')]
    );
    return ok(c, { favorited: !!favorited });
  });

  app.get('/api/profile/hours-by-genre', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const rows = await db.query<{ genre: string; hours: number }>(
      `SELECT genre, hours FROM user_playtime_by_genre WHERE user_id = $1`,
      [userId]
    );
    if (!rows.length) {
      return ok(c, { items: [] });
    }
    return ok(c, {
      items: rows.map(
        (row): UserHoursByGenre => ({
          genre: row.genre as UserHoursByGenre['genre'],
          hours: row.hours,
        })
      ),
    });
  });

  app.get('/api/profile/hours-details', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    
    const totalResult = await db.queryOne<{ total_hours: number }>(
      'SELECT COALESCE(SUM(hours), 0) as total_hours FROM user_playtime_by_genre WHERE user_id = $1',
      [userId]
    );
    const total = totalResult?.total_hours || 0;
    
    const rows = await db.query<{ genre: string; hours: number }>(
      `SELECT genre, hours FROM user_playtime_by_genre WHERE user_id = $1 ORDER BY hours DESC`,
      [userId]
    );
    
    const byGenre = rows.map(row => ({ genre: row.genre, hours: row.hours }));
    const topGenre = byGenre.length > 0 ? byGenre[0] : null;
    
    return ok(c, {
      total,
      byGenre,
      topGenre,
    });
  });

  app.get('/api/profile/friends-details', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    
    const rows = await db.query<any>(
      `SELECT DISTINCT u.id, u.username, u.avatar_url, u.status, u.current_game_slug
       FROM friends f
       JOIN users u ON (u.id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END)
       WHERE (f.user_id = $1 OR f.friend_id = $1) AND u.id != $1
       ORDER BY u.status DESC, u.last_seen DESC`,
      [userId]
    );
    
    return ok(c, {
      items: rows.map((row) => {
        let computedStatus: FriendStatus = row.status || 'Offline';
        if (row.last_seen) {
          const lastSeenDate = new Date(row.last_seen);
          const minutesAgo = (Date.now() - lastSeenDate.getTime()) / (1000 * 60);
          if (row.status === 'Online' || minutesAgo <= 5) {
            computedStatus = row.status === 'In Game' ? 'In Game' : 'Online';
          } else if (minutesAgo <= 30) {
            computedStatus = 'Offline';
          } else {
            computedStatus = 'Offline';
          }
        }
        return {
          id: row.id,
          username: row.username,
          avatar: row.avatar_url || DEMO_AVATAR,
          status: computedStatus,
          currentGame: row.current_game_slug || null,
        };
      }),
    });
  });
}
