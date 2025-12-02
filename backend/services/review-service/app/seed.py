"""Seed utility for the review service."""
from __future__ import annotations

import argparse
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .database import SessionLocal, Base, engine  # type: ignore[attr-defined]
from . import models


def seed_reviews(target: int = 100) -> int:
    Base.metadata.create_all(bind=engine)
    session: Session = SessionLocal()
    try:
        existing = session.query(models.Review).count()
        missing = max(0, target - existing)
        if missing == 0:
            return 0

        for offset in range(missing):
            idx = existing + offset + 1
            review = models.Review(
                uuid=str(uuid.uuid4()),
                user_id=str((idx % 100) + 1),
                game_id=str((idx % 100) + 1),
                review_type=random.choice(
                    [choice.value for choice in models.ReviewType]
                ),
                title=f"Review headline #{idx}",
                content=f"This is the detailed review body for review #{idx}.",
                rating=random.randint(1, 5),
                is_positive=random.random() > 0.3,
                language=random.choice(["en", "es", "de", "fr"]),
                playtime_at_review=random.randint(0, 500),
                is_early_access=random.random() > 0.7,
                status=random.choice(
                    [choice.value for choice in models.ReviewStatus]
                ),
                helpful_votes=random.randint(0, 250),
                unhelpful_votes=random.randint(0, 50),
                total_votes=random.randint(0, 300),
                is_flagged=random.random() > 0.95,
                flag_reason=None,
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 365)),
            )
            session.add(review)
            if (offset + 1) % 25 == 0:
                session.flush()

        session.commit()
        return missing
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the review service database with sample reviews."
    )
    parser.add_argument("--count", type=int, default=100)
    args = parser.parse_args()
    created = seed_reviews(args.count)
    print(f"Review service seed complete (inserted {created} rows).")


if __name__ == "__main__":
    main()

