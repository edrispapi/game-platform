"""
Recommendation Service Pydantic Schemas
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict


class RecommendationItem(BaseModel):
    game_id: str
    score: float = Field(..., ge=0.0)
    reason: Optional[str] = Field(default=None, max_length=500)
    context: Optional[Dict[str, str]] = None
    algorithm: str = "hybrid"


class RecommendationBatchCreate(BaseModel):
    user_id: str
    recommendations: List[RecommendationItem]
    expires_in_hours: Optional[int] = Field(default=None, ge=1)


class RecommendationResponse(BaseModel):
    id: int
    uuid: str
    user_id: str
    game_id: str
    score: float
    rank: int
    algorithm: str
    reason: Optional[str]
    context: Optional[Dict[str, str]]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendationFeedbackCreate(BaseModel):
    recommendation_id: Optional[int] = None
    user_id: str
    game_id: str
    action: str = Field(..., pattern="^(clicked|ignored|wishlisted|purchased)$")
    details: Optional[Dict[str, str]] = None


class RecommendationFeedbackResponse(RecommendationFeedbackCreate):
    id: int
    recommendation_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InteractionEvent(BaseModel):
    user_id: str
    game_id: str
    event_type: str = Field(..., max_length=50)
    weight: Optional[float] = Field(default=None, ge=0.0)
    metadata: Optional[Dict[str, str]] = None
    occurred_at: Optional[datetime] = None


class InteractionBatch(BaseModel):
    interactions: List[InteractionEvent]


class InteractionIngestResponse(BaseModel):
    created: int
    updated: int


class TrainingRequest(BaseModel):
    min_interactions: Optional[int] = Field(default=None, ge=1)
    n_components: Optional[int] = Field(default=None, ge=2, le=200)
    persist: bool = True


class TrainingResponse(BaseModel):
    interactions: int
    users: int
    games: int
    components: int
    trained_at: datetime


class GenerationRequest(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
    algorithm: str = Field(default="collaborative")
    reason: Optional[str] = Field(
        default="Because you liked similar games",
        max_length=500,
    )
