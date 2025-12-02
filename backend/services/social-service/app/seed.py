"""Seed helper for the social service."""
from __future__ import annotations

import argparse
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from . import models


def seed_social(target: int = 100) -> int:
    """Populate friend requests and friendships."""
    init_db()
    session: Session = SessionLocal()
    try:
        existing = session.query(models.FriendRequest).count()
        missing = max(0, target - existing)
        if missing == 0:
            return 0

        for offset in range(missing):
            idx = existing + offset + 1
            requester = str(random.randint(1, 200))
            receiver = str(random.randint(1, 200))
            if requester == receiver:
                receiver = str((int(receiver) % 200) + 1)
            fr = models.FriendRequest(
                id=str(uuid.uuid4()),
                requester_id=requester,
                receiver_id=receiver,
                message=f"Let's connect in game #{idx}!",
                status=random.choice(
                    list(models.FriendRequestStatus)  # type: ignore[arg-type]
                ),
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60)),
            )
            session.add(fr)

            if random.random() > 0.5:
                friendship = models.Friendship(
                    id=str(uuid.uuid4()),
                    user_id=requester,
                    friend_id=receiver,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60)),
                )
                session.add(friendship)

            if (offset + 1) % 25 == 0:
                session.flush()

        session.commit()
        return missing
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the social service with friend requests."
    )
    parser.add_argument("--count", type=int, default=100)
    args = parser.parse_args()
    created = seed_social(args.count)
    print(f"Social service seed complete (inserted {created} friend requests).")


if __name__ == "__main__":
    main()

