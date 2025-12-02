"""CRUD helpers for workshop service."""
from __future__ import annotations

from typing import List, Optional, Tuple

from slugify import slugify
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from . import models, schemas
from .services import auto_moderation


def _unique_slug(db: Session, title: str) -> str:
    base = slugify(title) or "workshop-item"
    slug = base
    idx = 1
    while (
        db.query(models.WorkshopItem)
        .filter(models.WorkshopItem.slug == slug)
        .first()
        is not None
    ):
        slug = f"{base}-{idx}"
        idx += 1
    return slug


def create_item(
    db: Session,
    user_id: str,
    payload: schemas.WorkshopItemCreate,
    file_meta: Tuple[str, str, str] | None,
) -> models.WorkshopItem:
    slug = _unique_slug(db, payload.title)
    auto_result = auto_moderation.score_content(
        payload.title, payload.description, payload.tags
    )

    status = (
        models.WorkshopItemStatus.APPROVED
        if not auto_result.flagged
        else models.WorkshopItemStatus.PENDING
    )

    file_path = file_url = checksum = None
    if file_meta:
        file_path, file_url, checksum = file_meta
    elif payload.file_url:
        file_url = payload.file_url

    item = models.WorkshopItem(
        user_id=user_id,
        game_id=payload.game_id,
        title=payload.title,
        slug=slug,
        description=payload.description,
        tags=payload.tags,
        version=payload.version,
        visibility=payload.visibility,
        status=status,
        file_path=file_path,
        file_url=file_url,
        thumbnail_url=payload.thumbnail_url,
        content_checksum=checksum,
        auto_flagged=auto_result.flagged,
        auto_score=auto_result.score,
        auto_reasons=auto_result.reasons,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_items(
    db: Session,
    *,
    status: Optional[models.WorkshopItemStatus] = None,
    visibility: Optional[models.WorkshopItemVisibility] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[models.WorkshopItem], int]:
    query = db.query(models.WorkshopItem)
    if status:
        query = query.filter(models.WorkshopItem.status == status)
    if visibility:
        query = query.filter(models.WorkshopItem.visibility == visibility)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(models.WorkshopItem.title).like(like),
                func.lower(models.WorkshopItem.description).like(like),
            )
        )
    total = query.count()
    items = (
        query.order_by(models.WorkshopItem.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return items, total


def get_item(db: Session, item_id: int) -> models.WorkshopItem | None:
    return db.query(models.WorkshopItem).filter(models.WorkshopItem.id == item_id).first()


def update_item(
    db: Session, item: models.WorkshopItem, payload: schemas.WorkshopItemUpdate
) -> models.WorkshopItem:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def add_vote(
    db: Session,
    item: models.WorkshopItem,
    user_id: str,
    is_upvote: bool,
) -> models.WorkshopItem:
    existing = (
        db.query(models.WorkshopVote)
        .filter(
            models.WorkshopVote.item_id == item.id,
            models.WorkshopVote.user_id == user_id,
        )
        .one_or_none()
    )
    if existing:
        if existing.is_upvote == is_upvote:
            return item  # no change
        if existing.is_upvote:
            item.votes_up -= 1
        else:
            item.votes_down -= 1
        existing.is_upvote = is_upvote
    else:
        vote = models.WorkshopVote(item_id=item.id, user_id=user_id, is_upvote=is_upvote)
        db.add(vote)

    if is_upvote:
        item.votes_up += 1
    else:
        item.votes_down += 1

    db.commit()
    db.refresh(item)
    return item


def record_download(db: Session, item: models.WorkshopItem) -> models.WorkshopItem:
    item.downloads += 1
    db.commit()
    db.refresh(item)
    return item


def moderate_item(
    db: Session, item: models.WorkshopItem, request: schemas.WorkshopModerationRequest
) -> models.WorkshopItem:
    log = models.WorkshopModerationLog(
        item_id=item.id,
        moderator_id=request.moderator_id,
        action=request.action.value,
        reason=request.reason,
    )
    db.add(log)
    item.status = request.action
    item.manual_reviewer_id = request.moderator_id
    item.moderation_notes = request.reason
    db.commit()
    db.refresh(item)
    return item

