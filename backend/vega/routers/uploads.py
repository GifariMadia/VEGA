from __future__ import annotations

import os
import tempfile
import threading
import time
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import joinedload

from backend.python.vega_excel import ExcelFileError, FISCAL_MONTHS, parse_budget_file, parse_gl_file
from backend.vega.backup import BackupError, create_database_backup
from backend.vega.config import database_url, upload_max_bytes
from backend.vega.dependencies import AdminUser, CurrentUser, DbSession
from backend.vega.models import ActualEntry, AuditLog, BudgetEntry, Coa, Department, UploadBatch
from backend.vega.schemas import ConfirmUpload

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])
PREVIEW_TTL_SECONDS = 30 * 60
ALLOWED_CONTENT_TYPES = {None, "", "application/octet-stream", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
_previews: dict[str, dict[str, Any]] = {}
_preview_lock = threading.Lock()


def _json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


def _period_label(period: int | None) -> str:
    if period is None:
        return "Apr-Mar"
    return f"{FISCAL_MONTHS[period - 1]}"


def _batch_payload(batch: UploadBatch) -> dict[str, Any]:
    return {
        "id": batch.id,
        "kind": batch.kind,
        "filename": batch.filename,
        "fiscal_year": batch.fy,
        "period": batch.period,
        "period_label": _period_label(batch.period),
        "uploaded_by": batch.uploader.full_name,
        "uploaded_at": batch.uploaded_at,
        "rows_read": batch.rows_read,
        "rows_imported": batch.rows_imported,
        "rows_rejected": batch.rows_rejected,
        "total_amount": format(batch.total_amount, "f"),
        "status": batch.status,
        "replaced_batch_id": batch.replaced_batch_id,
    }


def _find_active(db, parsed: dict[str, Any]) -> UploadBatch | None:
    statement = select(UploadBatch).options(joinedload(UploadBatch.uploader)).where(
        UploadBatch.kind == parsed["kind"],
        UploadBatch.fy == parsed["fiscal_year"],
        UploadBatch.status == "ACTIVE",
    )
    if parsed["kind"] == "GL":
        statement = statement.where(UploadBatch.period == parsed["period"])
    else:
        statement = statement.where(UploadBatch.period.is_(None))
    return db.scalar(statement)


def _preview_data(parsed: dict[str, Any], preview_id: str | None, existing: UploadBatch | None) -> dict[str, Any]:
    preview_rows = parsed.get("records", [])
    if parsed["kind"] == "BUDGET":
        monthly: dict[str, dict[str, Any]] = {}
        for record in preview_rows:
            monthly.setdefault(record["coa_code"], {})[FISCAL_MONTHS[record["period"] - 1]] = record["amount"]
        preview_rows = [{**account, "monthly": monthly.get(account["coa_code"], {})} for account in parsed.get("accounts", [])]
    data = {
        "preview_id": preview_id,
        "kind": parsed["kind"],
        "sheet_read": parsed.get("sheet_read"),
        "fiscal_year": parsed.get("fiscal_year"),
        "period": parsed.get("period"),
        "period_label": _period_label(parsed.get("period")),
        "rows_read": parsed.get("rows_read", 0),
        "rows_accepted": parsed.get("rows_accepted", 0),
        "rows_rejected": parsed.get("rows_rejected", 0),
        "rows_filtered": parsed.get("rows_filtered", 0),
        "filtered_rows": parsed.get("filtered_rows", []) + parsed.get("rows_skipped", []),
        "total_amount": parsed.get("total_amount", Decimal("0.00")),
        "sample_rows": parsed.get("sample_rows", []),
        "preview_rows": preview_rows,
        "unknown_coas": parsed.get("unknown_coas", []),
        "duplicates": parsed.get("duplicates", []),
        "warnings": parsed.get("warnings", []),
        "already_loaded": {"exists": existing is not None, "existing_batch": _batch_payload(existing) if existing else None},
    }
    return _json_safe(data)


@router.get("/templates/{kind}")
def download_template(kind: Literal["BUDGET", "GL"], _user: CurrentUser):
    path = Path(__file__).resolve().parents[3] / "Docs" / "Source" / ("Budget Dummy.xlsx" if kind == "BUDGET" else "GL Dummy.xlsx")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Contoh template tidak tersedia.")
    return FileResponse(path, filename=path.name, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@router.post("/preview")
async def preview_upload(
    user: AdminUser,
    db: DbSession,
    kind: Annotated[Literal["BUDGET", "GL"], Form()],
    file: Annotated[UploadFile, File()],
    register_new_coas: Annotated[bool, Form()] = True,
):
    filename = Path(file.filename or "upload.xlsx").name
    errors: list[dict[str, Any]] = []
    suffix = Path(filename).suffix.casefold()
    if suffix != ".xlsx":
        errors.append({"row": None, "issue": "Format file tidak didukung.", "expected": "Unggah workbook .xlsx."})
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        errors.append({"row": None, "issue": "Content-Type file bukan workbook Excel yang didukung.", "expected": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet."})
    if errors:
        return {"success": False, "message": "File ditolak; tidak ada data yang disimpan.", "data": {"preview_id": None}, "errors": errors}

    size = 0
    path = None
    try:
        with tempfile.NamedTemporaryFile(prefix="vega-preview-", suffix=".xlsx", delete=False) as temporary:
            path = temporary.name
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > upload_max_bytes():
                    return {"success": False, "message": "File melebihi batas ukuran.", "data": {"preview_id": None}, "errors": [{"row": None, "issue": "Ukuran file terlalu besar.", "expected": f"Maksimum {upload_max_bytes()} byte."}]}
                temporary.write(chunk)
        if size == 0:
            return {"success": False, "message": "File kosong.", "data": {"preview_id": None}, "errors": [{"row": None, "issue": "File tidak berisi data.", "expected": "Pilih workbook Excel yang tidak kosong."}]}

        if kind == "BUDGET":
            from starlette.concurrency import run_in_threadpool
            parsed = await run_in_threadpool(parse_budget_file, path)
        else:
            known_codes = set(db.scalars(select(Coa.code).where(Coa.is_active.is_(True))).all())
            from starlette.concurrency import run_in_threadpool
            parsed = await run_in_threadpool(parse_gl_file, path, known_codes, register_new_coas)
    except ExcelFileError as exc:
        return {"success": False, "message": "File ditolak; tidak ada data yang disimpan.", "data": {"preview_id": None}, "errors": [{"row": None, "issue": str(exc), "expected": "File harus berupa workbook Excel .xlsx yang valid."}]}
    finally:
        await file.close()
        if path and os.path.exists(path):
            os.unlink(path)

    if not parsed["success"]:
        return {"success": False, "message": "File ditolak; tidak ada data yang disimpan dan data sebelumnya tidak berubah.", "data": _preview_data(parsed, None, None), "errors": parsed["errors"]}

    existing = _find_active(db, parsed)
    preview_id = os.urandom(24).hex()
    with _preview_lock:
        expired = [key for key, value in _previews.items() if value["created_at"] + PREVIEW_TTL_SECONDS < time.monotonic()]
        for key in expired:
            _previews.pop(key, None)
        _previews[preview_id] = {"created_at": time.monotonic(), "user_id": user.id, "filename": filename, "parsed": parsed, "register_new_coas": register_new_coas}
    return {"success": True, "message": "Preview berhasil dibuat; belum ada data yang disimpan.", "data": _preview_data(parsed, preview_id, existing), "errors": []}


@router.post("/confirm")
def confirm_upload(payload: ConfirmUpload, user: AdminUser, db: DbSession):
    with _preview_lock:
        preview = _previews.get(payload.preview_id)
        if preview and preview["created_at"] + PREVIEW_TTL_SECONDS < time.monotonic():
            _previews.pop(payload.preview_id, None)
            preview = None
    if preview is None or preview["user_id"] != user.id:
        raise HTTPException(status_code=410, detail="Preview tidak ditemukan atau sudah kedaluwarsa; unggah ulang file.")
    if payload.decision == "CANCEL":
        with _preview_lock:
            _previews.pop(payload.preview_id, None)
        return {"success": True, "message": "Preview dibatalkan; tidak ada data yang disimpan.", "data": {}}

    parsed = preview["parsed"]
    try:
        existing = _find_active(db, parsed)
        if existing and payload.decision != "REPLACE":
            raise HTTPException(status_code=409, detail="Periode sudah memiliki data aktif; pilih REPLACE atau CANCEL.")
        if not existing and payload.decision == "REPLACE":
            raise HTTPException(status_code=409, detail="Tidak ada data aktif untuk diganti; pilih CONFIRM.")

        if existing:
            existing.status = "REPLACED"
            try:
                backup_path = create_database_backup(database_url(), label=f"replace-batch-{existing.id}")
            except BackupError as exc:
                raise HTTPException(status_code=503, detail="Backup sebelum penggantian gagal; data aktif tidak diubah.") from exc
            db.add(AuditLog(user_id=user.id, action="BACKUP_BEFORE_REPLACE", entity="upload_batch", entity_id=existing.id, detail=f"Created pre-replace database backup at {backup_path.name}."))
            if parsed["kind"] == "BUDGET":
                db.execute(delete(BudgetEntry).where(BudgetEntry.batch_id == existing.id))
            else:
                db.execute(delete(ActualEntry).where(ActualEntry.batch_id == existing.id))
            db.flush()

        batch = UploadBatch(
            kind=parsed["kind"],
            filename=preview["filename"],
            fy=parsed["fiscal_year"],
            period=parsed["period"],
            uploaded_by=user.id,
            rows_read=parsed["rows_read"],
            rows_imported=parsed["rows_accepted"],
            rows_rejected=parsed["rows_rejected"],
            total_amount=parsed["total_amount"],
            status="ACTIVE",
            replaced_batch_id=existing.id if existing else None,
        )
        db.add(batch)
        db.flush()

        if parsed["kind"] == "BUDGET":
            department = db.scalar(select(Department).where(Department.code == "MIS000"))
            if department is None:
                raise HTTPException(status_code=503, detail="Master departemen MIS000 belum di-seed.")
            coa_by_code = {coa.code: coa for coa in db.scalars(select(Coa)).all()}
            records_by_code: dict[str, list[dict[str, Any]]] = {}
            for record in parsed["records"]:
                records_by_code.setdefault(record["coa_code"], []).append(record)
            for account in parsed["accounts"]:
                coa = coa_by_code.get(account["coa_code"])
                if coa is None:
                    coa = Coa(code=account["coa_code"], name=account["name"], category=account["category"], department_id=department.id, is_active=True, is_gl_derived=False)
                    db.add(coa)
                    db.flush()
                    coa_by_code[coa.code] = coa
                else:
                    coa.name = account["name"]
                    coa.category = account["category"]
                    coa.is_active = True
                    coa.is_gl_derived = False
                for record in records_by_code.get(coa.code, []):
                    db.add(BudgetEntry(fy=parsed["fiscal_year"], period=record["period"], coa_id=coa.id, amount=record["amount"], batch_id=batch.id))
        else:
            coa_by_code = {coa.code: coa for coa in db.scalars(select(Coa)).all()}
            department = db.scalar(select(Department).where(Department.code == "MIS000"))
            new_codes = {item["coa_code"] for item in parsed.get("unknown_coas", [])}
            for record in parsed["records"]:
                coa = coa_by_code.get(record["coa_code"])
                if coa is None or not coa.is_active:
                    if not preview.get("register_new_coas") or record["coa_code"] not in new_codes:
                        raise HTTPException(status_code=409, detail=f"Kode COA {record['coa_code']} tidak lagi terdaftar; jalankan preview ulang.")
                    if department is None:
                        raise HTTPException(status_code=503, detail="Master departemen MIS000 belum di-seed.")
                    if coa is None:
                        coa = Coa(code=record["coa_code"], name=record["description"] or record["coa_code"], department_id=department.id, is_active=True, is_gl_derived=True, register_system="Auto-Detected")
                        db.add(coa)
                        db.flush()
                        coa_by_code[coa.code] = coa
                    else:
                        coa.is_active = True
                    db.add(AuditLog(user_id=user.id, action="GL_COA_REGISTER", entity="coa", entity_id=coa.id, detail=f"COA {coa.code} registered from confirmed GL batch {batch.id}"))
                db.add(ActualEntry(
                    fy=parsed["fiscal_year"], period=parsed["period"], coa_id=coa.id,
                    amount=record["amount"], account_number=record["account_number"], section=record["section"],
                    txn_date=record["txn_date"], description=record["description"], currency=record["currency"],
                    exch_rate=record["exchange_rate"], debit_native=record["debit_native"], credit_native=record["credit_native"],
                    reference=record["reference"], vendor=record["vendor"], row_no=record["row_number"], batch_id=batch.id,
                ))

        action = "REPLACE" if existing else "UPLOAD"
        detail = f"{parsed['kind']} {parsed['fiscal_year']} {_period_label(parsed['period'])}; {parsed['rows_accepted']} rows; total {parsed['total_amount']}"
        if existing and payload.replace_reason:
            detail += f"; reason: {payload.replace_reason.strip()}"
        db.add(AuditLog(user_id=user.id, action=action, entity="upload_batch", entity_id=batch.id, detail=detail))
        db.commit()
        db.refresh(batch)
    except HTTPException:
        db.rollback()
        raise
    except (IntegrityError, SQLAlchemyError) as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Simpan gagal; seluruh perubahan dibatalkan.") from exc

    with _preview_lock:
        _previews.pop(payload.preview_id, None)

    return {"success": True, "message": "Unggahan berhasil disimpan.", "data": {"batch_id": batch.id, "kind": batch.kind, "fiscal_year": batch.fy, "period": batch.period, "rows_read": batch.rows_read, "rows_imported": batch.rows_imported, "rows_rejected": batch.rows_rejected, "total_amount": format(batch.total_amount, "f"), "status": batch.status}}


@router.get("/batches")
def list_batches(_user: CurrentUser, db: DbSession, kind: Literal["BUDGET", "GL"] | None = None, fiscal_year: int | None = None, status: Literal["ACTIVE", "REPLACED", "CANCELLED"] | None = None, page: int = 1, page_size: int = 20):
    if page < 1 or page_size < 1 or page_size > 100:
        raise HTTPException(status_code=422, detail="Pagination tidak valid.")
    statement = select(UploadBatch).options(joinedload(UploadBatch.uploader))
    if kind:
        statement = statement.where(UploadBatch.kind == kind)
    if fiscal_year:
        statement = statement.where(UploadBatch.fy == fiscal_year)
    if status:
        statement = statement.where(UploadBatch.status == status)
    batches = db.scalars(statement.order_by(UploadBatch.uploaded_at.desc(), UploadBatch.id.desc()).offset((page - 1) * page_size).limit(page_size)).unique().all()
    items = [_batch_payload(batch) for batch in batches]
    # Evaluate actuals against the same monthly Budget used by the dashboard.
    from backend.vega.routers.dashboard import dashboard_summary
    summaries = {}
    for batch, item in zip(batches, items):
        item["comparison"] = None
        if batch.kind != "GL" or batch.status != "ACTIVE":
            continue
        if batch.fy not in summaries:
            summaries[batch.fy] = dashboard_summary(_user, db, batch.fy, None, None, None)["data"]
        summary = summaries[batch.fy]
        monthly = summary["monthly"][batch.period - 1]
        item["comparison"] = {**monthly, "over_budget_accounts_count": sum(account["monthly"][batch.period - 1]["status"] == "OVER_BUDGET" for account in summary["accounts"])}
    return {"success": True, "message": "Success", "data": {"items": items, "page": page, "page_size": page_size}}


@router.get("/batches/{batch_id}")
def get_batch(batch_id: int, _user: CurrentUser, db: DbSession):
    batch = db.scalar(select(UploadBatch).options(joinedload(UploadBatch.uploader)).where(UploadBatch.id == batch_id))
    if batch is None:
        raise HTTPException(status_code=404, detail="Riwayat unggahan tidak ditemukan.")
    return {"success": True, "message": "Success", "data": _batch_payload(batch)}


@router.post("/batches/{batch_id}/cancel")
def cancel_batch(batch_id: int, user: AdminUser, db: DbSession):
    batch = db.scalar(select(UploadBatch).where(UploadBatch.id == batch_id).with_for_update())
    if batch is None:
        raise HTTPException(status_code=404, detail="Riwayat unggahan tidak ditemukan.")
    if batch.status == "CANCELLED":
        raise HTTPException(status_code=409, detail="Unggahan sudah dibatalkan.")
    try:
        if batch.kind == "BUDGET":
            db.execute(delete(BudgetEntry).where(BudgetEntry.batch_id == batch.id))
        else:
            db.execute(delete(ActualEntry).where(ActualEntry.batch_id == batch.id))
        batch.status = "CANCELLED"
        db.add(AuditLog(user_id=user.id, action="CANCEL", entity="upload_batch", entity_id=batch.id, detail=f"Cancelled upload batch {batch.id}; this does not restore a replaced version."))
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Pembatalan gagal; perubahan dibatalkan.") from exc
    return {"success": True, "message": "Unggahan dibatalkan dan datanya dihapus. Versi sebelumnya tidak dipulihkan.", "data": {"batch_id": batch.id, "status": batch.status}}
