"""Seed helper for online service presence/messages."""
from __future__ import annotations

import argparse
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from . import models

STATUSES = ["online", "offline", "away", "in-game"]
PLATFORMS = ["desktop", "mobile", "steamdeck"]


def seed_presence(target: int = 100) -> int:
    init_db()
    session: Session = SessionLocal()
    try:
        existing = session.query(models.UserPresence).count()
        missing = max(0, target - existing)
        if missing == 0:
            return 0

        for offset in range(missing):
            idx = existing + offset + 1
            presence = models.UserPresence(
                user_id=str(idx),
                status=random.choice(STATUSES),
                platform=random.choice(PLATFORMS),
                activity=random.choice(
                    ["Browsing store", "In lobby", "Playing ranked", "Idle"]
                ),
                region=random.choice(["NA", "EU", "APAC", "SA"]),
                last_seen=datetime.utcnow() - timedelta(minutes=random.randint(0, 120)),
                updated_at=datetime.utcnow(),
                extra_metadata={"party_size": random.randint(1, 4)},
            )
            session.add(presence)
            if (offset + 1) % 25 == 0:
                session.flush()

        session.commit()
        return missing
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the online service with presence records."
    )
    parser.add_argument("--count", type=int, default=100)
    args = parser.parse_args()
    created = seed_presence(args.count)
    print(f"Online service seed complete (inserted {created} presence rows).")


if __name__ == "__main__":
    main()

