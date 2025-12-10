"""
Notification Service Pydantic Schemas
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict

from pydantic import BaseModel, Field, ConfigDict


class NotificationCreate(BaseModel):
    user_id: str
    title: Optional[str] = Field(default=None, max_length=150)
    message: str = Field(..., max_length=5000)
    category: str = Field(default="general", max_length=50)
    priority: str = Field(default="normal", pattern="^(low|normal|high|critical)$")
    delivered_via: Optional[str] = Field(default="in-app", max_length=50)
    metadata: Optional[Dict[str, str]] = None


class NotificationResponse(NotificationCreate):
    id: int
    uuid: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    # extra_metadata stored as text in DB; accept either dict or string
    metadata: Optional[Dict[str, str] | str] = Field(default=None, alias="extra_metadata")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NotificationReadUpdate(BaseModel):
    is_read: bool = True
