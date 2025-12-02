"""
Lightweight event publishing helper used when Kafka is unavailable locally.

The original architecture expected a shared package that wrapped Kafka.
For local development and automated tests we only need a best-effort logger
so services can continue to run without the Kafka dependency.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict

logger = logging.getLogger("event_bus")


def publish_event(topic: str, payload: Dict[str, Any]) -> None:
    """Log the event payload instead of publishing to Kafka."""
    if not topic:
        logger.debug("Skipping event publish because topic is empty")
        return

    event = {
        "topic": topic,
        "payload": payload,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    logger.info("Event emitted: %s", json.dumps(event, default=str))

