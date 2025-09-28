# ai_service/main.py
from pathlib import Path
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="TrustEdge AI Scoring", version="1.0.0")

# --- Static (for favicon and any other assets) ---
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


# Allow local dev from anywhere (tighten later if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Features(BaseModel):
    amount: float
    term_months: int
    annual_income: Optional[float] = None
    credit_score: Optional[int] = None
    dti: Optional[float] = None
    past_defaults: Optional[int] = None
    employment_years: Optional[float] = None
    savings: Optional[float] = None
    collateral_value: Optional[float] = None
    age: Optional[float] = None
    # Backend may send these; harmless for simple heuristic
    purpose: Optional[str] = None
    region: Optional[str] = None


def _score(f: Features) -> float:
    """
    Simple heuristic to emulate a credit model; outputs a probability-like score in [0,1].
    Tuned so that higher credit_score, lower dti, lower amount, higher income/savings/collateral increase the score.
    """
    cs = float(f.credit_score or 650)          # center around 650
    dti = float(f.dti if f.dti is not None else 0.35)
    amt = float(f.amount)
    inc = float(f.annual_income or 40000.0)
    sav = float(f.savings or 0.0)
    col = float(f.collateral_value or 0.0)
    emp = float(f.employment_years or 2.0)
    defs = float(f.past_defaults or 0)

    # baseline
    s = 0.50

    # positive contributors
    s += max(0.0, (cs - 650.0)) / 1000.0          # +0.35 @ cs=1000
    s += min(inc, 150_000.0) / 1_000_000.0        # up to +0.15
    s += min(sav, 50_000.0) / 250_000.0           # up to +0.20
    s += min(col, 200_000.0) / 1_000_000.0        # up to +0.20
    s += min(emp, 10.0) / 100.0                   # up to +0.10

    # negative contributors
    s -= max(0.0, dti - 0.35) * 0.6               # -0.3 @ dti=0.85
    s -= max(0.0, (amt - 10_000.0)) / 120_000.0   # -0.25 @ amt=40k above base
    s -= min(defs, 5.0) * 0.05                    # up to -0.25

    # clamp
    return max(0.0, min(1.0, s))


def _band(score: float) -> str:
    # Match backend's thresholds (see _risk_band in backend)
    if score >= 0.75:
        return "Low"
    if score >= 0.50:
        return "Medium"
    return "High"


@app.get("/")
def root():
    return {
        "service": "TrustEdge AI Scoring",
        "version": app.version,
        "docs": "/docs",
        "health": "/health",
        "predict": "/predict",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai", "version": app.version}


@app.post("/predict")
def predict(f: Features):
    score = _score(f)
    band = _band(score)
    # Return both "risk" (what backend prefers) and "band" (extra compatibility)
    return {"score": score, "risk": band, "band": band}

# Serve favicon; return .ico if present, else fall back to trustedge-icon.png, else 204
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    ico = static_dir / "favicon.ico"
    png = static_dir / "trustedge-icon.png"
    if ico.exists():
        return FileResponse(ico, media_type="image/x-icon")
    if png.exists():
        return FileResponse(png, media_type="image/png")
    return Response(status_code=204)  # no-content, avoids 404 noise

@app.get("/")
def root():
    return {"app": "AI Service", "status": "ok"}