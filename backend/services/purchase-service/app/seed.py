"""Seed helper for the purchase service."""
from __future__ import annotations

import argparse
import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from . import models


def seed_purchases(target: int = 100) -> int:
    init_db()
    session: Session = SessionLocal()
    try:
        existing = session.query(models.Purchase).count()
        missing = max(0, target - existing)
        if missing == 0:
            return 0

        statuses = ["pending", "completed", "refunded"]
        for offset in range(missing):
            idx = existing + offset + 1
            purchase = models.Purchase(
                uuid=str(uuid.uuid4()),
                user_id=str((idx % 100) + 1),
                total_amount=Decimal(str(round(random.uniform(5, 120), 2))),
                currency="USD",
                status=random.choice(statuses),
                payment_method=random.choice(["card", "wallet", "gift-card"]),
                payment_id=f"PAY-{uuid.uuid4().hex[:12]}",
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 90)),
            )
            for _ in range(random.randint(1, 4)):
                purchase.items.append(
                    models.PurchaseItem(
                        game_id=str(random.randint(1, 200)),
                        game_name=f"Sample Game {random.randint(1, 200)}",
                        price=Decimal(str(round(random.uniform(4.99, 59.99), 2))),
                        quantity=random.randint(1, 3),
                    )
                )

            if purchase.status == "refunded":
                purchase.refunds.append(
                    models.Refund(
                        user_id=purchase.user_id,
                        amount=purchase.total_amount / 2,
                        reason="Sample auto-refund",
                        status="approved",
                        processed_at=datetime.utcnow(),
                    )
                )

            session.add(purchase)
            if (offset + 1) % 20 == 0:
                session.flush()

        session.commit()
        return missing
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the purchase service database with sample purchases."
    )
    parser.add_argument("--count", type=int, default=100)
    args = parser.parse_args()
    created = seed_purchases(args.count)
    print(f"Purchase service seed complete (inserted {created} purchases).")


if __name__ == "__main__":
    main()

