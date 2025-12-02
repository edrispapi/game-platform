"""Achievement Service API routes."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from . import crud, database, schemas
from .services import leaderboard, notifications, users

router = APIRouter()


def _serialize_user_score(user_score, rank_info):
    rank = rank_info[0] if rank_info else None
    return schemas.UserScoreResponse(
        user_id=user_score.user_id,
        total_points=user_score.total_points,
        achievements_unlocked=user_score.achievements_unlocked,
        star_tokens=user_score.star_tokens,
        leaderboard_rank=rank,
    )


def _serialize_progress(progress, achievement):
    target = progress.progress_target or 1
    percent = min(100.0, (progress.progress_current / target) * 100 if target else 0.0)
    return schemas.UserAchievementProgress(
        id=progress.id,
        user_id=progress.user_id,
        achievement_code=achievement.code,
        achievement_title=achievement.title,
        progress_current=progress.progress_current,
        progress_target=target,
        is_completed=progress.is_completed,
        unlocked_at=progress.unlocked_at,
        reward_points=progress.reward_points,
        progress_percent=round(percent, 2),
    )


@router.post(
    "/achievements",
    response_model=schemas.AchievementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_achievement(
    payload: schemas.AchievementCreate, db: Session = Depends(database.get_db)
):
    try:
        return crud.create_achievement(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/achievements", response_model=List[schemas.AchievementResponse])
def list_achievements(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(database.get_db),
):
    return crud.list_achievements(db, skip=skip, limit=limit)


@router.get("/achievements/{achievement_code}", response_model=schemas.AchievementResponse)
def get_achievement(achievement_code: str, db: Session = Depends(database.get_db)):
    achievement = crud.get_achievement_by_code(db, achievement_code)
    if not achievement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Achievement not found")
    return achievement


@router.patch("/achievements/{achievement_code}", response_model=schemas.AchievementResponse)
def update_achievement(
    achievement_code: str,
    payload: schemas.AchievementUpdate,
    db: Session = Depends(database.get_db),
):
    try:
        return crud.update_achievement(db, achievement_code, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post(
    "/users/{user_id}/progress",
    response_model=schemas.AchievementUnlockResponse,
    status_code=status.HTTP_200_OK,
)
def record_user_progress(
    user_id: str,
    payload: schemas.AchievementProgressRequest,
    db: Session = Depends(database.get_db),
):
    try:
        result = crud.record_progress(db, user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    leaderboard.update_score(result.user_score.user_id, result.user_score.total_points)
    rank_info = leaderboard.get_user_rank(result.user_score.user_id)
    leaderboard_score = rank_info[1] if rank_info else result.user_score.total_points

    if payload.notify and result.completed:
        notifications.send_notification(
            user_id=str(user_id),
            title="🎖 Achievement Unlocked",
            message=f"You unlocked {result.achievement.title} (+{result.achievement.points} XP)!",
            metadata={
                "achievement_code": result.achievement.code,
                "score_delta": str(result.score_delta),
                "star_tokens": str(result.star_tokens_awarded),
            },
        )

    return schemas.AchievementUnlockResponse(
        user=_serialize_user_score(result.user_score, rank_info),
        achievement=_serialize_progress(result.achievement_progress, result.achievement),
        star_tokens_awarded=result.star_tokens_awarded,
        score_delta=result.score_delta,
        leaderboard_score=leaderboard_score,
    )


@router.get(
    "/users/{user_id}/overview",
    response_model=schemas.UserAchievementOverview,
)
def user_overview(user_id: str, db: Session = Depends(database.get_db)):
    user_score, rows = crud.get_user_overview(db, user_id)
    rank_info = leaderboard.get_user_rank(user_score.user_id)
    leaderboard_score = rank_info[1] if rank_info else user_score.total_points

    achievements = [
        _serialize_progress(progress, achievement) for progress, achievement in rows
    ]
    recent_unlocked = [item for item in achievements if item.unlocked_at is not None]
    recent_unlocked.sort(
        key=lambda item: item.unlocked_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    recent_unlocked = recent_unlocked[:5]

    return schemas.UserAchievementOverview(
        user=_serialize_user_score(user_score, rank_info),
        achievements=achievements,
        recent_unlocked=recent_unlocked,
        leaderboard_score=leaderboard_score,
        leaderboard_rank=rank_info[0] if rank_info else None,
    )


@router.get("/leaderboard", response_model=schemas.LeaderboardResponse)
def get_leaderboard(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(database.get_db),
):
    entries = leaderboard.get_top(limit=limit, offset=offset)
    user_ids = [user_id for user_id, _ in entries]
    scores_map = crud.get_user_scores_map(db, user_ids)
    profiles = users.fetch_profiles(user_ids)

    leaderboard_entries = []
    for index, (user_id, score) in enumerate(entries, start=offset + 1):
        profile = profiles.get(user_id, {})
        user_score = scores_map.get(user_id)
        star_tokens = user_score.star_tokens if user_score else None
        leaderboard_entries.append(
            schemas.LeaderboardEntry(
                user_id=user_id,
                score=score,
                rank=index,
                star_tokens=star_tokens,
                display_name=profile.get("display_name"),
                username=profile.get("username"),
            )
        )

    return schemas.LeaderboardResponse(
        entries=leaderboard_entries,
        total_players=leaderboard.get_total_players(),
        generated_at=datetime.now(timezone.utc),
    )
