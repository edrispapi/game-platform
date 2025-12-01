import { QueryClient } from '@tanstack/react-query';
import type { ApiResponse } from "../../shared/types";

export const queryClient = new QueryClient();

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  };

  // Attach current user id (demo auth) if available so backend can resolve the user
  if (typeof window !== 'undefined') {
    const userId = window.localStorage.getItem('crimson-user-id');
    if (userId) {
      (headers as any)['x-user-id'] = userId;
    }
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });

  let json: ApiResponse<T> | null = null;

  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch (err) {
    // If the response is not JSON (e.g. plain "Internal Server Error"),
    // fall back to a text body so we don't surface a confusing JSON parse error.
    const text = await res.text().catch(() => '');
    const message = text || res.statusText || 'Request failed';
    throw new Error(message);
  }

  if (!res.ok || !json?.success || json.data === undefined) {
    throw new Error(json?.error || 'Request failed');
  }

  return json.data;
}