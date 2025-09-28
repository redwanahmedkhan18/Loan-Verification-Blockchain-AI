# backend/app/main.py
from pathlib import Path

import httpx
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from web3 import Web3

from .config import settings
from .db import SessionLocal, init_db
from .routers import ai, auth, blockchain, kyc, loans, staff, contact

app = FastAPI(title="TrustEdge Backend", version="0.1.0")

# ---- CORS (from env / config) ----
allowed_methods = (
    ["*"]
    if settings.CORS_ALLOW_METHODS == "*"
    else [m.strip().upper() for m in settings.CORS_ALLOW_METHODS.split(",") if m.strip()]
)
allowed_headers = (
    ["*"]
    if settings.CORS_ALLOW_HEADERS == "*"
    else [h.strip() for h in settings.CORS_ALLOW_HEADERS.split(",") if h.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS or ["*"],
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=allowed_methods,
    allow_headers=allowed_headers,
)

# ---- Static mounts ----
# Media (uploaded files)
media_dir = Path(settings.MEDIA_ROOT)
media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

# Optional static folder for favicon or other assets
static_dir = Path("app/static")
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


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


@app.on_event("startup")
async def on_startup():
    """Initialize database at startup."""
    init_db()


@app.get("/")
def root():
    """Simple landing to avoid 404 at root."""
    return {
        "app": "TrustEdge Backend",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": [
            "/auth",
            "/kyc",
            "/ai",
            "/loans",
            "/chain",
            "/staff",
            "/contact",
            "/media/*",
        ],
    }


def _test_local_ai() -> dict:
    """
    Try only to LOAD the local model (no prediction) so health doesn't
    fail on missing feature columns.
    """
    try:
        from .services.local_ai import _load_model  # lazy import
        _load_model()
        return {"model_found": True, "mode": "local", "model_path": settings.LOCAL_MODEL_PATH}
    except Exception as e:
        return {
            "model_found": False,
            "mode": "local",
            "error": str(e),
            "model_path": settings.LOCAL_MODEL_PATH,
        }


@app.get("/health")
async def health():
    """
    Composite health:
      - DB connectivity
      - AI (service / local)
      - Blockchain RPC
    """
    results = {"status": "ok", "db": None, "ai": None, "chain": None}

    # --- DB check ---
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        results["db"] = "ok"
    except Exception as e:
        results["db"] = f"error: {e}"
        results["status"] = "degraded"
    finally:
        try:
            db.close()
        except Exception:
            pass

    # --- AI check ---
    try:
        if settings.AI_MODE.lower() == "service":
            base = str(settings.AI_SERVICE_URL).rstrip("/")
            async with httpx.AsyncClient(timeout=3) as client:
                r = await client.get(f"{base}/health")
                r.raise_for_status()
                payload = r.json()
            results["ai"] = {"mode": "service", "service_url": str(settings.AI_SERVICE_URL), **payload}
        else:
            results["ai"] = _test_local_ai()
            if not results["ai"].get("model_found"):
                results["status"] = "degraded"
    except Exception as e:
        results["ai"] = {"mode": settings.AI_MODE, "error": str(e)}
        results["status"] = "degraded"

    # --- Blockchain check ---
    try:
        w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER))
        results["chain"] = {"connected": bool(w3.is_connected()), "rpc": settings.WEB3_PROVIDER}
        if not results["chain"]["connected"]:
            results["status"] = "degraded"
    except Exception as e:
        results["chain"] = {"error": str(e), "rpc": settings.WEB3_PROVIDER}
        results["status"] = "degraded"

    return results


# ---- Mount routers ----
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(kyc.router, prefix="/kyc", tags=["kyc"])
# ai.router already defines its own prefix (e.g., "/ai")
app.include_router(ai.router, tags=["ai"])
app.include_router(loans.router, prefix="/loans", tags=["loans"])
app.include_router(blockchain.router, prefix="/chain", tags=["blockchain"])
app.include_router(staff.router)     # file uses /staff internally
app.include_router(contact.router)   # file uses /contact internally
