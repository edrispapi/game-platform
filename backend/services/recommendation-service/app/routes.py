"""
Recommendation Service API Routes
"""
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from . import crud, schemas, database
from .services import cf_engine

router = APIRouter()


@router.post(
    "/batch",
    response_model=List[schemas.RecommendationResponse],
    status_code=status.HTTP_201_CREATED,
)
def upsert_recommendations(
    batch: schemas.RecommendationBatchCreate,
    db: Session = Depends(database.get_db),
):
    """Replace a user's recommendations with a new batch."""
    if not batch.recommendations:
        raise HTTPException(status_code=400, detail="Recommendations list cannot be empty.")
    return crud.replace_user_recommendations(db=db, batch=batch)


@router.get(
    "/user/{user_id}",
    response_model=List[schemas.RecommendationResponse],
)
def get_user_recommendations(
    user_id: str,
    limit: int = 20,
    db: Session = Depends(database.get_db),
):
    """Return the active recommendations for a user."""
    limit = max(1, min(limit, 50))
    return crud.get_user_recommendations(db=db, user_id=user_id, limit=limit)


@router.post(
    "/feedback",
    response_model=schemas.RecommendationFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_feedback(
    feedback: schemas.RecommendationFeedbackCreate,
    db: Session = Depends(database.get_db),
):
    """Record user feedback for a recommendation."""
    return crud.record_feedback(db, feedback.recommendation_id, feedback)


@router.post(
    "/interactions",
    response_model=schemas.InteractionIngestResponse,
    status_code=status.HTTP_201_CREATED,
)
def ingest_interactions(
    payload: schemas.InteractionBatch,
    db: Session = Depends(database.get_db),
):
    if not payload.interactions:
        raise HTTPException(status_code=400, detail="Interactions list cannot be empty.")
    created, updated = crud.ingest_interactions(db, payload)
    return schemas.InteractionIngestResponse(created=created, updated=updated)


@router.post("/train", response_model=schemas.TrainingResponse)
def train_collaborative_model(
    request: schemas.TrainingRequest = Body(default=schemas.TrainingRequest()),
    db: Session = Depends(database.get_db),
):
    interactions = crud.list_interaction_tuples(db)
    try:
        result = cf_engine.train(
            interactions,
            min_interactions=request.min_interactions,
            n_components=request.n_components,
            persist=request.persist,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return schemas.TrainingResponse(
        interactions=result.interactions,
        users=result.users,
        games=result.games,
        components=result.components,
        trained_at=result.trained_at,
    )


@router.post(
    "/user/{user_id}/generate",
    response_model=List[schemas.RecommendationResponse],
)
def generate_recommendations(
    user_id: str,
    request: schemas.GenerationRequest,
    db: Session = Depends(database.get_db),
):
    if not cf_engine.is_ready():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Model has not been trained yet."
        )
    seen_games = crud.get_user_seen_games(db, user_id)
    try:
        scored = cf_engine.recommend(user_id, seen_games, limit=request.limit)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not scored:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No candidates found.")

    batch = schemas.RecommendationBatchCreate(
        user_id=user_id,
        recommendations=[
            schemas.RecommendationItem(
                game_id=game_id,
                score=max(score, 0.0),
                algorithm=request.algorithm,
                reason=request.reason,
                context={"source": "collaborative"},
            )
            for game_id, score in scored
        ],
        expires_in_hours=24,
    )
    return crud.replace_user_recommendations(db, batch)
