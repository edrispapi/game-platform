import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

// FastAPI Gateway URL - use environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:13000';

// Store JWT token
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('crimson-auth-token', token);
  } else {
    localStorage.removeItem('crimson-auth-token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken && typeof window !== 'undefined') {
    authToken = localStorage.getItem('crimson-auth-token');
  }
  return authToken;
}

export function getCurrentUserId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('crimson-user-id');
  }
  return null;
}

export function setCurrentUserId(userId: string | null) {
  if (typeof window !== 'undefined') {
    if (userId) {
      localStorage.setItem('crimson-user-id', userId);
    } else {
      localStorage.removeItem('crimson-user-id');
    }
  }
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Generic API client for FastAPI backend
 * Handles authentication, error handling, and response parsing
 */
export async function api<T>(path: string, init?: ApiOptions): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  };

  // Add auth token if available and not skipped
  if (!init?.skipAuth) {
    const token = getAuthToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  // Build full URL - if path starts with http, use as-is, otherwise prepend base URL
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers,
  });

  // Handle non-JSON responses
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    if (!res.ok) {
      throw new Error(res.statusText || 'Request failed');
    }
    return {} as T;
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    const text = await res.text().catch(() => '');
    throw new Error(text || res.statusText || 'Request failed');
  }

  if (!res.ok) {
    throw new Error(json?.detail || json?.message || json?.error || 'Request failed');
  }

  return json as T;
}

// ============================================================================
// AUTH API
// ============================================================================

export interface LoginRequest {
  username_or_email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  display_name?: string;
}

export interface UserResponse {
  id: number;
  uuid: string;
  username: string;
  email: string;
  full_name?: string;
  display_name?: string;
  bio?: string;
  status: string;
  steam_level: number;
  steam_xp: number;
  created_at: string;
  updated_at: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    api<LoginResponse>('/api/v1/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: RegisterRequest) =>
    api<UserResponse>('/api/v1/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    api<{ message: string }>('/api/v1/users/logout', {
      method: 'POST',
    }),

  me: () => api<UserResponse>('/api/v1/users/me'),

  updateProfile: (data: Partial<UserResponse>) =>
    api<UserResponse>('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================================================
// GAMES / CATALOG API
// ============================================================================

export interface GameResponse {
  id: number;
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  discount_percent?: number;
  cover_image_url?: string;
  banner_image_url?: string;
  release_date?: string;
  developer?: string;
  publisher?: string;
  genres: string[];
  tags: string[];
  platforms: string[];
  rating?: number;
  reviews_count?: number;
}

export interface GameSearchFilters {
  search?: string;
  genre?: string;
  tag?: string;
  platform?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface GameSearchResponse {
  games: GameResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export const gamesApi = {
  search: (filters?: GameSearchFilters, page = 1, perPage = 20) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.genre) params.set('genre', filters.genre);
    if (filters?.tag) params.set('tag', filters.tag);
    if (filters?.platform) params.set('platform', filters.platform);
    if (filters?.min_price !== undefined) params.set('min_price', String(filters.min_price));
    if (filters?.max_price !== undefined) params.set('max_price', String(filters.max_price));
    if (filters?.sort_by) params.set('sort_by', filters.sort_by);
    if (filters?.sort_order) params.set('sort_order', filters.sort_order);
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    return api<GameSearchResponse>(`/api/v1/catalog/games?${params.toString()}`);
  },

  getById: (gameId: number) => api<GameResponse>(`/api/v1/catalog/games/${gameId}`),

  getFeatured: (limit = 10) =>
    api<GameResponse[]>(`/api/v1/catalog/games/featured?limit=${limit}`),

  getNewReleases: (limit = 10) =>
    api<GameResponse[]>(`/api/v1/catalog/games/new-releases?limit=${limit}`),

  getOnSale: (limit = 10) =>
    api<GameResponse[]>(`/api/v1/catalog/games/on-sale?limit=${limit}`),

  getGenres: () => api<{ id: number; name: string; slug: string }[]>('/api/v1/catalog/genres'),

  getTags: () => api<{ id: number; name: string; slug: string }[]>('/api/v1/catalog/tags'),
};

// ============================================================================
// REVIEWS API
// ============================================================================

export interface ReviewResponse {
  id: number;
  game_id: string;
  user_id: string;
  rating: number;
  content: string;
  is_recommended: boolean;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreate {
  game_id: string;
  user_id: string;
  rating: number;
  content: string;
  is_recommended: boolean;
}

export const reviewsApi = {
  getForGame: (gameId: string, skip = 0, limit = 100) =>
    api<ReviewResponse[]>(`/api/v1/reviews/game/${gameId}?skip=${skip}&limit=${limit}`),

  getForUser: (userId: string, skip = 0, limit = 100) =>
    api<ReviewResponse[]>(`/api/v1/reviews/user/${userId}?skip=${skip}&limit=${limit}`),

  create: (data: ReviewCreate) =>
    api<ReviewResponse>('/api/v1/reviews/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  vote: (reviewId: number, userId: string, isHelpful: boolean) =>
    api<any>(`/api/v1/reviews/${reviewId}/vote?user_id=${userId}&is_helpful=${isHelpful}`, {
      method: 'POST',
    }),
};

// ============================================================================
// SHOPPING API
// ============================================================================

export interface CartResponse {
  id: number;
  user_id: string;
  items: CartItemResponse[];
  total: number;
  created_at: string;
  updated_at: string;
}

export interface CartItemResponse {
  id: number;
  cart_id: number;
  game_id: string;
  game_title: string;
  price: number;
  quantity: number;
}

export const shoppingApi = {
  getCart: (userId: string) => api<CartResponse>(`/api/v1/shopping/cart/user/${userId}`),

  createCart: (userId: string) =>
    api<CartResponse>('/api/v1/shopping/cart', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  addToCart: (cartId: number, gameId: string, gameTitle: string, price: number) =>
    api<CartItemResponse>(`/api/v1/shopping/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, game_title: gameTitle, price, quantity: 1 }),
    }),

  removeFromCart: (itemId: number) =>
    api<{ message: string }>(`/api/v1/shopping/cart/items/${itemId}`, {
      method: 'DELETE',
    }),

  clearCart: (cartId: number) =>
    api<{ message: string }>(`/api/v1/shopping/cart/${cartId}/clear`, {
      method: 'DELETE',
    }),

  getWishlists: (userId: string) =>
    api<any[]>(`/api/v1/shopping/wishlist/user/${userId}`),

  addToWishlist: (wishlistId: number, gameId: string, gameTitle: string) =>
    api<any>(`/api/v1/shopping/wishlist/${wishlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, game_title: gameTitle }),
    }),
};

// ============================================================================
// FRIENDS / SOCIAL API
// ============================================================================

export interface FriendRequestResponse {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface FriendResponse {
  id: string;
  username: string;
  avatar?: string;
  status: 'Online' | 'Offline' | 'In Game';
  current_game?: string;
}

export const friendsApi = {
  // PostgreSQL social service
  listFriends: (userId: string) =>
    api<{ items: FriendResponse[] }>(`/api/v1/social/friends/${userId}`),

  getPendingRequests: (userId: string) =>
    api<FriendRequestResponse[]>(`/api/v1/social/friend-requests/pending/${userId}`),

  sendRequest: (senderId: string, receiverId: string) =>
    api<FriendRequestResponse>('/api/v1/social/friend-requests', {
      method: 'POST',
      body: JSON.stringify({ sender_id: senderId, receiver_id: receiverId }),
    }),

  respondToRequest: (requestId: string, accept: boolean) =>
    api<FriendRequestResponse>(`/api/v1/social/friend-requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ decision: accept ? 'accepted' : 'rejected' }),
    }),

  // MongoDB friends-chat service
  getFriendsList: () => api<{ friends: string[] }>('/api/v1/friends/friends'),

  getIncomingRequests: () => api<FriendRequestResponse[]>('/api/v1/friends/friends/requests'),

  sendFriendRequest: (targetUserId: string) =>
    api<FriendRequestResponse>('/api/v1/friends/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    }),

  respondFriendRequest: (requestId: string, accept: boolean) =>
    api<FriendRequestResponse>(`/api/v1/friends/friends/requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),
};

// ============================================================================
// CHAT API
// ============================================================================

export interface ChatMessageResponse {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export const chatApi = {
  getDirectMessages: (peerId: string, limit = 50) =>
    api<ChatMessageResponse[]>(`/api/v1/friends/chats/direct/${peerId}/messages?limit=${limit}`),

  sendDirectMessage: (peerId: string, content: string) =>
    api<ChatMessageResponse>(`/api/v1/friends/chats/direct/${peerId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getLobbyMessages: (lobbyId: string, limit = 50) =>
    api<ChatMessageResponse[]>(`/api/v1/friends/chats/lobbies/${lobbyId}/messages?limit=${limit}`),

  sendLobbyMessage: (lobbyId: string, content: string) =>
    api<ChatMessageResponse>(`/api/v1/friends/chats/lobbies/${lobbyId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export interface NotificationResponse {
  id: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: (userId: string, onlyUnread = false, limit = 50) =>
    api<NotificationResponse[]>(
      `/api/v1/notifications/user/${userId}?only_unread=${onlyUnread}&limit=${limit}`
    ),

  markRead: (notificationId: number, isRead = true) =>
    api<NotificationResponse>(`/api/v1/notifications/${notificationId}/read`, {
      method: 'POST',
      body: JSON.stringify({ is_read: isRead }),
    }),
};

// ============================================================================
// ACHIEVEMENTS API
// ============================================================================

export interface AchievementResponse {
  id: number;
  name: string;
  description: string;
  icon_url?: string;
  points: number;
  rarity: string;
  game_id?: number;
}

export interface UserAchievementResponse {
  achievement: AchievementResponse;
  unlocked: boolean;
  progress: number;
  unlocked_at?: string;
}

export const achievementsApi = {
  list: () => api<AchievementResponse[]>('/api/v1/achievements/'),

  getUserAchievements: (userId: string) =>
    api<UserAchievementResponse[]>(`/api/v1/achievements/users/${userId}`),

  getLeaderboard: (limit = 100) =>
    api<any[]>(`/api/v1/achievements/leaderboard?limit=${limit}`),
};

// ============================================================================
// WORKSHOP API
// ============================================================================

export interface WorkshopItemResponse {
  id: number;
  user_id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  visibility: string;
  file_url?: string;
  thumbnail_url?: string;
  downloads: number;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
}

export interface WorkshopItemCreate {
  title: string;
  description: string;
  type: string;
  visibility?: string;
  tags?: string[];
}

export const workshopApi = {
  list: (search?: string, status?: string, visibility?: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status_filter', status);
    if (visibility) params.set('visibility', visibility);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return api<{ items: WorkshopItemResponse[]; total: number }>(
      `/api/v1/workshop/items?${params.toString()}`
    );
  },

  getById: (itemId: number) => api<WorkshopItemResponse>(`/api/v1/workshop/items/${itemId}`),

  create: (data: WorkshopItemCreate) =>
    api<WorkshopItemResponse>('/api/v1/workshop/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  vote: (itemId: number, isUpvote: boolean) =>
    api<WorkshopItemResponse>(`/api/v1/workshop/items/${itemId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ is_upvote: isUpvote }),
    }),

  download: (itemId: number) =>
    api<{ download_url: string; downloads: number }>(`/api/v1/workshop/items/${itemId}/download`, {
      method: 'POST',
    }),
};

// ============================================================================
// RECOMMENDATIONS API
// ============================================================================

export const recommendationsApi = {
  getForUser: (userId: string, limit = 10) =>
    api<GameResponse[]>(`/api/v1/recommendations/users/${userId}?limit=${limit}`),

  getSimilarGames: (gameId: number, limit = 10) =>
    api<GameResponse[]>(`/api/v1/recommendations/games/${gameId}/similar?limit=${limit}`),
};

// ============================================================================
// ONLINE STATUS API
// ============================================================================

export const onlineApi = {
  setStatus: (userId: string, status: 'Online' | 'Offline' | 'In Game', gameSlug?: string) =>
    api<{ success: boolean }>(`/api/v1/online/status/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ status, game_slug: gameSlug }),
    }),

  getStatus: (userId: string) =>
    api<{ status: string; game_slug?: string }>(`/api/v1/online/status/${userId}`),

  getOnlineFriends: (userId: string) =>
    api<{ user_id: string; status: string; game_slug?: string }[]>(
      `/api/v1/online/friends/${userId}`
    ),
};

// ============================================================================
// LEGACY COMPATIBILITY - Map old API structure to new FastAPI structure
// ============================================================================

/**
 * Legacy API wrapper for backward compatibility with existing components
 * Maps the old Hono/TypeScript API response format to FastAPI responses
 */
export async function legacyApi<T>(path: string, init?: RequestInit): Promise<T> {
  // Map old paths to new FastAPI paths
  const pathMappings: Record<string, string> = {
    '/api/games': '/api/v1/catalog/games',
    '/api/profile': '/api/v1/users/me',
    '/api/friends': '/api/v1/social/friends',
    '/api/friend-requests': '/api/v1/social/friend-requests',
    '/api/notifications': '/api/v1/notifications',
    '/api/achievements': '/api/v1/achievements',
    '/api/orders': '/api/v1/purchases/orders',
  };

  // Check if path needs mapping
  let newPath = path;
  for (const [oldPath, mappedPath] of Object.entries(pathMappings)) {
    if (path.startsWith(oldPath)) {
      newPath = path.replace(oldPath, mappedPath);
      break;
    }
  }

  return api<T>(newPath, init);
}
