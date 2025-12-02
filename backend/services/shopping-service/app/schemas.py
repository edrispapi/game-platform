"""
Shopping Service Pydantic Schemas
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CartItemBase(BaseModel):
    game_id: str = Field(..., description="Game identifier from the catalog service")
    game_name: str
    unit_price: float = Field(..., ge=0)
    quantity: int = Field(default=1, ge=1)
    discount_amount: float = Field(default=0.0, ge=0)


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: Optional[int] = Field(default=None, ge=0)
    discount_amount: Optional[float] = Field(default=None, ge=0)


class CartItemResponse(CartItemBase):
    id: int
    cart_id: int
    total_price: float
    added_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ShoppingCartCreate(BaseModel):
    user_id: str
    currency: str = "USD"


class ShoppingCartResponse(BaseModel):
    id: int
    uuid: str
    user_id: str
    status: str
    currency: str
    subtotal: float
    discount_amount: float
    tax_amount: float
    total_amount: float
    items: List[CartItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WishlistCreate(BaseModel):
    user_id: str
    name: str = "My Wishlist"
    description: Optional[str] = None
    is_public: bool = False


class WishlistItemCreate(BaseModel):
    game_id: str
    game_name: str
    price_when_added: float
    currency: str = "USD"


class WishlistItemResponse(WishlistItemCreate):
    id: int
    wishlist_id: int
    status: str
    notify_on_sale: bool
    notify_on_release: bool
    notify_on_price_drop: bool
    added_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WishlistResponse(BaseModel):
    id: int
    uuid: str
    user_id: str
    name: str
    description: Optional[str]
    is_public: bool
    items: List[WishlistItemResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
