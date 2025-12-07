"""Seed helper for the payment service."""
from __future__ import annotations

import argparse
import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from . import models


def seed_payments(target: int = 100) -> int:
    init_db()
    session: Session = SessionLocal()
    try:
        existing = session.query(models.PaymentIntent).count()
        missing = max(0, target - existing)
        if missing == 0:
            return 0

        statuses = ["requires_method", "processing", "succeeded", "cancelled"]
        for offset in range(missing):
            idx = existing + offset + 1
            intent = models.PaymentIntent(
                uuid=str(uuid.uuid4()),
                purchase_id=random.randint(1, 500),
                user_id=str((idx % 100) + 1),
                amount=Decimal(str(round(random.uniform(5, 120), 2))),
                currency="USD",
                status=random.choice(statuses),
                provider=random.choice(["test-gateway", "stripe-mock"]),
                client_secret=f"secret_{uuid.uuid4().hex}",
                expires_at=datetime.utcnow() + timedelta(hours=1),
            )
            if intent.status == "succeeded":
                intent.charges.append(
                    models.PaymentCharge(
                        provider_charge_id=f"ch_{uuid.uuid4().hex[:16]}",
                        amount=intent.amount,
                        status="succeeded",
                    )
                )
            session.add(intent)
            if (offset + 1) % 25 == 0:
                session.flush()

        session.commit()
        return missing
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the payment service database with sample payment intents."
    )
    parser.add_argument("--count", type=int, default=100)
    args = parser.parse_args()
    created = seed_payments(args.count)
    print(f"Payment service seed complete (inserted {created} intents).")


if __name__ == "__main__":
    main()

