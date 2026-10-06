from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")


def database_url() -> str:
    direct_url = os.getenv("DATABASE_URL")
    if direct_url:
        return direct_url
    required = ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD")
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise RuntimeError(f"Missing database configuration: {', '.join(missing)}")
    if os.environ["DB_PASSWORD"].lower().startswith(("replace-", "provide-", "your-")):
        raise RuntimeError("Replace the example DB_PASSWORD with a private database password.")
    username = quote_plus(os.environ["DB_USER"])
    password = quote_plus(os.environ["DB_PASSWORD"])
    host = os.environ["DB_HOST"]
    port = os.getenv("DB_PORT", "5432")
    name = quote_plus(os.environ["DB_NAME"])
    return f"postgresql+psycopg://{username}:{password}@{host}:{port}/{name}"


def jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY", "")
    if len(secret) < 32 or secret.lower().startswith(("generate-", "replace-", "provide-", "your-")):
        raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters.")
    return secret


def upload_max_bytes() -> int:
    return int(os.getenv("UPLOAD_MAX_BYTES", str(50 * 1024 * 1024)))


def login_attempt_limit() -> int:
    return int(os.getenv("LOGIN_ATTEMPT_LIMIT", "5"))


def login_attempt_window_seconds() -> int:
    return int(os.getenv("LOGIN_ATTEMPT_WINDOW_SECONDS", "300"))


def backup_dir() -> Path:
    configured = os.getenv("BACKUP_DIR", str(ROOT / "tmp" / "backups"))
    return Path(configured)


def session_timeout_minutes() -> int:
    return int(os.getenv("SESSION_TIMEOUT_MINUTES", "30"))