import { QueryClient } from '@tanstack/react-query';
import type { ApiResponse } from "../../shared/types";

export const queryClient = new QueryClient();

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
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