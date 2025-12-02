"""Data access helpers for games."""
from __future__ import annotations

from typing import List, Optional, Sequence, Tuple

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Game,
    GameStatus,
    Genre,
    Platform,
    Tag,
)
from app.schemas import GameSearchFilters


class GameRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, game_id: int) -> Optional[Game]:
        result = await self.session.execute(
            select(Game)
            .options(
                selectinload(Game.genres),
                selectinload(Game.tags),
                selectinload(Game.platforms),
            )
            .where(Game.id == game_id)
        )
        return result.scalar_one_or_none()

    async def get_by_steam_app_id(self, steam_app_id: int) -> Optional[Game]:
        result = await self.session.execute(
            select(Game).where(Game.steam_app_id == steam_app_id)
        )
        return result.scalar_one_or_none()

    async def list(
        self, skip: int = 0, limit: int = 100
    ) -> Sequence[Game]:
        result = await self.session.execute(
            select(Game)
            .options(
                selectinload(Game.genres),
                selectinload(Game.tags),
                selectinload(Game.platforms),
            )
            .offset(skip)
            .limit(limit)
            .order_by(Game.id)
        )
        return result.scalars().all()

    async def create(self, game: Game) -> Game:
        self.session.add(game)
        await self.session.flush()
        await self.session.refresh(game)
        return game

    async def delete(self, game: Game) -> None:
        await self.session.delete(game)

    async def featured(self, limit: int) -> List[Game]:
        stmt = (
            select(Game)
            .where(
                Game.status == GameStatus.ACTIVE.value,
                Game.average_rating >= 4.0,
                Game.total_reviews >= 100,
            )
            .order_by(desc(Game.average_rating))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def new_releases(self, limit: int) -> List[Game]:
        stmt = (
            select(Game)
            .where(
                Game.status == GameStatus.ACTIVE.value,
                Game.release_date.isnot(None),
            )
            .order_by(desc(Game.release_date))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def on_sale(self, limit: int) -> List[Game]:
        stmt = (
            select(Game)
            .where(
                Game.status == GameStatus.ACTIVE.value,
                Game.discount_percent > 0,
            )
            .order_by(desc(Game.discount_percent))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def search(
        self, filters: GameSearchFilters, page: int, per_page: int
    ) -> Tuple[List[Game], int]:
        stmt = select(Game).distinct()

        if filters.query:
            term = f"%{filters.query}%"
            stmt = stmt.where(
                or_(
                    Game.title.ilike(term),
                    Game.description.ilike(term),
                    Game.developer.ilike(term),
                    Game.publisher.ilike(term),
                )
            )

        if filters.genres:
            stmt = stmt.join(Game.genres).where(Genre.id.in_(filters.genres))
        if filters.tags:
            stmt = stmt.join(Game.tags).where(Tag.id.in_(filters.tags))
        if filters.platforms:
            stmt = stmt.join(Game.platforms).where(Platform.id.in_(filters.platforms))

        if filters.min_price is not None:
            stmt = stmt.where(Game.price >= filters.min_price)
        if filters.max_price is not None:
            stmt = stmt.where(Game.price <= filters.max_price)
        if filters.min_rating is not None:
            stmt = stmt.where(Game.average_rating >= filters.min_rating)
        if filters.max_rating is not None:
            stmt = stmt.where(Game.average_rating <= filters.max_rating)
        if filters.single_player is not None:
            stmt = stmt.where(Game.single_player == filters.single_player)
        if filters.multiplayer is not None:
            stmt = stmt.where(Game.multiplayer == filters.multiplayer)
        if filters.co_op is not None:
            stmt = stmt.where(Game.co_op == filters.co_op)
        if filters.vr_support is not None:
            stmt = stmt.where(Game.vr_support == filters.vr_support)
        if filters.early_access is not None:
            stmt = stmt.where(Game.early_access == filters.early_access)
        if filters.status:
            stmt = stmt.where(Game.status == filters.status.value)
        if filters.game_type:
            stmt = stmt.where(Game.game_type == filters.game_type.value)
        if filters.age_rating:
            stmt = stmt.where(Game.age_rating == filters.age_rating.value)

        if filters.sort_by == "price":
            order = asc if filters.sort_order == "asc" else desc
            stmt = stmt.order_by(order(Game.price))
        elif filters.sort_by == "rating":
            order = asc if filters.sort_order == "asc" else desc
            stmt = stmt.order_by(order(Game.average_rating))
        elif filters.sort_by == "release_date":
            order = asc if filters.sort_order == "asc" else desc
            stmt = stmt.order_by(order(Game.release_date))
        elif filters.sort_by == "title":
            order = asc if filters.sort_order == "asc" else desc
            stmt = stmt.order_by(order(Game.title))
        else:
            stmt = stmt.order_by(desc(Game.average_rating), desc(Game.total_reviews))

        count_stmt = (
            select(func.count(func.distinct(Game.id))).select_from(stmt.subquery())
        )
        total = (await self.session.execute(count_stmt)).scalar_one()

        offset = (page - 1) * per_page
        stmt = stmt.offset(offset).limit(per_page)
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total


class GenreRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, genre_id: int) -> Optional[Genre]:
        result = await self.session.execute(select(Genre).where(Genre.id == genre_id))
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Genre]:
        result = await self.session.execute(select(Genre).where(Genre.name == name))
        return result.scalar_one_or_none()

    async def list(self, skip: int, limit: int) -> List[Genre]:
        result = await self.session.execute(
            select(Genre).offset(skip).limit(limit).order_by(Genre.name)
        )
        return result.scalars().all()

    async def create(self, genre: Genre) -> Genre:
        self.session.add(genre)
        await self.session.flush()
        await self.session.refresh(genre)
        return genre

    async def list_by_ids(self, ids: List[int]) -> List[Genre]:
        if not ids:
            return []
        result = await self.session.execute(select(Genre).where(Genre.id.in_(ids)))
        return result.scalars().all()


class TagRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, tag_id: int) -> Optional[Tag]:
        result = await self.session.execute(select(Tag).where(Tag.id == tag_id))
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Tag]:
        result = await self.session.execute(select(Tag).where(Tag.name == name))
        return result.scalar_one_or_none()

    async def list(self, skip: int, limit: int) -> List[Tag]:
        result = await self.session.execute(
            select(Tag).offset(skip).limit(limit).order_by(Tag.name)
        )
        return result.scalars().all()

    async def create(self, tag: Tag) -> Tag:
        self.session.add(tag)
        await self.session.flush()
        await self.session.refresh(tag)
        return tag

    async def list_by_ids(self, ids: List[int]) -> List[Tag]:
        if not ids:
            return []
        result = await self.session.execute(select(Tag).where(Tag.id.in_(ids)))
        return result.scalars().all()


class PlatformRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, platform_id: int) -> Optional[Platform]:
        result = await self.session.execute(
            select(Platform).where(Platform.id == platform_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Platform]:
        result = await self.session.execute(
            select(Platform).where(Platform.name == name)
        )
        return result.scalar_one_or_none()

    async def list(self, skip: int, limit: int) -> List[Platform]:
        result = await self.session.execute(
            select(Platform).offset(skip).limit(limit).order_by(Platform.name)
        )
        return result.scalars().all()

    async def create(self, platform: Platform) -> Platform:
        self.session.add(platform)
        await self.session.flush()
        await self.session.refresh(platform)
        return platform

    async def list_by_ids(self, ids: List[int]) -> List[Platform]:
        if not ids:
            return []
        result = await self.session.execute(select(Platform).where(Platform.id.in_(ids)))
        return result.scalars().all()

