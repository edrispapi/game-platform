"""Data access helpers for Friends & Chat service."""
from __future__ import annotations

from datetime import datetime
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING
from pymongo.collection import Collection
from bson import ObjectId

from . import schemas


def _friend_requests(db: AsyncIOMotorDatabase) -> Collection:
    return db["friend_requests"]


def _friends(db: AsyncIOMotorDatabase) -> Collection:
    return db["friends"]


def _messages(db: AsyncIOMotorDatabase) -> Collection:
    return db["chat_messages"]


async def create_friend_request(db: AsyncIOMotorDatabase, requester_id: str, payload: schemas.FriendRequestCreate) -> dict:
    doc = {
        "requester_id": requester_id,
        "target_user_id": payload.target_user_id,
        "message": payload.message,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    result = await _friend_requests(db).insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def list_incoming_requests(db: AsyncIOMotorDatabase, user_id: str) -> List[dict]:
    cursor = _friend_requests(db).find({"target_user_id": user_id}).sort("created_at", ASCENDING)
    return await cursor.to_list(length=100)


async def respond_to_request(db: AsyncIOMotorDatabase, request_id: str, user_id: str, accept: bool) -> dict | None:
    request = await _friend_requests(db).find_one({"_id": ObjectId(request_id), "target_user_id": user_id})
    if not request:
        return None
    new_status = "accepted" if accept else "declined"
    await _friend_requests(db).update_one({"_id": request["_id"]}, {"$set": {"status": new_status}})
    if accept:
        await _friends(db).update_one(
            {"user_id": request["target_user_id"]},
            {"$push": {"friends": {"friend_id": request["requester_id"], "since": datetime.utcnow()}}},
            upsert=True,
        )
        await _friends(db).update_one(
            {"user_id": request["requester_id"]},
            {"$push": {"friends": {"friend_id": request["target_user_id"], "since": datetime.utcnow()}}},
            upsert=True,
        )
    request["status"] = new_status
    return request


async def list_friends(db: AsyncIOMotorDatabase, user_id: str) -> dict:
    record = await _friends(db).find_one({"user_id": user_id})
    if not record:
        record = {"user_id": user_id, "friends": []}
    return record


async def _store_message(
    db: AsyncIOMotorDatabase,
    *,
    channel_type: str,
    channel_id: str,
    sender_id: str,
    content: str,
) -> dict:
    doc = {
        "channel_type": channel_type,
        "channel_id": channel_id,
        "sender_id": sender_id,
        "content": content,
        "sent_at": datetime.utcnow(),
    }
    result = await _messages(db).insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def send_direct_message(db: AsyncIOMotorDatabase, *, sender_id: str, peer_id: str, content: str) -> dict:
    channel_id = "::".join(sorted([sender_id, peer_id]))
    return await _store_message(db, channel_type="direct", channel_id=channel_id, sender_id=sender_id, content=content)


async def send_lobby_message(db: AsyncIOMotorDatabase, *, sender_id: str, lobby_id: str, content: str) -> dict:
    return await _store_message(db, channel_type="lobby", channel_id=lobby_id, sender_id=sender_id, content=content)


async def fetch_messages(
    db: AsyncIOMotorDatabase,
    *,
    channel_type: str,
    channel_id: str,
    limit: int,
) -> List[dict]:
    cursor = (
        _messages(db)
        .find({"channel_type": channel_type, "channel_id": channel_id})
        .sort("sent_at", -1)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    return list(reversed(docs))
