"""
Review Service Pydantic Schemas
"""
from __future__ import annotations

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class ReviewStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"

class ReviewTypeEnum(str, Enum):
    GAME = "game"
    DLC = "dlc"
    SOFTWARE = "software"

class ReviewBase(BaseModel):
    user_id: str
    game_id: str
    review_type: ReviewTypeEnum = ReviewTypeEnum.GAME
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    language: str = Field(default="en", max_length=5)
    playtime_at_review: int = Field(default=0, ge=0)
    is_early_access: bool = False
    is_positive: bool = True

class ReviewCreate(ReviewBase):
    pass

class ReviewUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    language: Optional[str] = Field(None, max_length=5)
    content: Optional[str] = None
    title: Optional[str] = Field(None, max_length=255)

class ReviewResponse(ReviewBase):
    id: int
    uuid: str
    is_positive: bool
    status: ReviewStatusEnum
    helpful_votes: int
    unhelpful_votes: int
    total_votes: int
    is_flagged: bool
    created_at: datetime
    updated_at: datetime
    extra_metadata: Optional[Dict[str, dict]] = None
    
    model_config = ConfigDict(from_attributes=True)

class ReviewCommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class ReviewCommentCreate(ReviewCommentBase):
    review_id: int
    user_id: str
    parent_comment_id: Optional[int] = None

class ReviewCommentResponse(ReviewCommentBase):
    id: int
    uuid: str
    review_id: int
    user_id: str
    parent_comment_id: Optional[int]
    is_edited: bool
    helpful_votes: int
    unhelpful_votes: int
    is_flagged: bool
    created_at: datetime
    updated_at: datetime
    replies: List["ReviewCommentResponse"] = []
    
    model_config = ConfigDict(from_attributes=True)

class ReviewVoteCreate(BaseModel):
    is_helpful: bool

class ReviewVoteResponse(BaseModel):
    id: int
    review_id: int
    user_id: str
    is_helpful: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CommentVoteCreate(BaseModel):
    is_helpful: bool

class CommentVoteResponse(BaseModel):
    id: int
    comment_id: int
    user_id: str
    is_helpful: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ReviewReportCreate(BaseModel):
    report_reason: str = Field(..., max_length=100)
    report_description: Optional[str] = Field(None, max_length=1000)

class ReviewReportResponse(BaseModel):
    id: int
    review_id: int
    user_id: str
    report_reason: str
    report_description: Optional[str]
    status: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ReviewSearchFilters(BaseModel):
    game_id: Optional[int] = None
    user_id: Optional[int] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    min_rating: Optional[int] = Field(None, ge=1, le=5)
    max_rating: Optional[int] = Field(None, ge=1, le=5)
    is_positive: Optional[bool] = None
    status: Optional[ReviewStatusEnum] = None
    language: Optional[str] = None
    min_playtime: Optional[int] = Field(None, ge=0)
    is_early_access: Optional[bool] = None
    sort_by: Optional[str] = Field(default="created_at", pattern="^(created_at|rating|helpful_votes|playtime_at_review)$")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$")

class ReviewStatsResponse(BaseModel):
    total_reviews: int
    average_rating: float
    positive_reviews: int
    negative_reviews: int
    rating_distribution: dict
    recent_reviews: int
    helpful_reviews: int


ReviewCommentResponse.model_rebuild()
