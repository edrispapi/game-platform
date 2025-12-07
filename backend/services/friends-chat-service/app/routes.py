"""Friends & Chat API routes."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from . import crud, schemas
from .auth import get_current_user_id
from .database import get_database
from .core.config import settings

router = APIRouter()


@router.post("/friends/requests", response_model=schemas.FriendRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_friend_request(
    payload: schemas.FriendRequestCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if payload.target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")
    doc = await crud.create_friend_request(db, user_id, payload)
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/friends/requests", response_model=List[schemas.FriendRequestResponse])
async def list_requests(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    docs = await crud.list_incoming_requests(db, user_id)
    for doc in docs:
        doc["id"] = str(doc.pop("_id"))
    return docs


@router.post("/friends/requests/{request_id}/respond", response_model=schemas.FriendRequestResponse)
async def respond_request(
    request_id: str,
    decision: schemas.FriendRequestDecision,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await crud.respond_to_request(db, request_id, user_id, decision.accept)
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/friends", response_model=schemas.FriendListResponse)
async def get_friends(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    record = await crud.list_friends(db, user_id)
    return record


@router.post("/chats/direct/{peer_id}/messages", response_model=schemas.ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_direct_message(
    peer_id: str,
    payload: schemas.ChatMessageCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await crud.send_direct_message(db, sender_id=user_id, peer_id=peer_id, content=payload.content)
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/chats/direct/{peer_id}/messages", response_model=List[schemas.ChatMessageResponse])
async def list_direct_messages(
    peer_id: str,
    limit: int = Query(default=50, ge=1, le=settings.CHAT_HISTORY_LIMIT),
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    channel_id = "::".join(sorted([user_id, peer_id]))
    docs = await crud.fetch_messages(db, channel_type="direct", channel_id=channel_id, limit=limit)
    for doc in docs:
        doc["id"] = str(doc.pop("_id"))
    return docs


@router.post("/chats/lobbies/{lobby_id}/messages", response_model=schemas.ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_lobby_message(
    lobby_id: str,
    payload: schemas.ChatMessageCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await crud.send_lobby_message(db, sender_id=user_id, lobby_id=lobby_id, content=payload.content)
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/chats/lobbies/{lobby_id}/messages", response_model=List[schemas.LobbyChatMessage])
async def list_lobby_messages(
    lobby_id: str,
    limit: int = Query(default=50, ge=1, le=settings.CHAT_HISTORY_LIMIT),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    docs = await crud.fetch_messages(db, channel_type="lobby", channel_id=lobby_id, limit=limit)
    for doc in docs:
        doc["id"] = str(doc.pop("_id"))
    return docs
