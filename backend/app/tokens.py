from datetime import timedelta
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from .config import settings

def _serializer(salt: str):
    return URLSafeTimedSerializer(secret_key=settings.JWT_SECRET, salt=salt)

def sign_email_token(email: str, salt: str, expires_hours: int) -> str:
    s = _serializer(salt)
    return s.dumps({"email": email, "exp": expires_hours})

def verify_email_token(token: str, salt: str, max_age_hours: int) -> str:
    s = _serializer(salt)
    try:
        data = s.loads(token, max_age=max_age_hours * 3600)
        return data["email"]
    except SignatureExpired as e:
        raise ValueError("Token expired") from e
    except BadSignature as e:
        raise ValueError("Invalid token") from e
