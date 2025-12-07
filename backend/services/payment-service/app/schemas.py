"""
Payment Service Pydantic Schemas
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict

from pydantic import BaseModel, Field, ConfigDict


class PaymentIntentCreate(BaseModel):
    purchase_id: int
    user_id: str
    amount: Decimal = Field(..., ge=0)
    currency: str = "USD"
    provider: str = "test-gateway"
    expires_in_minutes: Optional[int] = Field(default=30, ge=1)


class PaymentIntentResponse(BaseModel):
    id: int
    uuid: str
    purchase_id: int
    user_id: str
    amount: Decimal
    currency: str
    status: str
    provider: str
    client_secret: str
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentChargeCreate(BaseModel):
    intent_id: int
    provider_charge_id: str
    amount: Decimal
    metadata: Optional[Dict[str, str]] = None


class PaymentChargeResponse(BaseModel):
    id: int
    intent_id: int
    provider_charge_id: str
    amount: Decimal
    status: str
    failure_code: Optional[str]
    failure_message: Optional[str]
    processed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentRefundCreate(BaseModel):
    charge_id: int
    amount: Decimal
    reason: Optional[str] = Field(default=None, max_length=255)


class PaymentRefundResponse(BaseModel):
    id: int
    charge_id: int
    amount: Decimal
    status: str
    reason: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
