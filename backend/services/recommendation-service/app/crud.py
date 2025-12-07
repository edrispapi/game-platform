"""
Recommendation Service CRUD Operations
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Sequence, Tuple

from sqlalchemy.orm import Session

from app.events import publish_event
from .core.config import settings

from . import models, schemas


def _publish(event_type: str, payload: dict) -> None:
    publish_event(settings.KAFKA_RECOMMENDATION_TOPIC, {"event_type": event_type, **payload})


def replace_user_recommendations(db: Session, batch: schemas.RecommendationBatchCreate) -> List[models.Recommendation]:
    """Replace a user's active recommendations with a fresh batch."""
    db.query(models.Recommendation).filter(models.Recommendation.user_id == batch.user_id).update(
        {"is_active": False}, synchronize_session=False
    )

    expires_at = (
        datetime.now(timezone.utc) + timedelta(hours=batch.expires_in_hours)
        if batch.expires_in_hours
        else None
    )

    new_records: List[models.Recommendation] = []
    for idx, item in enumerate(batch.recommendations, start=1):
        rec = models.Recommendation(
            user_id=batch.user_id,
            game_id=item.game_id,
            score=item.score,
            rank=idx,
            algorithm=item.algorithm,
            reason=item.reason,
            context=item.context,
            expires_at=expires_at,
            is_active=True,
        )
        db.add(rec)
        new_records.append(rec)

    db.commit()
    for rec in new_records:
        db.refresh(rec)

    _publish(
        "recommendations_created",
        {"user_id": batch.user_id, "count": len(new_records)},
    )
    return new_records


def get_user_recommendations(db: Session, user_id: str, limit: int = 20) -> List[models.Recommendation]:
    """Fetch active recommendations for a user ordered by rank."""
    now = datetime.now(timezone.utc)
    return (
        db.query(models.Recommendation)
        .filter(
            models.Recommendation.user_id == user_id,
            models.Recommendation.is_active == True,  # noqa: E712
            (models.Recommendation.expires_at.is_(None) | (models.Recommendation.expires_at > now)),
        )
        .order_by(models.Recommendation.rank.asc())
        .limit(limit)
        .all()
    )


def record_feedback(
    db: Session,
    recommendation_id: int | None,
    payload: schemas.RecommendationFeedbackCreate,
) -> models.RecommendationFeedback:
    """Record user feedback for a recommendation."""
    rec_id = recommendation_id
    if rec_id is None:
        rec = (
            db.query(models.Recommendation)
            .filter(
                models.Recommendation.user_id == payload.user_id,
                models.Recommendation.game_id == payload.game_id,
                models.Recommendation.is_active == True,  # noqa: E712
            )
            .order_by(models.Recommendation.rank.asc())
            .first()
        )
        rec_id = rec.id if rec else None

    feedback = models.RecommendationFeedback(
        recommendation_id=rec_id,
        user_id=payload.user_id,
        game_id=payload.game_id,
        action=payload.action,
        details=payload.details,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    _publish(
        "recommendation_feedback",
        {
            "user_id": payload.user_id,
            "game_id": payload.game_id,
            "action": payload.action,
            "recommendation_id": rec_id,
        },
    )
    return feedback


def _interaction_weight(event_type: str, override: float | None) -> float:
    if override is not None:
        return override
    return settings.INTERACTION_WEIGHTS.get(event_type, 1.0)


def ingest_interactions(db: Session, batch: schemas.InteractionBatch) -> Tuple[int, int]:
    created = 0
    updated = 0
    now = datetime.now(timezone.utc)
    for event in batch.interactions:
        weight = _interaction_weight(event.event_type, event.weight)
        occurred_at = event.occurred_at or now
        existing = (
            db.query(models.UserGameInteraction)
            .filter(
                models.UserGameInteraction.user_id == event.user_id,
                models.UserGameInteraction.game_id == event.game_id,
            )
            .one_or_none()
        )
        if existing:
            existing.score += weight
            existing.interactions += 1
            existing.last_event_type = event.event_type
            existing.last_event_at = occurred_at
            existing.extra_metadata = event.metadata
            updated += 1
        else:
            new_row = models.UserGameInteraction(
                user_id=event.user_id,
                game_id=event.game_id,
                score=weight,
                interactions=1,
                last_event_type=event.event_type,
                last_event_at=occurred_at,
                extra_metadata=event.metadata,
            )
            db.add(new_row)
            created += 1
    db.commit()
    return created, updated


def list_interaction_tuples(db: Session) -> List[Tuple[str, str, float]]:
    rows = db.query(models.UserGameInteraction).all()
    return [(row.user_id, row.game_id, row.score) for row in rows if row.score > 0]


def get_user_seen_games(db: Session, user_id: str) -> List[str]:
    rows = (
        db.query(models.UserGameInteraction)
        .filter(models.UserGameInteraction.user_id == user_id)
        .all()
    )
    return [row.game_id for row in rows]
