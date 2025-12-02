"""Pydantic schemas for workshop service."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict

from .models import WorkshopItemStatus, WorkshopItemVisibility


class WorkshopItemBase(BaseModel):
    title: str = Field(..., max_length=150)
    description: str = Field(..., max_length=4000)
    tags: Optional[List[str]] = Field(default=None, max_length=20)
    game_id: Optional[str] = Field(default=None, max_length=64)
    version: Optional[str] = Field(default=None, max_length=50)
    visibility: WorkshopItemVisibility = WorkshopItemVisibility.PUBLIC
    file_url: Optional[str] = Field(default=None, max_length=500)
    thumbnail_url: Optional[str] = Field(default=None, max_length=500)


class WorkshopItemCreate(WorkshopItemBase):
    pass


class WorkshopItemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=150)
    description: Optional[str] = Field(default=None, max_length=4000)
    tags: Optional[List[str]] = None
    version: Optional[str] = None
    visibility: Optional[WorkshopItemVisibility] = None
    file_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class WorkshopItemResponse(WorkshopItemBase):
    id: int
    uuid: str
    user_id: str
    slug: str
    status: WorkshopItemStatus
    auto_flagged: bool
    auto_score: Optional[float]
    auto_reasons: Optional[List[str]]
    manual_reviewer_id: Optional[str]
    moderation_notes: Optional[str]
    downloads: int
    votes_up: int
    votes_down: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkshopModerationRequest(BaseModel):
    action: WorkshopItemStatus
    reason: Optional[str] = Field(default=None, max_length=2000)
    moderator_id: Optional[str] = Field(default=None, max_length=64)


class WorkshopVoteRequest(BaseModel):
    is_upvote: bool = True


class WorkshopListResponse(BaseModel):
    items: List[WorkshopItemResponse]
    total: int


class WorkshopDownloadResponse(BaseModel):
    download_url: str
    downloads: int


class AutoModerationResult(BaseModel):
    score: float
    flagged: bool
    reasons: List[str] = Field(default_factory=list)

