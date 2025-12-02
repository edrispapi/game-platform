"""Sample data generator for the game-catalog service."""
from __future__ import annotations

import argparse
import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.models import AgeRating, Game, GameType, Genre, Platform, Tag

GENRES = [
    ("Action", "Fast-paced action games"),
    ("Adventure", "Narrative driven adventures"),
    ("Strategy", "Plan and conquer"),
    ("RPG", "Role-playing epics"),
]

PLATFORMS = [
    ("windows", "Windows"),
    ("linux", "Linux"),
    ("mac", "macOS"),
]

TAGS = [
    "Indie",
    "Multiplayer",
    "Controller Support",
    "Pixel Graphics",
    "Story Rich",
]


async def _ensure_reference_data(session: AsyncSession) -> None:
    if await _count(session, Genre) == 0:
        for name, desc in GENRES:
            session.add(Genre(name=name, description=desc))
    if await _count(session, Platform) == 0:
        for name, display in PLATFORMS:
            session.add(Platform(name=name, display_name=display))
    if await _count(session, Tag) == 0:
        for tag in TAGS:
            session.add(Tag(name=tag))
    await session.commit()


async def _count(session: AsyncSession, model) -> int:
    result = await session.execute(select(func.count(model.id)))
    return result.scalar_one()


async def seed_games(target: int = 100) -> int:
    await init_db()
    async with AsyncSessionLocal() as session:
        await _ensure_reference_data(session)
        existing = await _count(session, Game)
        missing = max(0, target - existing)
        if missing == 0:
            return 0

        genres = (await session.execute(select(Genre))).scalars().all()
        tags = (await session.execute(select(Tag))).scalars().all()
        platforms = (await session.execute(select(Platform))).scalars().all()

        for offset in range(missing):
            idx = existing + offset + 1
            game = Game(
                title=f"Sample Game {idx}",
                description=f"This is the storyline for Sample Game {idx}.",
                short_description="A thrilling experience.",
                developer=random.choice(["PixelSmith", "Nebula Devs", "Aurora Labs"]),
                publisher=random.choice(["IndiePub", "Galactic Games"]),
                price=round(random.uniform(9.99, 59.99), 2),
                currency="USD",
                game_type=random.choice([choice.value for choice in GameType]),
                status="active",
                age_rating=random.choice([choice.value for choice in AgeRating]),
                release_date=datetime.utcnow() - timedelta(days=random.randint(0, 1800)),
                single_player=True,
                multiplayer=random.random() > 0.5,
                co_op=random.random() > 0.6,
                local_co_op=random.random() > 0.7,
                cross_platform=random.random() > 0.4,
                vr_support=random.random() > 0.8,
                total_reviews=random.randint(0, 10000),
                positive_reviews=random.randint(0, 9000),
                negative_reviews=random.randint(0, 4000),
                metadata_json={
                    "support_email": "support@example.com",
                    "website": f"https://games.example.com/{idx}",
                },
            )

            game.genres = random.sample(genres, k=min(2, len(genres)))
            game.tags = random.sample(tags, k=min(3, len(tags)))
            game.platforms = random.sample(platforms, k=min(2, len(platforms)))

            session.add(game)
            if (offset + 1) % 20 == 0:
                await session.flush()

        await session.commit()
        return missing


async def async_main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the game catalog database with sample games."
    )
    parser.add_argument("--count", type=int, default=100)
    args = parser.parse_args()
    created = await seed_games(args.count)
    print(f"Game catalog seed complete (inserted {created} rows).")


if __name__ == "__main__":
    asyncio.run(async_main())

