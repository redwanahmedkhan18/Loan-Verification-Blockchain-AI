# app/utils/files.py
import os
import re
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException

from ..config import settings

# allow simple nested subfolders like "profiles" or "profiles/2025"
_SAFE_SUBDIR_RE = re.compile(r"^[A-Za-z0-9_\-\/]+$")


def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _sanitize_subdir(s: str) -> str:
    s = (s or "uploads").strip().strip("/\\")
    if not s or ".." in s.split("/"):
        raise HTTPException(status_code=400, detail="Invalid subdir")
    if not _SAFE_SUBDIR_RE.match(s):
        raise HTTPException(status_code=400, detail="Invalid subdir")
    return s


def save_upload(file: UploadFile, subdir: str = "profiles") -> str:
    """
    Save an uploaded *image* to MEDIA_ROOT/subdir, streaming in chunks, enforcing size.
    Returns a POSIX-style relative path like 'profiles/<uuid>.ext' suitable to store in DB.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Image file is required")

    # Extension whitelist
    ext = os.path.splitext(file.filename)[1].lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext or 'unknown'}")

    # Where to save
    subdir = _sanitize_subdir(subdir)
    root = Path(settings.MEDIA_ROOT)
    rel_dir = Path(subdir)
    ensure_dir(root / rel_dir)

    # Unique name
    name = f"{uuid.uuid4().hex}{ext}"
    rel_path = rel_dir / name
    abs_path = root / rel_path

    # Limit & stream copy (default 5 MB if not set)
    limit_bytes = int(getattr(settings, "MAX_UPLOAD_MB", 5)) * 1024 * 1024
    total = 0

    try:
        with abs_path.open("wb") as out:
            while True:
                chunk = file.file.read(1024 * 1024)  # 1 MB
                if not chunk:
                    break
                total += len(chunk)
                if total > limit_bytes:
                    out.close()
                    abs_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large (> {getattr(settings, 'MAX_UPLOAD_MB', 5)} MB)",
                    )
                out.write(chunk)
    finally:
        # make sure temporary file handle is closed
        try:
            file.file.close()
        except Exception:
            pass

    # return POSIX-style relative path (store in DB)
    return str(rel_path).replace("\\", "/")


def file_url(rel_path: str) -> str:
    """
    Build a public URL (served by FastAPI's /media mount) from a stored relative path.
    """
    rel = str(rel_path).lstrip("/\\").replace("\\", "/")
    return f"/media/{rel}"
