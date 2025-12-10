"""Pydantic schemas for forum service."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


class ForumPostBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str = Field(..., min_length=1)
    tags: Optional[List[str]] = Field(default=None, max_length=10)
    game_id: Optional[str] = Field(default=None, max_length=64)
    # Allow creators to optionally pin/lock their own posts (used for seeded event highlights)
    is_pinned: Optional[bool] = False
    is_locked: Optional[bool] = False


class ForumPostCreate(ForumPostBase):
    pass


class ForumPostUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    is_pinned: Optional[bool] = None
    is_locked: Optional[bool] = None


class ForumPostResponse(ForumPostBase):
    id: int
    uuid: str
    user_id: str
    author_username: str | None = None
    author_avatar_url: str | None = None
    slug: str
    status: str
    is_pinned: bool
    is_locked: bool
    views: int
    likes: int
    replies_count: int
    created_at: datetime
    updated_at: datetime
    last_reply_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ForumReplyBase(BaseModel):
    content: str = Field(..., min_length=1)
    parent_reply_id: Optional[int] = None


class ForumReplyCreate(ForumReplyBase):
    pass


class ForumReplyResponse(ForumReplyBase):
    id: int
    uuid: str
    post_id: int
    user_id: str
    author_username: str | None = None
    author_avatar_url: str | None = None
    likes: int
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    child_replies: List["ForumReplyResponse"] = []

    model_config = ConfigDict(from_attributes=True)


class ForumListResponse(BaseModel):
    items: List[ForumPostResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


ForumReplyResponse.model_rebuild()

