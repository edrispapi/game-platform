from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import crud, models, schemas
from app.database import Base


def _db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestingSession()


def test_create_item_auto_flags_banned_keyword():
    db = _db()
    payload = schemas.WorkshopItemCreate(
        title="Ultra Hack Pack",
        description="A hack that should be flagged",
        tags=["fun"],
    )
    item = crud.create_item(db, user_id="user-1", payload=payload, file_meta=None)
    assert item.auto_flagged is True
    assert item.status == models.WorkshopItemStatus.PENDING


def test_vote_updates_aggregates():
    db = _db()
    payload = schemas.WorkshopItemCreate(
        title="Quality Mod",
        description="Clean description",
        tags=["quality"],
    )
    item = crud.create_item(db, user_id="user-2", payload=payload, file_meta=None)
    item = crud.add_vote(db, item, user_id="u1", is_upvote=True)
    assert item.votes_up == 1
    item = crud.add_vote(db, item, user_id="u1", is_upvote=False)
    assert item.votes_up == 0
    assert item.votes_down == 1

