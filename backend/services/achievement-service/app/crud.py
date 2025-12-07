"""Data-access helpers for the achievement service."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional, Sequence, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models, schemas
from .core.config import settings


@dataclass(slots=True)
class ProgressResult:
    """Return payload after a progress mutation."""

    user_score: models.UserScore
    achievement_progress: models.UserAchievement
    achievement: models.Achievement
    score_delta: int
    star_tokens_awarded: int
    completed: bool


def create_achievement(db: Session, payload: schemas.AchievementCreate) -> models.Achievement:
    achievement = models.Achievement(
        code=payload.code,
        title=payload.title,
        description=payload.description,
        points=payload.points,
        category=payload.category,
        rarity=payload.rarity,
        icon_url=payload.icon_url,
        is_secret=payload.is_secret,
        progress_target=payload.progress_target,
        auto_claim=payload.auto_claim,
    )
    db.add(achievement)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("Achievement code already exists") from exc
    db.refresh(achievement)
    return achievement


def update_achievement(
    db: Session, achievement_code: str, payload: schemas.AchievementUpdate
) -> models.Achievement:
    achievement = (
        db.query(models.Achievement)
        .filter(models.Achievement.code == achievement_code)
        .one_or_none()
    )
    if not achievement:
        raise ValueError("Achievement not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(achievement, field, value)
    db.commit()
    db.refresh(achievement)
    return achievement


def list_achievements(db: Session, skip: int = 0, limit: int = 50) -> List[models.Achievement]:
    return (
        db.query(models.Achievement)
        .order_by(models.Achievement.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_achievement_by_code(db: Session, code: str) -> Optional[models.Achievement]:
    return (
        db.query(models.Achievement)
        .filter(models.Achievement.code == code)
        .one_or_none()
    )


def _get_or_create_user_score(db: Session, user_id: str) -> models.UserScore:
    user_score = db.query(models.UserScore).filter(models.UserScore.user_id == user_id).one_or_none()
    if user_score:
        return user_score
    user_score = models.UserScore(user_id=str(user_id))
    db.add(user_score)
    db.flush()
    return user_score


def record_progress(
    db: Session, user_id: str, payload: schemas.AchievementProgressRequest
) -> ProgressResult:
    achievement = get_achievement_by_code(db, payload.achievement_code)
    if not achievement:
        raise ValueError("Achievement definition not found")

    progress = (
        db.query(models.UserAchievement)
        .filter(
            models.UserAchievement.user_id == str(user_id),
            models.UserAchievement.achievement_id == achievement.id,
        )
        .one_or_none()
    )
    if not progress:
        progress = models.UserAchievement(
            user_id=str(user_id),
            achievement_id=achievement.id,
            progress_target=achievement.progress_target,
            reward_points=achievement.points,
        )
        db.add(progress)
        db.flush()

    previous_progress = progress.progress_current
    previous_completion = progress.is_completed

    if payload.force_complete:
        progress.progress_current = progress.progress_target
    else:
        progress.progress_current = min(
            progress.progress_target, previous_progress + payload.progress_delta
        )

    if progress.progress_target == 0:
        progress.progress_target = achievement.progress_target or 1

    if progress.progress_current >= progress.progress_target:
        progress.is_completed = True
        if not progress.unlocked_at:
            progress.unlocked_at = datetime.now(timezone.utc)
    progress.last_progress_at = datetime.now(timezone.utc)

    score_delta = 0
    star_tokens_awarded = 0
    user_score = _get_or_create_user_score(db, str(user_id))
    previous_points = user_score.total_points

    if progress.is_completed and not previous_completion:
        score_delta += achievement.points
        user_score.total_points += achievement.points
        user_score.achievements_unlocked += 1

    if payload.score_bonus:
        score_delta += payload.score_bonus
        user_score.total_points += payload.score_bonus

    if score_delta:
        step = max(settings.STAR_TOKEN_SCORE_STEP, 1)
        before_tokens = previous_points // step
        after_tokens = user_score.total_points // step
        if after_tokens > before_tokens:
            star_tokens_awarded = after_tokens - before_tokens
            user_score.star_tokens += star_tokens_awarded
            user_score.last_star_token_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(progress)
    db.refresh(user_score)

    return ProgressResult(
        user_score=user_score,
        achievement_progress=progress,
        achievement=achievement,
        score_delta=score_delta,
        star_tokens_awarded=star_tokens_awarded,
        completed=progress.is_completed and not previous_completion,
    )


def get_user_overview(db: Session, user_id: str) -> Tuple[models.UserScore, List[Tuple[models.UserAchievement, models.Achievement]]]:
    user_score = (
        db.query(models.UserScore)
        .filter(models.UserScore.user_id == str(user_id))
        .one_or_none()
    )
    if not user_score:
        user_score = models.UserScore(
            user_id=str(user_id),
            total_points=0,
            achievements_unlocked=0,
            star_tokens=0,
        )
        db.add(user_score)
        db.commit()
        db.refresh(user_score)

    rows = (
        db.query(models.UserAchievement, models.Achievement)
        .join(models.Achievement, models.Achievement.id == models.UserAchievement.achievement_id)
        .filter(models.UserAchievement.user_id == str(user_id))
        .order_by(models.UserAchievement.last_progress_at.desc())
        .all()
    )
    return user_score, rows


def get_user_scores_map(db: Session, user_ids: Sequence[str]) -> Dict[str, models.UserScore]:
    if not user_ids:
        return {}
    rows = (
        db.query(models.UserScore)
        .filter(models.UserScore.user_id.in_([str(uid) for uid in user_ids]))
        .all()
    )
    return {row.user_id: row for row in rows}
