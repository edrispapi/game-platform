"""
Notification Service CRUD Operations
"""
from __future__ import annotations

from typing import List, Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.events import publish_event
from .core.config import settings

from . import models, schemas


def _publish(event_type: str, payload: dict) -> None:
    publish_event(settings.KAFKA_NOTIFICATION_TOPIC, {"event_type": event_type, **payload})


def create_notification(db: Session, notification: schemas.NotificationCreate) -> models.Notification:
    db_notification = models.Notification(**notification.model_dump())
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    _publish("notification_created", {"notification_id": db_notification.id, "user_id": db_notification.user_id})
    return db_notification


def list_notifications(
    db: Session,
    user_id: str,
    only_unread: bool = False,
    limit: int = 50,
) -> List[models.Notification]:
    query = db.query(models.Notification).filter(models.Notification.user_id == user_id)
    if only_unread:
        query = query.filter(models.Notification.is_read == False)  # noqa: E712
    return query.order_by(models.Notification.created_at.desc()).limit(limit).all()


def mark_read(db: Session, notification_id: int, read: bool = True) -> Optional[models.Notification]:
    notification = db.get(models.Notification, notification_id)
    if not notification:
        return None
    notification.is_read = read
    notification.read_at = datetime.now(timezone.utc) if read else None
    db.commit()
    db.refresh(notification)
    _publish("notification_read" if read else "notification_unread", {"notification_id": notification_id})
    return notification
