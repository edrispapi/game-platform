"""MongoDB connection helpers."""
from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient

from .core.config import settings

client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.MONGO_DB]


async def get_database():
    yield db
