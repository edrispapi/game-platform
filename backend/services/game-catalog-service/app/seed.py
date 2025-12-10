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

# Curated Steam assets provided for the store page.
CURATED_STEAM_GAMES: list[dict] = [
    {
        "steam_app_id": 1086940,
        "title": "Baldur's Gate 3",
        "developer": "Larian Studios",
        "publisher": "Larian Studios",
        "price": 59.99,
        "release_date": datetime(2023, 8, 3),
        "age_rating": AgeRating.MATURE.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086940/library_hero_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086940/library_600x900_2x.jpg",
        "average_rating": 4.9,
        "total_reviews": 720000,
        "positive_reviews": 700000,
        "negative_reviews": 20000,
        "metadata": {"wishlist_count": 1200000},
    },
    {
        "steam_app_id": 413150,
        "title": "Stardew Valley",
        "developer": "ConcernedApe",
        "publisher": "ConcernedApe",
        "price": 14.99,
        "release_date": datetime(2016, 2, 26),
        "age_rating": AgeRating.EVERYONE_10_PLUS.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/413150/library_hero_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/413150/library_600x900_2x.jpg",
        "average_rating": 4.9,
        "total_reviews": 560000,
        "positive_reviews": 545000,
        "negative_reviews": 15000,
        "metadata": {"wishlist_count": 800000},
    },
    {
        "steam_app_id": 1145360,
        "title": "Hades",
        "developer": "Supergiant Games",
        "publisher": "Supergiant Games",
        "price": 24.99,
        "release_date": datetime(2020, 9, 17),
        "age_rating": AgeRating.TEEN.value,
        # Use working Steam assets and valid trailer thumbnail-friendly video
        "header_image_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg",
        "background_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/library_hero_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/library_600x900_2x.jpg",
        "screenshots": [
            "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg",
            "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/library_hero_2x.jpg",
            "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/library_600x900_2x.jpg",
        ],
        "movies": ["https://www.youtube.com/watch?v=5917EfTQAKU"],
        "average_rating": 4.9,
        "total_reviews": 350000,
        "positive_reviews": 340000,
        "negative_reviews": 10000,
        "metadata": {"wishlist_count": 500000},
    },
    {
        "steam_app_id": 292030,
        "title": "The Witcher 3: Wild Hunt",
        "developer": "CD PROJEKT RED",
        "publisher": "CD PROJEKT RED",
        "price": 39.99,
        "release_date": datetime(2015, 5, 18),
        "age_rating": AgeRating.MATURE.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/library_hero_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/library_600x900_2x.jpg",
        "average_rating": 4.9,
        "total_reviews": 780000,
        "positive_reviews": 760000,
        "negative_reviews": 20000,
        "metadata": {"wishlist_count": 950000},
    },
    {
        "steam_app_id": 367520,
        "title": "Hollow Knight",
        "developer": "Team Cherry",
        "publisher": "Team Cherry",
        "price": 14.99,
        "release_date": datetime(2017, 2, 24),
        "age_rating": AgeRating.TEEN.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/367520/library_600x900_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/367520/library_600x900_2x.jpg",
        "average_rating": 4.9,
        "total_reviews": 300000,
        "positive_reviews": 290000,
        "negative_reviews": 10000,
        "metadata": {"wishlist_count": 600000},
    },
    {
        "steam_app_id": 1245620,
        "title": "ELDEN RING",
        "developer": "FromSoftware",
        "publisher": "Bandai Namco Entertainment",
        "price": 59.99,
        "release_date": datetime(2022, 2, 25),
        "age_rating": AgeRating.MATURE.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/library_hero_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/library_600x900_2x.jpg",
        "average_rating": 4.8,
        "total_reviews": 600000,
        "positive_reviews": 570000,
        "negative_reviews": 30000,
        "metadata": {"wishlist_count": 1100000},
    },
    {
        "steam_app_id": 504230,
        "title": "Celeste",
        "developer": "Extremely OK Games",
        "publisher": "Extremely OK Games",
        "price": 19.99,
        "release_date": datetime(2018, 1, 25),
        "age_rating": AgeRating.EVERYONE_10_PLUS.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/504230/library_600x900_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/504230/library_600x900_2x.jpg",
        "average_rating": 4.9,
        "total_reviews": 150000,
        "positive_reviews": 145000,
        "negative_reviews": 5000,
        "metadata": {"wishlist_count": 420000},
    },
    {
        "steam_app_id": 374320,
        "title": "DARK SOULS III",
        "developer": "FromSoftware",
        "publisher": "Bandai Namco Entertainment",
        "price": 59.99,
        "release_date": datetime(2016, 4, 11),
        "age_rating": AgeRating.MATURE.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/374320/library_600x900_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/374320/library_600x900_2x.jpg",
        "average_rating": 4.8,
        "total_reviews": 550000,
        "positive_reviews": 520000,
        "negative_reviews": 30000,
        "metadata": {"wishlist_count": 750000},
    },
    {
        "steam_app_id": 1593500,
        "title": "God of War",
        "developer": "Santa Monica Studio",
        "publisher": "PlayStation PC LLC",
        "price": 49.99,
        "release_date": datetime(2022, 1, 14),
        "age_rating": AgeRating.MATURE.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1593500/library_hero_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1593500/library_600x900_2x.jpg",
        "average_rating": 4.9,
        "total_reviews": 320000,
        "positive_reviews": 310000,
        "negative_reviews": 10000,
        "metadata": {"wishlist_count": 680000},
    },
    {
        "steam_app_id": 1151640,
        "title": "Horizon Zero Dawn",
        "developer": "Guerrilla",
        "publisher": "PlayStation PC LLC",
        "price": 49.99,
        "release_date": datetime(2020, 8, 7),
        "age_rating": AgeRating.MATURE.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1151640/library_600x900_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1151640/library_600x900_2x.jpg",
        "average_rating": 4.6,
        "total_reviews": 210000,
        "positive_reviews": 195000,
        "negative_reviews": 15000,
        "metadata": {"wishlist_count": 520000},
    },
    {
        "steam_app_id": 1174180,
        "title": "Red Dead Redemption 2",
        "developer": "Rockstar Games",
        "publisher": "Rockstar Games",
        "price": 59.99,
        "release_date": datetime(2019, 11, 5),
        "age_rating": AgeRating.MATURE.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/library_hero_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/library_600x900_2x.jpg",
        "average_rating": 4.9,
        "total_reviews": 700000,
        "positive_reviews": 670000,
        "negative_reviews": 30000,
        "metadata": {"wishlist_count": 1000000},
    },
    {
        "steam_app_id": 1091500,
        "title": "Cyberpunk 2077",
        "developer": "CD PROJEKT RED",
        "publisher": "CD PROJEKT RED",
        "price": 59.99,
        "release_date": datetime(2020, 12, 10),
        "age_rating": AgeRating.MATURE.value,
        "header_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/library_hero_2x.jpg",
        "capsule_image_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900_2x.jpg",
        "average_rating": 4.5,
        "total_reviews": 650000,
        "positive_reviews": 520000,
        "negative_reviews": 130000,
        "metadata": {"wishlist_count": 900000},
    },
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


async def _seed_curated_games(session: AsyncSession) -> int:
    """Insert curated Steam games with provided cover and hero assets."""
    inserted = 0
    for data in CURATED_STEAM_GAMES:
        result = await session.execute(
            select(Game).where(Game.steam_app_id == data["steam_app_id"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            # Backfill critical assets if they were missing.
            updated = False
            for field in (
                "header_image_url",
                "capsule_image_url",
                "price",
                "developer",
                "publisher",
            ):
                new_value = data.get(field)
                if new_value and getattr(existing, field) != new_value:
                    setattr(existing, field, new_value)
                    updated = True
            if data.get("movies") and not existing.movies:
                existing.movies = data["movies"]
                updated = True
            if data.get("metadata") and not existing.metadata_json:
                existing.metadata_json = data["metadata"]
                updated = True
            if updated:
                await session.flush()
            continue

        game = Game(
            steam_app_id=data["steam_app_id"],
            title=data["title"],
            description=data.get("description"),
            short_description=data.get("short_description") or data.get("description"),
            developer=data["developer"],
            publisher=data["publisher"],
            price=data["price"],
            currency="USD",
            game_type=GameType.GAME.value,
            status="active",
            age_rating=data.get("age_rating"),
            release_date=data.get("release_date"),
            header_image_url=data.get("header_image_url"),
            background_image_url=data.get("background_image_url"),
            capsule_image_url=data.get("capsule_image_url"),
            icon_url=data.get("icon_url"),
            screenshots=data.get("screenshots"),
            movies=data.get("movies"),
            total_reviews=data.get("total_reviews", 0),
            positive_reviews=data.get("positive_reviews", 0),
            negative_reviews=data.get("negative_reviews", 0),
            average_rating=data.get("average_rating"),
            metadata_json=data.get("metadata"),
        )

        session.add(game)
        inserted += 1
        if inserted % 10 == 0:
            await session.flush()

    if inserted:
        await session.flush()
    return inserted


async def seed_games(target: int = 100, curated_only: bool = False) -> tuple[int, int]:
    """
    Seed the database.

    Returns (total_inserted, curated_inserted).
    """
    await init_db()
    async with AsyncSessionLocal() as session:
        await _ensure_reference_data(session)

        curated_inserted = await _seed_curated_games(session)
        if curated_only:
            await session.commit()
            return curated_inserted, curated_inserted

        existing = await _count(session, Game)
        missing = max(0, target - existing)

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

        if curated_inserted or missing:
        await session.commit()

        return curated_inserted + missing, curated_inserted


async def async_main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the game catalog database with sample games."
    )
    parser.add_argument("--count", type=int, default=100)
    parser.add_argument(
        "--curated-only",
        action="store_true",
        help="Insert curated Steam assets and skip random filler rows.",
    )
    args = parser.parse_args()
    created, curated = await seed_games(args.count, curated_only=args.curated_only)
    print(
        f"Game catalog seed complete (inserted {created} rows; curated added {curated})."
    )


if __name__ == "__main__":
    asyncio.run(async_main())

