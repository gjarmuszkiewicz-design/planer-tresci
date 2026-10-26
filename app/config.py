"""Ustawienia z zmiennych środowiskowych (Railway → Variables)."""
from __future__ import annotations

import os


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip() or "sqlite:///./planer.db"
    # Railway i Heroku podają czasem stary prefiks postgres://, którego SQLAlchemy nie rozpoznaje
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


class Settings:
    database_url = _database_url()
    secret_key = os.getenv("SECRET_KEY", "").strip() or "dev-tylko-lokalnie-zmien-na-produkcji"
    cookie_secure = os.getenv("COOKIE_SECURE", "0").strip() == "1"
    # pierwsze konto administratora – tworzone przy starcie, gdy w bazie nie ma jeszcze żadnego użytkownika
    admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "").strip()
    admin_name = os.getenv("ADMIN_NAME", "").strip() or "Administrator"
    max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "15"))


settings = Settings()
