"""Database initialization helpers for the game-catalog service."""
from __future__ import annotations

from app.db.base import Base
from app.db.session import engine


async def init_db() -> None:
    """Create database tables if they do not exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

