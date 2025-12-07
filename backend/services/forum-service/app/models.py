"""Forum service database models."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Index,
    func,
)
from sqlalchemy.orm import relationship

from .database import Base


class ForumPostStatus(str, enum.Enum):
    ACTIVE = "active"
    LOCKED = "locked"
    ARCHIVED = "archived"
    DELETED = "deleted"


class ForumPost(Base):
    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    game_id = Column(String(64), nullable=True, index=True)  # Optional: can be general forum
    title = Column(String(255), nullable=False)
    slug = Column(String(300), nullable=False, unique=True, index=True)
    content = Column(Text, nullable=False)
    tags = Column(JSON, nullable=True)  # Array of tag strings
    
    status = Column(String(20), default=ForumPostStatus.ACTIVE.value, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    
    views = Column(Integer, default=0, nullable=False)
    likes = Column(Integer, default=0, nullable=False)
    replies_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_reply_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    replies = relationship("ForumReply", back_populates="post", cascade="all, delete-orphan")
    likes_rel = relationship("ForumPostLike", back_populates="post", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_forum_posts_game_status", "game_id", "status"),
        Index("idx_forum_posts_user", "user_id"),
        Index("idx_forum_posts_created", "created_at"),
    )


class ForumReply(Base):
    __tablename__ = "forum_replies"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    parent_reply_id = Column(Integer, ForeignKey("forum_replies.id"), nullable=True, index=True)  # For nested replies
    content = Column(Text, nullable=False)
    
    likes = Column(Integer, default=0, nullable=False)
    is_edited = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    post = relationship("ForumPost", back_populates="replies")
    parent_reply = relationship("ForumReply", remote_side=[id], back_populates="child_replies")
    child_replies = relationship("ForumReply", back_populates="parent_reply", cascade="all, delete-orphan")
    likes_rel = relationship("ForumReplyLike", back_populates="reply", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_forum_replies_post", "post_id", "created_at"),
        Index("idx_forum_replies_user", "user_id"),
    )


class ForumPostLike(Base):
    __tablename__ = "forum_post_likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    post = relationship("ForumPost", back_populates="likes_rel")

    __table_args__ = (
        Index("idx_forum_post_likes_unique", "post_id", "user_id", unique=True),
    )


class ForumReplyLike(Base):
    __tablename__ = "forum_reply_likes"

    id = Column(Integer, primary_key=True, index=True)
    reply_id = Column(Integer, ForeignKey("forum_replies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    reply = relationship("ForumReply", back_populates="likes_rel")

    __table_args__ = (
        Index("idx_forum_reply_likes_unique", "reply_id", "user_id", unique=True),
    )

