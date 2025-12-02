"""
Service-local configuration utilities.

This module replaces the previous `shared.config` so each service can determine
its runtime settings without importing from a global package.
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


def _db_url(
    env_var: str,
    default: str,
    *,
    legacy_env: str | None = None,
) -> str:
    """Resolve a service database URL with fallbacks."""
    return (
        os.getenv(env_var)
        or (os.getenv(legacy_env) if legacy_env else None)
        or default
    )


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

    # ---------- DATABASE URLS ----------
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://user:password@localhost:5432/shared"
    )

    USER_DATABASE_URL: str = _db_url(
        "USER_DATABASE_URL",
        "postgresql://user:password@localhost:5432/user_service",
        legacy_env="USER_SERVICE_DATABASE_URL",
    )
    USER_SERVICE_PORT: int = int(os.getenv("USER_SERVICE_PORT", "8001"))

    SOCIAL_DATABASE_URL: str = _db_url(
        "SOCIAL_DATABASE_URL",
        "postgresql://user:password@localhost:5432/social_service",
        legacy_env="SOCIAL_SERVICE_DATABASE_URL",
    )
    SOCIAL_SERVICE_PORT: int = int(os.getenv("SOCIAL_SERVICE_PORT", "8008"))

    SHOPPING_DATABASE_URL: str = _db_url(
        "SHOPPING_DATABASE_URL",
        "postgresql://user:password@localhost:5432/shopping_service",
        legacy_env="SHOPPING_SERVICE_DATABASE_URL",
    )
    SHOPPING_SERVICE_PORT: int = int(os.getenv("SHOPPING_SERVICE_PORT", "8004"))

    REVIEW_DATABASE_URL: str = _db_url(
        "REVIEW_DATABASE_URL",
        "postgresql://user:password@localhost:5432/review_service",
        legacy_env="REVIEW_SERVICE_DATABASE_URL",
    )
    REVIEW_SERVICE_PORT: int = int(os.getenv("REVIEW_SERVICE_PORT", "8003"))

    RECOMMENDATION_DATABASE_URL: str = _db_url(
        "RECOMMENDATION_DATABASE_URL",
        "postgresql://user:password@localhost:5432/recommendation_service",
        legacy_env="RECOMMENDATION_SERVICE_DATABASE_URL",
    )
    RECOMMENDATION_SERVICE_PORT: int = int(os.getenv("RECOMMENDATION_SERVICE_PORT", "8010"))

    PURCHASE_DATABASE_URL: str = _db_url(
        "PURCHASE_DATABASE_URL",
        "postgresql://user:password@localhost:5432/purchase_service",
        legacy_env="PURCHASE_SERVICE_DATABASE_URL",
    )
    PURCHASE_SERVICE_PORT: int = int(os.getenv("PURCHASE_SERVICE_PORT", "8005"))

    PAYMENT_DATABASE_URL: str = _db_url(
        "PAYMENT_DATABASE_URL",
        "postgresql://user:password@localhost:5432/payment_service",
        legacy_env="PAYMENT_SERVICE_DATABASE_URL",
    )
    PAYMENT_SERVICE_PORT: int = int(os.getenv("PAYMENT_SERVICE_PORT", "8006"))

    ONLINE_DATABASE_URL: str = _db_url(
        "ONLINE_DATABASE_URL",
        "postgresql://user:password@localhost:5432/online_service",
        legacy_env="ONLINE_SERVICE_DATABASE_URL",
    )
    ONLINE_SERVICE_PORT: int = int(os.getenv("ONLINE_SERVICE_PORT", "8007"))

    NOTIFICATION_DATABASE_URL: str = _db_url(
        "NOTIFICATION_DATABASE_URL",
        "postgresql://user:password@localhost:5432/notification_service",
        legacy_env="NOTIFICATION_SERVICE_DATABASE_URL",
    )
    NOTIFICATION_SERVICE_PORT: int = int(os.getenv("NOTIFICATION_SERVICE_PORT", "8009"))

    ACHIEVEMENT_DATABASE_URL: str = _db_url(
        "ACHIEVEMENT_DATABASE_URL",
        "postgresql://user:password@localhost:5432/achievement_service",
        legacy_env="ACHIEVEMENT_SERVICE_DATABASE_URL",
    )
    ACHIEVEMENT_SERVICE_PORT: int = int(os.getenv("ACHIEVEMENT_SERVICE_PORT", "8011"))

    MONITORING_DATABASE_URL: str = _db_url(
        "MONITORING_DATABASE_URL",
        "postgresql://user:password@localhost:5432/monitoring_service",
        legacy_env="MONITORING_SERVICE_DATABASE_URL",
    )
    MONITORING_SERVICE_PORT: int = int(os.getenv("MONITORING_SERVICE_PORT", "8012"))

    # ---------- KAFKA ----------
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    KAFKA_CLIENT_ID: str = os.getenv("KAFKA_CLIENT_ID", "steam-clone-api")
    KAFKA_ENABLED: bool = os.getenv("KAFKA_ENABLED", "false").lower() in {"1", "true", "yes"}

    KAFKA_SOCIAL_TOPIC: str = os.getenv("KAFKA_SOCIAL_TOPIC", "social-events")
    KAFKA_SHOPPING_TOPIC: str = os.getenv("KAFKA_SHOPPING_TOPIC", "shopping-events")
    KAFKA_REVIEW_TOPIC: str = os.getenv("KAFKA_REVIEW_TOPIC", "review-events")
    KAFKA_RECOMMENDATION_TOPIC: str = os.getenv("KAFKA_RECOMMENDATION_TOPIC", "recommendation-events")
    KAFKA_PURCHASE_TOPIC: str = os.getenv("KAFKA_PURCHASE_TOPIC", "purchase-events")
    KAFKA_PAYMENT_TOPIC: str = os.getenv("KAFKA_PAYMENT_TOPIC", "payment-events")
    KAFKA_ONLINE_TOPIC: str = os.getenv("KAFKA_ONLINE_TOPIC", "online-events")
    KAFKA_NOTIFICATION_TOPIC: str = os.getenv("KAFKA_NOTIFICATION_TOPIC", "notification-events")
    KAFKA_ACHIEVEMENT_TOPIC: str = os.getenv("KAFKA_ACHIEVEMENT_TOPIC", "achievement-events")
    KAFKA_MONITORING_TOPIC: str = os.getenv("KAFKA_MONITORING_TOPIC", "monitoring-events")


settings = Settings()

