"""Service configuration for the game catalog microservice."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List


def _parse_origins(raw: str | None) -> List[str]:
    if not raw:
        return ["http://localhost", "http://localhost:3000"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass(slots=True)
class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Game Catalog Service")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1/catalog")
    GAME_CATALOG_DATABASE_URL: str = os.getenv(
        "GAME_CATALOG_DATABASE_URL",
        "postgresql://user:password@postgres:5432/game_catalog_service",
    )
    GAME_CATALOG_SERVICE_PORT: int = int(
        os.getenv("GAME_CATALOG_SERVICE_PORT", "8002")
    )
    ALLOWED_ORIGINS: List[str] = field(
        default_factory=lambda: _parse_origins(os.getenv("ALLOWED_ORIGINS"))
    )


settings = Settings()


