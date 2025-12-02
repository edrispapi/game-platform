"""Seed helper for the recommendation service."""
from __future__ import annotations

import argparse
import random

from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from . import models


def seed_recommendations(target: int = 100) -> int:
    init_db()
    session: Session = SessionLocal()
    try:
        existing = session.query(models.Recommendation).count()
        missing = max(0, target - existing)
        if missing == 0:
            return 0

        for offset in range(missing):
            idx = existing + offset + 1
            recommendation = models.Recommendation(
                user_id=str((idx % 100) + 1),
                game_id=str((idx % 200) + 1),
                score=round(random.uniform(0.2, 0.99), 3),
                rank=(idx % 20) + 1,
                algorithm=random.choice(["collaborative", "content-based", "hybrid"]),
                reason="Sample seed recommendation",
                context={"similar_users": random.randint(1, 50)},
                is_active=True,
            )
            session.add(recommendation)

            recommendation.feedback_entries.append(
                models.RecommendationFeedback(
                    user_id=recommendation.user_id,
                    game_id=recommendation.game_id,
                    action=random.choice(["clicked", "wishlisted", "ignored"]),
                    details={"source": "seed"},
                )
            )

            if (offset + 1) % 25 == 0:
                session.flush()

        session.commit()
        return missing
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the recommendation service database."
    )
    parser.add_argument("--count", type=int, default=100)
    args = parser.parse_args()
    created = seed_recommendations(args.count)
    print(f"Recommendation service seed complete (inserted {created} rows).")


if __name__ == "__main__":
    main()

