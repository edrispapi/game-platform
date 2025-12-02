"""
Online Service Database Models
"""
from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
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


class UserPresence(Base):
    __tablename__ = "user_presence"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), unique=True, nullable=False, index=True)
    status = Column(String(20), default="offline", nullable=False)  # online, offline, away, in-game
    platform = Column(String(20), default="desktop", nullable=False)
    activity = Column(String(100), nullable=True)
    region = Column(String(10), nullable=True)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    extra_metadata = Column(JSON, nullable=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(128), nullable=False, index=True)
    sender_id = Column(String(64), nullable=False, index=True)
    recipient_id = Column(String(64), nullable=False, index=True)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_messages_conv_sent", "conversation_id", "sent_at"),
    )


class GameLobby(Base):
    __tablename__ = "game_lobbies"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid4()))
    host_id = Column(String(64), nullable=False, index=True)
    name = Column(String(80), nullable=False)
    description = Column(Text, nullable=True)
    max_members = Column(Integer, default=4, nullable=False)
    is_private = Column(Boolean, default=False, nullable=False)
    passcode = Column(String(32), nullable=True)
    region = Column(String(20), nullable=True)
    status = Column(String(20), default="forming", nullable=False)
    extra_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    members = relationship("LobbyMember", back_populates="lobby", cascade="all, delete-orphan")


class LobbyMember(Base):
    __tablename__ = "lobby_members"

    id = Column(Integer, primary_key=True, index=True)
    lobby_id = Column(String(36), ForeignKey("game_lobbies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(64), nullable=False, index=True)
    role = Column(String(20), default="member", nullable=False)
    is_ready = Column(Boolean, default=False, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    lobby = relationship("GameLobby", back_populates="members")

    __table_args__ = (UniqueConstraint("lobby_id", "user_id", name="uq_lobby_member"),)
