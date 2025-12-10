"""Forum service API routes."""
from __future__ import annotations

from typing import Optional, List, Dict, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
import os
import httpx
from sqlalchemy.orm import Session

from . import crud, database, schemas
from .core.auth import verify_token

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:8001")
router = APIRouter()


async def _fetch_user_profile(user_id: str, client: httpx.AsyncClient) -> Tuple[str | None, str | None]:
    """
    Fetch a user's username and avatar_url from the user service.
    Returns (username, avatar_url) or (None, None) on failure.
    """
    try:
        resp = await client.get(f"{USER_SERVICE_URL}/api/v1/users/by-id/{user_id}", timeout=5.0)
        if resp.status_code != 200:
            return None, None
        data = resp.json()
        return data.get("username"), data.get("avatar_url")
    except Exception:
        return None, None


@router.post("/posts", response_model=schemas.ForumPostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    post: schemas.ForumPostCreate,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    """Create a new forum post"""
    return crud.create_post(
        db=db,
        user_id=str(token_payload["user_id"]),
        post=post,
    )


@router.get("/posts", response_model=schemas.ForumListResponse)
async def list_posts(
    game_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "newest",
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(database.get_db),
):
    """List forum posts"""
    skip = (page - 1) * per_page
    limit = min(per_page, 100)
    
    posts, total = crud.list_posts(
        db=db,
        game_id=game_id,
        skip=skip,
        limit=limit,
        search=search,
        sort_by=sort_by,
    )
    
    total_pages = max(1, (total + limit - 1) // limit)
    # Enrich with author profile data
    unique_user_ids = {p.user_id for p in posts if p.user_id}
    profile_cache: Dict[str, Tuple[str | None, str | None]] = {}
    async with httpx.AsyncClient() as client:
        for uid in unique_user_ids:
            username, avatar = await _fetch_user_profile(uid, client)
            profile_cache[uid] = (username, avatar)
    
    enriched_items = []
    for p in posts:
        username, avatar = profile_cache.get(p.user_id, (None, None))
        enriched_items.append(
            schemas.ForumPostResponse.model_validate(
                {
                    "id": p.id,
                    "uuid": p.uuid,
                    "user_id": p.user_id,
                    "author_username": username,
                    "author_avatar_url": avatar,
                    "title": p.title,
                    "content": p.content,
                    "tags": p.tags,
                    "game_id": p.game_id,
                    "is_pinned": p.is_pinned,
                    "is_locked": p.is_locked,
                    "slug": p.slug,
                    "status": p.status,
                    "views": p.views,
                    "likes": p.likes,
                    "replies_count": p.replies_count,
                    "created_at": p.created_at,
                    "updated_at": p.updated_at,
                    "last_reply_at": p.last_reply_at,
                }
            )
        )

    return schemas.ForumListResponse(
        items=enriched_items,
        total=total,
        page=page,
        per_page=limit,
        total_pages=total_pages,
    )


@router.get("/posts/{post_id}", response_model=schemas.ForumPostResponse)
async def get_post(
    post_id: int,
    db: Session = Depends(database.get_db),
):
    """Get a forum post by ID"""
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Increment view count
    crud.increment_post_views(db, post)
    
    async with httpx.AsyncClient() as client:
        username, avatar = await _fetch_user_profile(post.user_id, client)
    return schemas.ForumPostResponse.model_validate(
        {
            "id": post.id,
            "uuid": post.uuid,
            "user_id": post.user_id,
            "author_username": username,
            "author_avatar_url": avatar,
            "title": post.title,
            "content": post.content,
            "tags": post.tags,
            "game_id": post.game_id,
            "is_pinned": post.is_pinned,
            "is_locked": post.is_locked,
            "slug": post.slug,
            "status": post.status,
            "views": post.views,
            "likes": post.likes,
            "replies_count": post.replies_count,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
            "last_reply_at": post.last_reply_at,
        }
    )


@router.put("/posts/{post_id}", response_model=schemas.ForumPostResponse)
def update_post(
    post_id: int,
    post_update: schemas.ForumPostUpdate,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    """Update a forum post"""
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if str(post.user_id) != str(token_payload["user_id"]):
        raise HTTPException(status_code=403, detail="Cannot update this post")
    
    return crud.update_post(db, post, post_update)


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    """Delete a forum post"""
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if str(post.user_id) != str(token_payload["user_id"]):
        raise HTTPException(status_code=403, detail="Cannot delete this post")
    
    crud.delete_post(db, post)
    return {"message": "Post deleted"}


@router.post("/posts/{post_id}/like", response_model=dict)
def toggle_post_like(
    post_id: int,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    """Toggle like on a post"""
    is_liked = crud.toggle_post_like(
        db=db,
        post_id=post_id,
        user_id=str(token_payload["user_id"]),
    )
    return {"liked": is_liked}


@router.post("/posts/{post_id}/replies", response_model=schemas.ForumReplyResponse, status_code=status.HTTP_201_CREATED)
def create_reply(
    post_id: int,
    reply: schemas.ForumReplyCreate,
    token_payload=Depends(verify_token),
    db: Session = Depends(database.get_db),
):
    """Create a reply to a post"""
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return crud.create_reply(
        db=db,
        user_id=str(token_payload["user_id"]),
        post_id=post_id,
        reply=reply,
    )


@router.get("/posts/{post_id}/replies", response_model=List[schemas.ForumReplyResponse])
async def get_replies(
    post_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
):
    """Get replies for a post"""
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    replies = crud.get_replies(db, post_id, skip=skip, limit=limit)
    unique_user_ids = {r.user_id for r in replies if r.user_id}
    profile_cache: Dict[str, Tuple[str | None, str | None]] = {}
    async with httpx.AsyncClient() as client:
        for uid in unique_user_ids:
            username, avatar = await _fetch_user_profile(uid, client)
            profile_cache[uid] = (username, avatar)
    enriched = []
    for r in replies:
        username, avatar = profile_cache.get(r.user_id, (None, None))
        enriched.append(
            schemas.ForumReplyResponse.model_validate(
                {
                    "id": r.id,
                    "uuid": r.uuid,
                    "post_id": r.post_id,
                    "user_id": r.user_id,
                    "author_username": username,
                    "author_avatar_url": avatar,
                    "content": r.content,
                    "parent_reply_id": r.parent_reply_id,
                    "likes": r.likes,
                    "is_edited": r.is_edited,
                    "created_at": r.created_at,
                    "updated_at": r.updated_at,
                    "child_replies": [],
                }
            )
        )
    return enriched

