"""
Online status and multiplayer service for Steam-like platform
"""
from __future__ import annotations

import asyncio
import contextlib
import json
from datetime import datetime, timezone

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import crud, database, models, routes
from .core.config import settings
from .database import SessionLocal, engine
from .realtime import hub

# Create FastAPI app
app = FastAPI(
    title="Online Service",
    description="Online status and multiplayer service for Steam-like platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(routes.router, prefix="/api/v1/online", tags=["online"])


@app.on_event("shutdown")
async def _shutdown() -> None:
    await hub.close()

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "online-service"}


@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "Online Service API", "version": "1.0.0"}


async def _forward_pubsub(pubsub, websocket: WebSocket) -> None:
    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        await websocket.send_text(message["data"])


@app.websocket("/ws/lobbies/{lobby_id}")
async def lobby_socket(websocket: WebSocket, lobby_id: str):
    """Realtime lobby channel used for chat/ready-up events."""
    user_id = websocket.query_params.get("user_id")
    if not user_id:
        await websocket.close(code=4001)
        return

    session = SessionLocal()
    try:
        lobby = crud.get_lobby(session, lobby_id)
        if not lobby:
            await websocket.close(code=4404)
            return
        membership = next((m for m in lobby.members if m.user_id == user_id), None)
        if membership is None:
            await websocket.close(code=4403)
            return

        await websocket.accept()
        pubsub = await hub.subscribe(lobby_id)
        forward_task = asyncio.create_task(_forward_pubsub(pubsub, websocket))

        history = await hub.lobby_history(lobby_id)
        for entry in history:
            await websocket.send_text(json.dumps(entry))

        join_event = {
            "type": "presence",
            "subtype": "joined",
            "lobby_id": lobby_id,
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await hub.publish_lobby_event(lobby_id, join_event)

        try:
            while True:
                message = await websocket.receive_text()
                event = {
                    "type": "chat",
                    "lobby_id": lobby_id,
                    "user_id": user_id,
                    "message": message,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await hub.publish_lobby_event(lobby_id, event)
        except WebSocketDisconnect:
            leave_event = {
                "type": "presence",
                "subtype": "disconnect",
                "lobby_id": lobby_id,
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await hub.publish_lobby_event(lobby_id, leave_event)
        finally:
            forward_task.cancel()
            with contextlib.suppress(Exception):
                await pubsub.unsubscribe()
                await pubsub.close()
    finally:
        session.close()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.ONLINE_SERVICE_PORT,
        reload=True
    )
