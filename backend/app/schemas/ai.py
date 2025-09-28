from pydantic import BaseModel, Field
from typing import Optional

class AIFeatures(BaseModel):
    amount: float = Field(..., ge=0)
    term_months: int = Field(..., ge=1)
    annual_income: Optional[float] = None
    credit_score: Optional[int] = None
    dti: Optional[float] = None
    past_defaults: Optional[int] = None
    employment_years: Optional[float] = None
    savings: Optional[float] = None
    collateral_value: Optional[float] = None
    age: Optional[float] = None
    purpose: Optional[str] = None
    region: Optional[str] = None

class AIPrediction(BaseModel):
    score: float
    risk: str
