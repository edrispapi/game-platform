"""Workshop service database models."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from .database import Base


class WorkshopItemStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class WorkshopItemVisibility(str, enum.Enum):
    PUBLIC = "public"
    UNLISTED = "unlisted"
    PRIVATE = "private"


class WorkshopItem(Base):
    __tablename__ = "workshop_items"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    game_id = Column(String(64), nullable=True, index=True)
    title = Column(String(150), nullable=False)
    slug = Column(String(180), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    tags = Column(JSON, nullable=True)
    version = Column(String(50), nullable=True)
    visibility = Column(
        Enum(WorkshopItemVisibility),
        nullable=False,
        default=WorkshopItemVisibility.PUBLIC,
    )
    status = Column(
        Enum(WorkshopItemStatus),
        nullable=False,
        default=WorkshopItemStatus.PENDING,
    )
    file_path = Column(String(500), nullable=True)
    file_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    content_checksum = Column(String(128), nullable=True)
    auto_flagged = Column(Boolean, nullable=False, default=False)
    auto_score = Column(Float, nullable=True)
    auto_reasons = Column(JSON, nullable=True)
    manual_reviewer_id = Column(String(64), nullable=True)
    moderation_notes = Column(Text, nullable=True)
    downloads = Column(Integer, nullable=False, default=0)
    votes_up = Column(Integer, nullable=False, default=0)
    votes_down = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    votes = relationship(
        "WorkshopVote", back_populates="item", cascade="all, delete-orphan"
    )
    moderation_events = relationship(
        "WorkshopModerationLog",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="WorkshopModerationLog.created_at.desc()",
    )


class WorkshopVote(Base):
    __tablename__ = "workshop_votes"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("workshop_items.id"), nullable=False)
    user_id = Column(String(64), nullable=False)
    is_upvote = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    item = relationship("WorkshopItem", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("item_id", "user_id", name="uq_workshop_vote_item_user"),
    )


class WorkshopModerationLog(Base):
    __tablename__ = "workshop_moderation_log"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("workshop_items.id"), nullable=False, index=True)
    moderator_id = Column(String(64), nullable=True)
    action = Column(String(30), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    item = relationship("WorkshopItem", back_populates="moderation_events")


class WorkshopComment(Base):
    __tablename__ = "workshop_comments"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("workshop_items.id"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WorkshopRating(Base):
    __tablename__ = "workshop_ratings"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("workshop_items.id"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    score = Column(Integer, nullable=False)  # 1-5
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("item_id", "user_id", name="uq_workshop_rating_item_user"),
    )

