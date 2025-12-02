"""
Payment Service CRUD Operations
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from sqlalchemy.orm import Session

from app.events import publish_event
from .core.config import settings
from . import models, schemas


def _publish(event_type: str, payload: dict) -> None:
    publish_event(settings.KAFKA_PAYMENT_TOPIC, {"event_type": event_type, **payload})


def create_payment_intent(db: Session, payload: schemas.PaymentIntentCreate) -> models.PaymentIntent:
    expires_at = None
    if payload.expires_in_minutes:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=payload.expires_in_minutes)

    intent = models.PaymentIntent(
        purchase_id=payload.purchase_id,
        user_id=payload.user_id,
        amount=payload.amount,
        currency=payload.currency,
        provider=payload.provider,
        client_secret=f"secret_{uuid.uuid4().hex}",
        expires_at=expires_at,
    )
    db.add(intent)
    db.commit()
    db.refresh(intent)
    _publish("payment_intent_created", {"intent_id": intent.id, "purchase_id": intent.purchase_id})
    return intent


def get_payment_intent(db: Session, intent_id: int) -> Optional[models.PaymentIntent]:
    return db.get(models.PaymentIntent, intent_id)


def create_charge(db: Session, payload: schemas.PaymentChargeCreate) -> models.PaymentCharge:
    intent = get_payment_intent(db, payload.intent_id)
    if not intent:
        raise ValueError("Payment intent not found.")

    charge = models.PaymentCharge(
        intent_id=intent.id,
        provider_charge_id=payload.provider_charge_id,
        amount=payload.amount,
        status="succeeded",
    )
    intent.status = "succeeded"
    db.add(charge)
    db.commit()
    db.refresh(charge)
    db.refresh(intent)
    _publish("payment_charge_succeeded", {"charge_id": charge.id, "intent_id": intent.id})
    return charge


def create_refund(db: Session, payload: schemas.PaymentRefundCreate) -> models.PaymentRefund:
    charge = db.get(models.PaymentCharge, payload.charge_id)
    if not charge:
        raise ValueError("Charge not found.")

    refund = models.PaymentRefund(
        charge_id=charge.id,
        amount=payload.amount,
        reason=payload.reason,
        status="pending",
    )
    db.add(refund)
    charge.status = "refund_pending"
    db.commit()
    db.refresh(refund)
    _publish("payment_refund_created", {"refund_id": refund.id, "charge_id": charge.id})
    return refund
