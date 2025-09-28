# backend/app/routers/contact.py
from __future__ import annotations

from datetime import datetime
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, EmailStr, Field

from ..config import settings
from ..email import send_email

router = APIRouter()


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    message: str = Field(min_length=1, max_length=5000)


@router.post("/contact")
def submit_contact(payload: ContactIn, bg: BackgroundTasks):
    """Receive a contact message, save to disk, and email support (if configured)."""
    # Persist to disk under MEDIA_ROOT/contact_submissions/<uuid>.json
    base = Path(settings.MEDIA_ROOT)
    out_dir = base / "contact_submissions"
    out_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{uuid.uuid4().hex}.json"
    fpath = out_dir / fname

    doc = {
        "id": fname.removesuffix(".json"),
        "name": payload.name.strip(),
        "email": str(payload.email).strip().lower(),
        "message": payload.message.strip(),
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    try:
        fpath.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save message: {e}")

    # Email support (best-effort)
    to_addr = (
        getattr(settings, "SUPPORT_EMAIL", None)
        or getattr(settings, "ADMIN_EMAIL", None)
        or getattr(settings, "EMAIL_FROM", None)
    )
    if to_addr:
        subj = "New contact message — TrustEdge"
        html = (
            f"<h2>New Contact Message</h2>"
            f"<p><b>Name:</b> {doc['name']}</p>"
            f"<p><b>Email:</b> {doc['email']}</p>"
            f"<p><b>Time (UTC):</b> {doc['created_at']}</p>"
            f"<hr><pre style='white-space:pre-wrap;font-family:inherit'>{doc['message']}</pre>"
        )
        try:
            bg.add_task(send_email, to_addr, subj, html)
        except Exception:
            # ignore email issues; message is already recorded
            pass

    # Optional: acknowledgment email to the sender (best-effort)
    try:
        ack_html = (
            f"<p>Hi {doc['name']},</p>"
            f"<p>We received your message and will get back to you soon.</p>"
            f"<p>— TrustEdge Support</p>"
        )
        bg.add_task(send_email, doc["email"], "We received your message", ack_html)
    except Exception:
        pass

    return {"status": "ok", "id": doc["id"]}
