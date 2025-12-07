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
    icon_url: Optional[str] = Field(None, max_length=500)  # Avatar/Icon (1:1 square)
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
    icon_url: Optional[str] = Field(None, max_length=500)  # Avatar/Icon (1:1 square)
    screenshots: Optional[List[str]] = None
    movies: Optional[List[str]] = None
    pc_requirements: Optional[SystemRequirements] = None
    mac_requirements: Optional[SystemRequirements] = None
    linux_requirements: Optional[SystemRequirements] = None

class GameResponse(GameBase):
    id: int
    uuid: Optional[str] = None
    steam_app_id: Optional[int] = None
    discount_percent: Optional[float] = None
    header_image_url: Optional[str] = None
    background_image_url: Optional[str] = None
    capsule_image_url: Optional[str] = None
    icon_url: Optional[str] = None  # Avatar/Icon (1:1 square)
    screenshots: Optional[List[str]] = None
    movies: Optional[List[str]] = None
    total_reviews: int = 0
    positive_reviews: int = 0
    negative_reviews: int = 0
    average_rating: Optional[float] = None
    playtime_forever: int = 0
    playtime_2weeks: int = 0
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]] = None
    genres: List["GenreResponse"] = []
    tags: List["TagResponse"] = []
    platforms: List["PlatformResponse"] = []
    
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def from_orm_with_relations(cls, game, genres=None, tags=None, platforms=None):
        """Create GameResponse from ORM model with pre-loaded relations"""
        # Convert JSONB dict to SystemRequirements Pydantic model if present
        # SQLAlchemy JSONB fields are loaded as dicts
        pc_req = None
        if hasattr(game, 'pc_requirements') and game.pc_requirements is not None:
            if isinstance(game.pc_requirements, dict):
                try:
                    pc_req = SystemRequirements(**game.pc_requirements)
                except Exception:
                    # If conversion fails, try to use as-is
                    pc_req = game.pc_requirements
            elif isinstance(game.pc_requirements, SystemRequirements):
                pc_req = game.pc_requirements
            else:
                pc_req = game.pc_requirements
        
        mac_req = None
        if hasattr(game, 'mac_requirements') and game.mac_requirements is not None:
            if isinstance(game.mac_requirements, dict):
                try:
                    mac_req = SystemRequirements(**game.mac_requirements)
                except Exception:
                    mac_req = game.mac_requirements
            elif isinstance(game.mac_requirements, SystemRequirements):
                mac_req = game.mac_requirements
            else:
                mac_req = game.mac_requirements
        
        linux_req = None
        if hasattr(game, 'linux_requirements') and game.linux_requirements is not None:
            if isinstance(game.linux_requirements, dict):
                try:
                    linux_req = SystemRequirements(**game.linux_requirements)
                except Exception:
                    linux_req = game.linux_requirements
            elif isinstance(game.linux_requirements, SystemRequirements):
                linux_req = game.linux_requirements
            else:
                linux_req = game.linux_requirements
        
        return cls(
            id=game.id,
            uuid=str(game.uuid) if game.uuid else None,
            title=game.title,
            description=game.description,
            short_description=game.short_description,
            developer=game.developer,
            publisher=game.publisher,
            price=game.price,
            original_price=game.original_price,
            currency=game.currency,
            game_type=game.game_type,
            status=game.status,
            age_rating=game.age_rating,
            release_date=game.release_date,
            early_access=game.early_access,
            single_player=game.single_player,
            multiplayer=game.multiplayer,
            co_op=game.co_op,
            local_co_op=game.local_co_op,
            cross_platform=game.cross_platform,
            vr_support=game.vr_support,
            pc_requirements=pc_req,
            mac_requirements=mac_req,
            linux_requirements=linux_req,
            steam_app_id=game.steam_app_id,
            discount_percent=game.discount_percent,
            header_image_url=game.header_image_url,
            background_image_url=game.background_image_url,
            capsule_image_url=game.capsule_image_url,
            icon_url=game.icon_url,
            screenshots=game.screenshots or [],
            movies=game.movies or [],
            total_reviews=game.total_reviews,
            positive_reviews=game.positive_reviews,
            negative_reviews=game.negative_reviews,
            average_rating=game.average_rating,
            playtime_forever=game.playtime_forever,
            playtime_2weeks=game.playtime_2weeks,
            created_at=game.created_at,
            updated_at=game.updated_at,
            metadata=game.metadata_json if hasattr(game, 'metadata_json') else None,
            genres=genres or [],
            tags=tags or [],
            platforms=platforms or [],
        )

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