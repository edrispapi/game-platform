"""
Notification Service API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from . import crud, schemas, database

router = APIRouter()


@router.post("/", response_model=schemas.NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(notification: schemas.NotificationCreate, db: Session = Depends(database.get_db)):
    """Create a new notification for a user."""
    return crud.create_notification(db, notification)


@router.get("/user/{user_id}", response_model=List[schemas.NotificationResponse])
def list_user_notifications(
    user_id: str,
    only_unread: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(database.get_db),
):
    """Retrieve notifications for a user."""
    return crud.list_notifications(db, user_id=user_id, only_unread=only_unread, limit=limit)


@router.post("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_read(
    notification_id: str,
    read_update: schemas.NotificationReadUpdate,
    db: Session = Depends(database.get_db),
):
    """Toggle the read state for a notification."""
    try:
        notification_int = int(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification_id.")

    notification = crud.mark_read(db, notification_int, read_update.is_read)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return notification
