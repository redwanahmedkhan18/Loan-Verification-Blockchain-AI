# backend/app/services/local_ai.py
from functools import lru_cache
from pathlib import Path
import math
import warnings
import pandas as pd
import joblib
import pickle
import numpy as np

from ..config import settings

# Keep this in sync with your training features
FEATURE_COLUMNS = [
    "amount",
    "term_months",
    "annual_income",
    "credit_score",
    "dti",
    "past_defaults",
    "employment_years",
    "savings",
    "collateral_value",
    "age",
    "purpose",
    "region",
]


def _patch_numpy_randomstate_ctor() -> bool:
    """
    Work around '__randomstate_ctor' TypeError during unpickle of older artifacts.
    Safe for inference (RNG state isn't used at predict time).
    """
    try:
        import numpy.random._pickle as np_pickle  # type: ignore[attr-defined]
        original = np_pickle.__randomstate_ctor  # type: ignore[attr-defined]

        def patched_ctor(*args, **kwargs):
            try:
                return original(*args, **kwargs)
            except TypeError as e:
                if "__randomstate_ctor" in str(e):
                    rs = np.random.RandomState()
                    for a in args:
                        try:
                            rs.set_state(a)
                            break
                        except Exception:
                            continue
                    return rs
                raise

        np_pickle.__randomstate_ctor = patched_ctor  # type: ignore[attr-defined]
        return True
    except Exception:
        return False


@lru_cache(maxsize=1)
def _load_model():
    """
    Load a scikit-learn pipeline safely:
      1) patch numpy ctor (handles RandomState pickle mismatch),
      2) try joblib.load,
      3) fallback to pickle.load,
      4) accept {"model": estimator} artifacts as well.
    """
    path = Path(settings.LOCAL_MODEL_PATH)
    if not path.exists():
        raise FileNotFoundError(f"Model not found at {path}. Set LOCAL_MODEL_PATH correctly.")

    _patch_numpy_randomstate_ctor()

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            obj = joblib.load(path)
        except Exception as e1:
            try:
                with open(path, "rb") as f:
                    obj = pickle.load(f)
            except Exception as e2:
                raise RuntimeError(
                    "Failed to load model via joblib and pickle.\n"
                    f"joblib error: {e1}\n"
                    f"pickle error: {e2}\n"
                    f"Path: {path}"
                ) from e2

    if isinstance(obj, dict) and "model" in obj:
        obj = obj["model"]

    if not (hasattr(obj, "predict") or hasattr(obj, "predict_proba") or hasattr(obj, "decision_function")):
        raise TypeError("Loaded object doesn't look like a scikit-learn estimator.")

    return obj


def _to_df(features: dict) -> pd.DataFrame:
    """
    Build a single-row DataFrame that ALWAYS includes all expected feature columns.
    Missing fields are filled with None so the pipeline's imputers/encoders can handle them.
    """
    row = {col: features.get(col, None) for col in FEATURE_COLUMNS}
    return pd.DataFrame([row])


def _prob_from_model(model, X: pd.DataFrame) -> float:
    # 1) predict_proba
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)
        try:
            return float(proba[0, 1])
        except Exception:
            p = proba[0]
            return float(p[1] if hasattr(p, "__len__") and len(p) > 1 else p)

    # 2) decision_function → logistic
    if hasattr(model, "decision_function"):
        df = float(model.decision_function(X)[0])
        return 1.0 / (1.0 + math.exp(-df))

    # 3) predict class → cast to prob
    pred = model.predict(X)
    return float(pred[0])


def _band(p: float) -> str:
    return "Low" if p >= 0.75 else "Medium" if p >= 0.5 else "High"


def predict_dict(features: dict) -> dict:
    model = _load_model()
    X = _to_df(features)
    p = _prob_from_model(model, X)
    return {"score": round(float(p), 6), "risk": _band(float(p))}
