"""Catalog endpoints."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_session
from app.schemas import (
    GameCreate,
    GameResponse,
    GameSearchFilters,
    GameSearchResponse,
    GameUpdate,
    GenreCreate,
    GenreResponse,
    PlatformCreate,
    PlatformResponse,
    TagCreate,
    TagResponse,
)
from app.services import CatalogService
from app.utils.exceptions import ConflictError, NotFoundError, ServiceError

router = APIRouter()


async def get_catalog_service(
    session: AsyncSession = Depends(get_session),
) -> CatalogService:
    return CatalogService(session)


def _http_error(exc: ServiceError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, ConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/games", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
async def create_game(
    payload: GameCreate, service: CatalogService = Depends(get_catalog_service)
):
    try:
        game = await service.create_game(payload)
        return GameResponse.from_orm_with_relations(
            game,
            genres=[GenreResponse.model_validate(g) for g in (game.genres or [])],
            tags=[TagResponse.model_validate(t) for t in (game.tags or [])],
            platforms=[PlatformResponse.model_validate(p) for p in (game.platforms or [])],
        )
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/games")
async def search_games(
    filters: GameSearchFilters = Depends(),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    service: CatalogService = Depends(get_catalog_service),
):
    games, total = await service.search(filters, page, per_page)
    total_pages = max(1, (total + per_page - 1) // per_page)

    # Convert ORM objects to Pydantic models safely
    game_responses = []
    for game in games:
        # Convert relations to response models while still in async context
        genres = [GenreResponse.model_validate(g) for g in (game.genres or [])]
        tags = [TagResponse.model_validate(t) for t in (game.tags or [])]
        platforms = [PlatformResponse.model_validate(p) for p in (game.platforms or [])]
        
        # Handle metadata_json - JSONB column
        metadata = game.metadata_json if hasattr(game, 'metadata_json') else None
        
        # Create response using from_orm_with_relations
        game_response = GameResponse.from_orm_with_relations(
            game,
            genres=genres,
            tags=tags,
            platforms=platforms,
        )
        # Set metadata explicitly
        game_response.metadata = metadata
        
        game_responses.append(game_response)

    response = GameSearchResponse(
        games=game_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        filters_applied=filters,
    )
    return response.model_dump()


@router.get("/games-simple")
async def list_games_simple(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """
    Lightweight games listing used by the StorePage to avoid complex ORM/Pydantic issues.
    Returns only basic fields required by the UI.
    """
    offset = (page - 1) * per_page

    result = await session.execute(
        text(
            """
            SELECT
              id,
              title,
              description,
              short_description,
              price,
              developer,
              publisher,
              release_date,
              header_image_url AS banner_image_url,
              capsule_image_url AS cover_image_url,
              icon_url,
              average_rating,
              total_reviews,
              positive_reviews,
              negative_reviews
            FROM games
            ORDER BY id
            LIMIT :limit OFFSET :offset
            """
        ),
        {"limit": per_page, "offset": offset},
    )
    rows = []
    for r in result:
        row_dict = dict(r._mapping)
        # Convert datetime to ISO string for JSON serialization
        if 'release_date' in row_dict and row_dict['release_date']:
            row_dict['release_date'] = row_dict['release_date'].isoformat()
        rows.append(row_dict)

    count_result = await session.execute(text("SELECT COUNT(*) FROM games"))
    total = int(count_result.scalar_one() or 0)
    total_pages = max(1, (total + per_page - 1) // per_page)

    return JSONResponse(
        {
            "games": rows,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }
    )


@router.get("/games/by-slug/{slug}", response_model=GameResponse)
async def get_game_by_slug(
    slug: str,
    session: AsyncSession = Depends(get_session),
    service: CatalogService = Depends(get_catalog_service),
):
    """
    Get a game by its slug (title converted to URL-friendly format).
    Falls back to title matching if slug doesn't exist in database.
    """
    try:
        # Convert slug back to title for matching
        # Handle both "cyberpunk-2077" and "cyberpunk 2077" formats
        title_from_slug = slug.replace('-', ' ').replace('_', ' ')
        
        # Try to find game by exact title match (case-insensitive) and fetch requirements in one query
        from sqlalchemy import text
        result = await session.execute(
            text("""
                SELECT id, pc_requirements, mac_requirements, linux_requirements
                FROM games 
                WHERE LOWER(TRIM(title)) = LOWER(TRIM(:title))
                LIMIT 1
            """),
            {"title": title_from_slug}
        )
        row = result.mappings().first()
        
        # If exact match not found, try normalized matching (remove special chars)
        if not row:
            # Normalize both slug and title by removing special characters
            normalized_slug = title_from_slug.lower().replace(':', '').replace('-', ' ').replace('_', ' ').strip()
            result2 = await session.execute(
                text("""
                    SELECT id, pc_requirements, mac_requirements, linux_requirements
                    FROM games 
                    WHERE LOWER(REPLACE(REPLACE(REPLACE(TRIM(title), ':', ''), '-', ' '), '_', ' ')) = :normalized
                    LIMIT 1
                """),
                {"normalized": normalized_slug}
            )
            row = result2.mappings().first()
        
        if row:
            game_id = row['id'] if isinstance(row, dict) else row[0]
            game = await service.get_game(game_id)
            
            # Fetch requirements separately using raw SQL with explicit text cast
            reqs_result = await session.execute(
                text("""
                    SELECT 
                        pc_requirements::text as pc_req,
                        mac_requirements::text as mac_req,
                        linux_requirements::text as linux_req
                    FROM games WHERE id = :game_id
                """),
                {"game_id": game_id}
            )
            reqs_row = reqs_result.mappings().first()
            
            # Build response with requirements data
            response_dict = GameResponse.from_orm_with_relations(
                game,
                genres=[GenreResponse.model_validate(g) for g in (game.genres or [])],
                tags=[TagResponse.model_validate(t) for t in (game.tags or [])],
                platforms=[PlatformResponse.model_validate(p) for p in (game.platforms or [])],
            ).model_dump()
            
            # Parse and add requirements from the query result
            from app.schemas import SystemRequirements
            import json
            
            if reqs_row:
                pc_req_text = reqs_row.get('pc_req')
                if pc_req_text:
                    try:
                        pc_req_dict = json.loads(pc_req_text)
                        response_dict['pc_requirements'] = SystemRequirements(**pc_req_dict).model_dump()
                    except Exception:
                        pass
                
                mac_req_text = reqs_row.get('mac_req')
                if mac_req_text:
                    try:
                        mac_req_dict = json.loads(mac_req_text)
                        response_dict['mac_requirements'] = SystemRequirements(**mac_req_dict).model_dump()
                    except Exception:
                        pass
                
                linux_req_text = reqs_row.get('linux_req')
                if linux_req_text:
                    try:
                        linux_req_dict = json.loads(linux_req_text)
                        response_dict['linux_requirements'] = SystemRequirements(**linux_req_dict).model_dump()
                    except Exception:
                        pass
            
            return GameResponse(**response_dict)
        else:
            raise HTTPException(status_code=404, detail=f"Game not found with slug: {slug}")
    except HTTPException:
        raise
    except ServiceError as exc:
        raise _http_error(exc)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error fetching game: {str(exc)}")


@router.get("/games/{game_id}", response_model=GameResponse)
async def get_game(game_id: int, service: CatalogService = Depends(get_catalog_service)):
    try:
        game = await service.get_game(game_id)
        return GameResponse.from_orm_with_relations(
            game,
            genres=[GenreResponse.model_validate(g) for g in (game.genres or [])],
            tags=[TagResponse.model_validate(t) for t in (game.tags or [])],
            platforms=[PlatformResponse.model_validate(p) for p in (game.platforms or [])],
        )
    except ServiceError as exc:
        raise _http_error(exc)


@router.put("/games/{game_id}", response_model=GameResponse)
async def update_game(
    game_id: int,
    payload: GameUpdate,
    service: CatalogService = Depends(get_catalog_service),
):
    try:
        game = await service.update_game(game_id, payload)
        return GameResponse.from_orm_with_relations(
            game,
            genres=[GenreResponse.model_validate(g) for g in (game.genres or [])],
            tags=[TagResponse.model_validate(t) for t in (game.tags or [])],
            platforms=[PlatformResponse.model_validate(p) for p in (game.platforms or [])],
        )
    except ServiceError as exc:
        raise _http_error(exc)


@router.delete("/games/{game_id}")
async def delete_game(
    game_id: int, service: CatalogService = Depends(get_catalog_service)
):
    try:
        await service.delete_game(game_id)
        return {"message": "Game deleted successfully"}
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/games/featured")
async def get_featured_games(
    limit: int = Query(10, ge=1, le=50),
    service: CatalogService = Depends(get_catalog_service),
):
    games = await service.featured_games(limit)
    responses = [
        GameResponse.from_orm_with_relations(
            game,
            genres=[GenreResponse.model_validate(g) for g in (game.genres or [])],
            tags=[TagResponse.model_validate(t) for t in (game.tags or [])],
            platforms=[PlatformResponse.model_validate(p) for p in (game.platforms or [])],
        )
        for game in games
    ]
    return [g.model_dump() for g in responses]


@router.get("/games/new-releases")
async def get_new_releases(
    limit: int = Query(10, ge=1, le=50),
    service: CatalogService = Depends(get_catalog_service),
):
    games = await service.new_releases(limit)
    responses = [
        GameResponse.from_orm_with_relations(
            game,
            genres=[GenreResponse.model_validate(g) for g in (game.genres or [])],
            tags=[TagResponse.model_validate(t) for t in (game.tags or [])],
            platforms=[PlatformResponse.model_validate(p) for p in (game.platforms or [])],
        )
        for game in games
    ]
    return [g.model_dump() for g in responses]


@router.get("/games/on-sale")
async def get_on_sale_games(
    limit: int = Query(10, ge=1, le=50),
    service: CatalogService = Depends(get_catalog_service),
):
    games = await service.on_sale(limit)
    responses = [
        GameResponse.from_orm_with_relations(
            game,
            genres=[GenreResponse.model_validate(g) for g in (game.genres or [])],
            tags=[TagResponse.model_validate(t) for t in (game.tags or [])],
            platforms=[PlatformResponse.model_validate(p) for p in (game.platforms or [])],
        )
        for game in games
    ]
    return [g.model_dump() for g in responses]


@router.get("/games/simple")
async def list_games_simple(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """
    Lightweight games listing used by the StorePage to avoid complex ORM/Pydantic issues.
    Returns only basic fields required by the UI.
    """
    offset = (page - 1) * per_page

    result = await session.execute(
        text(
            """
            SELECT
              id,
              title,
              price,
              header_image_url AS banner_image_url,
              capsule_image_url AS cover_image_url,
              icon_url,
              average_rating,
              total_reviews
            FROM games
            ORDER BY id
            LIMIT :limit OFFSET :offset
            """
        ),
        {"limit": per_page, "offset": offset},
    )
    rows = [dict(r._mapping) for r in result]

    count_result = await session.execute(text("SELECT COUNT(*) FROM games"))
    total = int(count_result.scalar_one() or 0)
    total_pages = max(1, (total + per_page - 1) // per_page)

    return JSONResponse(
        {
            "games": rows,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }
    )


@router.post("/genres", response_model=GenreResponse, status_code=status.HTTP_201_CREATED)
async def create_genre(
    payload: GenreCreate,
    service: CatalogService = Depends(get_catalog_service),
):
    try:
        return await service.create_genre(payload)
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/genres", response_model=List[GenreResponse])
async def list_genres(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: CatalogService = Depends(get_catalog_service),
):
    return await service.list_genres(skip, limit)


@router.get("/genres/{genre_id}", response_model=GenreResponse)
async def get_genre(
    genre_id: int,
    service: CatalogService = Depends(get_catalog_service),
):
    try:
        return await service.get_genre(genre_id)
    except ServiceError as exc:
        raise _http_error(exc)


@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    payload: TagCreate, service: CatalogService = Depends(get_catalog_service)
):
    try:
        return await service.create_tag(payload)
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/tags", response_model=List[TagResponse])
async def list_tags(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: CatalogService = Depends(get_catalog_service),
):
    return await service.list_tags(skip, limit)


@router.get("/tags/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int, service: CatalogService = Depends(get_catalog_service)
):
    try:
        return await service.get_tag(tag_id)
    except ServiceError as exc:
        raise _http_error(exc)


@router.post(
    "/platforms", response_model=PlatformResponse, status_code=status.HTTP_201_CREATED
)
async def create_platform(
    payload: PlatformCreate,
    service: CatalogService = Depends(get_catalog_service),
):
    try:
        return await service.create_platform(payload)
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/platforms", response_model=List[PlatformResponse])
async def list_platforms(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: CatalogService = Depends(get_catalog_service),
):
    return await service.list_platforms(skip, limit)


@router.get("/platforms/{platform_id}", response_model=PlatformResponse)
async def get_platform(
    platform_id: int,
    service: CatalogService = Depends(get_catalog_service),
):
    try:
        return await service.get_platform(platform_id)
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/game-icons")
async def get_game_icons(
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    """
    Get available game icons for user avatars.
    Returns a list of game icon URLs that users can choose from.
    """
    # Use subquery to handle DISTINCT with RANDOM() ordering
    result = await session.execute(
        text(
            """
            SELECT icon_url FROM (
                SELECT DISTINCT icon_url
                FROM games
                WHERE icon_url IS NOT NULL AND icon_url != ''
            ) AS distinct_icons
            ORDER BY RANDOM()
            LIMIT :limit
            """
        ),
        {"limit": limit},
    )
    icons = [row[0] for row in result if row[0]]
    
    # If we don't have enough icons, also include capsule images as fallback
    if len(icons) < limit:
        result2 = await session.execute(
            text(
                """
                SELECT capsule_image_url FROM (
                    SELECT DISTINCT capsule_image_url
                    FROM games
                    WHERE capsule_image_url IS NOT NULL 
                      AND capsule_image_url != ''
                      AND capsule_image_url != ALL(:icons)
                ) AS distinct_capsules
                ORDER BY RANDOM()
                LIMIT :remaining
                """
            ),
            {"icons": icons, "remaining": limit - len(icons)},
        )
        icons.extend([row[0] for row in result2 if row[0]])
    
    return {"icons": icons, "count": len(icons)}


    payload: TagCreate, service: CatalogService = Depends(get_catalog_service)
):
    try:
        return await service.create_tag(payload)
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/tags", response_model=List[TagResponse])
async def list_tags(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: CatalogService = Depends(get_catalog_service),
):
    return await service.list_tags(skip, limit)


@router.get("/tags/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int, service: CatalogService = Depends(get_catalog_service)
):
    try:
        return await service.get_tag(tag_id)
    except ServiceError as exc:
        raise _http_error(exc)


@router.post(
    "/platforms", response_model=PlatformResponse, status_code=status.HTTP_201_CREATED
)
async def create_platform(
    payload: PlatformCreate,
    service: CatalogService = Depends(get_catalog_service),
):
    try:
        return await service.create_platform(payload)
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/platforms", response_model=List[PlatformResponse])
async def list_platforms(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: CatalogService = Depends(get_catalog_service),
):
    return await service.list_platforms(skip, limit)


@router.get("/platforms/{platform_id}", response_model=PlatformResponse)
async def get_platform(
    platform_id: int,
    service: CatalogService = Depends(get_catalog_service),
):
    try:
        return await service.get_platform(platform_id)
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/game-icons")
async def get_game_icons(
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    """
    Get available game icons for user avatars.
    Returns a list of game icon URLs that users can choose from.
    """
    # Use subquery to handle DISTINCT with RANDOM() ordering
    result = await session.execute(
        text(
            """
            SELECT icon_url FROM (
                SELECT DISTINCT icon_url
                FROM games
                WHERE icon_url IS NOT NULL AND icon_url != ''
            ) AS distinct_icons
            ORDER BY RANDOM()
            LIMIT :limit
            """
        ),
        {"limit": limit},
    )
    icons = [row[0] for row in result if row[0]]
    
    # If we don't have enough icons, also include capsule images as fallback
    if len(icons) < limit:
        result2 = await session.execute(
            text(
                """
                SELECT capsule_image_url FROM (
                    SELECT DISTINCT capsule_image_url
                    FROM games
                    WHERE capsule_image_url IS NOT NULL 
                      AND capsule_image_url != ''
                      AND capsule_image_url != ALL(:icons)
                ) AS distinct_capsules
                ORDER BY RANDOM()
                LIMIT :remaining
                """
            ),
            {"icons": icons, "remaining": limit - len(icons)},
        )
        icons.extend([row[0] for row in result2 if row[0]])
    
    return {"icons": icons, "count": len(icons)}

