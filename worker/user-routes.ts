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
  tags: tags.get(row.id) || [],
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
            COALESCE(s.email_notifications, true) AS email_notifications
     FROM users u
     LEFT JOIN user_settings s ON s.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (!row) return null;

  const favorites = await db.query<{ game_slug: string }>('SELECT game_slug FROM user_favorite_games WHERE user_id = $1', [userId]);

  return {
    id: row.id,
    username: row.username,
    bio: row.bio || '',
    avatar: row.avatar_url || DEMO_AVATAR,
    hoursPlayed: row.hours_played || 0,
    achievementsCount: row.achievements_count || 0,
    friendsCount: row.friends_count || 0,
    favoriteGames: favorites.map((f) => f.game_slug),
    settings: {
      profilePublic: row.profile_public,
      emailNotifications: row.email_notifications,
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
      `SELECT gr.id, gr.rating, gr.comment, gr.created_at, gr.user_id, u.username
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
        rating: review.rating,
        comment: review.comment,
        createdAt: new Date(review.created_at).getTime(),
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
    await db.execute(
      `INSERT INTO game_reviews (id, game_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (game_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()`,
      [reviewId, gameRow.id, userId, rating, comment.trim()]
    );
    const userRow = await db.queryOne<{ username: string }>('SELECT username FROM users WHERE id = $1', [userId]);
    return ok(c, {
      id: reviewId,
      userId,
      username: userRow?.username || 'player',
      rating,
      comment: comment.trim(),
      createdAt: Date.now(),
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
    const profile = await db.queryOne<any>(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1)`,
      [c.req.param('username')]
    );
    if (!profile) {
      return notFound(c, 'User not found');
    }
    const result = await fetchUserProfile(db, profile.id);
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
      `INSERT INTO user_settings (user_id, profile_public, email_notifications)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET profile_public = EXCLUDED.profile_public, email_notifications = EXCLUDED.email_notifications, updated_at = NOW()`,
      [userId, settings.profilePublic, settings.emailNotifications]
    );
    return ok(c, { success: true });
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
    const rows = await db.query<any>(
      `SELECT u.id, u.username, u.avatar_url, f.status, f.current_game_slug
       FROM friends f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = $1
       ORDER BY f.updated_at DESC`,
      [userId]
    );
    return ok(c, { items: rows.map((row) => ({
      id: row.id,
      username: row.username,
      avatar: row.avatar_url || DEMO_AVATAR,
      status: row.status as FriendStatus,
      game: row.current_game_slug || undefined,
    })) });
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
          views: row.views || 0,
          likes: row.likes || 0,
          tags: [],
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
    const author = await db.queryOne<{ username: string; avatar_url: string }>('SELECT username, avatar_url FROM users WHERE id = $1', [userId]);
    return ok(c, {
      id: postId,
      gameSlug: c.req.param('slug'),
      title: title.trim(),
      content: content.trim(),
      author: author?.username || 'player',
      authorId: userId,
      authorAvatar: author?.avatar_url || DEMO_AVATAR,
      createdAt: Date.now(),
      replies: 0,
      views: 0,
      likes: 0,
      tags: tags || [],
    } satisfies ForumPost);
  });

  app.get('/api/forum/posts/:postId', async (c) => {
    const db = getAdapter(c);
    const postId = c.req.param('postId');
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
    await db.execute('UPDATE forum_posts SET views = views + 1 WHERE id = $1', [postId]);
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
      tags: [],
      pinned: post.pinned,
    } satisfies ForumPost);
  });

  app.post('/api/forum/posts/:postId/like', async (c) => {
    const db = getAdapter(c);
    const postId = c.req.param('postId');
    await db.execute('UPDATE forum_posts SET likes = likes + 1 WHERE id = $1', [postId]);
    return ok(c, { success: true });
  });

  app.get('/api/forum/posts/:postId/replies', async (c) => {
    const db = getAdapter(c);
    const rows = await db.query<any>(
      `SELECT r.*, u.username, u.avatar_url FROM forum_replies r
       JOIN users u ON u.id = r.user_id WHERE r.post_id = $1 ORDER BY r.created_at ASC`,
      [c.req.param('postId')]
    );
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
    const author = await db.queryOne<{ username: string; avatar_url: string }>('SELECT username, avatar_url FROM users WHERE id = $1', [userId]);
    return ok(c, {
      id: replyId,
      postId,
      content: content.trim(),
      author: author?.username || 'player',
      authorId: userId,
      authorAvatar: author?.avatar_url || DEMO_AVATAR,
      createdAt: Date.now(),
      likes: 0,
    } satisfies ForumReply);
  });

  app.post('/api/forum/replies/:replyId/like', async (c) => {
    const db = getAdapter(c);
    await db.execute('UPDATE forum_replies SET likes = likes + 1 WHERE id = $1', [c.req.param('replyId')]);
    return ok(c, { success: true });
  });

  app.get('/api/games/:slug/workshop/items', async (c) => {
    const db = getAdapter(c);
    const rows = await db.query<any>(
      `SELECT w.*, u.username, u.avatar_url,
              COALESCE(array_agg(DISTINCT wt.tag) FILTER (WHERE wt.tag IS NOT NULL), '{}') AS tags
       FROM workshop_items w
       JOIN users u ON u.id = w.user_id
       LEFT JOIN workshop_item_tags wt ON wt.item_id = w.id
       WHERE w.game_slug = $1
       GROUP BY w.id, u.id
       ORDER BY w.featured DESC, w.downloads DESC`,
      [c.req.param('slug')]
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
          featured: row.featured,
        })
      ),
    });
  });

  app.post('/api/games/:slug/workshop/items', async (c) => {
    const db = getAdapter(c);
    const userId = await resolveUserId(c, db);
    const slug = c.req.param('slug');
    const { title, description, type, tags, image } = await c.req.json<{
      title: string;
      description: string;
      type: 'mod' | 'skin' | 'map' | 'tool';
      tags?: string[];
      image?: string;
    }>();
    if (!title || !description || !type) {
      return bad(c, 'Title, description, and type are required');
    }
    const itemId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO workshop_items (id, game_slug, user_id, title, description, type, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [itemId, slug, userId, title.trim(), description.trim(), type, image || '/images/default-workshop.svg']
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
    } satisfies WorkshopItem);
  });

  app.post('/api/workshop/items/:itemId/download', async (c) => {
    const db = getAdapter(c);
    await db.execute('UPDATE workshop_items SET downloads = downloads + 1 WHERE id = $1', [c.req.param('itemId')]);
    return ok(c, { success: true });
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
}
