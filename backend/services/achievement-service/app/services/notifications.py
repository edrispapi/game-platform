"""Thin HTTP client for the notification service."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)


def send_notification(
    user_id: str,
    title: str,
    message: str,
    category: str = "achievement",
    priority: str = "normal",
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Best-effort fire-and-forget notification."""
    base_url = settings.NOTIFICATION_SERVICE_URL.rstrip("/")
    url = f"{base_url}/"
    payload = {
        "user_id": str(user_id),
        "title": title,
        "message": message,
        "category": category,
        "priority": priority,
        "metadata": metadata or {},
    }
    try:
        with httpx.Client(timeout=3.0) as client:
            response = client.post(url, json=payload)
            if response.status_code >= 400:
                logger.warning(
                    "Notification service responded with %s: %s",
                    response.status_code,
                    response.text,
                )
    except httpx.HTTPError as exc:  # pragma: no cover - network failure
        logger.error("Failed to send notification: %s", exc)

