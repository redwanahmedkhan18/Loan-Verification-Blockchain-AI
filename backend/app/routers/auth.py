# backend/app/routers/auth.py
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    BackgroundTasks,
    status,
    Form,
    File,
    UploadFile,
    Query,
)
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from .. import schemas, models
from ..security import get_db, hash_password, verify_password, create_token, get_current_user
from ..config import settings
from ..email import send_email
from ..tokens import sign_email_token, verify_email_token
from ..utils.files import save_upload

# Google ID token verification
from google.oauth2 import id_token as g_id_token
from google.auth.transport import requests as g_requests

router = APIRouter()

VERIFY_SALT = "verify-email"
RESET_SALT = "reset-password"


# ---------- Local request models ----------
class EmailIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str


class GoogleIdTokenIn(BaseModel):
    id_token: str


# ---------- REGISTER (multipart) ----------
@router.post("/register", response_model=schemas.UserOut)
def register(
    # account
    email: EmailStr = Form(...),
    password: str = Form(...),
    role: str = Form("borrower"),
    # profile
    full_name: str = Form(...),
    phone: str = Form(...),
    nid_number: str = Form(...),
    address: str = Form(...),
    # photo (REQUIRED)
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    bg: BackgroundTasks = None,
):
    """
    Public registration is restricted to BORROWERS only.
    Creates account with profile fields + required photo, then sends verification email.
    """
    email_norm = email.strip().lower()

    if db.query(models.User).filter(models.User.email == email_norm).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Enforce borrower-only public signup
    role_norm = (role or "borrower").strip().lower()
    if role_norm != "borrower":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public sign-up is only available for borrowers.",
        )
    role_norm = "borrower"

    # Save required profile image
    profile_rel = save_upload(photo, "profiles")

    user = models.User(
        email=email_norm,
        password_hash=hash_password(password),
        role=role_norm,
        is_verified=False,
        full_name=full_name.strip(),
        phone=phone.strip(),
        nid_number=nid_number.strip(),
        address=address.strip(),
        profile_image=profile_rel,
    )

    token = sign_email_token(email_norm, VERIFY_SALT, settings.EMAIL_TOKEN_EXPIRE_HOURS)
    user.verify_token = token
    user.verify_sent_at = datetime.utcnow()

    db.add(user)
    db.commit()
    db.refresh(user)

    # Build verify link (cast AnyHttpUrl -> str before rstrip)
    base_front = str(settings.FRONTEND_URL).rstrip("/")
    verify_url = f"{base_front}/verify?token={token}"
    html = (
        "<h2>Verify your email</h2>"
        "<p>Welcome to TrustEdge! Click the link to verify your email:</p>"
        f'<p><a href="{verify_url}">{verify_url}</a></p>'
        f"<p>This link expires in {settings.EMAIL_TOKEN_EXPIRE_HOURS} hours.</p>"
    )
    if bg:
        bg.add_task(send_email, email_norm, "Verify your email", html)
    else:
        send_email(email_norm, "Verify your email", html)

    return user


# ---------- LOGIN ----------
@router.post("/login", response_model=schemas.Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    as_role: str | None = Query(None, regex="^(borrower|officer|admin)$"),
    db: Session = Depends(get_db),
):
    """
    Username/password login with optional ?as_role=borrower|officer|admin.
    If as_role is set and doesn't match the account's role -> 403.
    """
    email = (form.username or "").strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if settings.AUTH_REQUIRE_VERIFIED and not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in.",
        )

    # 🔒 Role guard
    if as_role and user.role != as_role:
        raise HTTPException(
            status_code=403,
            detail=f"Role mismatch: your account role is '{user.role}'. You cannot sign in as '{as_role}'.",
        )

    return schemas.Token(access_token=create_token(user))


# ---------- CURRENT USER ----------
@router.get("/me", response_model=schemas.UserOut)
def me(user=Depends(get_current_user)):
    return user


# ---------- EMAIL VERIFICATION ----------
@router.get("/verify")
def verify(token: str, db: Session = Depends(get_db)):
    try:
        email = verify_email_token(token, VERIFY_SALT, settings.EMAIL_TOKEN_EXPIRE_HOURS)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not user.verify_token or user.verify_token != token:
        raise HTTPException(status_code=400, detail="Invalid or already used token")

    user.is_verified = True
    user.verify_token = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"status": "verified", "email": user.email}


@router.post("/resend-verification")
def resend_verification(
    payload: EmailIn,
    db: Session = Depends(get_db),
    bg: BackgroundTasks = None,
):
    email = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return {"status": "ok"}
    if user.is_verified:
        return {"status": "already_verified"}

    token = sign_email_token(email, VERIFY_SALT, settings.EMAIL_TOKEN_EXPIRE_HOURS)
    user.verify_token = token
    user.verify_sent_at = datetime.utcnow()
    db.add(user)
    db.commit()

    base_front = str(settings.FRONTEND_URL).rstrip("/")
    verify_url = f"{base_front}/verify?token={token}"
    html = (
        "<h2>Verify your email</h2>"
        "<p>Click the link to verify your email:</p>"
        f'<p><a href="{verify_url}">{verify_url}</a></p>'
    )
    if bg:
        bg.add_task(send_email, email, "Verify your email", html)
    else:
        send_email(email, "Verify your email", html)
    return {"status": "sent"}


# ---------- FORGOT / RESET ----------
@router.post("/forgot-password")
def forgot_password(
    payload: EmailIn,
    db: Session = Depends(get_db),
    bg: BackgroundTasks = None,
):
    email = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        token = sign_email_token(email, RESET_SALT, settings.RESET_TOKEN_EXPIRE_HOURS)
        user.reset_token = token
        user.reset_sent_at = datetime.utcnow()
        db.add(user)
        db.commit()

        base_front = str(settings.FRONTEND_URL).rstrip("/")
        reset_url = f"{base_front}/reset?token={token}"
        html = (
            "<h2>Reset your password</h2>"
            f"<p>Click the link below to choose a new password. "
            f"This link expires in {settings.RESET_TOKEN_EXPIRE_HOURS} hours.</p>"
            f'<p><a href="{reset_url}">{reset_url}</a></p>'
        )
        if bg:
            bg.add_task(send_email, email, "Password reset", html)
        else:
            send_email(email, "Password reset", html)

    return {"status": "ok"}


@router.post("/reset-password")
def reset_password(payload: ResetIn, db: Session = Depends(get_db)):
    if not payload.token or not payload.new_password:
        raise HTTPException(status_code=400, detail="token and new_password required")

    try:
        email = verify_email_token(payload.token, RESET_SALT, settings.RESET_TOKEN_EXPIRE_HOURS)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not user.reset_token or user.reset_token != payload.token:
        raise HTTPException(status_code=400, detail="Invalid or already used token")

    user.password_hash = hash_password(payload.new_password)
    user.reset_token = None
    db.add(user)
    db.commit()
    return {"status": "password_changed"}


# ---------- GOOGLE SIGN-IN ----------
@router.post("/google", response_model=schemas.Token)
def google_login(
    payload: GoogleIdTokenIn,
    as_role: str | None = Query(None, regex="^(borrower|officer|admin)$"),
    db: Session = Depends(get_db),
):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Sign-In not configured")

    try:
        info = g_id_token.verify_oauth2_token(
            payload.id_token,
            g_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
        iss = info.get("iss")
        allowed_issuers = set(
            getattr(settings, "GOOGLE_ALLOWED_ISSUERS", ["accounts.google.com", "https://accounts.google.com"])
        )
        if iss not in allowed_issuers:
            raise ValueError(f"Invalid issuer: {iss}")

        email = (info.get("email") or "").lower().strip()
        sub = info.get("sub")
        email_verified = bool(info.get("email_verified", False))
        if not email or not sub:
            raise ValueError("Missing email or sub in Google token")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google token: {e}")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # New users created via Google default to borrower
        user = models.User(
            email=email,
            password_hash=hash_password(sub + settings.JWT_SECRET),  # dummy/opaque
            role="borrower",
            is_verified=True if email_verified else True,
            oauth_provider="google",
            oauth_sub=sub,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Link oauth if not set
        if not getattr(user, "oauth_provider", None):
            user.oauth_provider = "google"
            user.oauth_sub = sub
            if email_verified:
                user.is_verified = True
            db.add(user)
            db.commit()
            db.refresh(user)

    if settings.AUTH_REQUIRE_VERIFIED and not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in.")

    # 🔒 Role guard for OAuth, too
    if as_role and user.role != as_role:
        raise HTTPException(
            status_code=403,
            detail=f"Role mismatch: your account role is '{user.role}'. You cannot sign in as '{as_role}'.",
        )

    return schemas.Token(access_token=create_token(user))
