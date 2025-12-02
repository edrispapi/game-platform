"""Simple heuristic-based moderation helpers."""
from __future__ import annotations

import re
from typing import Iterable

from ..core.config import settings
from ..schemas import AutoModerationResult


def score_content(title: str, description: str, tags: Iterable[str] | None = None) -> AutoModerationResult:
    keywords = [kw.strip() for kw in settings.AUTO_REJECTED_KEYWORDS if kw.strip()]
    text = f"{title} {description} {' '.join(tags or [])}".lower()
    reasons: list[str] = []
    hits = 0
    for keyword in keywords:
        if not keyword:
            continue
        if re.search(rf"\b{re.escape(keyword)}\b", text):
            hits += 1
            reasons.append(f"Contains banned keyword '{keyword}'")
    length_penalty = 0.0
    if len(description) > 3500:
        length_penalty = 0.1
        reasons.append("Description is very long and may require manual review")

    score = max(0.0, 1.0 - (hits * 0.35) - length_penalty)
    flagged = score < settings.AUTO_APPROVAL_SCORE or bool(reasons)
    return AutoModerationResult(score=score, flagged=flagged, reasons=reasons)

