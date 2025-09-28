# backend/app/routers/staff.py
from __future__ import annotations

from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, EmailStr, Field

from .. import models
from ..security import get_db, require_role, hash_password
from ..config import settings
from ..email import send_email
from ..tokens import sign_email_token

router = APIRouter(prefix="/staff", tags=["staff"])


# ----------------------------
# Helpers
# ----------------------------
def _sanitize_user(u: models.User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
        "is_verified": u.is_verified,
        "created_at": u.created_at,
        "full_name": u.full_name,
        "phone": u.phone,
        "nid_number": u.nid_number,
        "address": u.address,
        "profile_image": u.profile_image,
    }


def _ensure_can_create(requestor_role: str, new_role: str) -> None:
    """
    Admin can create any role (borrower/officer/admin).
    Officer can create only borrower.
    """
    if requestor_role == "admin":
        return
    if requestor_role == "officer" and new_role == "borrower":
        return
    raise HTTPException(status_code=403, detail="Not allowed to create this role")


def _send_invite_email(bg: BackgroundTasks, email_norm: str, token: str) -> None:
    reset_url_root = str(settings.FRONTEND_URL).rstrip("/")
    reset_url = f"{reset_url_root}/reset?token={token}"
    html = (
        f"<h2>Welcome to TrustEdge</h2>"
        f"<p>An account has been created for you.</p>"
        f"<p>Please set your password here: <a href='{reset_url}'>{reset_url}</a></p>"
    )
    try:
        bg.add_task(send_email, email_norm, "Set your password", html)
    except Exception:
        # best-effort only
        pass


# ----------------------------
# Pydantic payloads (portable across v1/v2)
# ----------------------------
RoleLiteral = Literal["borrower", "officer", "admin"]


class StaffCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: RoleLiteral
    full_name: Optional[str] = None
    phone: Optional[str] = None
    nid_number: Optional[str] = None
    address: Optional[str] = None


class StaffPatch(BaseModel):
    role: Optional[RoleLiteral] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    nid_number: Optional[str] = None
    address: Optional[str] = None


# ----------------------------
# Unified Staff Management (admin/officer)
# ----------------------------
@router.get(
    "/users",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def list_users(
    role: Optional[str] = Query(None, description="borrower|officer|admin"),
    q: Optional[str] = Query(None, description="search email/full_name"),
    active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    actor=Depends(require_role("officer", "admin")),
):
    """
    Admin: list any role.
    Officer: may only list borrowers (if role not specified, returns borrowers; if specified and not borrower -> 403).
    """
    if actor.role == "officer" and role and role != "borrower":
        raise HTTPException(status_code=403, detail="Officers can list only borrowers")

    query = db.query(models.User)
    if actor.role == "officer" and not role:
        query = query.filter(models.User.role == "borrower")
    elif role:
        query = query.filter(models.User.role == role)

    if active is not None:
        query = query.filter(models.User.is_active == active)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.User.email.ilike(like),
                models.User.full_name.ilike(like),
            )
        )

    total = query.count()
    rows = (
        query.order_by(models.User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "items": [_sanitize_user(u) for u in rows]}


@router.post(
    "/users",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("officer", "admin"))],
)
def create_user(
    payload: StaffCreate,
    db: Session = Depends(get_db),
    actor=Depends(require_role("officer", "admin")),
    bg: BackgroundTasks = None,  # <-- no Depends(); FastAPI injects it
):
    """
    Admin: create borrower/officer/admin.
    Officer: create borrower only.
    Sends a password reset link to the new user.
    """
    _ensure_can_create(actor.role, payload.role)

    email_norm = payload.email.strip().lower()
    if db.query(models.User).filter(models.User.email == email_norm).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    user = models.User(
        email=email_norm,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_verified=False,
        is_active=True,
        full_name=(payload.full_name or "").strip() or None,
        phone=(payload.phone or "").strip() or None,
        nid_number=(payload.nid_number or "").strip() or None,
        address=(payload.address or "").strip() or None,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # invite (reset link)
    token = sign_email_token(email_norm, "reset-password", settings.RESET_TOKEN_EXPIRE_HOURS)
    user.reset_token = token
    user.reset_sent_at = datetime.utcnow()
    db.add(user)
    db.commit()

    if bg is not None:
        _send_invite_email(bg, email_norm, token)

    return _sanitize_user(user)


@router.get(
    "/users/{user_id}",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    actor=Depends(require_role("officer", "admin")),
):
    """
    Admin: view any user.
    Officer: can view borrowers only.
    """
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if actor.role == "officer" and u.role != "borrower":
        raise HTTPException(status_code=403, detail="Officers can only view borrowers")
    return _sanitize_user(u)


@router.get(
    "/users/{user_id}/overview",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def user_overview(
    user_id: int,
    db: Session = Depends(get_db),
    actor=Depends(require_role("officer", "admin")),
):
    """
    Expanded profile: user + applications + loans(+repayments).
    Officers restricted to borrowers.
    """
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if actor.role == "officer" and u.role != "borrower":
        raise HTTPException(status_code=403, detail="Officers can only view borrowers")

    apps = (
        db.query(models.LoanApplication)
        .filter(models.LoanApplication.borrower_id == u.id)
        .order_by(models.LoanApplication.created_at.desc())
        .all()
    )
    loans = (
        db.query(models.Loan)
        .filter(models.Loan.borrower_id == u.id)
        .order_by(models.Loan.created_at.desc())
        .all()
    )
    packed_loans = []
    for ln in loans:
        reps = (
            db.query(models.Repayment)
            .filter(models.Repayment.loan_id == ln.id)
            .order_by(models.Repayment.due_date.asc())
            .all()
        )
        packed_loans.append(
            {
                "loan": {
                    "id": ln.id,
                    "application_id": ln.application_id,
                    "principal": ln.principal,
                    "interest_rate": ln.interest_rate,
                    "duration_months": ln.duration_months,
                    "status": ln.status,
                    "created_at": ln.created_at,
                },
                "repayments": [
                    {
                        "id": r.id,
                        "due_date": r.due_date,
                        "amount_due": r.amount_due,
                        "amount_paid": r.amount_paid,
                        "paid_at": r.paid_at,
                        "status": r.status,
                        "receipt_path": r.receipt_path,
                    }
                    for r in reps
                ],
            }
        )

    return {
        "user": _sanitize_user(u),
        "applications": [
            {
                "id": a.id,
                "amount": a.amount,
                "term_months": a.term_months,
                "purpose": a.purpose,
                "region": a.region,
                "status": a.status,
                "ai_score": a.ai_score,
                "ai_risk_band": a.ai_risk_band,
                "risk_level": a.risk_level,
                "created_at": a.created_at,
            }
            for a in apps
        ],
        "loans": packed_loans,
    }


@router.patch(
    "/users/{user_id}",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def patch_user(
    user_id: int,
    patch: StaffPatch,
    db: Session = Depends(get_db),
    actor=Depends(require_role("officer", "admin")),
):
    """
    Admin: can change role, is_active, profile fields for any user.
    Officer: can update borrowers only; cannot change role (but can toggle is_active).
    """
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if actor.role == "officer":
        if u.role != "borrower":
            raise HTTPException(status_code=403, detail="Officers may only edit borrowers")
        if patch.role and patch.role != "borrower":
            raise HTTPException(status_code=403, detail="Officers cannot change roles")

    # Apply permitted fields
    if patch.role is not None and actor.role == "admin":
        u.role = patch.role
    if patch.is_active is not None:
        u.is_active = bool(patch.is_active)
    for k in ("full_name", "phone", "nid_number", "address"):
        v = getattr(patch, k)
        if v is not None:
            setattr(u, k, v.strip() or None)

    db.add(u)
    db.commit()
    db.refresh(u)
    return _sanitize_user(u)


# =================================================================
# Borrowers: list / create / view / update (kept for convenience)
# =================================================================
@router.get(
    "/borrowers",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def list_borrowers(
    q: str | None = Query(None, description="Search email/name/phone"),
    active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(models.User).filter(models.User.role == "borrower")
    if active is not None:
        query = query.filter(models.User.is_active == active)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.User.email.ilike(like),
                models.User.full_name.ilike(like),
                models.User.phone.ilike(like),
            )
        )
    total = query.count()
    rows = (
        query.order_by(models.User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "items": [_sanitize_user(u) for u in rows]}


@router.post(
    "/borrowers",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def create_borrower(
    email: str,
    full_name: str | None = None,
    phone: str | None = None,
    address: str | None = None,
    db: Session = Depends(get_db),
    bg: BackgroundTasks = None,  # <-- no Depends(); FastAPI injects it
):
    """
    Quick-create a borrower by email (sends reset link).
    Use /staff/users for a structured body that also allows officers/admins.
    """
    email_norm = (email or "").strip().lower()
    if not email_norm:
        raise HTTPException(status_code=400, detail="email is required")
    if db.query(models.User).filter(models.User.email == email_norm).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    temp_pw = f"temp-{int(datetime.utcnow().timestamp())}"
    user = models.User(
        email=email_norm,
        password_hash=hash_password(temp_pw),
        role="borrower",
        is_verified=False,
        is_active=True,
        full_name=(full_name or "").strip() or None,
        phone=(phone or "").strip() or None,
        address=(address or "").strip() or None,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = sign_email_token(email_norm, "reset-password", settings.RESET_TOKEN_EXPIRE_HOURS)
    user.reset_token = token
    user.reset_sent_at = datetime.utcnow()
    db.add(user)
    db.commit()

    if bg is not None:
        _send_invite_email(bg, email_norm, token)

    return _sanitize_user(user)


@router.get(
    "/borrowers/{borrower_id}",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def get_borrower(borrower_id: int, db: Session = Depends(get_db)):
    u = db.get(models.User, borrower_id)
    if not u or u.role != "borrower":
        raise HTTPException(status_code=404, detail="Borrower not found")
    return _sanitize_user(u)


@router.patch(
    "/borrowers/{borrower_id}",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def update_borrower(
    borrower_id: int,
    full_name: str | None = None,
    phone: str | None = None,
    address: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
):
    u = db.get(models.User, borrower_id)
    if not u or u.role != "borrower":
        raise HTTPException(status_code=404, detail="Borrower not found")

    if full_name is not None:
        u.full_name = full_name.strip() or None
    if phone is not None:
        u.phone = phone.strip() or None
    if address is not None:
        u.address = address.strip() or None
    if is_active is not None:
        u.is_active = bool(is_active)

    db.add(u)
    db.commit()
    db.refresh(u)
    return _sanitize_user(u)


# ----------------------------
# Borrower profile subresources
# ----------------------------
@router.get(
    "/borrowers/{borrower_id}/applications",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def borrower_applications(borrower_id: int, db: Session = Depends(get_db)):
    u = db.get(models.User, borrower_id)
    if not u or u.role != "borrower":
        raise HTTPException(status_code=404, detail="Borrower not found")
    apps = (
        db.query(models.LoanApplication)
        .filter(models.LoanApplication.borrower_id == borrower_id)
        .order_by(models.LoanApplication.id.desc())
        .all()
    )
    out = []
    for a in apps:
        out.append(
            {
                "id": a.id,
                "amount": a.amount,
                "term_months": a.term_months,
                "purpose": a.purpose,
                "region": a.region,
                "status": a.status,
                "ai_score": a.ai_score,
                "ai_risk_band": a.ai_risk_band,
                "risk_level": a.risk_level,
                "created_at": a.created_at,
            }
        )
    return out


@router.get(
    "/borrowers/{borrower_id}/loans",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def borrower_loans(borrower_id: int, db: Session = Depends(get_db)):
    u = db.get(models.User, borrower_id)
    if not u or u.role != "borrower":
        raise HTTPException(status_code=404, detail="Borrower not found")

    loans = (
        db.query(models.Loan)
        .filter(models.Loan.borrower_id == borrower_id)
        .order_by(models.Loan.id.desc())
        .all()
    )
    out = []
    for ln in loans:
        reps = (
            db.query(models.Repayment)
            .filter(models.Repayment.loan_id == ln.id)
            .order_by(models.Repayment.due_date.asc())
            .all()
        )
        out.append(
            {
                "loan": {
                    "id": ln.id,
                    "application_id": ln.application_id,
                    "principal": ln.principal,
                    "interest_rate": ln.interest_rate,
                    "duration_months": ln.duration_months,
                    "status": ln.status,
                    "created_at": ln.created_at,
                },
                "repayments": [
                    {
                        "id": r.id,
                        "due_date": r.due_date,
                        "amount_due": r.amount_due,
                        "amount_paid": r.amount_paid,
                        "paid_at": r.paid_at,
                        "status": r.status,
                        "receipt_path": r.receipt_path,
                    }
                    for r in reps
                ],
            }
        )
    return out


@router.get(
    "/borrowers/{borrower_id}/payments",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def borrower_payments(borrower_id: int, db: Session = Depends(get_db)):
    u = db.get(models.User, borrower_id)
    if not u or u.role != "borrower":
        raise HTTPException(status_code=404, detail="Borrower not found")
    pays = (
        db.query(models.Payment)
        .filter(models.Payment.borrower_id == borrower_id)
        .order_by(models.Payment.created_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "loan_id": p.loan_id,
            "repayment_id": p.repayment_id,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "payment_intent_id": p.payment_intent_id,
            "created_at": p.created_at,
            "authorized_at": p.authorized_at,
            "captured_at": p.captured_at,
            "canceled_at": p.canceled_at,
        }
        for p in pays
    ]


@router.get(
    "/borrowers/{borrower_id}/kyc",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def borrower_kyc(borrower_id: int, db: Session = Depends(get_db)):
    u = db.get(models.User, borrower_id)
    if not u or u.role != "borrower":
        raise HTTPException(status_code=404, detail="Borrower not found")
    docs = (
        db.query(models.Document)
        .filter(models.Document.user_id == borrower_id)
        .order_by(models.Document.uploaded_at.desc())
        .all()
    )
    return [
        {
            "id": d.id,
            "doc_type": d.doc_type,
            "filename": d.filename,
            "status": d.status,
            "ipfs_hash": d.ipfs_hash,
            "meta": d.meta,
            "uploaded_at": d.uploaded_at,
            "application_id": d.application_id,
        }
        for d in docs
    ]


# ----------------------------
# KYC queue & update
# ----------------------------
@router.get(
    "/kyc/queue",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def kyc_queue(status: str = Query("Pending"), db: Session = Depends(get_db)):
    q = db.query(models.Document)
    if status:
        q = q.filter(models.Document.status == status)
    q = q.order_by(models.Document.uploaded_at.desc())
    docs = q.all()
    out = []
    for d in docs:
        borrower = db.get(models.User, d.user_id)
        out.append(
            {
                "id": d.id,
                "borrower_email": borrower.email if borrower else None,
                "user_id": d.user_id,
                "doc_type": d.doc_type,
                "filename": d.filename,
                "status": d.status,
                "uploaded_at": d.uploaded_at,
                "application_id": d.application_id,
                "meta": d.meta,
            }
        )
    return out


@router.patch(
    "/kyc/{doc_id}",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def kyc_update(
    doc_id: int,
    status: str = Query(..., description="Pending|Verified|Rejected"),
    note: str | None = None,
    db: Session = Depends(get_db),
):
    if status not in {"Pending", "Verified", "Rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status. Use Pending, Verified, or Rejected.")
    d = db.get(models.Document, doc_id)
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    d.status = status
    meta = dict(d.meta or {})
    if note:
        meta["note"] = note
    d.meta = meta
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id, "status": d.status, "meta": d.meta}
