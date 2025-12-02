"""
Notification Service Pydantic Schemas
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict

from pydantic import BaseModel, Field, ConfigDict


class NotificationCreate(BaseModel):
    user_id: str
    title: str = Field(..., max_length=150)
    message: str = Field(..., max_length=5000)
    category: str = Field(default="general", max_length=50)
    priority: str = Field(default="normal", pattern="^(low|normal|high|critical)$")
    delivered_via: str = Field(default="in-app", max_length=50)
    metadata: Optional[Dict[str, str]] = None


class NotificationResponse(NotificationCreate):
    id: int
    uuid: str
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, str]] = Field(default=None, alias="extra_metadata")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NotificationReadUpdate(BaseModel):
    is_read: bool = True
