from __future__ import annotations

from app.services.collaborative import CollaborativeFilteringEngine


def test_engine_trains_and_recommends(tmp_path):
    model_path = tmp_path / "cf.pkl"
    engine = CollaborativeFilteringEngine(str(model_path))
    interactions = [
        ("u1", "g1", 5.0),
        ("u1", "g2", 3.0),
        ("u2", "g2", 4.0),
        ("u2", "g3", 5.0),
        ("u3", "g1", 4.0),
        ("u3", "g3", 2.0),
    ]
    result = engine.train(interactions, n_components=2, persist=False)
    assert result.users == 3
    assert result.games == 3
    assert engine.is_ready()

    recs = engine.recommend("u1", exclude_games={"g1", "g2"}, limit=1)
    assert len(recs) == 1
    assert recs[0][0] == "g3"

