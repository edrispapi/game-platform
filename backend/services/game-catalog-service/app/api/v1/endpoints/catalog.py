"""Catalog endpoints."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

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
        return await service.create_game(payload)
    except ServiceError as exc:
        raise _http_error(exc)


@router.get("/games", response_model=GameSearchResponse)
async def search_games(
    filters: GameSearchFilters = Depends(),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    service: CatalogService = Depends(get_catalog_service),
):
    games, total = await service.search(filters, page, per_page)
    total_pages = max(1, (total + per_page - 1) // per_page)
    return GameSearchResponse(
        games=games,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        filters_applied=filters,
    )


@router.get("/games/{game_id}", response_model=GameResponse)
async def get_game(game_id: int, service: CatalogService = Depends(get_catalog_service)):
    try:
        return await service.get_game(game_id)
    except ServiceError as exc:
        raise _http_error(exc)


@router.put("/games/{game_id}", response_model=GameResponse)
async def update_game(
    game_id: int,
    payload: GameUpdate,
    service: CatalogService = Depends(get_catalog_service),
):
    try:
        return await service.update_game(game_id, payload)
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


@router.get("/games/featured", response_model=List[GameResponse])
async def get_featured_games(
    limit: int = Query(10, ge=1, le=50),
    service: CatalogService = Depends(get_catalog_service),
):
    return await service.featured_games(limit)


@router.get("/games/new-releases", response_model=List[GameResponse])
async def get_new_releases(
    limit: int = Query(10, ge=1, le=50),
    service: CatalogService = Depends(get_catalog_service),
):
    return await service.new_releases(limit)


@router.get("/games/on-sale", response_model=List[GameResponse])
async def get_on_sale_games(
    limit: int = Query(10, ge=1, le=50),
    service: CatalogService = Depends(get_catalog_service),
):
    return await service.on_sale(limit)


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

