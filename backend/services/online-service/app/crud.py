"""
Online Service CRUD Operations
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import func

from sqlalchemy.orm import Session

from app.events import publish_event
from .core.config import settings

from . import models, schemas


def _publish(event_type: str, payload: dict) -> None:
    publish_event(settings.KAFKA_ONLINE_TOPIC, {"event_type": event_type, **payload})


def upsert_presence(db: Session, presence: schemas.PresenceUpdate) -> models.UserPresence:
    db_presence = (
        db.query(models.UserPresence)
        .filter(models.UserPresence.user_id == presence.user_id)
        .one_or_none()
    )

    update_data = presence.model_dump(exclude_unset=True)
    metadata_value = update_data.pop("metadata", None)

    if db_presence:
        for field, value in update_data.items():
            setattr(db_presence, field, value)
        if metadata_value is not None:
            db_presence.extra_metadata = metadata_value
    else:
        if metadata_value is not None:
            update_data["extra_metadata"] = metadata_value
        db_presence = models.UserPresence(**update_data)
        db.add(db_presence)

    db.commit()
    db.refresh(db_presence)
    _publish("presence_updated", {"user_id": db_presence.user_id, "status": db_presence.status})
    return db_presence


def get_presence(db: Session, user_id: str) -> models.UserPresence | None:
    return (
        db.query(models.UserPresence)
        .filter(models.UserPresence.user_id == user_id)
        .one_or_none()
    )


def list_presence(db: Session, user_ids: List[str]) -> List[models.UserPresence]:
    if not user_ids:
        return []
    return (
        db.query(models.UserPresence)
        .filter(models.UserPresence.user_id.in_(user_ids))
        .all()
    )


def _conversation_id(user_a: str, user_b: str) -> str:
    return "::".join(sorted([user_a, user_b]))


def create_message(db: Session, payload: schemas.ChatMessageCreate) -> models.ChatMessage:
    conversation_id = _conversation_id(payload.sender_id, payload.recipient_id)
    message = models.ChatMessage(
        conversation_id=conversation_id,
        sender_id=payload.sender_id,
        recipient_id=payload.recipient_id,
        content=payload.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    _publish(
        "chat_message_sent",
        {
            "conversation_id": conversation_id,
            "sender_id": payload.sender_id,
            "recipient_id": payload.recipient_id,
            "message_id": message.id,
        },
    )
    return message


def _hydrate_lobby(lobby: Optional[models.GameLobby]) -> Optional[models.GameLobby]:
    if lobby is None:
        return None
    _ = lobby.members  # force relationship loading for Pydantic
    return lobby


def get_conversation_messages(
    db: Session,
    user_id: str,
    peer_id: str,
    limit: int = 50,
) -> List[models.ChatMessage]:
    conversation_id = _conversation_id(user_id, peer_id)
    limit = max(1, min(limit, 100))
    return (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.conversation_id == conversation_id)
        .order_by(models.ChatMessage.sent_at.desc())
        .limit(limit)
        .all()
    )


def create_lobby(
    db: Session,
    payload: schemas.LobbyCreate,
    *,
    max_members_limit: int,
) -> models.GameLobby:
    max_members = max(2, min(payload.max_members, max_members_limit))
    lobby = models.GameLobby(
        host_id=payload.host_id,
        name=payload.name,
        description=payload.description,
        max_members=max_members,
        is_private=payload.is_private,
        passcode=payload.passcode,
        region=payload.region,
        extra_metadata=payload.metadata,
    )
    db.add(lobby)
    db.flush()

    host_member = models.LobbyMember(lobby_id=lobby.id, user_id=payload.host_id, role="host")
    db.add(host_member)
    db.commit()
    db.refresh(lobby)
    _hydrate_lobby(lobby)
    _publish("lobby_created", {"lobby_id": lobby.id, "host_id": lobby.host_id})
    return lobby


def list_lobbies(
    db: Session,
    *,
    status: Optional[str] = None,
    region: Optional[str] = None,
    limit: int = 50,
) -> List[models.GameLobby]:
    limit = max(1, min(limit, 100))
    query = db.query(models.GameLobby)
    if status:
        query = query.filter(models.GameLobby.status == status)
    if region:
        query = query.filter(models.GameLobby.region == region)
    lobbies = query.order_by(models.GameLobby.created_at.desc()).limit(limit).all()
    for lobby in lobbies:
        _hydrate_lobby(lobby)
    return lobbies


def get_lobby(db: Session, lobby_id: str) -> Optional[models.GameLobby]:
    lobby = (
        db.query(models.GameLobby)
        .filter(models.GameLobby.id == lobby_id)
        .one_or_none()
    )
    return _hydrate_lobby(lobby)


def lobby_member_count(db: Session, lobby_id: str) -> int:
    return (
        db.query(func.count(models.LobbyMember.id))
        .filter(models.LobbyMember.lobby_id == lobby_id)
        .scalar()
    )


def join_lobby(
    db: Session,
    lobby: models.GameLobby,
    *,
    user_id: str,
    role: str = "member",
) -> models.GameLobby:
    existing = (
        db.query(models.LobbyMember)
        .filter(models.LobbyMember.lobby_id == lobby.id, models.LobbyMember.user_id == user_id)
        .one_or_none()
    )
    if existing:
        return lobby

    if lobby_member_count(db, lobby.id) >= lobby.max_members:
        raise ValueError("Lobby is full.")

    db.add(models.LobbyMember(lobby_id=lobby.id, user_id=user_id, role=role))
    db.commit()
    db.refresh(lobby)
    _hydrate_lobby(lobby)
    _publish("lobby_joined", {"lobby_id": lobby.id, "user_id": user_id})
    return lobby


def leave_lobby(
    db: Session,
    lobby: models.GameLobby,
    *,
    user_id: str,
) -> Tuple[Optional[models.GameLobby], bool]:
    membership = (
        db.query(models.LobbyMember)
        .filter(models.LobbyMember.lobby_id == lobby.id, models.LobbyMember.user_id == user_id)
        .one_or_none()
    )
    if not membership:
        raise ValueError("User is not part of the lobby.")

    db.delete(membership)
    db.flush()

    if lobby.host_id == user_id:
        successor = (
            db.query(models.LobbyMember)
            .filter(models.LobbyMember.lobby_id == lobby.id)
            .order_by(models.LobbyMember.joined_at.asc())
            .first()
        )
        if successor:
            lobby.host_id = successor.user_id
            successor.role = "host"
        else:
            db.delete(lobby)
            db.commit()
            _publish("lobby_closed", {"lobby_id": lobby.id, "reason": "empty"})
            return None, True

    db.commit()
    db.refresh(lobby)
    _hydrate_lobby(lobby)
    _publish("lobby_left", {"lobby_id": lobby.id, "user_id": user_id})
    return lobby, False


def set_ready_state(
    db: Session,
    lobby: models.GameLobby,
    *,
    user_id: str,
    is_ready: bool,
) -> models.GameLobby:
    membership = (
        db.query(models.LobbyMember)
        .filter(models.LobbyMember.lobby_id == lobby.id, models.LobbyMember.user_id == user_id)
        .one_or_none()
    )
    if not membership:
        raise ValueError("User is not part of the lobby.")

    membership.is_ready = is_ready
    db.commit()
    db.refresh(lobby)
    _hydrate_lobby(lobby)
    _publish(
        "lobby_ready_state_changed",
        {"lobby_id": lobby.id, "user_id": user_id, "is_ready": is_ready},
    )
    return lobby
