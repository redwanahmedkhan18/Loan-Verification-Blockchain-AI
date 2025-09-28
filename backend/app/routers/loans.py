# backend/app/routers/loans.py
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import uuid

import stripe
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..email import send_email
from ..security import get_current_user, get_db, require_role

# AI client (service) and local fallback
from ..services.ai_client import ai_predict
from ..services.local_ai import predict_dict as local_predict

router = APIRouter()

# Configure Stripe (ensure key is present)
def _stripe():
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


# --------------------------
# Helpers
# --------------------------
def _risk_band(p: float) -> str:
    if p >= 0.75:
        return "Low"
    if p >= 0.5:
        return "Medium"
    return "High"


def _monthly_payment(principal: float, annual_rate: float, months: int) -> float:
    r = annual_rate / 12.0
    if months <= 0:
        return round(principal, 2)
    if r == 0:
        return round(principal / months, 2)
    denom = 1.0 - (1.0 + r) ** (-months)
    if denom == 0:
        return round(principal / months, 2)
    pmt = principal * r / denom
    return round(pmt, 2)


def _add_months(dt: datetime, n: int) -> datetime:
    y = dt.year + (dt.month - 1 + n) // 12
    m = (dt.month - 1 + n) % 12 + 1
    d = min(dt.day, 28)
    return dt.replace(year=y, month=m, day=d)


def _generate_receipt_file(loan: models.Loan, r: models.Repayment, user: models.User) -> str:
    media = Path(settings.MEDIA_ROOT)
    out_dir = media / "receipts"
    out_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.html"
    rel = f"receipts/{name}"
    fp = out_dir / name

    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Payment Receipt</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
  <h2 style="margin-bottom:0">TrustEdge Bank</h2>
  <div style="color:#555;margin-top:2px">Payment Receipt</div>
  <hr>
  <p><b>Borrower:</b> {user.full_name or user.email}</p>
  <p><b>Loan ID:</b> {loan.id} &nbsp; <b>Application ID:</b> {loan.application_id}</p>
  <p><b>Principal:</b> {loan.principal:.2f} &nbsp; <b>APR:</b> {loan.interest_rate*100:.2f}% &nbsp; <b>Term:</b> {loan.duration_months} months</p>
  <p><b>Installment ID:</b> {r.id} &nbsp; <b>Due Date:</b> {r.due_date.date()}</p>
  <p><b>Amount Due:</b> {r.amount_due:.2f} &nbsp; <b>Amount Paid:</b> {r.amount_paid:.2f}</p>
  <p><b>Paid At:</b> {r.paid_at}</p>
  <hr>
  <p>Thank you for your payment.</p>
</body></html>"""
    fp.write_text(html, encoding="utf-8")
    return rel


def _schedule_loan(db: Session, loan: models.Loan) -> None:
    monthly = _monthly_payment(loan.principal, loan.interest_rate, loan.duration_months)
    first_due = _add_months(datetime.utcnow(), 1)
    items = []
    for i in range(loan.duration_months):
        due = _add_months(first_due, i)
        items.append(
            models.Repayment(
                loan_id=loan.id,
                due_date=due,
                amount_due=monthly,
                amount_paid=0.0,
                status="Due",
            )
        )
    db.add_all(items)
    db.commit()


async def _score_features(payload: dict) -> dict:
    try:
        res = await ai_predict(payload)
        s = float(res["score"])
        r = str(res.get("risk") or res.get("risk_band") or res.get("band") or _risk_band(s))
        return {"score": s, "risk": r}
    except Exception:
        res = local_predict(payload)
        s = float(res["score"])
        r = str(res.get("risk") or res.get("risk_band") or res.get("band") or _risk_band(s))
        return {"score": s, "risk": r}


def _app_to_features(app: models.LoanApplication) -> dict:
    return {
        "amount": float(app.amount),
        "term_months": int(app.term_months),
        "annual_income": float(app.annual_income) if app.annual_income is not None else None,
        "credit_score": int(app.credit_score) if app.credit_score is not None else None,
        "dti": float(app.dti) if app.dti is not None else None,
        "past_defaults": int(app.past_defaults) if app.past_defaults is not None else None,
        "employment_years": float(app.employment_years) if app.employment_years is not None else None,
        "savings": float(app.savings) if app.savings is not None else None,
        "collateral_value": float(app.collateral_value) if app.collateral_value is not None else None,
        "age": float(app.age) if app.age is not None else None,
        "purpose": app.purpose or None,
        "region": app.region or None,
    }


# --------------------------
# Applications (Borrower)
# --------------------------
@router.post(
    "/applications",
    response_model=schemas.LoanAppOut,
    dependencies=[Depends(require_role("borrower"))],
)
async def create_application(
    payload: schemas.LoanAppCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    bg: BackgroundTasks = ...,
):
    app = models.LoanApplication(
        borrower_id=user.id,
        amount=payload.amount,
        term_months=payload.term_months,
        purpose=getattr(payload, "purpose", None),
        region=getattr(payload, "region", None),
        annual_income=getattr(payload, "annual_income", None),
        credit_score=getattr(payload, "credit_score", None),
        dti=getattr(payload, "dti", None),
        past_defaults=getattr(payload, "past_defaults", None),
        employment_years=getattr(payload, "employment_years", None),
        savings=getattr(payload, "savings", None),
        collateral_value=getattr(payload, "collateral_value", None),
        age=getattr(payload, "age", None),
        status="Submitted",
        created_at=datetime.utcnow(),
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    feats = _app_to_features(app)
    res = await _score_features(feats)
    app.ai_score = float(res["score"])
    app.ai_risk_band = str(res["risk"])
    app.risk_level = app.ai_risk_band

    if app.ai_risk_band == "Low":
        app.status = "Approved"
        db.add(app)
        db.commit()
        db.refresh(app)

        loan = models.Loan(
            application_id=app.id,
            borrower_id=app.borrower_id,
            principal=app.amount,
            duration_months=app.term_months,
            interest_rate=0.10,
            status="Active",
            created_at=datetime.utcnow(),
        )
        db.add(loan)
        db.commit()
        db.refresh(loan)

        _schedule_loan(db, loan)

        try:
            approve_html = (
                f"<h2>Your loan was approved!</h2>"
                f"<p>Application ID: {app.id}</p>"
                f"<p>Principal: {loan.principal:.2f} • Term: {loan.duration_months} months</p>"
                f"<p>AI Score: {app.ai_score:.4f} (Risk: {app.ai_risk_band})</p>"
            )
            bg.add_task(send_email, user.email, "Loan Approved", approve_html)
        except Exception:
            pass
    else:
        app.status = "UnderReview"
        db.add(app)
        db.commit()

    return app


@router.get("/applications", response_model=list[schemas.LoanAppOut])
def list_applications(
    scope: str = Query("mine", enum=["mine", "all"]),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(models.LoanApplication)
    if user.role == "borrower" or scope == "mine":
        q = q.filter(models.LoanApplication.borrower_id == user.id)
    return q.order_by(models.LoanApplication.id.desc()).all()


@router.post(
    "/applications/{application_id}/decision",
    dependencies=[Depends(require_role("officer", "admin"))],
)
def decide_application(
    application_id: int,
    decision: str = Query(...),
    reason: str | None = None,
    db: Session = Depends(get_db),
    bg: BackgroundTasks = ...,
):
    if decision not in ("Approved", "Rejected"):
        raise HTTPException(status_code=400, detail="Decision must be 'Approved' or 'Rejected'.")

    app = db.get(models.LoanApplication, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = decision
    app.decision_reason = reason
    db.add(app)
    db.commit()
    db.refresh(app)

    borrower = db.get(models.User, app.borrower_id)

    if decision == "Approved":
        existing = (
            db.query(models.Loan)
            .filter(
                models.Loan.application_id == app.id,
                models.Loan.borrower_id == app.borrower_id,
            )
            .first()
        )
        if not existing:
            loan = models.Loan(
                application_id=app.id,
                borrower_id=app.borrower_id,
                principal=app.amount,
                duration_months=app.term_months,
                interest_rate=0.10,
                status="Active",
                created_at=datetime.utcnow(),
            )
            db.add(loan)
            db.commit()
            db.refresh(loan)
            _schedule_loan(db, loan)
        else:
            loan = existing

        html = (
            f"<h2>Your loan was approved!</h2>"
            f"<p>Application ID: {app.id}</p>"
            f"<p>Principal: {loan.principal:.2f} • Term: {loan.duration_months} months</p>"
            f"<p>AI Score: {app.ai_score:.4f} (Risk: {app.ai_risk_band})</p>"
        )
        bg.add_task(send_email, borrower.email, "Loan Approved", html)
    else:
        html = (
            f"<h2>Your loan application was rejected</h2>"
            f"<p>Application ID: {app.id}</p>"
            f"<p>Reason: {app.decision_reason or 'N/A'}</p>"
        )
        bg.add_task(send_email, borrower.email, "Loan Decision", html)

    return {"id": app.id, "status": app.status, "reason": app.decision_reason}


# --------------------------
# Loans & Repayments (Borrower)
# --------------------------
@router.get("/loans/mine")
def loans_mine(db: Session = Depends(get_db), user=Depends(get_current_user)):
    loans = (
        db.query(models.Loan)
        .filter(models.Loan.borrower_id == user.id)
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
    "/loans/{loan_id}/chart",
    dependencies=[Depends(require_role("borrower"))],
)
def loan_chart(
    loan_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    loan = db.get(models.Loan, loan_id)
    if not loan or loan.borrower_id != user.id:
        raise HTTPException(status_code=404, detail="Loan not found")

    reps = (
        db.query(models.Repayment)
        .filter(models.Repayment.loan_id == loan.id)
        .order_by(models.Repayment.due_date.asc())
        .all()
    )
    series = []
    for r in reps:
        key = r.due_date.strftime("%Y-%m")
        series.append(
            {
                "month": key,
                "due": float(r.amount_due or 0.0),
                "paid": float(r.amount_paid or 0.0),
                "status": r.status,
            }
        )
    return series


# =========================================================
# Stripe: Borrower authorizes; Officer/Admin approves/captures
# =========================================================

@router.post(
    "/loans/{loan_id}/repayments/{repayment_id}/stripe/intent",
    dependencies=[Depends(require_role("borrower"))],
)
def create_stripe_intent(
    loan_id: int,
    repayment_id: int,
    amount: float | None = Query(None, gt=0),
    currency: str | None = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    _stripe()

    loan = db.get(models.Loan, loan_id)
    if not loan or loan.borrower_id != user.id:
        raise HTTPException(status_code=404, detail="Loan not found")

    rep = db.get(models.Repayment, repayment_id)
    if not rep or rep.loan_id != loan.id:
        raise HTTPException(status_code=404, detail="Repayment not found")

    remaining = round(rep.amount_due - (rep.amount_paid or 0.0), 2)
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Installment already fully paid")

    amt = amount if amount is not None else remaining
    if amt > remaining + 1e-6:
        raise HTTPException(status_code=400, detail="Amount exceeds remaining due")

    curr = (currency or settings.STRIPE_CURRENCY or "usd").lower()

    intent = stripe.PaymentIntent.create(
        amount=int(round(amt * 100)),
        currency=curr,
        capture_method="manual",
        metadata={
            "loan_id": str(loan.id),
            "repayment_id": str(rep.id),
            "borrower_id": str(user.id),
        },
        description=f"TrustEdge installment loan#{loan.id} repayment#{rep.id}",
    )

    pay = models.Payment(
        loan_id=loan.id,
        repayment_id=rep.id,
        borrower_id=user.id,
        amount=amt,
        currency=curr,
        status="Pending",
        payment_intent_id=intent.id,
        created_at=datetime.utcnow(),
    )
    db.add(pay)
    db.commit()
    db.refresh(pay)

    return {"client_secret": intent.client_secret, "payment_id": pay.id, "payment_intent_id": intent.id}


@router.post("/payments/confirm", dependencies=[Depends(require_role("borrower"))])
def confirm_authorization(
    payment_intent_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    _stripe()
    pi = stripe.PaymentIntent.retrieve(payment_intent_id)

    if str(pi.metadata.get("borrower_id")) != str(user.id):
        raise HTTPException(status_code=403, detail="Not your payment")

    pay = db.query(models.Payment).filter(models.Payment.payment_intent_id == payment_intent_id).first()
    if not pay:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if pi.status == "requires_capture":
        pay.status = "Authorized"
        pay.authorized_at = datetime.utcnow()
        db.add(pay)
        db.commit()
        return {"payment_id": pay.id, "status": pay.status}

    if pi.status in ("requires_payment_method", "requires_confirmation", "processing"):
        return {"payment_id": pay.id, "status": "Pending"}

    if pi.status in ("canceled",):
        pay.status = "Canceled"
        pay.canceled_at = datetime.utcnow()
        db.add(pay)
        db.commit()
        return {"payment_id": pay.id, "status": pay.status}

    return {"payment_id": pay.id, "status": pi.status}


@router.get("/payments/pending", dependencies=[Depends(require_role("officer", "admin"))])
def list_pending_payments(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Payment)
        .filter(models.Payment.status == "Authorized")
        .order_by(models.Payment.created_at.asc())
        .all()
    )
    out = []
    for p in rows:
        borrower = db.get(models.User, p.borrower_id)
        rep = db.get(models.Repayment, p.repayment_id)
        out.append(
            {
                "id": p.id,
                "payment_intent_id": p.payment_intent_id,
                "loan_id": p.loan_id,
                "repayment_id": p.repayment_id,
                "borrower": borrower.email if borrower else None,
                "amount": p.amount,
                "currency": p.currency,
                "authorized_at": p.authorized_at,
            }
        )
    return out


@router.post("/payments/{payment_id}/approve", dependencies=[Depends(require_role("officer", "admin"))])
def approve_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    bg: BackgroundTasks = ...,
):
    _stripe()

    pay = db.get(models.Payment, payment_id)
    if not pay:
        raise HTTPException(status_code=404, detail="Payment not found")
    if pay.status != "Authorized":
        raise HTTPException(status_code=400, detail=f"Payment is not Authorized (status={pay.status})")

    stripe.PaymentIntent.capture(pay.payment_intent_id)

    pay.status = "Captured"
    pay.captured_at = datetime.utcnow()
    db.add(pay)

    loan = db.get(models.Loan, pay.loan_id)
    rep = db.get(models.Repayment, pay.repayment_id)
    borrower = db.get(models.User, pay.borrower_id)

    rep.amount_paid = round((rep.amount_paid or 0.0) + float(pay.amount), 2)
    if rep.amount_paid + 1e-6 >= rep.amount_due:
        rep.status = "Paid"
        rep.paid_at = datetime.utcnow()
        rel = _generate_receipt_file(loan, rep, borrower)
        rep.receipt_path = rel
        receipt_url = f"/media/{rel}"
    else:
        receipt_url = None
        rep.status = "Due"
        if datetime.utcnow().date() > rep.due_date.date():
            rep.status = "Late"

    db.add(rep)
    db.commit()
    db.refresh(rep)

    try:
        if rep.status == "Paid":
            html = (
                f"<h2>Installment payment received</h2>"
                f"<p>Loan #{loan.id} — Installment #{rep.id}</p>"
                f"<p>Amount: {pay.amount:.2f} {pay.currency.upper()}</p>"
                f'<p>Receipt: <a href="{receipt_url}">{receipt_url}</a></p>'
            )
        else:
            html = (
                f"<h2>Partial installment payment captured</h2>"
                f"<p>Loan #{loan.id} — Installment #{rep.id}</p>"
                f"<p>Amount: {pay.amount:.2f} {pay.currency.upper()}</p>"
                f"<p>Remaining due: {rep.amount_due - rep.amount_paid:.2f}</p>"
            )
        bg.add_task(send_email, borrower.email, "Installment Payment Receipt", html)
    except Exception:
        pass

    return {
        "payment_id": pay.id,
        "status": pay.status,
        "repayment_status": rep.status,
        "receipt_url": receipt_url,
    }


@router.post("/payments/{payment_id}/cancel", dependencies=[Depends(require_role("officer", "admin"))])
def cancel_payment(payment_id: int, db: Session = Depends(get_db)):
    _stripe()

    pay = db.get(models.Payment, payment_id)
    if not pay:
        raise HTTPException(status_code=404, detail="Payment not found")
    if pay.status != "Authorized":
        raise HTTPException(status_code=400, detail=f"Payment is not Authorized (status={pay.status})")

    stripe.PaymentIntent.cancel(pay.payment_intent_id)
    pay.status = "Canceled"
    pay.canceled_at = datetime.utcnow()
    db.add(pay)
    db.commit()

    return {"payment_id": pay.id, "status": pay.status}
