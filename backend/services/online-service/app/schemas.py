"""
Online Service Pydantic Schemas
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PresenceUpdate(BaseModel):
    user_id: str
    status: str = Field(default="online", pattern="^(online|offline|away|in-game)$")
    platform: str = Field(default="desktop", max_length=20)
    activity: Optional[str] = Field(default=None, max_length=100)
    region: Optional[str] = Field(default=None, max_length=10)
    metadata: Optional[Dict[str, str]] = None


class PresenceResponse(PresenceUpdate):
    id: int
    last_seen: datetime
    updated_at: datetime

    metadata: Optional[Dict[str, str]] = Field(default=None, alias="extra_metadata")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ChatMessageCreate(BaseModel):
    sender_id: str
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=2000)


class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: str
    sender_id: str
    recipient_id: str
    content: str
    is_read: bool
    sent_at: datetime
    read_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class LobbyCreate(BaseModel):
    host_id: str
    name: str = Field(..., min_length=3, max_length=80)
    description: Optional[str] = Field(default=None, max_length=280)
    max_members: int = Field(default=4, ge=2, le=16)
    is_private: bool = False
    passcode: Optional[str] = Field(default=None, max_length=32)
    region: Optional[str] = Field(default=None, max_length=20)
    metadata: Optional[Dict[str, str]] = None


class LobbyJoinRequest(BaseModel):
    user_id: str
    passcode: Optional[str] = None


class LobbyMemberResponse(BaseModel):
    user_id: str
    role: str
    is_ready: bool
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LobbyResponse(BaseModel):
    id: str
    host_id: str
    name: str
    description: Optional[str]
    max_members: int
    is_private: bool
    region: Optional[str]
    status: str
    metadata: Optional[Dict[str, str]] = Field(default=None, alias="extra_metadata")
    created_at: datetime
    updated_at: datetime
    members: List[LobbyMemberResponse]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
