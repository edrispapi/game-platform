"""Local storage helper for uploaded workshop files."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Tuple

from fastapi import UploadFile, HTTPException, status

from ..core.config import settings

# Allow common mod/asset types; extend as needed
ALLOWED_MIME_PREFIXES = (
    "image/",
    "application/zip",
    "application/x-zip-compressed",
    "application/x-tar",
    "application/x-7z-compressed",
)

# Fallback size cap in bytes
MAX_BYTES = settings.STORAGE_MAX_FILE_MB * 1024 * 1024


def ensure_storage_dir() -> Path:
    path = Path(settings.STORAGE_BASE_PATH)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _validate_upload(file: UploadFile) -> None:
    content_type = (file.content_type or "").lower()
    if not any(content_type.startswith(p) for p in ALLOWED_MIME_PREFIXES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{content_type or 'unknown'}' is not allowed.",
        )


async def persist_upload(file: UploadFile) -> Tuple[str, str, str]:
    """Persist UploadFile to local storage and return tuple(path, url, checksum)."""
    _validate_upload(file)
    storage_dir = ensure_storage_dir()
    chunk_size = 1024 * 1024
    digest = hashlib.sha256()
    file_path = storage_dir / file.filename
    idx = 1
    while file_path.exists():
        stem, suffix = os.path.splitext(file.filename)
        file_path = storage_dir / f"{stem}_{idx}{suffix}"
        idx += 1

    written = 0
    with file_path.open("wb") as buffer:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            written += len(chunk)
            if written > MAX_BYTES:
                await file.close()
                file_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File exceeds max size of {settings.STORAGE_MAX_FILE_MB} MB.",
                )
            digest.update(chunk)
            buffer.write(chunk)
    await file.close()
    checksum = digest.hexdigest()
    return str(file_path), f"file://{file_path}", checksum

