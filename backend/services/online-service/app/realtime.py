"""
Redis-backed helpers for lobby broadcasts and message history.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Dict

import redis.asyncio as aioredis

from .core.config import settings

LOBBY_CHANNEL = "lobby:{lobby_id}:events"
LOBBY_HISTORY_KEY = "lobby:{lobby_id}:history"


class RealtimeHub:
    """Minimal Redis helper for pub/sub + history."""

    def __init__(self) -> None:
        self.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

    async def publish_lobby_event(self, lobby_id: str, payload: Dict[str, Any]) -> None:
        channel = LOBBY_CHANNEL.format(lobby_id=lobby_id)
        message = json.dumps(payload)
        await self.redis.publish(channel, message)
        history_key = LOBBY_HISTORY_KEY.format(lobby_id=lobby_id)
        await self.redis.lpush(history_key, message)
        await self.redis.ltrim(history_key, 0, settings.LOBBY_MESSAGE_HISTORY_LIMIT - 1)

    async def lobby_history(self, lobby_id: str) -> list[Dict[str, Any]]:
        history_key = LOBBY_HISTORY_KEY.format(lobby_id=lobby_id)
        entries = await self.redis.lrange(history_key, 0, settings.LOBBY_MESSAGE_HISTORY_LIMIT - 1)
        return [json.loads(entry) for entry in reversed(entries)]

    async def subscribe(self, lobby_id: str):
        channel = LOBBY_CHANNEL.format(lobby_id=lobby_id)
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(channel)
        return pubsub

    async def close(self) -> None:
        await self.redis.close()


hub = RealtimeHub()

