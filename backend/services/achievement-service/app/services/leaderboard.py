"""Redis-backed leaderboard helpers."""
from __future__ import annotations

import logging
from typing import List, Optional, Tuple

import redis
from redis.exceptions import RedisError

from ..core.config import settings

logger = logging.getLogger(__name__)
_redis_client: Optional[redis.Redis] = None


def _get_client() -> Optional[redis.Redis]:
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        _redis_client = redis.from_url(
            settings.ACHIEVEMENT_REDIS_URL,
            decode_responses=True,
        )
    except RedisError as exc:  # pragma: no cover - defensive
        logger.warning("Unable to connect to Redis leaderboard: %s", exc)
        _redis_client = None
    return _redis_client


def update_score(user_id: str, score: int) -> None:
    """Upsert the user's score inside the sorted set."""
    client = _get_client()
    if not client:
        return
    try:
        client.zadd(settings.LEADERBOARD_KEY, {str(user_id): score})
        max_entries = settings.LEADERBOARD_MAX_ENTRIES
        if max_entries and max_entries > 0:
            card = client.zcard(settings.LEADERBOARD_KEY)
            if card > max_entries:
                # Trim the lowest scores (rank ascending)
                client.zremrangebyrank(
                    settings.LEADERBOARD_KEY, 0, card - max_entries - 1
                )
    except RedisError as exc:  # pragma: no cover - network failure
        logger.error("Failed to update leaderboard: %s", exc)


def get_top(limit: int = 20, offset: int = 0) -> List[Tuple[str, int]]:
    """Return a slice of the leaderboard ordered by score desc."""
    client = _get_client()
    if not client:
        return []
    try:
        start = max(offset, 0)
        end = start + max(limit, 1) - 1
        results = client.zrevrange(
            settings.LEADERBOARD_KEY, start, end, withscores=True
        )
        return [(user_id, int(score)) for user_id, score in results]
    except RedisError as exc:  # pragma: no cover
        logger.error("Failed to read leaderboard: %s", exc)
        return []


def get_user_rank(user_id: str) -> Optional[Tuple[int, int]]:
    """Fetch the rank (1-indexed) and score for a user."""
    client = _get_client()
    if not client:
        return None
    try:
        rank = client.zrevrank(settings.LEADERBOARD_KEY, str(user_id))
        if rank is None:
            return None
        score = client.zscore(settings.LEADERBOARD_KEY, str(user_id)) or 0
        return rank + 1, int(score)
    except RedisError as exc:  # pragma: no cover
        logger.error("Failed to read user rank: %s", exc)
        return None


def get_total_players() -> int:
    client = _get_client()
    if not client:
        return 0
    try:
        return client.zcard(settings.LEADERBOARD_KEY)
    except RedisError as exc:  # pragma: no cover
        logger.error("Failed to read leaderboard size: %s", exc)
        return 0

