"""Forum service API routes."""
from __future__ import annotations

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import crud, database, schemas
from .core.auth import verify_token

router = APIRouter()


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
def list_posts(
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
    
    return schemas.ForumListResponse(
        items=posts,
        total=total,
        page=page,
        per_page=limit,
        total_pages=total_pages,
    )


@router.get("/posts/{post_id}", response_model=schemas.ForumPostResponse)
def get_post(
    post_id: int,
    db: Session = Depends(database.get_db),
):
    """Get a forum post by ID"""
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Increment view count
    crud.increment_post_views(db, post)
    
    return post


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
def get_replies(
    post_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
):
    """Get replies for a post"""
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return crud.get_replies(db, post_id, skip=skip, limit=limit)

