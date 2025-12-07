"""Pydantic schemas for the achievement and leaderboard APIs."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class AchievementBase(BaseModel):
    code: str = Field(..., max_length=64)
    title: str = Field(..., max_length=120)
    description: str = Field(..., max_length=2000)
    points: int = Field(default=50, ge=0, le=10000)
    category: Optional[str] = Field(default=None, max_length=50)
    rarity: Optional[str] = Field(default=None, max_length=30)
    icon_url: Optional[str] = Field(default=None, max_length=500)
    is_secret: bool = False
    progress_target: int = Field(default=1, ge=1)
    auto_claim: bool = True


class AchievementCreate(AchievementBase):
    """Payload used to register a new achievement definition."""


class AchievementUpdate(BaseModel):
    """Patch-like update for an achievement definition."""

    title: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    points: Optional[int] = Field(default=None, ge=0, le=10000)
    category: Optional[str] = Field(default=None, max_length=50)
    rarity: Optional[str] = Field(default=None, max_length=30)
    icon_url: Optional[str] = Field(default=None, max_length=500)
    is_secret: Optional[bool] = None
    progress_target: Optional[int] = Field(default=None, ge=1)
    auto_claim: Optional[bool] = None


class AchievementResponse(AchievementBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AchievementProgressRequest(BaseModel):
    """External trigger to move a user's progress forward."""

    achievement_code: str = Field(..., max_length=64)
    progress_delta: int = Field(default=1, ge=0, le=100000)
    score_bonus: int = Field(default=0, ge=0, le=5000)
    force_complete: bool = False
    metadata: Optional[dict] = None
    notify: bool = True


class UserAchievementProgress(BaseModel):
    id: str
    user_id: str
    achievement_code: str
    achievement_title: str
    progress_current: int
    progress_target: int
    is_completed: bool
    unlocked_at: Optional[datetime]
    reward_points: int
    progress_percent: float

    class Config:
        from_attributes = True


class UserScoreResponse(BaseModel):
    user_id: str
    total_points: int
    achievements_unlocked: int
    star_tokens: int
    leaderboard_rank: Optional[int]


class AchievementUnlockResponse(BaseModel):
    user: UserScoreResponse
    achievement: UserAchievementProgress
    star_tokens_awarded: int = 0
    score_delta: int = 0
    leaderboard_score: int


class LeaderboardEntry(BaseModel):
    user_id: str
    score: int
    rank: int
    star_tokens: Optional[int] = None
    display_name: Optional[str] = None
    username: Optional[str] = None


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    total_players: int
    generated_at: datetime


class UserAchievementOverview(BaseModel):
    user: UserScoreResponse
    achievements: List[UserAchievementProgress]
    recent_unlocked: List[UserAchievementProgress]
    leaderboard_score: int
    leaderboard_rank: Optional[int]
