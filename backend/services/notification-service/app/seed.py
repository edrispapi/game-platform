"""Seed helper for the notification service."""
from __future__ import annotations

import argparse
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from . import models

CATEGORIES = ["purchase", "friend_request", "achievement", "system"]
PRIORITIES = ["low", "normal", "high", "urgent"]


def seed_notifications(target: int = 100) -> int:
    init_db()
    session: Session = SessionLocal()
    try:
        existing = session.query(models.Notification).count()
        missing = max(0, target - existing)
        if missing == 0:
            return 0

        for offset in range(missing):
            idx = existing + offset + 1
            notification = models.Notification(
                user_id=str((idx % 100) + 1),
                message=f"Sample notification #{idx}",
                category=random.choice(CATEGORIES),
                priority=random.choice(PRIORITIES),
                is_read=random.random() > 0.8,
                extra_metadata='{"source": "seed"}',
                created_at=datetime.utcnow() - timedelta(hours=random.randint(0, 72)),
            )
            session.add(notification)
            if (offset + 1) % 25 == 0:
                session.flush()

        session.commit()
        return missing
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the notification service database."
    )
    parser.add_argument("--count", type=int, default=100)
    args = parser.parse_args()
    created = seed_notifications(args.count)
    print(f"Notification service seed complete (inserted {created} rows).")


if __name__ == "__main__":
    main()

