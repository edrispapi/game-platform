"""Business logic for the game catalog."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Game,
    Genre,
    Platform,
    Tag,
)
from app.repository.game_repository import (
    GameRepository,
    GenreRepository,
    PlatformRepository,
    TagRepository,
)
from app.schemas import (
    GameCreate,
    GameSearchFilters,
    GameUpdate,
    GenreCreate,
    PlatformCreate,
    TagCreate,
)
from app.utils.exceptions import ConflictError, NotFoundError


def _to_dict(requirements) -> dict | None:
    return requirements.model_dump(exclude_none=True) if requirements else None


class CatalogService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.games = GameRepository(session)
        self.genres = GenreRepository(session)
        self.tags = TagRepository(session)
        self.platforms = PlatformRepository(session)

    # ------------------------------------------------------------------ Games
    async def create_game(self, payload: GameCreate) -> Game:
        if payload.steam_app_id and await self.games.get_by_steam_app_id(
            payload.steam_app_id
        ):
            raise ConflictError("Game with this Steam App ID already exists")

        game = Game(
            steam_app_id=payload.steam_app_id,
            title=payload.title,
            description=payload.description,
            short_description=payload.short_description,
            developer=payload.developer,
            publisher=payload.publisher,
            price=payload.price,
            original_price=payload.original_price,
            currency=payload.currency,
            game_type=payload.game_type.value,
            status=payload.status.value,
            age_rating=payload.age_rating.value if payload.age_rating else None,
            release_date=payload.release_date,
            early_access=payload.early_access,
            single_player=payload.single_player,
            multiplayer=payload.multiplayer,
            co_op=payload.co_op,
            local_co_op=payload.local_co_op,
            cross_platform=payload.cross_platform,
            vr_support=payload.vr_support,
            header_image_url=payload.header_image_url,
            background_image_url=payload.background_image_url,
            capsule_image_url=payload.capsule_image_url,
            screenshots=payload.screenshots,
            movies=payload.movies,
            pc_requirements=_to_dict(payload.pc_requirements),
            mac_requirements=_to_dict(payload.mac_requirements),
            linux_requirements=_to_dict(payload.linux_requirements),
        )

        if payload.original_price and payload.original_price > payload.price:
            game.discount_percent = round(
                ((payload.original_price - payload.price) / payload.original_price)
                * 100,
                2,
            )

        game.genres = await self.genres.list_by_ids(payload.genre_ids or [])
        game.tags = await self.tags.list_by_ids(payload.tag_ids or [])
        game.platforms = await self.platforms.list_by_ids(payload.platform_ids or [])

        await self.games.create(game)
        await self.session.commit()
        await self.session.refresh(game)
        return game

    async def get_game(self, game_id: int) -> Game:
        game = await self.games.get_by_id(game_id)
        if not game:
            raise NotFoundError("Game not found")
        return game

    async def list_games(self, skip: int = 0, limit: int = 100):
        return await self.games.list(skip, limit)

    async def update_game(self, game_id: int, payload: GameUpdate) -> Game:
        game = await self.get_game(game_id)
        data = payload.model_dump(exclude_unset=True)

        for field, value in data.items():
            if field in {"pc_requirements", "mac_requirements", "linux_requirements"}:
                setattr(game, field, _to_dict(value))
            elif field in {"status", "game_type", "age_rating"} and value:
                setattr(game, field, value.value)
            else:
                setattr(game, field, value)

        if game.original_price and game.original_price > game.price:
            game.discount_percent = round(
                ((game.original_price - game.price) / game.original_price) * 100, 2
            )
        else:
            game.discount_percent = 0.0

        await self.session.commit()
        await self.session.refresh(game)
        return game

    async def delete_game(self, game_id: int) -> None:
        game = await self.get_game(game_id)
        await self.games.delete(game)
        await self.session.commit()

    async def featured_games(self, limit: int):
        return await self.games.featured(limit)

    async def new_releases(self, limit: int):
        return await self.games.new_releases(limit)

    async def on_sale(self, limit: int):
        return await self.games.on_sale(limit)

    async def search(
        self, filters: GameSearchFilters, page: int, per_page: int
    ) -> tuple[list[Game], int]:
        return await self.games.search(filters, page, per_page)

    # ------------------------------------------------------------------ Genres
    async def create_genre(self, payload: GenreCreate) -> Genre:
        existing = await self.genres.get_by_name(payload.name)
        if existing:
            raise ConflictError("Genre already exists")
        genre = Genre(name=payload.name, description=payload.description)
        await self.genres.create(genre)
        await self.session.commit()
        return genre

    async def get_genre(self, genre_id: int) -> Genre:
        genre = await self.genres.get_by_id(genre_id)
        if not genre:
            raise NotFoundError("Genre not found")
        return genre

    async def list_genres(self, skip: int, limit: int):
        return await self.genres.list(skip, limit)

    # ------------------------------------------------------------------ Tags
    async def create_tag(self, payload: TagCreate) -> Tag:
        existing = await self.tags.get_by_name(payload.name)
        if existing:
            raise ConflictError("Tag already exists")
        tag = Tag(name=payload.name, description=payload.description, category=payload.category)
        await self.tags.create(tag)
        await self.session.commit()
        return tag

    async def get_tag(self, tag_id: int) -> Tag:
        tag = await self.tags.get_by_id(tag_id)
        if not tag:
            raise NotFoundError("Tag not found")
        return tag

    async def list_tags(self, skip: int, limit: int):
        return await self.tags.list(skip, limit)

    # ------------------------------------------------------------------ Platforms
    async def create_platform(self, payload: PlatformCreate) -> Platform:
        existing = await self.platforms.get_by_name(payload.name)
        if existing:
            raise ConflictError("Platform already exists")
        platform = Platform(
            name=payload.name,
            display_name=payload.display_name,
            description=payload.description,
            icon_url=payload.icon_url,
        )
        await self.platforms.create(platform)
        await self.session.commit()
        return platform

    async def get_platform(self, platform_id: int) -> Platform:
        platform = await self.platforms.get_by_id(platform_id)
        if not platform:
            raise NotFoundError("Platform not found")
        return platform

    async def list_platforms(self, skip: int, limit: int):
        return await self.platforms.list(skip, limit)


