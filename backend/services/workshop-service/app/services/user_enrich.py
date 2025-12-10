"""User enrichment helpers for workshop items."""
from __future__ import annotations

import os
from typing import Iterable, Optional

import httpx

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:8001")


class EnrichedUser(dict):
    username: Optional[str]
    avatar_url: Optional[str]


async def _fetch_user(client: httpx.AsyncClient, user_id: str) -> EnrichedUser:
    try:
        resp = await client.get(f"{USER_SERVICE_URL}/api/v1/users/by-id/{user_id}", timeout=3.0)
        if resp.status_code != 200:
            return {}
        data = resp.json()
        return {
          "username": data.get("username"),
          "avatar_url": data.get("avatar_url"),
        }
    except Exception:
        return {}


def enrich_items_with_users(items: Iterable, user_cache: dict[str, EnrichedUser] | None = None) -> None:
    """
    Attach author_username and author_avatar_url to items (in-place).
    Uses a simple per-call cache to reduce repeat lookups.
    """
    cache: dict[str, EnrichedUser] = user_cache if user_cache is not None else {}
    unique_ids = [str(i.user_id) for i in items if getattr(i, "user_id", None)]
    if not unique_ids:
        return

    # Best-effort synchronous fetch to avoid pulling in async here;
    # for high volume, convert to async + batch.
    with httpx.Client(timeout=3.0) as client:
        for uid in unique_ids:
            if uid in cache:
                continue
            try:
                resp = client.get(f"{USER_SERVICE_URL}/api/v1/users/by-id/{uid}")
                if resp.status_code == 200:
                    data = resp.json()
                    cache[uid] = {
                        "username": data.get("username"),
                        "avatar_url": data.get("avatar_url"),
                    }
                else:
                    cache[uid] = {}
            except Exception:
                cache[uid] = {}

    for item in items:
        uid = str(getattr(item, "user_id", "")) if getattr(item, "user_id", None) else None
        if not uid:
            item.author_username = None
            item.author_avatar_url = None
            continue
        enriched = cache.get(uid, {})
        item.author_username = enriched.get("username")
        item.author_avatar_url = enriched.get("avatar_url")

