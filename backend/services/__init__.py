"""Namespace package exposing all microservices for Python imports."""
from __future__ import annotations

import sys
from pathlib import Path

__all__: list[str] = []

_legacy_root = Path(__file__).resolve().parent / "Moved to its own separate service"
if _legacy_root.exists():
    legacy_path = str(_legacy_root)
    if legacy_path not in sys.path:
        sys.path.append(legacy_path)
