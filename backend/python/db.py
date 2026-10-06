from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from dotenv import load_dotenv
import psycopg

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def get_db_config() -> Dict[str, Any]:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return {"conninfo": database_url}

    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "vega_db"),
        "user": os.getenv("DB_USER", "vega_user"),
        "password": os.getenv("DB_PASSWORD", "vega_password"),
    }


def get_connection() -> psycopg.Connection:
    return psycopg.connect(**get_db_config())


def _normalize_category(code: str, account_name: str) -> str:
    text = f"{code} {account_name or ''}".lower()
    if any(token in text for token in ["server", "storage", "hardware", "network", "device", "laptop", "switch", "firewall", "data center"]):
        return "Hardware"
    if any(token in text for token in ["software", "license", "saas", "cloud", "database", "cyber", "security", "erp", "office", "git", "jira", "service"]):
        return "Software"
    if any(token in text for token in ["telecom", "network", "wan", "mpls", "wifi", "router", "switch", "firewall"]):
        return "Network"
    if any(token in text for token in ["consult", "advisory", "audit", "strategy", "pmo", "project", "implementation"]):
        return "Consulting"
    if any(token in text for token in ["maintenance", "sla", "support", "service", "battery", "cooling", "ups", "managed"]):
        return "Maintenance"
    if any(token in text for token in ["training", "education", "course", "certification"]):
        return "Training"
    return "Other"


def _ensure_coa_record(cur: Any, coa_code: str, account_name: str, department: str = "MIS Department") -> None:
    code = str(coa_code or "").strip()
    name = (account_name or "Unmapped COA").strip() or "Unmapped COA"
    if not code:
        return

    cur.execute(
        """
        INSERT INTO coa_master (code, account_name, category, department, section_code, status, register_system, in_scope)
        VALUES (%s, %s, %s, %s, %s, 'Active', 'Imported Upload', TRUE)
        ON CONFLICT (code) DO UPDATE SET
            account_name = EXCLUDED.account_name,
            category = EXCLUDED.category,
            department = EXCLUDED.department,
            section_code = EXCLUDED.section_code,
            status = 'Active',
            register_system = EXCLUDED.register_system,
            in_scope = TRUE,
            updated_at = NOW()
        """,
        (code, name, _normalize_category(code, name), department, None),
    )


def _get_active_batch_id(cur: Any, upload_type: str, fiscal_year: str, target_month: Optional[str]) -> Optional[int]:
    if upload_type == "Budget":
        cur.execute(
            """
            SELECT id
            FROM upload_batches
            WHERE upload_type = %s AND fiscal_year = %s AND status = 'Active'
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (upload_type, fiscal_year),
        )
    else:
        cur.execute(
            """
            SELECT id
            FROM upload_batches
            WHERE upload_type = %s AND fiscal_year = %s AND target_month = %s AND status = 'Active'
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (upload_type, fiscal_year, target_month),
        )

    previous = cur.fetchone()
    return previous[0] if previous else None


def _replace_active_upload_batch(cur: Any, upload_type: str, fiscal_year: str, target_month: Optional[str], new_batch_id: int, reason: str) -> Optional[int]:
    previous_id = _get_active_batch_id(cur, upload_type, fiscal_year, target_month)
    if previous_id:
        cur.execute(
            """
            UPDATE upload_batches
            SET status = 'Replaced',
                replaced_batch_id = %s,
                replace_reason = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (new_batch_id, reason, previous_id),
        )
        return previous_id
    return None


def _create_upload_batch(cur: Any, *, upload_type: str, fiscal_year: str, file_name: str, row_count: int, accepted_rows: int, rejected_rows: int, total_amount: float, target_month: Optional[str], status: str = "Active") -> int:
    cur.execute(
        """
        INSERT INTO upload_batches (
            upload_type,
            fiscal_year,
            target_month,
            file_name,
            row_count,
            accepted_rows,
            rejected_rows,
            total_amount,
            status,
            replaced_batch_id,
            replace_reason
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, NULL)
        RETURNING id
        """,
        (upload_type, fiscal_year, target_month, file_name, row_count, accepted_rows, rejected_rows, total_amount, status),
    )
    return cur.fetchone()[0]


def _create_audit_note(cur: Any, *, user_name: str, user_role: str, category: str, related_batch_id: Optional[int], content: str) -> int:
    cur.execute(
        """
        INSERT INTO audit_notes (user_name, user_role, category, related_batch_id, content)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
        """,
        (user_name, user_role, category, related_batch_id, content),
    )
    return cur.fetchone()[0]


def _deduplicate_budget_rows(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    aggregated: Dict[tuple[str, str], Dict[str, Any]] = {}
    for row in rows:
        coa_code = str(row.get("coa_code") or "").strip()
        month = str(row.get("month") or "").strip()
        key = (coa_code, month)
        if key not in aggregated:
            aggregated[key] = dict(row)
        else:
            aggregated[key]["budget_amount"] = float(aggregated[key].get("budget_amount") or 0.0) + float(row.get("budget_amount") or 0.0)
    return list(aggregated.values())


def import_budget_excel(file_path: str, user_name: str = "python-import", user_role: str = "System") -> Dict[str, Any]:
    from budget_parser import parse_budget_excel

    parsed = parse_budget_excel(file_path)
    file_name = Path(file_path).name
    fiscal_year = str(parsed.get("reporting_period") or "FY2026/2027")
    rows = parsed.get("rows") or []
    total_amount = sum(float((row.get("budget_amount") or 0.0)) for row in rows)

    result: Dict[str, Any] = {
        "file_name": file_name,
        "file_type": "Budget",
        "fiscal_year": fiscal_year,
        "row_count": int(parsed.get("total_rows") or len(rows)),
        "accepted_rows": int(parsed.get("accepted_rows") or len(rows)),
        "rejected_rows": int(parsed.get("rejected_rows") or max(0, (parsed.get("total_rows") or 0) - len(rows))),
        "inserted_rows": 0,
        "batch_id": None,
        "audit_note_id": None,
        "warnings": parsed.get("warnings") or [],
        "validation_errors": parsed.get("validation_errors") or [],
    }

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                previous_batch_id = _get_active_batch_id(cur, "Budget", fiscal_year, None)
                if previous_batch_id:
                    cur.execute(
                        "UPDATE upload_batches SET status = 'Replaced', replaced_batch_id = NULL, replace_reason = %s, updated_at = NOW() WHERE id = %s",
                        ("New budget upload replaced previous active batch.", previous_batch_id),
                    )

                batch_id = _create_upload_batch(
                    cur,
                    upload_type="Budget",
                    fiscal_year=fiscal_year,
                    file_name=file_name,
                    row_count=result["row_count"],
                    accepted_rows=result["accepted_rows"],
                    rejected_rows=result["rejected_rows"],
                    total_amount=total_amount,
                    target_month=None,
                    status="Rejected" if not rows else "Active",
                )
                result["batch_id"] = batch_id

                if previous_batch_id:
                    cur.execute(
                        "UPDATE upload_batches SET replaced_batch_id = %s, replace_reason = %s, updated_at = NOW() WHERE id = %s",
                        (batch_id, "New budget upload replaced previous active batch.", previous_batch_id),
                    )

                if rows:
                    deduped_rows = _deduplicate_budget_rows(rows)
                    for row in deduped_rows:
                        coa_code = str(row.get("coa_code") or "").strip()
                        account_name = str(row.get("account_name") or "").strip() or coa_code
                        _ensure_coa_record(cur, coa_code, account_name)
                        cur.execute(
                            """
                            INSERT INTO budgets (fiscal_year, coa_code, month, budget_amount, upload_batch_id)
                            VALUES (%s, %s, %s, %s, %s)
                            """,
                            (fiscal_year, coa_code, row.get("month"), float(row.get("budget_amount") or 0.0), batch_id),
                        )
                    result["inserted_rows"] = len(deduped_rows)
                    cur.execute(
                        "UPDATE upload_batches SET status = 'Active', updated_at = NOW() WHERE id = %s",
                        (batch_id,),
                    )

                audit_note_id = _create_audit_note(
                    cur,
                    user_name=user_name,
                    user_role=user_role,
                    category="Upload",
                    related_batch_id=batch_id,
                    content=(
                        f"Budget upload {file_name} processed with {result['accepted_rows']} accepted rows and {result['rejected_rows']} rejected rows."
                    ),
                )
                result["audit_note_id"] = audit_note_id
    finally:
        conn.close()

    return result


def import_gl_excel(file_path: str, user_name: str = "python-import", user_role: str = "System") -> Dict[str, Any]:
    from gl_parser import parse_gl_excel

    parsed = parse_gl_excel(file_path)
    file_name = Path(file_path).name
    fiscal_year = str(parsed.get("reporting_period") or "FY2026/2027")
    rows = parsed.get("rows") or []
    total_amount = sum(float((row.get("actual_amount") or 0.0)) for row in rows)

    result: Dict[str, Any] = {
        "file_name": file_name,
        "file_type": "GL",
        "fiscal_year": fiscal_year,
        "row_count": int(parsed.get("total_rows") or len(rows)),
        "accepted_rows": int(parsed.get("accepted_rows") or len(rows)),
        "rejected_rows": int(parsed.get("rejected_rows") or max(0, (parsed.get("total_rows") or 0) - len(rows))),
        "inserted_rows": 0,
        "batch_id": None,
        "audit_note_id": None,
        "warnings": parsed.get("warnings") or [],
        "validation_errors": parsed.get("validation_errors") or [],
    }

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                target_month = None
                if rows:
                    target_month = str(rows[0].get("period_month") or "Jan")

                previous_batch_id = _get_active_batch_id(cur, "Monthly GL", fiscal_year, target_month)
                if previous_batch_id:
                    cur.execute(
                        "UPDATE upload_batches SET status = 'Replaced', replaced_batch_id = NULL, replace_reason = %s, updated_at = NOW() WHERE id = %s",
                        ("New GL upload replaced previous active monthly batch.", previous_batch_id),
                    )

                batch_id = _create_upload_batch(
                    cur,
                    upload_type="Monthly GL",
                    fiscal_year=fiscal_year,
                    file_name=file_name,
                    row_count=result["row_count"],
                    accepted_rows=result["accepted_rows"],
                    rejected_rows=result["rejected_rows"],
                    total_amount=total_amount,
                    target_month=target_month,
                    status="Rejected" if not rows else "Active",
                )
                result["batch_id"] = batch_id

                if previous_batch_id:
                    cur.execute(
                        "UPDATE upload_batches SET replaced_batch_id = %s, replace_reason = %s, updated_at = NOW() WHERE id = %s",
                        (batch_id, "New GL upload replaced previous active monthly batch.", previous_batch_id),
                    )

                if rows:
                    for row in rows:
                        coa_code = str(row.get("coa_code") or "").strip()
                        account_name = str(row.get("description") or "").strip() or coa_code
                        _ensure_coa_record(cur, coa_code, account_name)
                        cur.execute(
                            """
                            INSERT INTO gl_transactions (
                                fiscal_year,
                                period_month,
                                coa_code,
                                actual_amount,
                                debit,
                                credit,
                                doc_no,
                                posting_date,
                                vendor_name,
                                description,
                                department,
                                section_code,
                                currency,
                                upload_batch_id
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                fiscal_year,
                                row.get("period_month"),
                                coa_code,
                                float(row.get("actual_amount") or 0.0),
                                float(row.get("debit") or 0.0),
                                float(row.get("credit") or 0.0),
                                row.get("doc_no"),
                                row.get("posting_date"),
                                row.get("vendor_name"),
                                row.get("description"),
                                row.get("department") or "MIS Department",
                                row.get("section_code"),
                                row.get("currency") or "USD",
                                batch_id,
                            ),
                        )
                    result["inserted_rows"] = len(rows)
                    cur.execute(
                        "UPDATE upload_batches SET status = 'Active', updated_at = NOW() WHERE id = %s",
                        (batch_id,),
                    )

                audit_note_id = _create_audit_note(
                    cur,
                    user_name=user_name,
                    user_role=user_role,
                    category="Upload",
                    related_batch_id=batch_id,
                    content=(
                        f"GL upload {file_name} processed with {result['accepted_rows']} accepted rows and {result['rejected_rows']} rejected rows."
                    ),
                )
                result["audit_note_id"] = audit_note_id
    finally:
        conn.close()

    return result


if __name__ == "__main__":
    print("DB helpers loaded.")
