"""Utilities to fetch lightweight user profile snapshots."""
from __future__ import annotations

import logging
from typing import Dict, List

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)


def fetch_user_profile(user_id: str) -> Dict[str, str] | None:
    base_url = settings.USER_SERVICE_URL.rstrip("/")
    url = f"{base_url}/api/v1/users/users/{user_id}"
    try:
        with httpx.Client(timeout=3.0) as client:
            response = client.get(url)
            if response.status_code != 200:
                return None
            data = response.json()
            return {
                "username": data.get("username"),
                "display_name": data.get("display_name") or data.get("full_name"),
            }
    except httpx.HTTPError as exc:  # pragma: no cover - defensive
        logger.warning("Failed to fetch user profile %s: %s", user_id, exc)
        return None


def fetch_profiles(user_ids: List[str]) -> Dict[str, Dict[str, str]]:
    """Fetch multiple profiles sequentially (small N)."""
    profiles: Dict[str, Dict[str, str]] = {}
    for user_id in user_ids:
        data = fetch_user_profile(user_id)
        if data:
            profiles[user_id] = data
    return profiles

