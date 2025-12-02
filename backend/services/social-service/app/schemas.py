"""
Social Service Pydantic Schemas
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from .models import FriendRequestStatus


class FriendRequestBase(BaseModel):
    requester_id: UUID = Field(..., description="User initiating the friend request")
    receiver_id: UUID = Field(..., description="User receiving the friend request")
    message: Optional[str] = Field(default=None, max_length=280)


class FriendRequestCreate(FriendRequestBase):
    pass


class FriendRequestResponse(FriendRequestBase):
    id: UUID
    status: FriendRequestStatus
    created_at: datetime
    responded_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class FriendRequestDecision(BaseModel):
    action: Literal["accept", "reject", "cancel"]


class FriendshipResponse(BaseModel):
    id: UUID
    user_id: UUID
    friend_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FollowCreate(BaseModel):
    follower_id: UUID
    following_id: UUID
    notifications_enabled: bool = True


class FollowResponse(FollowCreate):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
