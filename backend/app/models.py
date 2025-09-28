# backend/app/models.py
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    JSON,
    Index,
)
from sqlalchemy.orm import relationship

from .db import Base


# -------------------------
# Users
# -------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)

    # auth
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="borrower")  # borrower | officer | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # email verification / reset
    is_verified = Column(Boolean, default=False)
    verify_token = Column(String, nullable=True)
    verify_sent_at = Column(DateTime, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_sent_at = Column(DateTime, nullable=True)

    # oauth (google)
    oauth_provider = Column(String, nullable=True)  # e.g., "google"
    oauth_sub = Column(String, nullable=True)       # Google's stable user id ("sub")

    # profile fields (for Register wizard)
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    nid_number = Column(String, nullable=True)
    address = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)   # relative path (e.g. "profiles/<uuid>.png")

    # Relationships
    applications = relationship(
        "LoanApplication",
        back_populates="borrower",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    loans = relationship(
        "Loan",
        back_populates="borrower",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# -------------------------
# Loan Applications
# -------------------------
class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(Integer, primary_key=True)
    borrower_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Core inputs
    amount = Column(Float, nullable=False)
    term_months = Column(Integer, nullable=False)
    purpose = Column(String)  # e.g. auto | business | personal | ...
    region = Column(String)   # e.g. NA | EU | APAC | LATAM | MEA

    # Extended features for AI (all optional)
    annual_income = Column(Float)
    credit_score = Column(Integer)
    dti = Column(Float)                 # debt-to-income ratio (0..1)
    past_defaults = Column(Integer)     # count
    employment_years = Column(Float)
    savings = Column(Float)
    collateral_value = Column(Float)
    age = Column(Float)

    # Workflow status
    status = Column(String, default="Submitted")  # Submitted | UnderReview | Approved | Rejected | Minted

    # AI outputs
    ai_score = Column(Float)                 # probability of "good"/approval
    ai_risk_band = Column(String)            # Low | Medium | High (preferred)
    risk_level = Column(String)              # legacy alias (kept for older UI)

    decision_reason = Column(String)         # optional free-text
    created_at = Column(DateTime, default=datetime.utcnow)

    borrower = relationship("User", back_populates="applications")

    __table_args__ = (
        Index("ix_loan_app_borrower_status", "borrower_id", "status"),
    )


# -------------------------
# On-chain Loans (after mint)
# -------------------------
class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"))
    borrower_id = Column(Integer, ForeignKey("users.id"))

    principal = Column(Float, nullable=False)
    interest_rate = Column(Float, default=0.10)  # 10% default APR
    duration_months = Column(Integer, nullable=False)

    contract_address = Column(String)  # address of LoanManager or token contract
    token_id = Column(String)          # NFT token ID (string keeps it simple)

    status = Column(String, default="Active")  # Active | Closed | Defaulted
    created_at = Column(DateTime, default=datetime.utcnow)

    borrower = relationship("User", back_populates="loans")
    application = relationship("LoanApplication")

    # Repayment schedule (one-to-many)
    repayments = relationship(
        "Repayment",
        back_populates="loan",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Repayment.due_date.asc()",
    )


# -------------------------
# Repayments (per-loan schedule & payments)
# -------------------------
class Repayment(Base):
    __tablename__ = "repayments"

    id = Column(Integer, primary_key=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False, index=True)

    due_date = Column(DateTime, nullable=False)
    amount_due = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0.0)
    paid_at = Column(DateTime, nullable=True)
    status = Column(String, default="Due")  # Due | Paid | Late
    receipt_path = Column(String, nullable=True)  # relative path under MEDIA_ROOT (e.g., "receipts/<file>.html")

    loan = relationship("Loan", back_populates="repayments")

    __table_args__ = (
        Index("ix_repayment_loan_due", "loan_id", "due_date"),
    )


# -------------------------
# Document Storage (KYC / Proofs)
# -------------------------
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("loan_applications.id"))

    doc_type = Column(String, nullable=False)  # ID | IncomeProof | Collateral | Other
    filename = Column(String, nullable=False)
    ipfs_hash = Column(String)                 # optional: store CID (IPFS/Pinata/etc)
    status = Column(String, default="Pending") # Pending | Verified | Rejected
    meta = Column(JSON)                        # JSON metadata blob
    uploaded_at = Column(DateTime, default=datetime.utcnow)


# -------------------------
# Payments (Stripe)
# -------------------------
class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False)
    repayment_id = Column(Integer, ForeignKey("repayments.id"), nullable=False)
    borrower_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    amount = Column(Float, nullable=False)
    currency = Column(String, default="usd")
    status = Column(String, default="Pending")  # Pending | Authorized | Captured | Canceled | Failed
    payment_intent_id = Column(String, unique=True, index=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    authorized_at = Column(DateTime, nullable=True)
    captured_at = Column(DateTime, nullable=True)
    canceled_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_payments_borrower_status", "borrower_id", "status"),
    )
