"""
Social Service CRUD Operations
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.events import publish_event
from .core.config import settings

from . import models, schemas


def _to_str(value: UUID | str) -> str:
    return str(value)


def _publish(event_type: str, payload: dict) -> None:
    publish_event(settings.KAFKA_SOCIAL_TOPIC, {"event_type": event_type, **payload})


def create_friend_request(db: Session, payload: schemas.FriendRequestCreate) -> models.FriendRequest:
    """Create a friend request if one is not already pending."""
    requester = _to_str(payload.requester_id)
    receiver = _to_str(payload.receiver_id)

    if requester == receiver:
        raise ValueError("Cannot send a friend request to yourself.")

    existing_friendship = (
        db.query(models.Friendship)
        .filter(models.Friendship.user_id == requester, models.Friendship.friend_id == receiver)
        .first()
    )
    if existing_friendship:
        raise ValueError("Users are already friends.")

    duplicate = (
        db.query(models.FriendRequest)
        .filter(
            or_(
                (
                    (models.FriendRequest.requester_id == requester)
                    & (models.FriendRequest.receiver_id == receiver)
                ),
                (
                    (models.FriendRequest.requester_id == receiver)
                    & (models.FriendRequest.receiver_id == requester)
                ),
            ),
            models.FriendRequest.status == models.FriendRequestStatus.PENDING,
        )
        .first()
    )
    if duplicate:
        raise ValueError("A pending friend request already exists.")

    friend_request = models.FriendRequest(
        requester_id=requester,
        receiver_id=receiver,
        message=payload.message,
    )
    db.add(friend_request)
    db.commit()
    db.refresh(friend_request)

    _publish(
        "friend_request_created",
        {
            "request_id": friend_request.id,
            "requester_id": requester,
            "receiver_id": receiver,
        },
    )

    return friend_request


def respond_to_friend_request(
    db: Session, request_id: str, decision: schemas.FriendRequestDecision
) -> models.FriendRequest:
    """Accept, reject, or cancel a friend request."""
    friend_request = db.get(models.FriendRequest, request_id)
    if not friend_request:
        raise ValueError("Friend request not found.")

    if friend_request.status != models.FriendRequestStatus.PENDING:
        raise ValueError("Friend request already resolved.")

    action = decision.action
    now = datetime.now(timezone.utc)

    if action == "accept":
        friend_request.status = models.FriendRequestStatus.ACCEPTED
        friend_request.responded_at = now
        _create_bidirectional_friendships(db, friend_request.requester_id, friend_request.receiver_id)
        event_type = "friend_request_accepted"
    elif action == "reject":
        friend_request.status = models.FriendRequestStatus.REJECTED
        friend_request.responded_at = now
        event_type = "friend_request_rejected"
    elif action == "cancel":
        friend_request.status = models.FriendRequestStatus.CANCELLED
        friend_request.responded_at = now
        event_type = "friend_request_cancelled"
    else:
        raise ValueError("Unsupported action.")

    db.add(friend_request)
    db.commit()
    db.refresh(friend_request)

    _publish(
        event_type,
        {"request_id": friend_request.id, "requester_id": friend_request.requester_id, "receiver_id": friend_request.receiver_id},
    )

    return friend_request


def _create_bidirectional_friendships(db: Session, user_a: str, user_b: str) -> None:
    for user_id, friend_id in ((user_a, user_b), (user_b, user_a)):
        existing = (
            db.query(models.Friendship)
            .filter(models.Friendship.user_id == user_id, models.Friendship.friend_id == friend_id)
            .first()
        )
        if existing:
            continue
        db.add(models.Friendship(user_id=user_id, friend_id=friend_id))
    db.flush()


def list_pending_requests(db: Session, user_id: UUID | str) -> List[models.FriendRequest]:
    return (
        db.query(models.FriendRequest)
        .filter(
            models.FriendRequest.receiver_id == _to_str(user_id),
            models.FriendRequest.status == models.FriendRequestStatus.PENDING,
        )
        .order_by(models.FriendRequest.created_at.desc())
        .all()
    )


def list_friends(db: Session, user_id: UUID | str) -> List[models.Friendship]:
    return (
        db.query(models.Friendship)
        .filter(models.Friendship.user_id == _to_str(user_id))
        .order_by(models.Friendship.created_at.desc())
        .all()
    )


def create_follow(db: Session, payload: schemas.FollowCreate) -> models.Follow:
    follower = _to_str(payload.follower_id)
    following = _to_str(payload.following_id)

    if follower == following:
        raise ValueError("Cannot follow yourself.")

    existing = (
        db.query(models.Follow)
        .filter(models.Follow.follower_id == follower, models.Follow.following_id == following)
        .first()
    )
    if existing:
        return existing

    follow = models.Follow(
        follower_id=follower,
        following_id=following,
        notifications_enabled=payload.notifications_enabled,
    )
    db.add(follow)
    db.commit()
    db.refresh(follow)

    _publish(
        "user_followed",
        {"follow_id": follow.id, "follower_id": follower, "following_id": following},
    )
    return follow


def delete_follow(db: Session, follower_id: UUID | str, following_id: UUID | str) -> bool:
    follow = (
        db.query(models.Follow)
        .filter(
            models.Follow.follower_id == _to_str(follower_id),
            models.Follow.following_id == _to_str(following_id),
        )
        .first()
    )
    if not follow:
        return False

    db.delete(follow)
    db.commit()
    _publish(
        "user_unfollowed",
        {"follower_id": _to_str(follower_id), "following_id": _to_str(following_id)},
    )
    return True


def list_following(db: Session, user_id: UUID | str) -> List[models.Follow]:
    return (
        db.query(models.Follow)
        .filter(models.Follow.follower_id == _to_str(user_id))
        .order_by(models.Follow.created_at.desc())
        .all()
    )


def list_followers(db: Session, user_id: UUID | str) -> List[models.Follow]:
    return (
        db.query(models.Follow)
        .filter(models.Follow.following_id == _to_str(user_id))
        .order_by(models.Follow.created_at.desc())
        .all()
    )
