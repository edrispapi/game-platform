"""
Review Service API Routes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from . import crud, schemas, database
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _parse_int(identifier: str, label: str) -> int:
    try:
        return int(identifier)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {label}.") from exc

@router.post("/", response_model=schemas.ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    review: schemas.ReviewCreate,
    db: Session = Depends(database.get_db)
):
    """Create a new review"""
    return crud.create_review(db=db, review=review)

@router.get("/{review_id}", response_model=schemas.ReviewResponse)
def get_review(
    review_id: str,
    db: Session = Depends(database.get_db)
):
    """Get review by ID"""
    review = crud.get_review(db=db, review_id=_parse_int(review_id, "review_id"))
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@router.get("/game/{game_id}/stats", response_model=schemas.ReviewStatsResponse)
def get_game_review_stats(
    game_id: str,
    db: Session = Depends(database.get_db)
):
    """Get aggregate statistics for a game's reviews"""
    try:
        stats = crud.get_game_review_stats(db=db, game_id=game_id)
        # Map to ReviewStatsResponse schema
        return schemas.ReviewStatsResponse(
            total_reviews=stats["total_reviews"],
            average_rating=stats["average_rating"],
            positive_reviews=stats["positive_reviews"],
            negative_reviews=stats["negative_reviews"],
            rating_distribution=stats["rating_distribution"],
            recent_reviews=0,  # Can be calculated if needed
            helpful_reviews=0,  # Can be calculated if needed
        )
    except Exception as exc:
        logger.exception("Failed to fetch review stats for game_id=%s", game_id)
        # Return empty stats instead of 500/404 to keep frontend stable
        return schemas.ReviewStatsResponse(
            total_reviews=0,
            average_rating=0.0,
            positive_reviews=0,
            negative_reviews=0,
            rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            recent_reviews=0,
            helpful_reviews=0,
        )

@router.get("/game/{game_id}", response_model=List[schemas.ReviewResponse])
def get_game_reviews(
    game_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Get reviews for a game"""
    try:
        return crud.get_game_reviews(db=db, game_id=game_id, skip=skip, limit=limit)
    except Exception as exc:
        logger.exception("Failed to fetch reviews for game_id=%s", game_id)
        # Return empty list instead of failing the entire page
        return []

@router.get("/user/{user_id}", response_model=List[schemas.ReviewResponse])
def get_user_reviews(
    user_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Get reviews by a user"""
    return crud.get_user_reviews(db=db, user_id=user_id, skip=skip, limit=limit)

@router.patch("/{review_id}", response_model=schemas.ReviewResponse)
def update_review(
    review_id: str,
    review_update: schemas.ReviewUpdate,
    db: Session = Depends(database.get_db)
):
    """Update review"""
    review_id_int = _parse_int(review_id, "review_id")
    review = crud.update_review(db=db, review_id=review_id_int, review_update=review_update)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@router.delete("/{review_id}")
def delete_review(
    review_id: str,
    db: Session = Depends(database.get_db)
):
    """Delete review"""
    review_id_int = _parse_int(review_id, "review_id")
    if not crud.delete_review(db=db, review_id=review_id_int):
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}

@router.post("/comments", response_model=schemas.ReviewCommentResponse, status_code=status.HTTP_201_CREATED)
def create_review_comment(
    comment: schemas.ReviewCommentCreate,
    db: Session = Depends(database.get_db)
):
    """Create a review comment"""
    return crud.create_review_comment(db=db, comment=comment)

@router.get("/{review_id}/comments", response_model=List[schemas.ReviewCommentResponse])
def get_review_comments(
    review_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Get comments for a review"""
    review_id_int = _parse_int(review_id, "review_id")
    return crud.get_review_comments(db=db, review_id=review_id_int, skip=skip, limit=limit)


@router.delete("/admin/reset")
def reset_all_reviews(admin_token: str, db: Session = Depends(database.get_db)):
    """
    Hard delete all reviews, comments, and votes.
    Requires ADMIN_RESET_TOKEN env var and matching admin_token query param.
    """
    if not settings.ADMIN_RESET_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="ADMIN_RESET_TOKEN is not configured on the review-service",
        )
    if admin_token != settings.ADMIN_RESET_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")

    crud.delete_all_reviews(db=db)
    return {"message": "All reviews, comments, and votes have been deleted"}


@router.post("/{review_id}/vote", response_model=schemas.ReviewVoteResponse, status_code=status.HTTP_201_CREATED)
def vote_review(
    review_id: str,
    user_id: str,
    is_helpful: bool,
    db: Session = Depends(database.get_db)
):
    """Vote on a review"""
    review_id_int = _parse_int(review_id, "review_id")
    return crud.vote_review(db=db, review_id=review_id_int, user_id=user_id, is_helpful=is_helpful)
