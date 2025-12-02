"""
Purchase Service CRUD Operations
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.events import publish_event
from .core.config import settings

from . import models, schemas


def _publish(event_type: str, payload: dict) -> None:
    publish_event(settings.KAFKA_PURCHASE_TOPIC, {"event_type": event_type, **payload})


def create_purchase(db: Session, purchase: schemas.PurchaseCreate) -> models.Purchase:
    db_purchase = models.Purchase(
        user_id=purchase.user_id,
        total_amount=purchase.total_amount,
        currency=purchase.currency,
        payment_method=purchase.payment_method,
        status="pending",
    )
    db.add(db_purchase)
    db.flush()

    for item in purchase.items:
        db.add(
            models.PurchaseItem(
                purchase_id=db_purchase.id,
                game_id=item.game_id,
                game_name=item.game_name,
                price=item.price,
                quantity=item.quantity,
            )
        )

    db.commit()
    db.refresh(db_purchase)
    _publish("purchase_created", {"purchase_id": db_purchase.id, "user_id": db_purchase.user_id})
    return db_purchase


def get_purchase(db: Session, purchase_id: int) -> Optional[models.Purchase]:
    return db.get(models.Purchase, purchase_id)


def get_user_purchases(db: Session, user_id: str, skip: int = 0, limit: int = 100) -> List[models.Purchase]:
    return (
        db.query(models.Purchase)
        .filter(models.Purchase.user_id == user_id)
        .order_by(models.Purchase.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_purchase(db: Session, purchase_id: int, purchase_update: schemas.PurchaseUpdate) -> Optional[models.Purchase]:
    db_purchase = get_purchase(db, purchase_id)
    if not db_purchase:
        return None

    updates = purchase_update.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(db_purchase, field, value)

    db.commit()
    db.refresh(db_purchase)
    _publish("purchase_updated", {"purchase_id": purchase_id, **updates})
    return db_purchase


def create_refund(db: Session, refund: schemas.RefundCreate, user_id: str) -> models.Refund:
    purchase = get_purchase(db, refund.purchase_id)
    if not purchase:
        raise ValueError("Purchase not found")

    refund_record = models.Refund(
        purchase_id=purchase.id,
        user_id=user_id,
        amount=purchase.total_amount,
        reason=refund.reason,
        status="pending",
    )
    db.add(refund_record)
    db.commit()
    db.refresh(refund_record)
    _publish("refund_created", {"refund_id": refund_record.id, "purchase_id": purchase.id})
    return refund_record


def get_refund(db: Session, refund_id: int) -> Optional[models.Refund]:
    return db.get(models.Refund, refund_id)


def get_user_refunds(db: Session, user_id: str, skip: int = 0, limit: int = 100) -> List[models.Refund]:
    return (
        db.query(models.Refund)
        .filter(models.Refund.user_id == user_id)
        .order_by(models.Refund.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
