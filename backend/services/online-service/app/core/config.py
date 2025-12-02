"""
Service-local configuration utilities for the online/multiplayer service.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List


def _parse_allowed_origins(raw_value: str | None) -> List[str]:
    """Return a sanitized list of allowed CORS origins."""
    if not raw_value:
        return [
            "http://localhost",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


@dataclass(slots=True)
class Settings:
    """Strongly-typed service configuration with sensible defaults."""

    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Steam Clone Platform")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    TOKEN_URL: str = os.getenv("TOKEN_URL", "/api/v1/users/login")

    ALLOWED_ORIGINS: List[str] = field(
        default_factory=lambda: _parse_allowed_origins(os.getenv("ALLOWED_ORIGINS"))
    )

    ONLINE_DATABASE_URL: str = os.getenv(
        "ONLINE_DATABASE_URL", "postgresql://user:password@localhost:5432/online_service"
    )
    ONLINE_SERVICE_PORT: int = int(os.getenv("ONLINE_SERVICE_PORT", "8007"))

    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    LOBBY_MAX_MEMBERS: int = int(os.getenv("LOBBY_MAX_MEMBERS", "8"))
    LOBBY_MESSAGE_HISTORY_LIMIT: int = int(os.getenv("LOBBY_MESSAGE_HISTORY_LIMIT", "50"))

    # ---------- KAFKA ----------
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    KAFKA_CLIENT_ID: str = os.getenv("KAFKA_CLIENT_ID", "steam-clone-online")
    KAFKA_ENABLED: bool = os.getenv("KAFKA_ENABLED", "false").lower() in {"1", "true", "yes"}
    KAFKA_ONLINE_TOPIC: str = os.getenv("KAFKA_ONLINE_TOPIC", "online-events")


settings = Settings()

