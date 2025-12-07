"""
Shopping Service Database Models
"""
from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class ShoppingCart(Base):
    __tablename__ = "shopping_carts"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    status = Column(String(20), default="active", nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    subtotal = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    extra_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_cart_user_status", "user_id", "status"),
    )


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("shopping_carts.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(String(64), nullable=False, index=True)
    game_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    total_price = Column(Float, default=0.0, nullable=False)
    extra_metadata = Column(JSON, nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    cart = relationship("ShoppingCart", back_populates="items")

    __table_args__ = (
        UniqueConstraint("cart_id", "game_id", name="uq_cart_game"),
    )


class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    name = Column(String(120), nullable=False, default="My Wishlist")
    description = Column(String(500), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    extra_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    items = relationship("WishlistItem", back_populates="wishlist", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_wishlist_user_public", "user_id", "is_public"),
    )


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    wishlist_id = Column(Integer, ForeignKey("wishlists.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(String(64), nullable=False, index=True)
    game_name = Column(String(255), nullable=False)
    price_when_added = Column(Float, nullable=True)
    currency = Column(String(3), default="USD", nullable=False)
    status = Column(String(20), default="active", nullable=False)
    notify_on_sale = Column(Boolean, default=True, nullable=False)
    notify_on_release = Column(Boolean, default=True, nullable=False)
    notify_on_price_drop = Column(Boolean, default=True, nullable=False)
    extra_metadata = Column(JSON, nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    wishlist = relationship("Wishlist", back_populates="items")

    __table_args__ = (
        UniqueConstraint("wishlist_id", "game_id", name="uq_wishlist_game"),
    )
