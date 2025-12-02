"""
Recommendation Service Database Models
"""
from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    game_id = Column(String(64), nullable=False, index=True)
    score = Column(Float, nullable=False, default=0.0)
    rank = Column(Integer, nullable=False, default=0)
    algorithm = Column(String(100), default="hybrid", nullable=False)
    reason = Column(Text, nullable=True)
    context = Column(JSON, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    feedback_entries = relationship("RecommendationFeedback", back_populates="recommendation", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "game_id", name="uq_user_game_recommendation"),
        Index("idx_recommendations_user_rank", "user_id", "rank"),
    )


class RecommendationFeedback(Base):
    __tablename__ = "recommendation_feedback"

    id = Column(Integer, primary_key=True, index=True)
    recommendation_id = Column(Integer, ForeignKey("recommendations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(64), nullable=False, index=True)
    game_id = Column(String(64), nullable=False, index=True)
    action = Column(String(20), nullable=False)  # clicked, ignored, wishlisted, purchased
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    recommendation = relationship("Recommendation", back_populates="feedback_entries")

    __table_args__ = (
        Index("idx_feedback_user_game", "user_id", "game_id"),
    )


class UserGameInteraction(Base):
    __tablename__ = "user_game_interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    game_id = Column(String(64), nullable=False, index=True)
    score = Column(Float, nullable=False, default=0.0)
    interactions = Column(Integer, nullable=False, default=0)
    last_event_type = Column(String(50), nullable=True)
    last_event_at = Column(DateTime(timezone=True), nullable=True)
    extra_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "game_id", name="uq_interaction_user_game"),
    )
