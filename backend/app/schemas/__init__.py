# app/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "borrower"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    class Config: from_attributes = True

class LoanAppCreate(BaseModel):
    amount: float
    term_months: int
    purpose: Optional[str] = None

class LoanAppOut(BaseModel):
    id: int
    amount: float
    term_months: int
    purpose: Optional[str]
    status: str
    ai_score: Optional[float]
    risk_level: Optional[str]
    class Config: from_attributes = True
