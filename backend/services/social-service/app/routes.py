"""
Social Service API Routes
"""
from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from . import crud, schemas
from .database import get_db

router = APIRouter()


@router.post(
    "/friend-requests",
    response_model=schemas.FriendRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_friend_request(
    request: schemas.FriendRequestCreate,
    db: Session = Depends(get_db),
):
    """Create a new friend request."""
    try:
        return crud.create_friend_request(db, request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post(
    "/friend-requests/{request_id}/respond",
    response_model=schemas.FriendRequestResponse,
)
def respond_to_friend_request(
    request_id: str,
    decision: schemas.FriendRequestDecision,
    db: Session = Depends(get_db),
):
    """Accept, reject, or cancel a friend request."""
    try:
        return crud.respond_to_friend_request(db, request_id, decision)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get(
    "/friend-requests/pending/{user_id}",
    response_model=List[schemas.FriendRequestResponse],
)
def pending_friend_requests(user_id: UUID, db: Session = Depends(get_db)):
    """List pending friend requests for a user."""
    return crud.list_pending_requests(db, user_id)


@router.get(
    "/friends/{user_id}",
    response_model=List[schemas.FriendshipResponse],
)
def list_friends(user_id: UUID, db: Session = Depends(get_db)):
    """List accepted friends for a user."""
    return crud.list_friends(db, user_id)


@router.post("/follows", response_model=schemas.FollowResponse, status_code=status.HTTP_201_CREATED)
def follow_user(payload: schemas.FollowCreate, db: Session = Depends(get_db)):
    """Follow another user."""
    try:
        return crud.create_follow(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/follows/{follower_id}/{following_id}", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(follower_id: UUID, following_id: UUID, db: Session = Depends(get_db)):
    """Unfollow a user."""
    deleted = crud.delete_follow(db, follower_id, following_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow relationship not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/follows/{user_id}/following", response_model=List[schemas.FollowResponse])
def list_following(user_id: UUID, db: Session = Depends(get_db)):
    """List users that the given user is following."""
    return crud.list_following(db, user_id)


@router.get("/follows/{user_id}/followers", response_model=List[schemas.FollowResponse])
def list_followers(user_id: UUID, db: Session = Depends(get_db)):
    """List followers for the given user."""
    return crud.list_followers(db, user_id)
