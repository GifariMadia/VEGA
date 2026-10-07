from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from backend.python.vega_excel import FISCAL_MONTHS
from backend.vega.dependencies import CurrentUser, DbSession
from backend.vega.models import ActualEntry, BudgetEntry, Coa, UploadBatch

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])
QUARTERS = {"Q1": (1, 2, 3), "Q2": (4, 5, 6), "Q3": (7, 8, 9), "Q4": (10, 11, 12)}
CENT = Decimal("0.01")
ZERO = Decimal("0")


def _round(value: Decimal) -> Decimal:
    return value.quantize(CENT)


def _status(budget: Decimal, actual: Decimal) -> str:
    """FR-36/FR-37: zero tolerance on the rounded variance; negative budget is an allocation."""
    budget = _round(budget)
    if budget < 0:
        return "ALOKASI"
    variance = _round(budget - actual)
    if variance > 0:
        return "UNDER_BUDGET"
    if variance < 0:
        return "OVER_BUDGET"
    return "ON_BUDGET"


def _pct(variance: Decimal, budget: Decimal) -> str | None:
    """FR-38: only defined when the budget is non-zero."""
    if _round(budget) == 0:
        return None
    return format(_round(variance / abs(budget) * 100), "f")


def _money(value: Decimal) -> str:
    return format(_round(value), "f")


def _line(budget: Decimal, actual: Decimal, evaluated: bool = True, budget_available: bool = True) -> dict[str, str | None]:
    variance = budget - actual
    return {
        "budget": _money(budget),
        "actual": _money(actual),
        "variance": _money(variance),
        "variance_pct": _pct(variance, budget) if evaluated and budget_available else None,
        "status": "PENDING_BUDGET" if not budget_available else _status(budget, actual) if evaluated else "PENDING_GL",
    }


@router.get("")
def dashboard_summary(
    _user: CurrentUser,
    db: DbSession,
    fiscal_year: Annotated[int, Query(ge=2000, le=2200)],
    quarter: Annotated[str | None, Query(pattern=r"^Q[1-4]$")] = None,
    category: Annotated[str | None, Query(max_length=120)] = None,
    period_to: Annotated[int | None, Query(ge=1, le=12)] = None,
):
    budget_rows = db.execute(
        select(BudgetEntry.coa_id, BudgetEntry.period, func.sum(BudgetEntry.amount))
        .join(UploadBatch, UploadBatch.id == BudgetEntry.batch_id)
        .where(UploadBatch.status == "ACTIVE", BudgetEntry.fy == fiscal_year)
        .group_by(BudgetEntry.coa_id, BudgetEntry.period)
    ).all()
    actual_rows = db.execute(
        select(ActualEntry.coa_id, ActualEntry.period, func.sum(ActualEntry.amount))
        .join(UploadBatch, UploadBatch.id == ActualEntry.batch_id)
        .where(UploadBatch.status == "ACTIVE", ActualEntry.fy == fiscal_year)
        .group_by(ActualEntry.coa_id, ActualEntry.period)
    ).all()
    loaded_periods = sorted(
        db.scalars(
            select(UploadBatch.period).where(UploadBatch.kind == "GL", UploadBatch.fy == fiscal_year, UploadBatch.status == "ACTIVE")
        ).all()
    )
    months_loaded = len(loaded_periods)

    all_coas = db.execute(select(Coa.id, Coa.code, Coa.name, Coa.category, Coa.is_active, Coa.is_gl_derived, Coa.manual_budget_amount, Coa.manual_budget_fy, Coa.in_scope)).all()
    available_categories = sorted({coa.category or "Uncategorized" for coa in all_coas})
    coa_by_id = {coa.id: coa for coa in all_coas if not category or (coa.category or "Uncategorized") == category}

    budget: dict[tuple[int, int], Decimal] = defaultdict(Decimal)
    actual: dict[tuple[int, int], Decimal] = defaultdict(Decimal)
    for coa_id, period, amount in budget_rows:
        if coa_id in coa_by_id:
            budget[(coa_id, period)] += Decimal(amount or 0)
    for coa_id, period, amount in actual_rows:
        if coa_id in coa_by_id:
            actual[(coa_id, period)] += Decimal(amount or 0)
    file_budget_coas = {row[0] for row in budget_rows}
    for coa_id, coa in coa_by_id.items():
        if coa.manual_budget_fy == fiscal_year and coa.manual_budget_amount is not None and coa.is_active and coa.in_scope and coa_id not in file_budget_coas:
            annual = Decimal(coa.manual_budget_amount)
            monthly_cents, remainder = divmod(int(annual * 100), 12)
            for period in range(1, 13):
                budget[(coa_id, period)] += Decimal(monthly_cents + (period > 12 - remainder)) / 100

    budget_available = bool(db.scalar(select(UploadBatch.id).where(UploadBatch.kind == "BUDGET", UploadBatch.fy == fiscal_year, UploadBatch.status == "ACTIVE").limit(1))) or any(coa.manual_budget_fy == fiscal_year and coa.manual_budget_amount is not None and coa.is_active and coa.in_scope for coa in all_coas)
    selected = set(QUARTERS[quarter]) if quarter else set(range(1, 13))
    if period_to is not None:
        selected &= set(range(1, period_to + 1))
    evaluated = bool(selected.intersection(loaded_periods))
    month_budget = [ZERO] * 12
    month_actual = [ZERO] * 12
    for (_coa, period), value in budget.items():
        month_budget[period - 1] += value
    for (_coa, period), value in actual.items():
        month_actual[period - 1] += value

    account_rows = []
    category_totals: dict[str, list[Decimal]] = defaultdict(lambda: [ZERO, ZERO])
    for coa_id, coa in coa_by_id.items():
        account_budget = sum((budget[(coa_id, p)] for p in selected), ZERO)
        account_actual = sum((actual[(coa_id, p)] for p in selected), ZERO)
        category_name = coa.category or "Uncategorized"
        category_totals[category_name][0] += account_budget
        category_totals[category_name][1] += account_actual
        account_rows.append({
            "coa_code": coa.code,
            "name": coa.name,
            "category": category_name,
            "is_active": coa.is_active,
            "is_gl_derived": coa.is_gl_derived,
            "has_data": any(_round(budget[(coa_id, p)]) != 0 or _round(actual[(coa_id, p)]) != 0 for p in selected),
            "projected_year_end": _money(sum((actual[(coa_id, p)] for p in loaded_periods), ZERO) * 12 / months_loaded) if months_loaded else None,
            "projected_gap": _money(sum((actual[(coa_id, p)] for p in loaded_periods), ZERO) * 12 / months_loaded - sum((budget[(coa_id, p)] for p in range(1, 13)), ZERO)) if months_loaded else None,
            "monthly": [
                {"period": p, "month": FISCAL_MONTHS[p - 1], "loaded": p in loaded_periods,
                 **_line(budget[(coa_id, p)], actual[(coa_id, p)], p in loaded_periods, budget_available)}
                for p in range(1, 13)
            ],
            **_line(account_budget, account_actual, evaluated, budget_available),
        })
    account_rows.sort(key=lambda row: abs(Decimal(row["variance"])), reverse=True)

    total_budget = sum((v[0] for v in category_totals.values()), ZERO)
    total_actual = sum((v[1] for v in category_totals.values()), ZERO)
    statuses = [row["status"] for row in account_rows if row["has_data"]]

    quarter_rows = []
    for name, periods in QUARTERS.items():
        q_budget = sum((month_budget[p - 1] for p in periods), ZERO)
        q_actual = sum((month_actual[p - 1] for p in periods), ZERO)
        quarter_rows.append({"quarter": name, "months": [FISCAL_MONTHS[p - 1] for p in periods], "loaded": all(p in loaded_periods for p in periods), **_line(q_budget, q_actual, bool(set(periods).intersection(loaded_periods)), budget_available)})

    ytd_actual = sum((month_actual[p - 1] for p in loaded_periods), ZERO)
    annual_budget = sum(month_budget, ZERO)
    months_remaining = 12 - months_loaded
    remaining_budget = annual_budget - ytd_actual
    projection = ytd_actual * 12 / months_loaded if months_loaded else None

    return {
        "success": True,
        "message": "Success",
        "data": {
            "fiscal_year": fiscal_year,
            "quarter": quarter,
            "category": category,
            "available_categories": available_categories,
            "budget_available": budget_available,
            "summary": {
                **_line(total_budget, total_actual, evaluated, budget_available),
                "utilization_pct": format(_round(total_actual / total_budget * 100), "f") if evaluated and budget_available and _round(total_budget) > 0 else None,
                "over_budget_count": statuses.count("OVER_BUDGET"),
                "under_budget_count": statuses.count("UNDER_BUDGET"),
                "on_budget_count": statuses.count("ON_BUDGET"),
                "alokasi_count": statuses.count("ALOKASI"),
            },
            "projection": {
                "months_loaded": months_loaded,
                "missing_periods": sorted(selected.difference(loaded_periods)),
                "year_end_gap": _money(projection - annual_budget) if projection is not None and budget_available else None,
                "loaded_periods": loaded_periods,
                "actual_through_period": loaded_periods[-1] if loaded_periods else 0,
                "actual_to_date": _money(ytd_actual),
                "annual_budget": _money(annual_budget),
                "year_end_actual": _money(projection) if projection is not None else None,
                "remaining_budget": _money(remaining_budget),
                "months_remaining": months_remaining,
                "allowed_monthly_spend": _money(remaining_budget / months_remaining) if months_remaining > 0 else None,
            },
            "monthly": [
                {"period": p, "month": FISCAL_MONTHS[p - 1], "loaded": p in loaded_periods, **_line(month_budget[p - 1], month_actual[p - 1], p in loaded_periods, budget_available)}
                for p in range(1, 13)
            ],
            "quarters": quarter_rows,
            "categories": [{"category": name, **_line(v[0], v[1], evaluated, budget_available)} for name, v in sorted(category_totals.items())],
            "accounts": account_rows,
        },
        "errors": [],
    }
