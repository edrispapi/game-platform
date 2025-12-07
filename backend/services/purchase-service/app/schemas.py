"""
Purchase Service Pydantic Schemas
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


class PurchaseItemBase(BaseModel):
    game_id: str
    game_name: str
    price: Decimal = Field(..., ge=0)
    quantity: int = Field(default=1, ge=1)


class PurchaseItemCreate(PurchaseItemBase):
    pass


class PurchaseItemResponse(PurchaseItemBase):
    id: int
    purchase_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PurchaseBase(BaseModel):
    user_id: str
    total_amount: Decimal = Field(..., ge=0)
    currency: str = "USD"
    payment_method: Optional[str] = None


class PurchaseCreate(PurchaseBase):
    items: List[PurchaseItemCreate]


class PurchaseUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(pending|completed|cancelled|refunded)$")
    payment_id: Optional[str] = None


class PurchaseResponse(PurchaseBase):
    id: int
    uuid: str
    status: str
    payment_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseItemResponse]

    model_config = ConfigDict(from_attributes=True)


class RefundCreate(BaseModel):
    purchase_id: int
    reason: Optional[str] = Field(default=None, max_length=1000)


class RefundResponse(BaseModel):
    id: int
    purchase_id: int
    user_id: str
    amount: Decimal
    status: str
    processed_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
