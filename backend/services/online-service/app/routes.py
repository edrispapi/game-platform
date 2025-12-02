"""
Online Service API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from . import crud, database, schemas
from .core.config import settings

router = APIRouter()


@router.post("/presence", response_model=schemas.PresenceResponse)
def update_presence(presence: schemas.PresenceUpdate, db: Session = Depends(database.get_db)):
    """Upsert presence for a user."""
    return crud.upsert_presence(db, presence)


@router.get("/presence/{user_id}", response_model=schemas.PresenceResponse)
def get_presence(user_id: str, db: Session = Depends(database.get_db)):
    """Fetch a user's presence."""
    presence = crud.get_presence(db, user_id)
    if not presence:
        raise HTTPException(status_code=404, detail="Presence not found.")
    return presence


@router.get("/presence", response_model=List[schemas.PresenceResponse])
def list_presence(user_ids: List[str] = Query(default=[]), db: Session = Depends(database.get_db)):
    """Batch fetch presence records."""
    return crud.list_presence(db, user_ids)


@router.post("/messages", response_model=schemas.ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(message: schemas.ChatMessageCreate, db: Session = Depends(database.get_db)):
    """Send a direct chat message."""
    if message.sender_id == message.recipient_id:
        raise HTTPException(status_code=400, detail="Cannot send a message to yourself.")
    return crud.create_message(db, message)


@router.get("/messages", response_model=List[schemas.ChatMessageResponse])
def get_conversation_messages(
    user_id: str,
    peer_id: str,
    limit: int = 50,
    db: Session = Depends(database.get_db),
):
    """Retrieve conversation history between two users."""
    return crud.get_conversation_messages(db, user_id=user_id, peer_id=peer_id, limit=limit)


@router.post("/lobbies", response_model=schemas.LobbyResponse, status_code=status.HTTP_201_CREATED)
def create_lobby(payload: schemas.LobbyCreate, db: Session = Depends(database.get_db)):
    """Create a multiplayer lobby."""
    try:
        lobby = crud.create_lobby(db, payload, max_members_limit=settings.LOBBY_MAX_MEMBERS)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return lobby


@router.get("/lobbies", response_model=List[schemas.LobbyResponse])
def list_lobbies(
    status_filter: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(database.get_db),
):
    """List available lobbies."""
    return crud.list_lobbies(db, status=status_filter, region=region, limit=limit)


@router.get("/lobbies/{lobby_id}", response_model=schemas.LobbyResponse)
def get_lobby(lobby_id: str, db: Session = Depends(database.get_db)):
    lobby = crud.get_lobby(db, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found.")
    return lobby


@router.post("/lobbies/{lobby_id}/join", response_model=schemas.LobbyResponse)
def join_lobby(lobby_id: str, payload: schemas.LobbyJoinRequest, db: Session = Depends(database.get_db)):
    lobby = crud.get_lobby(db, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found.")
    if lobby.is_private and lobby.passcode and lobby.passcode != payload.passcode:
        raise HTTPException(status_code=403, detail="Invalid passcode.")
    try:
        lobby = crud.join_lobby(db, lobby, user_id=payload.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return lobby


@router.post("/lobbies/{lobby_id}/leave", response_model=schemas.LobbyResponse | dict)
def leave_lobby(lobby_id: str, user_id: str, db: Session = Depends(database.get_db)):
    lobby = crud.get_lobby(db, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found.")
    try:
        updated, removed = crud.leave_lobby(db, lobby, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if removed:
        return {"message": "Lobby closed"}
    return updated


@router.post("/lobbies/{lobby_id}/ready", response_model=schemas.LobbyResponse)
def set_ready_state(
    lobby_id: str,
    user_id: str,
    is_ready: bool = True,
    db: Session = Depends(database.get_db),
):
    lobby = crud.get_lobby(db, lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found.")
    try:
        lobby = crud.set_ready_state(db, lobby, user_id=user_id, is_ready=is_ready)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return lobby
