"""Workshop service API routes."""
from __future__ import annotations

import json
from typing import List, Optional

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from . import crud, database, schemas
from .core.auth import verify_token
from .models import WorkshopItemStatus, WorkshopItemVisibility
from .services import storage

router = APIRouter()


@router.post(
    "/items",
    response_model=schemas.WorkshopItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_workshop_item(
    payload: schemas.WorkshopItemCreate,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    item = crud.create_item(
        db=db,
        user_id=str(token_payload["user_id"]),
        payload=payload,
        file_meta=None,
    )
    return item


@router.post(
    "/items/upload",
    response_model=schemas.WorkshopItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_workshop_item_with_upload(
    metadata: str = Form(...),
    file: UploadFile = File(...),
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    try:
        payload = schemas.WorkshopItemCreate.model_validate_json(metadata)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid metadata: {exc}") from exc

    file_meta = await storage.persist_upload(file)
    item = crud.create_item(
        db=db,
        user_id=str(token_payload["user_id"]),
        payload=payload,
        file_meta=file_meta,
    )
    return item


@router.get("/items", response_model=schemas.WorkshopListResponse)
def list_items(
    status_filter: Optional[WorkshopItemStatus] = None,
    visibility: Optional[WorkshopItemVisibility] = None,
    search: Optional[str] = None,
    game_id: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(database.get_db),
):
    items, total = crud.list_items(
        db,
        status=status_filter,
        visibility=visibility,
        search=search,
        game_id=game_id,
        limit=min(50, max(1, limit)),
        offset=max(0, offset),
    )
    return schemas.WorkshopListResponse(items=items, total=total)


@router.get("/items/{item_id}", response_model=schemas.WorkshopItemResponse)
def get_item(item_id: int, db: Session = Depends(database.get_db)):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}", response_model=schemas.WorkshopItemResponse)
def update_item(
    item_id: int,
    payload: schemas.WorkshopItemUpdate,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if str(item.user_id) != str(token_payload["user_id"]):
        raise HTTPException(status_code=403, detail="Cannot update this item")
    return crud.update_item(db, item, payload)


@router.post("/items/{item_id}/votes", response_model=schemas.WorkshopItemResponse)
def vote_item(
    item_id: int,
    payload: schemas.WorkshopVoteRequest,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return crud.add_vote(
        db, item=item, user_id=str(token_payload["user_id"]), is_upvote=payload.is_upvote
    )


def _require_moderator(token_payload) -> None:
    role = token_payload.get("role") or token_payload.get("user_role")
    if role not in {"admin", "moderator"}:
        raise HTTPException(status_code=403, detail="Moderator role required")


@router.post(
    "/items/{item_id}/moderation",
    response_model=schemas.WorkshopItemResponse,
)
def moderate_item(
    item_id: int,
    payload: schemas.WorkshopModerationRequest,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    _require_moderator(token_payload)
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return crud.moderate_item(db, item, payload)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    _require_moderator(token_payload)
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    crud.delete_item(db, item)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/items/{item_id}/download",
    response_model=schemas.WorkshopDownloadResponse,
)
def record_download(item_id: int, db: Session = Depends(database.get_db)):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item = crud.record_download(db, item)
    download_url = item.file_url or item.file_path or ""
    return schemas.WorkshopDownloadResponse(download_url=download_url, downloads=item.downloads)


# ---------------------------
# Comments
# ---------------------------


@router.get("/items/{item_id}/comments", response_model=list[schemas.WorkshopCommentResponse])
def list_comments(
    item_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(database.get_db),
):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return crud.list_comments(
        db, item_id=item_id, limit=min(100, max(1, limit)), offset=max(0, offset)
    )


@router.post(
    "/items/{item_id}/comments",
    response_model=schemas.WorkshopCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    item_id: int,
    payload: schemas.WorkshopCommentCreate,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return crud.create_comment(
        db, item_id=item_id, user_id=str(token_payload["user_id"]), payload=payload
    )


# ---------------------------
# Ratings
# ---------------------------


@router.get("/items/{item_id}/ratings", response_model=schemas.WorkshopRatingSummary)
def get_rating_summary(item_id: int, db: Session = Depends(database.get_db)):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return crud.rating_summary(db, item_id)


@router.post("/items/{item_id}/ratings", response_model=schemas.WorkshopRatingSummary)
def set_rating(
    item_id: int,
    payload: schemas.WorkshopRatingCreate,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    item = crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return crud.set_rating(
        db, item_id=item_id, user_id=str(token_payload["user_id"]), score=payload.score
    )


# ---------------------------
# Admin reset
# ---------------------------


@router.post("/admin/reset", status_code=status.HTTP_204_NO_CONTENT)
def reset_workshop(
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    _require_moderator(token_payload)
    crud.reset_workshop(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

