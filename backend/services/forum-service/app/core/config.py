"""Forum service configuration."""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from typing import List


def _parse_origins(raw: str | None) -> List[str]:
    if not raw:
        return ["http://localhost:3000", "http://127.0.0.1:3000"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


_IS_TESTING = (
    os.getenv("TESTING") == "true"
    or "pytest" in sys.modules
    or any("pytest" in arg.lower() for arg in sys.argv)
)


def _db_url(env_var: str, default: str, test_url: str | None = None) -> str:
    if _IS_TESTING and test_url:
        return test_url
    return os.getenv(env_var, default)


@dataclass(slots=True)
class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Steam Clone Platform")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")
    ALLOWED_ORIGINS: List[str] = field(
        default_factory=lambda: _parse_origins(os.getenv("ALLOWED_ORIGINS"))
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")

    FORUM_DATABASE_URL: str = _db_url(
        "FORUM_DATABASE_URL",
        "postgresql://user:password@localhost:5432/forum_service",
        "sqlite:///./test_forum.db",
    )
    FORUM_SERVICE_PORT: int = int(os.getenv("FORUM_SERVICE_PORT", "8015"))


settings = Settings()

