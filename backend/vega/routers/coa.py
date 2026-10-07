from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from backend.vega.dependencies import AdminUser, CurrentUser, DbSession
from backend.vega.models import AuditLog, Coa, Department
from backend.vega.schemas import CoaCreate, CoaStatus, CoaUpdate

router = APIRouter(prefix="/api/v1/coa", tags=["COA"])


def _item(coa: Coa) -> dict:
    return {
        "id": coa.id,
        "code": coa.code,
        "name": coa.name,
        "category": coa.category,
        "department": coa.department.code,
        "source": "GL auto-register" if coa.is_gl_derived else "Master data / Budget upload",
        "is_active": coa.is_active,
        "is_gl_derived": coa.is_gl_derived,
        "description": coa.description,
        "register_system": coa.register_system,
        "in_scope": coa.in_scope,
        "manual_budget_amount": str(coa.manual_budget_amount) if coa.manual_budget_amount is not None else None,
        "manual_budget_fy": coa.manual_budget_fy,
        "created_at": coa.created_at,
    }


@router.get("")
def list_coa(
    _user: CurrentUser,
    db: DbSession,
    search: Annotated[str | None, Query(max_length=120)] = None,
    category: Annotated[str | None, Query(max_length=120)] = None,
    department: Annotated[str | None, Query(max_length=20)] = None,
    is_active: bool | None = None,
    is_gl_derived: bool | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
):
    statement = select(Coa).options(joinedload(Coa.department))
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(or_(Coa.code.ilike(term), Coa.name.ilike(term)))
    if category:
        statement = statement.where(Coa.category == category)
    if department:
        statement = statement.join(Coa.department).where(Department.code == department)
    if is_active is not None:
        statement = statement.where(Coa.is_active.is_(is_active))
    if is_gl_derived is not None:
        statement = statement.where(Coa.is_gl_derived.is_(is_gl_derived))
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    items = db.scalars(statement.order_by(Coa.code).offset((page - 1) * page_size).limit(page_size)).unique().all()
    return {"success": True, "message": "Success", "data": {"items": [_item(coa) for coa in items], "total": total, "page": page, "page_size": page_size}}


@router.get("/{coa_id}")
def get_coa(coa_id: int, _user: CurrentUser, db: DbSession):
    coa = db.scalar(select(Coa).options(joinedload(Coa.department)).where(Coa.id == coa_id))
    if coa is None:
        raise HTTPException(status_code=404, detail="COA tidak ditemukan.")
    return {"success": True, "message": "Success", "data": _item(coa)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_coa(payload: CoaCreate, user: AdminUser, db: DbSession):
    code = payload.code.strip()
    if not re.fullmatch(r"\d{9}", code):
        raise HTTPException(status_code=422, detail="Kode COA harus terdiri dari 9 digit.")
    department = db.scalar(select(Department).where(Department.code == "MIS000"))
    if department is None:
        raise HTTPException(status_code=503, detail="Master departemen MIS000 belum di-seed.")
    if payload.initial_budget is not None and payload.fiscal_year is None:
        raise HTTPException(status_code=422, detail="Pilih tahun fiskal untuk Budget awal.")
    coa = Coa(code=code, name=payload.name.strip(), category=payload.category, department_id=department.id, is_active=payload.is_active, is_gl_derived=False,
              description=payload.description, register_system=payload.register_system, in_scope=payload.in_scope,
              manual_budget_amount=payload.initial_budget, manual_budget_fy=payload.fiscal_year if payload.initial_budget is not None else None)
    db.add(coa)
    try:
        db.flush()
        db.add(AuditLog(user_id=user.id, action="COA_CREATE", entity="coa", entity_id=coa.id, detail=f"Created COA {code}."))
        if payload.initial_budget is not None:
            db.add(AuditLog(user_id=user.id, action="MANUAL_BUDGET", entity="coa", entity_id=coa.id, detail=f"Manual Budget FY{payload.fiscal_year}: {payload.initial_budget}; allocated over 12 fiscal months. File Budget takes precedence for the same account/year."))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Kode COA sudah terdaftar.") from exc
    db.refresh(coa)
    return {"success": True, "message": "COA created.", "data": _item(coa)}


@router.put("/{coa_id}")
def update_coa(coa_id: int, payload: CoaUpdate, user: AdminUser, db: DbSession):
    coa = db.scalar(select(Coa).options(joinedload(Coa.department)).where(Coa.id == coa_id))
    if coa is None:
        raise HTTPException(status_code=404, detail="COA tidak ditemukan.")
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Tidak ada perubahan COA.")
    for field, value in changes.items():
        setattr(coa, field, value.strip() if isinstance(value, str) else value)
    db.add(AuditLog(user_id=user.id, action="COA_UPDATE", entity="coa", entity_id=coa.id, detail=f"Updated COA {coa.code}."))
    db.commit()
    db.refresh(coa)
    return {"success": True, "message": "COA updated.", "data": _item(coa)}


@router.patch("/{coa_id}/status")
def set_coa_status(coa_id: int, payload: CoaStatus, user: AdminUser, db: DbSession):
    coa = db.scalar(select(Coa).options(joinedload(Coa.department)).where(Coa.id == coa_id))
    if coa is None:
        raise HTTPException(status_code=404, detail="COA tidak ditemukan.")
    coa.is_active = payload.is_active
    db.add(AuditLog(user_id=user.id, action="COA_ACTIVATE" if coa.is_active else "COA_DEACTIVATE", entity="coa", entity_id=coa.id, detail=f"Set COA {coa.code} active={coa.is_active}."))
    db.commit()
    db.refresh(coa)
    return {"success": True, "message": "COA status updated.", "data": _item(coa)}


@router.delete("/{coa_id}")
def deactivate_coa(coa_id: int, user: AdminUser, db: DbSession):
    coa = db.scalar(select(Coa).options(joinedload(Coa.department)).where(Coa.id == coa_id))
    if coa is None:
        raise HTTPException(status_code=404, detail="COA tidak ditemukan.")
    coa.is_active = False
    db.add(AuditLog(user_id=user.id, action="COA_DEACTIVATE", entity="coa", entity_id=coa.id, detail=f"Deactivated COA {coa.code}."))
    db.commit()
    db.refresh(coa)
    return {"success": True, "message": "COA deactivated; history is retained.", "data": _item(coa)}
