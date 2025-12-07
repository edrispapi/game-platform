"""
Configuration for Friends & Chat service.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List


def _parse_allowed_origins(raw: str | None) -> List[str]:
    if not raw:
        return ["http://localhost", "http://localhost:3000", "http://127.0.0.1:3000"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass(slots=True)
class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Steam Clone Friends & Chat")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")

    ALLOWED_ORIGINS: List[str] = field(
        default_factory=lambda: _parse_allowed_origins(os.getenv("ALLOWED_ORIGINS"))
    )

    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://mongo:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "friends_chat")

    CHAT_HISTORY_LIMIT: int = int(os.getenv("CHAT_HISTORY_LIMIT", "100"))
    SERVICE_PORT: int = int(os.getenv("FRIENDS_CHAT_SERVICE_PORT", "8013"))


settings = Settings()

