"""
Review Service API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from . import crud, schemas, database

router = APIRouter()


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

@router.get("/game/{game_id}", response_model=List[schemas.ReviewResponse])
def get_game_reviews(
    game_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Get reviews for a game"""
    return crud.get_game_reviews(db=db, game_id=game_id, skip=skip, limit=limit)

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
