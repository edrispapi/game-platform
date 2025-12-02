"""Pydantic schemas for Friends & Chat service."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


class FriendRequestCreate(BaseModel):
    target_user_id: str
    message: Optional[str] = Field(default=None, max_length=280)


class FriendRequestResponse(BaseModel):
    id: str
    requester_id: str
    target_user_id: str
    message: Optional[str]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FriendResponse(BaseModel):
    friend_id: str
    since: datetime


class FriendListResponse(BaseModel):
    user_id: str
    friends: List[FriendResponse]


class FriendRequestDecision(BaseModel):
    accept: bool


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class ChatMessageResponse(BaseModel):
    id: str
    channel_type: str
    channel_id: str
    sender_id: str
    content: str
    sent_at: datetime


class LobbyChatMessage(ChatMessageResponse):
    pass
