"""
Game Catalog Service Pydantic Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class GameStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMING_SOON = "coming_soon"
    DISCONTINUED = "discontinued"

class GameTypeEnum(str, Enum):
    GAME = "game"
    DLC = "dlc"
    SOFTWARE = "software"
    VIDEO = "video"
    DEMO = "demo"

class AgeRatingEnum(str, Enum):
    EVERYONE = "everyone"
    EVERYONE_10_PLUS = "everyone_10_plus"
    TEEN = "teen"
    MATURE = "mature"
    ADULTS_ONLY = "adults_only"
    RATING_PENDING = "rating_pending"

class SystemRequirements(BaseModel):
    minimum: Optional[Dict[str, Any]] = None
    recommended: Optional[Dict[str, Any]] = None

class GameBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    developer: str = Field(
        default="Unknown Developer",
        max_length=255,
    )
    publisher: str = Field(
        default="Unknown Publisher",
        max_length=255,
    )
    price: float = Field(..., ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    currency: str = Field(default="USD", max_length=3)
    game_type: GameTypeEnum = GameTypeEnum.GAME
    status: GameStatusEnum = GameStatusEnum.ACTIVE
    age_rating: Optional[AgeRatingEnum] = None
    release_date: Optional[datetime] = None
    early_access: bool = False
    single_player: bool = False
    multiplayer: bool = False
    co_op: bool = False
    local_co_op: bool = False
    cross_platform: bool = False
    vr_support: bool = False
    pc_requirements: Optional[SystemRequirements] = None
    mac_requirements: Optional[SystemRequirements] = None
    linux_requirements: Optional[SystemRequirements] = None

class GameCreate(GameBase):
    steam_app_id: Optional[int] = None
    header_image_url: Optional[str] = Field(None, max_length=500)
    background_image_url: Optional[str] = Field(None, max_length=500)
    capsule_image_url: Optional[str] = Field(None, max_length=500)
    screenshots: Optional[List[str]] = None
    movies: Optional[List[str]] = None
    genre_ids: Optional[List[int]] = None
    tag_ids: Optional[List[int]] = None
    platform_ids: Optional[List[int]] = None
    # Convenience fields used by lightweight clients/tests
    genre: Optional[str] = Field(None, max_length=100)
    platform: Optional[str] = Field(None, max_length=50)

class GameUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    developer: Optional[str] = Field(None, max_length=255)
    publisher: Optional[str] = Field(None, max_length=255)
    price: Optional[float] = Field(None, ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    status: Optional[GameStatusEnum] = None
    age_rating: Optional[AgeRatingEnum] = None
    release_date: Optional[datetime] = None
    early_access: Optional[bool] = None
    single_player: Optional[bool] = None
    multiplayer: Optional[bool] = None
    co_op: Optional[bool] = None
    local_co_op: Optional[bool] = None
    cross_platform: Optional[bool] = None
    vr_support: Optional[bool] = None
    header_image_url: Optional[str] = Field(None, max_length=500)
    background_image_url: Optional[str] = Field(None, max_length=500)
    capsule_image_url: Optional[str] = Field(None, max_length=500)
    screenshots: Optional[List[str]] = None
    movies: Optional[List[str]] = None
    pc_requirements: Optional[SystemRequirements] = None
    mac_requirements: Optional[SystemRequirements] = None
    linux_requirements: Optional[SystemRequirements] = None

class GameResponse(GameBase):
    id: int
    uuid: str
    steam_app_id: Optional[int]
    discount_percent: Optional[float]
    header_image_url: Optional[str]
    background_image_url: Optional[str]
    capsule_image_url: Optional[str]
    screenshots: Optional[List[str]]
    movies: Optional[List[str]]
    total_reviews: int
    positive_reviews: int
    negative_reviews: int
    average_rating: Optional[float]
    playtime_forever: int
    playtime_2weeks: int
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]] = None
    genres: List["GenreResponse"] = []
    tags: List["TagResponse"] = []
    platforms: List["PlatformResponse"] = []
    model_config = ConfigDict(from_attributes=True)

class GenreBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None

class GenreCreate(GenreBase):
    pass

class GenreResponse(GenreBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TagBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PlatformBase(BaseModel):
    name: str = Field(..., max_length=50)
    display_name: str = Field(..., max_length=100)
    description: Optional[str] = None
    icon_url: Optional[str] = Field(None, max_length=500)

class PlatformCreate(PlatformBase):
    pass

class PlatformResponse(PlatformBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class GameReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None

class GameReviewCreate(GameReviewBase):
    game_id: int

class GameReviewResponse(GameReviewBase):
    id: int
    game_id: int
    user_id: int
    is_positive: bool
    helpful_votes: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class GameAchievementBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    icon_url: Optional[str] = Field(None, max_length=500)
    points: int = Field(default=0, ge=0)
    is_hidden: bool = False

class GameAchievementCreate(GameAchievementBase):
    game_id: int

class GameAchievementResponse(GameAchievementBase):
    id: int
    game_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class GameSearchFilters(BaseModel):
    query: Optional[str] = None
    genres: Optional[List[int]] = None
    tags: Optional[List[int]] = None
    platforms: Optional[List[int]] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    max_rating: Optional[float] = Field(None, ge=0, le=5)
    single_player: Optional[bool] = None
    multiplayer: Optional[bool] = None
    co_op: Optional[bool] = None
    vr_support: Optional[bool] = None
    early_access: Optional[bool] = None
    status: Optional[GameStatusEnum] = None
    game_type: Optional[GameTypeEnum] = None
    age_rating: Optional[AgeRatingEnum] = None
    sort_by: Optional[str] = Field(
        default="relevance",
        pattern="^(relevance|price|rating|release_date|title)$",
    )
    sort_order: Optional[str] = Field(
        default="desc",
        pattern="^(asc|desc)$",
    )

class GameSearchResponse(BaseModel):
    games: List[GameResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
    filters_applied: GameSearchFilters