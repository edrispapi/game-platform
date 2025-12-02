"""
Payment Service Database Models
"""
from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class PaymentIntent(Base):
    __tablename__ = "payment_intents"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    purchase_id = Column(Integer, nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    status = Column(String(20), default="requires_method", nullable=False)
    provider = Column(String(50), nullable=False, default="test-gateway")
    client_secret = Column(String(100), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    charges = relationship("PaymentCharge", back_populates="intent", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_payment_intents_purchase_status", "purchase_id", "status"),
    )


class PaymentCharge(Base):
    __tablename__ = "payment_charges"

    id = Column(Integer, primary_key=True, index=True)
    intent_id = Column(Integer, ForeignKey("payment_intents.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_charge_id = Column(String(100), nullable=False, unique=True)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False)  # succeeded, failed, refunded
    failure_code = Column(String(50), nullable=True)
    failure_message = Column(Text, nullable=True)
    processed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    intent = relationship("PaymentIntent", back_populates="charges")


class PaymentRefund(Base):
    __tablename__ = "payment_refunds"

    id = Column(Integer, primary_key=True, index=True)
    charge_id = Column(Integer, ForeignKey("payment_charges.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # pending, succeeded, failed
    reason = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    charge = relationship("PaymentCharge")
