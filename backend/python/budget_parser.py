from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Sequence, Tuple

from validators import (
    FISCAL_MONTHS,
    MONTH_ALIASES,
    build_summary,
    coerce_number,
    column_matches_alias,
    detect_reporting_period,
    detect_sheet_rows,
    find_first_value,
    normalize_header,
    read_excel_rows,
    resolve_month_name,
)


BUDGET_REQUIRED_COLUMNS = [
    "account number",
    "account description",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
    "jan",
    "feb",
    "mar",
]


def _candidate_aliases() -> Dict[str, List[str]]:
    return {
        "account number": [
            "account number",
            "account no",
            "account code",
            "coa",
            "coa code",
            "coa no",
            "coa no.",
            "coano",
            "kode coa",
            "no coa",
            "kode akun",
            "account",
            "acc no",
            "acc code",
        ],
        "account description": [
            "account description",
            "account name",
            "description",
            "desc",
            "deskripsi",
            "nama akun",
            "keterangan",
            "account desc",
            "item",
            "item description",
        ],
        "annual budget": [
            "annual budget",
            "budget",
            "fy26 budget",
            "budget fy26",
            "fy2026 budget",
            "pagu",
            "anggaran",
            "total budget",
            "fix cost",
            "budget amount",
        ],
    }


def _extract_account_number(pairs: Sequence[tuple[str, Any]]) -> Optional[str]:
    for key, value in pairs:
        if column_matches_alias(key, _candidate_aliases()["account number"]):
            text = str(value or "").strip()
            if text:
                return text
    return None


def _extract_account_description(pairs: Sequence[tuple[str, Any]]) -> Optional[str]:
    for key, value in pairs:
        if column_matches_alias(key, _candidate_aliases()["account description"]):
            text = str(value or "").strip()
            if text:
                return text
    return None


def _extract_annual_budget(pairs: Sequence[tuple[str, Any]]) -> Optional[float]:
    for key, value in pairs:
        if column_matches_alias(key, _candidate_aliases()["annual budget"]):
            value_num = coerce_number(value)
            if value_num is not None:
                return value_num
    return None


def _extract_monthly_budget_values(pairs: Sequence[tuple[str, Any]]) -> Dict[str, float]:
    monthly_values: Dict[str, float] = {}
    for month in FISCAL_MONTHS:
        for key, value in pairs:
            month_alias = resolve_month_name(key)
            if month_alias == month:
                number = coerce_number(value)
                if number is not None:
                    monthly_values[month] = number
                break
            normalized = normalize_header(key)
            if normalized in {normalize_header(month), normalize_header(f"{month} 2026"), normalize_header(f"{month} 2027")}:
                number = coerce_number(value)
                if number is not None:
                    monthly_values[month] = number
                break

    return monthly_values


def parse_budget_excel(file_path: str) -> Dict[str, Any]:
    rows = read_excel_rows(file_path)
    if not rows:
        return {
            "file_type": "Budget",
            "reporting_period": "FY2026/2027",
            "total_rows": 0,
            "accepted_rows": 0,
            "rejected_rows": 0,
            "missing_required_columns": [],
            "unmatched_coas": [],
            "validation_errors": ["Uploaded Excel file is empty."],
            "rows": [],
        }

    header_index, header_row = detect_sheet_rows(rows)
    if not header_row:
        return {
            "file_type": "Budget",
            "reporting_period": "FY2026/2027",
            "total_rows": 0,
            "accepted_rows": 0,
            "rejected_rows": 0,
            "missing_required_columns": ["header row"],
            "unmatched_coas": [],
            "validation_errors": ["No readable header row detected."],
            "rows": [],
        }

    headers = [str(cell or "").strip() for cell in header_row]
    normalized_headers = [normalize_header(cell) for cell in headers]

    missing_required_columns = []
    for alias in ["account number", "account description"]:
        if not any(column_matches_alias(header, _candidate_aliases()["account number" if alias == "account number" else "account description"]) for header in headers):
            missing_required_columns.append(alias)

    has_month_columns = any(resolve_month_name(header) in FISCAL_MONTHS for header in headers)
    if not has_month_columns:
        missing_required_columns.append("monthly budget columns")

    cleaned_rows: List[Dict[str, Any]] = []
    validation_errors: List[str] = []

    for index in range(header_index + 1, len(rows)):
        row = rows[index]
        if not row or not any(cell is not None and str(cell).strip() not in {"", "-", "--"} for cell in row):
            continue

        pairs = [(headers[col_index], row[col_index] if col_index < len(row) else None) for col_index in range(len(headers))]

        coa_code = _extract_account_number(pairs)
        if not coa_code:
            validation_errors.append(f"Row {index + 1}: Missing account number / COA.")
            continue

        description = _extract_account_description(pairs) or ""
        monthly_values = _extract_monthly_budget_values(pairs)
        if not monthly_values:
            annual_budget = _extract_annual_budget(pairs)
            if annual_budget is None:
                validation_errors.append(f"Row {index + 1}: No valid monthly budget values or annual budget found.")
                continue
            validation_errors.append(f"Row {index + 1}: Monthly budget columns are missing; annual value was not converted to monthly rows.")
            continue

        for month, amount in monthly_values.items():
            if amount is None:
                continue
            cleaned_rows.append(
                {
                    "fiscal_year": detect_reporting_period(rows),
                    "coa_code": coa_code,
                    "month": month,
                    "budget_amount": amount,
                    "upload_batch_id": None,
                    "created_at": None,
                    "updated_at": None,
                    "account_name": description,
                }
            )

    summary = build_summary(
        "Budget",
        cleaned_rows,
        missing_required_columns,
        validation_errors,
        [],
        detect_reporting_period(rows),
    )
    summary["rows"] = cleaned_rows
    summary["sample_records"] = cleaned_rows[:5]
    return summary
