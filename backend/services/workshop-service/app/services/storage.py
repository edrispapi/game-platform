"""Local storage helper for uploaded workshop files."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Tuple

from fastapi import UploadFile

from ..core.config import settings


def ensure_storage_dir() -> Path:
    path = Path(settings.STORAGE_BASE_PATH)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def persist_upload(file: UploadFile) -> Tuple[str, str, str]:
    """Persist UploadFile to local storage and return tuple(path, url, checksum)."""
    storage_dir = ensure_storage_dir()
    chunk_size = 1024 * 1024
    digest = hashlib.sha256()
    file_path = storage_dir / file.filename
    idx = 1
    while file_path.exists():
        stem, suffix = os.path.splitext(file.filename)
        file_path = storage_dir / f"{stem}_{idx}{suffix}"
        idx += 1

    with file_path.open("wb") as buffer:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
            buffer.write(chunk)
    await file.close()
    checksum = digest.hexdigest()
    return str(file_path), f"file://{file_path}", checksum

