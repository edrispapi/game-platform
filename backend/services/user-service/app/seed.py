"""Utility for populating the user-service database with sample data."""
from __future__ import annotations

import argparse
import random
import string
from datetime import datetime, timedelta, timezone

import asyncio

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_password_hash
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.models import User, UserStatus


STATUS_CHOICES = [
    UserStatus.ACTIVE,
    UserStatus.INACTIVE,
    UserStatus.PENDING,
]

COUNTRIES = ["US", "GB", "DE", "JP", "BR", "FR", "CA", "AU"]
LANGUAGES = ["en", "es", "de", "fr", "pt", "ja"]


def _random_text(prefix: str, idx: int) -> str:
    return f"{prefix}_{idx}"


def _random_password() -> str:
    base = "".join(random.choices(string.ascii_letters + string.digits, k=12))
    return get_password_hash(base)


async def seed_users(target: int = 100) -> int:
    """Insert sample users until the table has at least ``target`` rows."""
    await init_db()
    async with AsyncSessionLocal() as session:
        existing = await _count_users(session)
        missing = max(0, target - existing)
        if missing == 0:
            return 0

        now = datetime.now(timezone.utc)
        for offset in range(missing):
            idx = existing + offset + 1
            user = User(
                username=_random_text("user", idx),
                email=f"user{idx}@example.com",
                password_hash=_random_password(),
                full_name=f"Example User {idx}",
                display_name=f"Player{idx}",
                status=random.choice(STATUS_CHOICES),
                email_verified=random.random() > 0.2,
                two_factor_enabled=random.random() > 0.8,
                last_login=now - timedelta(days=random.randint(0, 30)),
                profile_visibility=random.choice(["public", "friends", "private"]),
                show_online_status=True,
                show_game_activity=random.random() > 0.1,
                steam_level=random.randint(1, 50),
                steam_xp=random.randint(0, 50_000),
                country_code=random.choice(COUNTRIES),
                language_code=random.choice(LANGUAGES),
                bio=f"This is the bio for user {idx}.",
                location=random.choice(
                    ["Seattle", "Berlin", "Tokyo", "São Paulo", "London", "Toronto"]
                ),
                website=f"https://example.com/users/{idx}",
                extra_metadata={"favorite_genre": random.choice(["rpg", "fps", "indie"])},
            )
            session.add(user)
            if (offset + 1) % 25 == 0:
                await session.flush()

        await session.commit()
        return missing


async def _count_users(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(User.id)))
    return result.scalar_one()


async def async_main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the user-service database with sample data."
    )
    parser.add_argument("--count", type=int, default=100, help="Desired row count")
    args = parser.parse_args()
    created = await seed_users(args.count)
    print(f"User service seed complete (inserted {created} rows).")


if __name__ == "__main__":
    asyncio.run(async_main())

