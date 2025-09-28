# backend/app/services/ai_client.py
from typing import Any, Dict
import httpx
from ..config import settings


class AIError(RuntimeError):
    """Raised when the AI microservice returns a non-2xx response."""


def _base_url() -> str:
    """
    settings.AI_SERVICE_URL is an AnyHttpUrl; cast to str before rstrip().
    """
    return str(settings.AI_SERVICE_URL).rstrip("/")


async def ai_health() -> Dict[str, Any]:
    """Call the AI microservice /health endpoint."""
    url = _base_url() + "/health"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(url)
            r.raise_for_status()
        except httpx.HTTPError as e:
            # Unify any transport or HTTP status errors
            raise AIError(f"AI health check failed: {e}") from e
        return r.json()


async def ai_predict(features: Dict[str, Any]) -> Dict[str, Any]:
    """Call the AI microservice /predict endpoint with a JSON payload."""
    url = _base_url() + "/predict"
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.post(url, json=features)
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise AIError(
                f"AI service error: {e.response.status_code} {e.response.text}"
            ) from e
        except httpx.HTTPError as e:
            raise AIError(f"AI request failed: {e}") from e
        return r.json()
