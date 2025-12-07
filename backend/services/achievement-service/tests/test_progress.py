"""Unit tests for achievement progress and scoring."""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app import crud, models as _models, schemas
from app.database import Base

# Import models to register SQLAlchemy mappings with Base
_ = _models

def _db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestingSession()


def test_record_progress_awards_points_and_tokens():
    original_step = settings.STAR_TOKEN_SCORE_STEP
    try:
        settings.STAR_TOKEN_SCORE_STEP = 100
        db = _db_session()
        crud.create_achievement(
            db,
            schemas.AchievementCreate(
                code="first-win",
                title="First Victory",
                description="Win your first match",
                points=120,
                progress_target=1,
            ),
        )

        result = crud.record_progress(
            db,
            user_id="user-1",
            payload=schemas.AchievementProgressRequest(
                achievement_code="first-win",
                progress_delta=1,
            ),
        )

        assert result.completed is True
        assert result.score_delta == 120
        assert result.star_tokens_awarded == 1
        assert result.user_score.total_points == 120
        assert result.user_score.star_tokens == 1
    finally:
        settings.STAR_TOKEN_SCORE_STEP = original_step


def test_progress_accumulates_without_duplicate_completion():
    original_step = settings.STAR_TOKEN_SCORE_STEP
    try:
        settings.STAR_TOKEN_SCORE_STEP = 1000
        db = _db_session()
        crud.create_achievement(
            db,
            schemas.AchievementCreate(
                code="grinder",
                title="Dedicated",
                description="Play 10 matches",
                points=80,
                progress_target=10,
            ),
        )

        # First increment
        first = crud.record_progress(
            db,
            user_id="user-2",
            payload=schemas.AchievementProgressRequest(
                achievement_code="grinder",
                progress_delta=3,
            ),
        )
        assert first.completed is False
        assert first.score_delta == 0

        # Completing the achievement
        second = crud.record_progress(
            db,
            user_id="user-2",
            payload=schemas.AchievementProgressRequest(
                achievement_code="grinder",
                progress_delta=7,
            ),
        )
        assert second.completed is True
        assert second.score_delta == 80
        assert second.achievement_progress.progress_current == 10
        assert second.achievement_progress.is_completed is True
    finally:
        settings.STAR_TOKEN_SCORE_STEP = original_step

