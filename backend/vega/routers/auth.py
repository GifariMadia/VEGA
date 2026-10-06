from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update

from backend.vega.config import login_attempt_limit, login_attempt_window_seconds
from backend.vega.dependencies import CurrentUser, DbSession, bearer
from fastapi.security import HTTPAuthorizationCredentials
from backend.vega.models import AuditLog, User, AuthSession
from backend.vega.schemas import LoginRequest, UserPublic
from backend.vega.security import create_access_token, verify_password, decode_access_token, token_hash

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
FAILED_LOGINS: dict[str, list[datetime]] = {}
LOGIN_ATTEMPT_LIMIT = login_attempt_limit()
LOGIN_ATTEMPT_WINDOW_SECONDS = login_attempt_window_seconds()


def _username_key(username: str) -> str:
    return (username or "").strip().lower()


def _is_login_locked(username: str) -> bool:
    key = _username_key(username)
    if not key:
        return False
    now = datetime.now(timezone.utc)
    recent = [ts for ts in FAILED_LOGINS.get(key, []) if ts >= now - timedelta(seconds=LOGIN_ATTEMPT_WINDOW_SECONDS)]
    FAILED_LOGINS[key] = recent
    return len(recent) > LOGIN_ATTEMPT_LIMIT


def _record_failed_login(username: str) -> None:
    key = _username_key(username)
    if not key:
        return
    now = datetime.now(timezone.utc)
    attempts = FAILED_LOGINS.setdefault(key, [])
    attempts.append(now)
    FAILED_LOGINS[key] = [ts for ts in attempts if ts >= now - timedelta(seconds=LOGIN_ATTEMPT_WINDOW_SECONDS)]


def _clear_failed_login(username: str) -> None:
    FAILED_LOGINS.pop(_username_key(username), None)


@router.post("/login")
def login(payload: LoginRequest, db: DbSession):
    username = payload.username.strip()
    if _is_login_locked(username):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Terlalu banyak percobaan login gagal. Tunggu beberapa menit lalu coba lagi.")

    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(payload.password, user.password_hash):
        _record_failed_login(username)
        db.add(AuditLog(user_id=user.id if user else None, action="LOGIN_FAILED", entity="user", entity_id=user.id if user else None, detail="Invalid credentials."))
        db.commit()
        if _is_login_locked(username):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Terlalu banyak percobaan login gagal. Tunggu beberapa menit lalu coba lagi.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username atau password salah.")
    if not user.is_active:
        db.add(AuditLog(user_id=user.id, action="LOGIN_FAILED", entity="user", entity_id=user.id, detail="Inactive account."))
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akun tidak aktif.")

    _clear_failed_login(username)
    token = create_access_token(user.id, user.username, user.role)
    db.add(AuthSession(token_hash=token_hash(token), user_id=user.id, expires_at=datetime.fromtimestamp(decode_access_token(token)["exp"], timezone.utc), revoked=False))
    db.add(AuditLog(user_id=user.id, action="LOGIN", entity="user", entity_id=user.id, detail="Login successful."))
    db.commit()
    return {"success": True, "message": "Success", "data": {"access_token": token, "token_type": "bearer", "user": UserPublic.model_validate(user).model_dump(mode="json")}}


@router.post("/logout")
def logout(user: CurrentUser, db: DbSession, credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)]):
    session = db.get(AuthSession, token_hash(credentials.credentials))
    session.revoked = True
    db.add(AuditLog(user_id=user.id, action="LOGOUT", entity="user", entity_id=user.id, detail="Session revoked."))
    db.commit()
    return {"success": True, "message": "Logout successful. Session revoked.", "data": {}}


@router.get("/me")
def me(user: CurrentUser):
    return {"success": True, "message": "Success", "data": UserPublic.model_validate(user).model_dump(mode="json")}


from backend.vega.schemas import ChangePasswordRequest

@router.put("/me/password")
def change_password(payload: ChangePasswordRequest, user: CurrentUser, db: DbSession):
    old_password = payload.old_password
    new_password = payload.new_password
    if not verify_password(old_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password lama tidak sesuai.")
    from backend.vega.security import hash_password

    user.password_hash = hash_password(new_password)
    db.execute(update(AuthSession).where(AuthSession.user_id == user.id).values(revoked=True))
    db.add(AuditLog(user_id=user.id, action="PASSWORD_CHANGE", entity="user", entity_id=user.id, detail="User changed own password."))
    db.commit()
    return {"success": True, "message": "Password updated.", "data": {}}
