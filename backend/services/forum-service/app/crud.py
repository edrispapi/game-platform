"""Forum service CRUD operations."""
from __future__ import annotations

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from slugify import slugify

from . import models, schemas


def create_post(db: Session, user_id: str, post: schemas.ForumPostCreate) -> models.ForumPost:
    """Create a new forum post"""
    # Generate slug from title
    base_slug = slugify(post.title)
    slug = base_slug
    counter = 1
    # Ensure unique slug
    while db.query(models.ForumPost).filter(models.ForumPost.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    db_post = models.ForumPost(
        user_id=user_id,
        game_id=post.game_id,
        title=post.title,
        slug=slug,
        content=post.content,
        tags=post.tags or [],
        is_pinned=bool(post.is_pinned) if post.is_pinned is not None else False,
        is_locked=bool(post.is_locked) if post.is_locked is not None else False,
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


def get_post(db: Session, post_id: int) -> Optional[models.ForumPost]:
    """Get post by ID"""
    return db.get(models.ForumPost, post_id)


def get_post_by_slug(db: Session, slug: str) -> Optional[models.ForumPost]:
    """Get post by slug"""
    return db.query(models.ForumPost).filter(models.ForumPost.slug == slug).first()


def list_posts(
    db: Session,
    game_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    sort_by: str = "newest",
) -> tuple[List[models.ForumPost], int]:
    """List forum posts with filters"""
    query = db.query(models.ForumPost).filter(
        models.ForumPost.status == models.ForumPostStatus.ACTIVE.value
    )
    
    if game_id:
        query = query.filter(models.ForumPost.game_id == game_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (models.ForumPost.title.ilike(search_term)) |
            (models.ForumPost.content.ilike(search_term))
        )
    
    # Sort
    if sort_by == "newest":
        query = query.order_by(desc(models.ForumPost.created_at))
    elif sort_by == "popular":
        query = query.order_by(desc(models.ForumPost.views))
    elif sort_by == "replies":
        query = query.order_by(desc(models.ForumPost.replies_count))
    elif sort_by == "likes":
        query = query.order_by(desc(models.ForumPost.likes))
    
    # Put pinned posts first
    query = query.order_by(desc(models.ForumPost.is_pinned))
    
    total = query.count()
    posts = query.offset(skip).limit(limit).all()
    
    return posts, total


def update_post(db: Session, post: models.ForumPost, post_update: schemas.ForumPostUpdate) -> models.ForumPost:
    """Update a forum post"""
    updates = post_update.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(post, field, value)
    
    # Regenerate slug if title changed
    if "title" in updates:
        base_slug = slugify(post.title)
        slug = base_slug
        counter = 1
        while db.query(models.ForumPost).filter(
            models.ForumPost.slug == slug,
            models.ForumPost.id != post.id
        ).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        post.slug = slug
    
    db.commit()
    db.refresh(post)
    return post


def delete_post(db: Session, post: models.ForumPost) -> bool:
    """Soft delete a forum post"""
    post.status = models.ForumPostStatus.DELETED.value
    db.commit()
    return True


def increment_post_views(db: Session, post: models.ForumPost) -> None:
    """Increment post view count"""
    post.views += 1
    db.commit()


def create_reply(db: Session, user_id: str, post_id: int, reply: schemas.ForumReplyCreate) -> models.ForumReply:
    """Create a reply to a post"""
    db_reply = models.ForumReply(
        post_id=post_id,
        user_id=user_id,
        content=reply.content,
        parent_reply_id=reply.parent_reply_id,
    )
    db.add(db_reply)
    
    # Update post reply count and last_reply_at
    post = get_post(db, post_id)
    if post:
        post.replies_count += 1
        post.last_reply_at = db_reply.created_at
    
    db.commit()
    db.refresh(db_reply)
    return db_reply


def get_replies(
    db: Session,
    post_id: int,
    skip: int = 0,
    limit: int = 100,
) -> List[models.ForumReply]:
    """Get replies for a post"""
    return (
        db.query(models.ForumReply)
        .filter(models.ForumReply.post_id == post_id)
        .filter(models.ForumReply.parent_reply_id.is_(None))  # Only top-level replies
        .order_by(models.ForumReply.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def toggle_post_like(db: Session, post_id: int, user_id: str) -> bool:
    """Toggle like on a post. Returns True if liked, False if unliked"""
    post = get_post(db, post_id)
    if not post:
        return False
    
    existing_like = (
        db.query(models.ForumPostLike)
        .filter(
            models.ForumPostLike.post_id == post_id,
            models.ForumPostLike.user_id == user_id
        )
        .first()
    )
    
    if existing_like:
        # Unlike
        db.delete(existing_like)
        post.likes = max(0, post.likes - 1)
        db.commit()
        return False
    else:
        # Like
        like = models.ForumPostLike(post_id=post_id, user_id=user_id)
        db.add(like)
        post.likes += 1
        db.commit()
        return True

