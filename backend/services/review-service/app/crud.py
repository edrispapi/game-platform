"""
Review Service CRUD operations.
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.events import publish_event
from .core.config import settings

from . import models, schemas


def _publish(event_type: str, payload: dict) -> None:
    publish_event(settings.KAFKA_REVIEW_TOPIC, {"event_type": event_type, **payload})


def _recalculate_votes(review: models.Review) -> None:
    helpful = sum(1 for vote in review.votes if vote.is_helpful)
    total = len(review.votes)
    review.helpful_votes = helpful
    review.unhelpful_votes = total - helpful
    review.total_votes = total


def create_review(db: Session, review: schemas.ReviewCreate) -> models.Review:
    is_positive = review.is_positive if review.is_positive is not None else review.rating >= 4
    db_review = models.Review(
        user_id=review.user_id,
        game_id=review.game_id,
        review_type=review.review_type,
        title=review.title,
        content=review.content,
        rating=review.rating,
        is_positive=is_positive,
        language=review.language,
        playtime_at_review=review.playtime_at_review,
        is_early_access=review.is_early_access,
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    _publish("review_created", {"review_id": db_review.id, "game_id": db_review.game_id, "user_id": db_review.user_id})
    return db_review


def get_review(db: Session, review_id: int) -> Optional[models.Review]:
    return db.get(models.Review, review_id)


def get_game_reviews(db: Session, game_id: str, skip: int = 0, limit: int = 100) -> List[models.Review]:
    return (
        db.query(models.Review)
        .filter(models.Review.game_id == game_id, models.Review.status == models.ReviewStatus.APPROVED)
        .order_by(models.Review.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_user_reviews(db: Session, user_id: str, skip: int = 0, limit: int = 100) -> List[models.Review]:
    return (
        db.query(models.Review)
        .filter(models.Review.user_id == user_id)
        .order_by(models.Review.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_review(db: Session, review_id: int, review_update: schemas.ReviewUpdate) -> Optional[models.Review]:
    review = get_review(db, review_id)
    if not review:
        return None

    updates = review_update.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(review, field, value)

    if "rating" in updates and "is_positive" not in updates:
        review.is_positive = updates["rating"] >= 4

    db.commit()
    db.refresh(review)
    _publish("review_updated", {"review_id": review_id})
    return review


def delete_review(db: Session, review_id: int) -> bool:
    review = get_review(db, review_id)
    if not review:
        return False
    db.delete(review)
    db.commit()
    _publish("review_deleted", {"review_id": review_id})
    return True


def create_review_comment(db: Session, comment: schemas.ReviewCommentCreate) -> models.ReviewComment:
    db_comment = models.ReviewComment(
        review_id=comment.review_id,
        user_id=comment.user_id,
        content=comment.content,
        parent_comment_id=comment.parent_comment_id,
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    _publish("review_comment_created", {"review_id": comment.review_id, "comment_id": db_comment.id})
    return db_comment


def get_review_comments(db: Session, review_id: int, skip: int = 0, limit: int = 100) -> List[models.ReviewComment]:
    return (
        db.query(models.ReviewComment)
        .filter(models.ReviewComment.review_id == review_id)
        .order_by(models.ReviewComment.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def vote_review(db: Session, review_id: int, user_id: str, is_helpful: bool) -> models.ReviewVote:
    vote = (
        db.query(models.ReviewVote)
        .filter(models.ReviewVote.review_id == review_id, models.ReviewVote.user_id == user_id)
        .first()
    )
    if vote:
        vote.is_helpful = is_helpful
    else:
        vote = models.ReviewVote(review_id=review_id, user_id=user_id, is_helpful=is_helpful)
        db.add(vote)

    db.commit()
    review = get_review(db, review_id)
    if review:
        _recalculate_votes(review)
        db.commit()
        db.refresh(review)
    db.refresh(vote)
    _publish("review_voted", {"review_id": review_id, "user_id": user_id, "is_helpful": is_helpful})
    return vote
