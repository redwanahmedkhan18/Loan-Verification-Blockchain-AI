# backend/app/routers/ai.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import settings
from ..models import LoanApplication
from ..schemas.ai import AIFeatures, AIPrediction
from ..services.ai_client import ai_health, ai_predict
from ..security import get_db, get_current_user  # type: ignore

# Router already carries the /ai prefix
router = APIRouter(prefix="/ai", tags=["AI"])


def _local_predict(payload: dict) -> dict:
    """Import local predictor only when needed to avoid heavy deps at import time."""
    from ..services.local_ai import predict_dict as _predict  # lazy import
    return _predict(payload)


@router.get("/health")
async def health():
    """AI health (service/local)."""
    mode = settings.AI_MODE.lower()

    if mode == "service":
        # Ask the microservice
        try:
            svc = await ai_health()
            return {"mode": "service", **svc, "service_url": str(settings.AI_SERVICE_URL)}
        except Exception as e:
            # Give a useful hint about local fallback availability
            try:
                from ..services.local_ai import _load_model  # lazy import
                _load_model()
                return {
                    "mode": "service",
                    "model_found": True,
                    "service_error": str(e),
                    "fallback": "local_available",
                }
            except Exception as le:
                return {
                    "mode": "service",
                    "model_found": False,
                    "service_error": str(e),
                    "fallback": f"local_failed: {le}",
                }

    # Local mode: only load the model; don't run a prediction
    try:
        from ..services.local_ai import _load_model  # lazy import
        _load_model()
        return {"mode": "local", "model_found": True, "model_path": settings.LOCAL_MODEL_PATH}
    except Exception as e:
        return {"mode": "local", "model_found": False, "error": str(e), "model_path": settings.LOCAL_MODEL_PATH}


@router.get("/mode")
def mode():
    """Return current AI mode and pointers."""
    return {
        "mode": settings.AI_MODE.lower(),
        "service_url": str(settings.AI_SERVICE_URL),
        "local_model_path": settings.LOCAL_MODEL_PATH,
    }


@router.post("/predict", response_model=AIPrediction)
async def predict(features: AIFeatures):
    """Score raw feature payload (no DB)."""
    payload = features.model_dump()
    mode = settings.AI_MODE.lower()

    if mode == "local":
        res = _local_predict(payload)
        return AIPrediction(score=float(res["score"]), risk=str(res["risk"]))

    # service mode
    try:
        res = await ai_predict(payload)
        return AIPrediction(score=float(res["score"]), risk=str(res["risk"]))
    except Exception:
        # Fallback to local if available
        try:
            res = _local_predict(payload)
            return AIPrediction(score=float(res["score"]), risk=str(res["risk"]))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI unavailable (service & local failed): {e}",
            ) from e


@router.post("/score/{application_id}")
async def score_application(
    application_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Pull features from DB -> call AI -> persist ai_score & ai_risk_band.
    Keeps legacy 'risk_level' in sync.
    """
    # Load application
    app = db.get(LoanApplication, application_id) if hasattr(db, "get") \
        else db.query(LoanApplication).get(application_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Build feature dict (None values are fine; pipeline imputes)
    feats = {
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

    # Choose inference path
    mode = settings.AI_MODE.lower()
    if mode == "local":
        res = _local_predict(feats)
    else:
        try:
            res = await ai_predict(feats)
        except Exception:
            try:
                res = _local_predict(feats)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"AI unavailable (service & local failed): {e}",
                ) from e

    # Persist outputs
    app.ai_score = float(res["score"])
    app.ai_risk_band = str(res["risk"])
    app.risk_level = app.ai_risk_band  # legacy sync
    if (app.status or "").lower() == "submitted":
        app.status = "UnderReview"

    db.add(app)
    db.commit()
    db.refresh(app)

    return {
        "application_id": app.id,
        "ai_score": app.ai_score,
        "risk": app.ai_risk_band,
        "status": app.status,
        "mode": settings.AI_MODE.lower(),
    }
