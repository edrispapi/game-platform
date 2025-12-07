"""Database models for the achievement service."""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from .database import Base


class Achievement(Base):
    """Static achievement definition shared across games/services."""

    __tablename__ = "achievements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=False)
    points = Column(Integer, nullable=False, default=50)
    category = Column(String(50), nullable=True)
    rarity = Column(String(30), nullable=True)
    icon_url = Column(String(500), nullable=True)
    is_secret = Column(Boolean, default=False, nullable=False)
    progress_target = Column(Integer, nullable=False, default=1)
    auto_claim = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user_progress = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    """A user's progress toward (or completion of) a specific achievement."""

    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(64), nullable=False, index=True)
    achievement_id = Column(String(36), ForeignKey("achievements.id"), nullable=False)
    progress_current = Column(Integer, default=0, nullable=False)
    progress_target = Column(Integer, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    unlocked_at = Column(DateTime(timezone=True), nullable=True)
    last_progress_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    reward_points = Column(Integer, nullable=False, default=0)

    achievement = relationship("Achievement", back_populates="user_progress")


class UserScore(Base):
    """Aggregated score and token balances for each user."""

    __tablename__ = "user_scores"

    user_id = Column(String(64), primary_key=True)
    total_points = Column(Integer, default=0, nullable=False)
    achievements_unlocked = Column(Integer, default=0, nullable=False)
    star_tokens = Column(Integer, default=0, nullable=False)
    last_star_token_at = Column(DateTime(timezone=True), nullable=True)
    extra_metadata = Column(Text, nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
