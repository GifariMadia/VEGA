from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select, update

from backend.vega.dependencies import AdminUser, DbSession
from backend.vega.models import AuditLog, User, AuthSession
from backend.vega.schemas import UserCreate, UserPublic, UserUpdate
from backend.vega.security import hash_password

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


def _public(user: User) -> dict:
    return UserPublic.model_validate(user).model_dump(mode="json")


def _active_admin_count(db: DbSession) -> int:
    return db.scalar(select(func.count()).select_from(User).where(User.role == "ADMIN", User.is_active.is_(True))) or 0


@router.get("")
def list_users(_admin: AdminUser, db: DbSession):
    users = db.scalars(select(User).order_by(User.username)).all()
    return {"success": True, "message": "Success", "data": {"items": [_public(user) for user in users], "total": len(users)}}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, admin: AdminUser, db: DbSession):
    username = payload.username.strip()
    if db.scalar(select(User.id).where(func.lower(User.username) == username.lower())):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username sudah dipakai.")
    user = User(username=username, full_name=payload.full_name.strip(), role=payload.role, is_active=True, password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    db.add(AuditLog(user_id=admin.id, action="USER_CREATE", entity="user", entity_id=user.id, detail=f"Created {user.username} with role {user.role}."))
    db.commit()
    return {"success": True, "message": "User dibuat.", "data": _public(user)}


@router.put("/{user_id}")
def update_user(user_id: int, payload: UserUpdate, admin: AdminUser, db: DbSession):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan.")
    new_role = payload.role if payload.role is not None else user.role
    new_active = payload.is_active if payload.is_active is not None else user.is_active
    if user.id == admin.id and (new_role != "ADMIN" or not new_active):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Anda tidak dapat menonaktifkan atau menurunkan role akun sendiri.")
    if user.role == "ADMIN" and user.is_active and (new_role != "ADMIN" or not new_active) and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Minimal harus ada satu administrator aktif.")

    changes = []
    if payload.full_name is not None and payload.full_name.strip() != user.full_name:
        user.full_name = payload.full_name.strip()
        changes.append("full_name")
    if new_role != user.role:
        user.role = new_role
        changes.append("role")
    if new_active != user.is_active:
        user.is_active = new_active
        changes.append("activated" if new_active else "deactivated")
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
        db.execute(update(AuthSession).where(AuthSession.user_id == user.id).values(revoked=True))
        changes.append("password_reset")
    if not new_active:
        db.execute(update(AuthSession).where(AuthSession.user_id == user.id).values(revoked=True))
    db.add(AuditLog(user_id=admin.id, action="USER_UPDATE", entity="user", entity_id=user.id, detail=f"{user.username}: {', '.join(changes) or 'no change'}."))
    db.commit()
    return {"success": True, "message": "User diperbarui.", "data": _public(user)}
