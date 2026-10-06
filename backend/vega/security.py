from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import hashlib
import secrets

from backend.vega.config import jwt_secret, session_timeout_minutes

ALGORITHM = "HS256"
TOKEN_MINUTES = 30


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, username: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "username": username, "role": role, "jti": secrets.token_hex(24), "iat": now, "exp": now + timedelta(minutes=session_timeout_minutes())}
    return jwt.encode(payload, jwt_secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, jwt_secret(), algorithms=[ALGORITHM], options={"require": ["sub", "exp"]})


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
