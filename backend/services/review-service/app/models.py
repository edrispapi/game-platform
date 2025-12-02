"""
Review Service Database Models
"""
from __future__ import annotations

import uuid
from enum import Enum as PyEnum

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


class ReviewStatus(PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"


class ReviewType(PyEnum):
    GAME = "game"
    DLC = "dlc"
    SOFTWARE = "software"


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    game_id = Column(String(64), nullable=False, index=True)
    review_type = Column(String(20), default=ReviewType.GAME.value, nullable=False)

    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    rating = Column(Integer, nullable=False)
    is_positive = Column(Boolean, nullable=False, default=True)
    language = Column(String(5), default="en", nullable=False)
    playtime_at_review = Column(Integer, default=0, nullable=False)
    is_early_access = Column(Boolean, default=False, nullable=False)

    status = Column(String(20), default=ReviewStatus.PENDING.value, nullable=False)
    helpful_votes = Column(Integer, default=0, nullable=False)
    unhelpful_votes = Column(Integer, default=0, nullable=False)
    total_votes = Column(Integer, default=0, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(String(100), nullable=True)
    moderator_notes = Column(Text, nullable=True)
    moderated_by = Column(String(64), nullable=True)
    moderated_at = Column(DateTime(timezone=True), nullable=True)

    extra_metadata = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    comments = relationship("ReviewComment", back_populates="review", cascade="all, delete-orphan")
    votes = relationship("ReviewVote", back_populates="review", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_reviews_game_rating", "game_id", "rating"),
        Index("idx_reviews_user_game", "user_id", "game_id"),
    )


class ReviewComment(Base):
    __tablename__ = "review_comments"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    parent_comment_id = Column(Integer, ForeignKey("review_comments.id"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    is_edited = Column(Boolean, default=False, nullable=False)
    helpful_votes = Column(Integer, default=0, nullable=False)
    unhelpful_votes = Column(Integer, default=0, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    review = relationship("Review", back_populates="comments")
    parent_comment = relationship("ReviewComment", remote_side=[id], back_populates="replies")
    replies = relationship("ReviewComment", back_populates="parent_comment", cascade="all, delete-orphan")
    votes = relationship("CommentVote", back_populates="comment", cascade="all, delete-orphan")


class ReviewVote(Base):
    __tablename__ = "review_votes"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    is_helpful = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    review = relationship("Review", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("review_id", "user_id", name="uq_review_vote"),
    )


class CommentVote(Base):
    __tablename__ = "comment_votes"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("review_comments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    is_helpful = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    comment = relationship("ReviewComment", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("comment_id", "user_id", name="uq_comment_vote"),
    )


class ReviewReport(Base):
    __tablename__ = "review_reports"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    report_reason = Column(String(100), nullable=False)
    report_description = Column(Text, nullable=True)
    status = Column(String(20), default="pending", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    review = relationship("Review")
