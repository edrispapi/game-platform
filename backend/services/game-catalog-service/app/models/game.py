"""Database models for the game catalog service."""
from __future__ import annotations

import uuid
from enum import Enum as PyEnum

from sqlalchemy import (
    ARRAY,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class GameStatus(PyEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMING_SOON = "coming_soon"
    DISCONTINUED = "discontinued"


class GameType(PyEnum):
    GAME = "game"
    DLC = "dlc"
    SOFTWARE = "software"
    VIDEO = "video"
    DEMO = "demo"


class AgeRating(PyEnum):
    EVERYONE = "everyone"
    EVERYONE_10_PLUS = "everyone_10_plus"
    TEEN = "teen"
    MATURE = "mature"
    ADULTS_ONLY = "adults_only"
    RATING_PENDING = "rating_pending"


game_genres = Table(
    "game_genres",
    Base.metadata,
    Column("game_id", Integer, ForeignKey("games.id"), primary_key=True),
    Column("genre_id", Integer, ForeignKey("genres.id"), primary_key=True),
)

game_tags = Table(
    "game_tags",
    Base.metadata,
    Column("game_id", Integer, ForeignKey("games.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)

game_platforms = Table(
    "game_platforms",
    Base.metadata,
    Column("game_id", Integer, ForeignKey("games.id"), primary_key=True),
    Column("platform_id", Integer, ForeignKey("platforms.id"), primary_key=True),
)


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    steam_app_id = Column(Integer, unique=True, index=True, nullable=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    short_description = Column(String(500), nullable=True)
    developer = Column(String(255), nullable=False, index=True)
    publisher = Column(String(255), nullable=False, index=True)
    price = Column(Float, nullable=False, default=0.0)
    original_price = Column(Float, nullable=True)
    discount_percent = Column(Float, nullable=True, default=0.0)
    currency = Column(String(3), default="USD", nullable=False)

    game_type = Column(String(20), default="game", nullable=False)
    status = Column(String(20), default="active", nullable=False)
    age_rating = Column(String(20), nullable=True)
    release_date = Column(DateTime(timezone=True), nullable=True)
    early_access = Column(Boolean, default=False, nullable=False)

    header_image_url = Column(String(500), nullable=True)
    background_image_url = Column(String(500), nullable=True)
    capsule_image_url = Column(String(500), nullable=True)
    screenshots = Column(ARRAY(String), nullable=True)
    movies = Column(ARRAY(String), nullable=True)

    pc_requirements = Column(JSONB, nullable=True)
    mac_requirements = Column(JSONB, nullable=True)
    linux_requirements = Column(JSONB, nullable=True)

    single_player = Column(Boolean, default=False, nullable=False)
    multiplayer = Column(Boolean, default=False, nullable=False)
    co_op = Column(Boolean, default=False, nullable=False)
    local_co_op = Column(Boolean, default=False, nullable=False)
    cross_platform = Column(Boolean, default=False, nullable=False)
    vr_support = Column(Boolean, default=False, nullable=False)

    total_reviews = Column(Integer, default=0, nullable=False)
    positive_reviews = Column(Integer, default=0, nullable=False)
    negative_reviews = Column(Integer, default=0, nullable=False)
    average_rating = Column(Float, nullable=True)
    playtime_forever = Column(Integer, default=0, nullable=False)
    playtime_2weeks = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    metadata_json = Column(JSONB, nullable=True)

    genres = relationship("Genre", secondary=game_genres, back_populates="games")
    tags = relationship("Tag", secondary=game_tags, back_populates="games")
    platforms = relationship("Platform", secondary=game_platforms, back_populates="games")
    reviews = relationship("GameReview", back_populates="game")
    achievements = relationship("GameAchievement", back_populates="game")

    __table_args__ = (
        Index("idx_games_title", "title"),
        Index("idx_games_developer", "developer"),
        Index("idx_games_publisher", "publisher"),
        Index("idx_games_price_range", "price"),
        Index("idx_games_release_date", "release_date"),
        Index("idx_games_average_rating", "average_rating"),
    )


class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    games = relationship("Game", secondary=game_genres, back_populates="genres")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    games = relationship("Game", secondary=game_tags, back_populates="tags")


class Platform(Base):
    __tablename__ = "platforms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    games = relationship("Game", secondary=game_platforms, back_populates="platforms")


class GameReview(Base):
    __tablename__ = "game_reviews"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    is_positive = Column(Boolean, nullable=False)
    helpful_votes = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    game = relationship("Game", back_populates="reviews")


class GameAchievement(Base):
    __tablename__ = "game_achievements"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)
    points = Column(Integer, default=0, nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    game = relationship("Game", back_populates="achievements")


class GameDLC(Base):
    __tablename__ = "game_dlcs"

    id = Column(Integer, primary_key=True, index=True)
    base_game_id = Column(Integer, ForeignKey("games.id"), nullable=False, index=True)
    dlc_game_id = Column(Integer, ForeignKey("games.id"), nullable=False, index=True)
    is_required = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    base_game = relationship("Game", foreign_keys=[base_game_id])
    dlc_game = relationship("Game", foreign_keys=[dlc_game_id])


class GameBundle(Base):
    __tablename__ = "game_bundles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    original_price = Column(Float, nullable=True)
    discount_percent = Column(Float, nullable=True, default=0.0)
    currency = Column(String(3), default="USD", nullable=False)
    header_image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class GameBundleItem(Base):
    __tablename__ = "game_bundle_items"

    id = Column(Integer, primary_key=True, index=True)
    bundle_id = Column(Integer, ForeignKey("game_bundles.id"), nullable=False, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    bundle = relationship("GameBundle")
    game = relationship("Game")

