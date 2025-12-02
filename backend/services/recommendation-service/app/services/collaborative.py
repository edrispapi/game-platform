"""Collaborative filtering utilities built on scikit-learn."""
from __future__ import annotations

import logging
import os
import pickle
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Iterable, List, Sequence, Tuple

import numpy as np
from scipy import sparse
from sklearn.decomposition import TruncatedSVD

from ..core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TrainingResult:
    interactions: int
    users: int
    games: int
    components: int
    trained_at: datetime


@dataclass
class _ModelState:
    user_index: Dict[str, int]
    game_index: Dict[str, int]
    user_factors: np.ndarray
    item_factors: np.ndarray
    game_popularity: List[Tuple[str, float]]
    trained_at: datetime = field(default_factory=datetime.utcnow)


class CollaborativeFilteringEngine:
    """Lightweight CF helper wrapping TruncatedSVD for implicit data."""

    def __init__(self, model_path: str):
        self.model_path = model_path
        self.state: _ModelState | None = None
        self._load_from_disk()

    # ------------------------- persistence ------------------------- #
    def _load_from_disk(self) -> None:
        if not self.model_path or not os.path.exists(self.model_path):
            return
        try:
            with open(self.model_path, "rb") as fh:
                self.state = pickle.load(fh)
            logger.info("Loaded collaborative model from %s", self.model_path)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Failed to load recommendation model: %s", exc)
            self.state = None

    def _persist(self) -> None:
        if not self.model_path:
            return
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, "wb") as fh:
            pickle.dump(self.state, fh)

    # ------------------------- training --------------------------- #
    def train(
        self,
        interactions: Sequence[Tuple[str, str, float]],
        *,
        min_interactions: int | None = None,
        n_components: int | None = None,
        persist: bool = True,
    ) -> TrainingResult:
        if not interactions:
            raise ValueError("No interactions supplied")

        min_required = min_interactions or settings.CF_MIN_INTERACTIONS
        if len(interactions) < max(2, min_required):
            raise ValueError("Not enough interactions to train the model")

        user_ids = sorted({u for u, _, _ in interactions})
        game_ids = sorted({g for _, g, _ in interactions})

        user_index = {user_id: idx for idx, user_id in enumerate(user_ids)}
        game_index = {game_id: idx for idx, game_id in enumerate(game_ids)}

        rows: List[int] = []
        cols: List[int] = []
        data: List[float] = []
        for user_id, game_id, score in interactions:
            rows.append(user_index[user_id])
            cols.append(game_index[game_id])
            data.append(max(score, 0.0))

        matrix = sparse.csr_matrix((data, (rows, cols)), shape=(len(user_ids), len(game_ids)))
        min_dim = min(matrix.shape)
        if min_dim < 2:
            raise ValueError("Insufficient dimensionality for SVD")

        components = n_components or settings.CF_N_COMPONENTS
        components = max(2, min(components, min_dim - 1))

        svd = TruncatedSVD(n_components=components, random_state=42)
        user_factors = svd.fit_transform(matrix)
        item_factors = svd.components_.T  # shape (games, k)

        game_popularity = self._compute_popularity(interactions)

        self.state = _ModelState(
            user_index=user_index,
            game_index=game_index,
            user_factors=user_factors,
            item_factors=item_factors,
            game_popularity=game_popularity,
            trained_at=datetime.utcnow(),
        )
        if persist:
            self._persist()
        return TrainingResult(
            interactions=len(interactions),
            users=len(user_ids),
            games=len(game_ids),
            components=components,
            trained_at=self.state.trained_at,
        )

    @staticmethod
    def _compute_popularity(interactions: Sequence[Tuple[str, str, float]]) -> List[Tuple[str, float]]:
        popularity: Dict[str, float] = {}
        for _, game_id, score in interactions:
            popularity[game_id] = popularity.get(game_id, 0.0) + score
        return sorted(popularity.items(), key=lambda item: item[1], reverse=True)

    # ------------------------- inference -------------------------- #
    def is_ready(self) -> bool:
        return self.state is not None

    def recommend(
        self,
        user_id: str,
        exclude_games: Iterable[str],
        *,
        limit: int = 20,
    ) -> List[Tuple[str, float]]:
        if not self.state:
            raise ValueError("Model is not trained")

        limit = max(1, min(limit, settings.CF_MAX_RECOMMENDATIONS))
        exclude = set(exclude_games)
        recommendations: List[Tuple[str, float]] = []

        if user_id in self.state.user_index:
            user_idx = self.state.user_index[user_id]
            user_vector = self.state.user_factors[user_idx]
            scores = self.state.item_factors @ user_vector
            game_ids = list(self.state.game_index.keys())
            scored = [
                (game_id, float(scores[self.state.game_index[game_id]]))
                for game_id in game_ids
                if game_id not in exclude
            ]
            scored.sort(key=lambda item: item[1], reverse=True)
            recommendations.extend(scored[:limit])

        if len(recommendations) < limit:
            for game_id, score in self.state.game_popularity:
                if game_id in exclude:
                    continue
                if any(rec[0] == game_id for rec in recommendations):
                    continue
                recommendations.append((game_id, score))
                if len(recommendations) >= limit:
                    break
        return recommendations[:limit]


cf_engine = CollaborativeFilteringEngine(settings.RECOMMENDATION_MODEL_PATH)

