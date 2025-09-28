# backend/app/config.py
from typing import List, Optional
from pydantic import AnyHttpUrl, EmailStr, Field, AliasChoices, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---- Runtime ----
    ENV: str = "local"
    PORT: int = 8000

    # ---- Database ----
    DATABASE_URL: str = "sqlite:///./trustedge.db"

    # ---- Auth / JWT ----
    JWT_SECRET: str = "devsecretchange"  # change in production
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    AUTH_REQUIRE_VERIFIED: bool = Field(
        default=False,
        validation_alias=AliasChoices("AUTH_REQUIRE_VERIFIED", "auth_require_verified"),
    )

    # ---- Email / Links ----
    FRONTEND_URL: AnyHttpUrl = Field(
        default="http://127.0.0.1:5173",
        validation_alias=AliasChoices("FRONTEND_URL", "frontend_url"),
    )
    EMAIL_ENABLED: bool = Field(
        default=False,
        validation_alias=AliasChoices("EMAIL_ENABLED", "email_enabled"),
    )

    # Optional helper to derive SMTP_HOST when set (e.g. gmail/outlook/yahoo)
    EMAIL_PROVIDER: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("EMAIL_PROVIDER", "email_provider"),
    )

    SMTP_HOST: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("SMTP_HOST", "smtp_host"),
    )
    SMTP_PORT: int = Field(
        default=587,
        validation_alias=AliasChoices("SMTP_PORT", "smtp_port", "EMAIL_PORT", "email_port"),
    )
    SMTP_USER: Optional[EmailStr | str] = Field(
        default=None,
        validation_alias=AliasChoices("SMTP_USER", "smtp_user", "EMAIL_HOST_USER", "email_host_user"),
    )
    SMTP_PASSWORD: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("SMTP_PASSWORD", "smtp_password", "EMAIL_HOST_PASSWORD", "email_host_password"),
    )
    SMTP_TLS: bool = Field(
        default=True,
        validation_alias=AliasChoices("SMTP_TLS", "smtp_tls", "EMAIL_USE_TLS", "email_use_tls"),
    )

    EMAIL_FROM: str = Field(
        default="no-reply@trustedgebank.local",
        validation_alias=AliasChoices("EMAIL_FROM", "email_from", "DEFAULT_FROM_EMAIL", "default_from_email"),
    )
    EMAIL_FROM_NAME: str = Field(
        default="TrustEdge Bank",
        validation_alias=AliasChoices("EMAIL_FROM_NAME", "email_from_name"),
    )

    EMAIL_TOKEN_EXPIRE_HOURS: int = 48
    RESET_TOKEN_EXPIRE_HOURS: int = 2

    # ---- Google Sign-In ----
    GOOGLE_CLIENT_ID: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_CLIENT_ID", "google_client_id"),
    )
    GOOGLE_ALLOWED_ISSUERS: List[str] = Field(
        default_factory=lambda: ["accounts.google.com", "https://accounts.google.com"],
        validation_alias=AliasChoices("GOOGLE_ALLOWED_ISSUERS", "google_allowed_issuers"),
    )

    # ---- File/Media storage ----
    MEDIA_ROOT: str = Field(
        default="app/uploads",
        validation_alias=AliasChoices("MEDIA_ROOT", "media_root"),
    )
    MAX_UPLOAD_MB: int = Field(
        default=5,
        validation_alias=AliasChoices("MAX_UPLOAD_MB", "max_upload_mb"),
    )

    # ---- AI inference ----
    AI_MODE: str = Field(
        default="service",  # "service" or "local"
        validation_alias=AliasChoices("AI_MODE", "ai_mode"),
    )
    AI_SERVICE_URL: AnyHttpUrl = Field(
        default="http://127.0.0.1:8001",
        validation_alias=AliasChoices("AI_SERVICE_URL", "ai_service_url"),
    )
    LOCAL_MODEL_PATH: str = Field(
        default="app/artifacts/credit_risk_pipeline.pkl",
        validation_alias=AliasChoices("LOCAL_MODEL_PATH", "local_model_path"),
    )

    # ---- Blockchain (Hardhat local node) ----
    WEB3_PROVIDER: AnyHttpUrl = Field(
        default="http://127.0.0.1:8545",
        validation_alias=AliasChoices("WEB3_PROVIDER", "web3_provider"),
    )
    CONTRACT_ADDRESS: str = Field(
        default="",
        validation_alias=AliasChoices("CONTRACT_ADDRESS", "contract_address"),
    )
    PRIVATE_KEY: str = Field(
        default="",
        validation_alias=AliasChoices("PRIVATE_KEY", "private_key"),
    )
    CHAIN_ID: int = Field(
        default=31337,
        validation_alias=AliasChoices("CHAIN_ID", "chain_id"),
    )

    # ---- CORS ----
    CORS_ALLOW_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://localhost:3000",
        ],
        validation_alias=AliasChoices("CORS_ALLOW_ORIGINS", "cors_allow_origins"),
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        validation_alias=AliasChoices("CORS_ALLOW_CREDENTIALS", "cors_allow_credentials"),
    )
    CORS_ALLOW_METHODS: str = Field(
        default="*",
        validation_alias=AliasChoices("CORS_ALLOW_METHODS", "cors_allow_methods"),
    )
    CORS_ALLOW_HEADERS: str = Field(
        default="*",
        validation_alias=AliasChoices("CORS_ALLOW_HEADERS", "cors_allow_headers"),
    )

    # ---- Settings loader ----
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # ignore unknown keys instead of crashing
    )

    # -------- Validators & Normalizers --------
    @field_validator("CORS_ALLOW_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            s = v.strip()
            if s.startswith("[") and s.endswith("]"):
                s = s.strip("[]")
                items = [x.strip().strip('"').strip("'") for x in s.split(",")]
                return [i for i in items if i]
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @field_validator("AI_MODE", mode="before")
    @classmethod
    def _normalize_ai_mode(cls, v: str) -> str:
        v = (v or "service").strip().lower()
        return v if v in {"service", "local"} else "service"

    def model_post_init(self, _ctx):
        """
        If EMAIL_PROVIDER is set (gmail/outlook/yahoo) and SMTP_HOST is missing,
        derive the SMTP host automatically.
        """
        if not self.SMTP_HOST and self.EMAIL_PROVIDER:
            prov = self.EMAIL_PROVIDER.strip().lower()
            hosts = {
                "gmail": "smtp.gmail.com",
                "google": "smtp.gmail.com",
                "outlook": "smtp.office365.com",
                "office365": "smtp.office365.com",
                "yahoo": "smtp.mail.yahoo.com",
            }
            self.SMTP_HOST = hosts.get(prov, None)


settings = Settings()
