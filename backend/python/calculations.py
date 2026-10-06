from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, Iterable, List, Optional


def total_budget(records: Iterable[Dict[str, Any]]) -> float:
    return sum(float(record.get("budget_amount", 0) or 0) for record in records)


def total_actual(records: Iterable[Dict[str, Any]]) -> float:
    return sum(float(record.get("actual_amount", 0) or 0) for record in records)


def variance(actual: float, budget: float) -> float:
    return float(actual) - float(budget)


def budget_utilization_pct(actual: float, budget: float) -> Optional[float]:
    if budget in (None, 0):
        return None
    return (float(actual) / float(budget)) * 100


def budget_status(actual: float, budget: float) -> str:
    if budget in (None, 0):
        return "No Budget / Over Budget" if actual else "Within Budget"
    if actual > budget:
        return "Over Budget"
    if actual < budget:
        return "Under Budget"
    return "Within Budget"


def budget_vs_actual_by_month(budget_records: Iterable[Dict[str, Any]], gl_records: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    budget_map: Dict[str, float] = defaultdict(float)
    actual_map: Dict[str, float] = defaultdict(float)

    for record in budget_records:
        key = (record.get("coa_code", ""), record.get("month", ""))
        budget_map[key] += float(record.get("budget_amount", 0) or 0)

    for record in gl_records:
        key = (record.get("coa_code", ""), record.get("period_month", ""))
        actual_map[key] += float(record.get("actual_amount", 0) or 0)

    output = []
    keys = sorted(set(budget_map) | set(actual_map))
    for coa_code, month in keys:
        b = budget_map.get((coa_code, month), 0)
        a = actual_map.get((coa_code, month), 0)
        output.append(
            {
                "coa_code": coa_code,
                "month": month,
                "budget": b,
                "actual": a,
                "variance": a - b,
                "utilization_pct": budget_utilization_pct(a, b),
            }
        )
    return output


def budget_vs_actual_by_coa(budget_records: Iterable[Dict[str, Any]], gl_records: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    budget_map: Dict[str, float] = defaultdict(float)
    actual_map: Dict[str, float] = defaultdict(float)

    for record in budget_records:
        budget_map[str(record.get("coa_code", ""))] += float(record.get("budget_amount", 0) or 0)

    for record in gl_records:
        actual_map[str(record.get("coa_code", ""))] += float(record.get("actual_amount", 0) or 0)

    output = []
    keys = sorted(set(budget_map) | set(actual_map))
    for coa_code in keys:
        budget = budget_map.get(coa_code, 0)
        actual = actual_map.get(coa_code, 0)
        output.append(
            {
                "coa_code": coa_code,
                "budget": budget,
                "actual": actual,
                "variance": actual - budget,
                "utilization_pct": budget_utilization_pct(actual, budget),
                "status": budget_status(actual, budget),
            }
        )
    return output


def top_over_budget_coas(budget_records: Iterable[Dict[str, Any]], gl_records: Iterable[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
    by_coa = budget_vs_actual_by_coa(budget_records, gl_records)
    return sorted(
        [item for item in by_coa if item["variance"] > 0],
        key=lambda item: item["variance"],
        reverse=True,
    )[:limit]


def top_under_budget_coas(budget_records: Iterable[Dict[str, Any]], gl_records: Iterable[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
    by_coa = budget_vs_actual_by_coa(budget_records, gl_records)
    return sorted(
        [item for item in by_coa if item["variance"] < 0],
        key=lambda item: item["variance"],
    )[:limit]


def worst_coa_variance(budget_records: Iterable[Dict[str, Any]], gl_records: Iterable[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
    by_coa = budget_vs_actual_by_coa(budget_records, gl_records)
    return sorted(
        by_coa,
        key=lambda item: abs(float(item["variance"])),
        reverse=True,
    )[:limit]


def monthly_matrix(budget_records: Iterable[Dict[str, Any]], gl_records: Iterable[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
    matrix: Dict[str, Dict[str, float]] = defaultdict(dict)
    for item in budget_vs_actual_by_month(budget_records, gl_records):
        matrix[item["coa_code"]][item["month"]] = {
            "budget": float(item["budget"]),
            "actual": float(item["actual"]),
            "variance": float(item["variance"]),
            "utilization_pct": item["utilization_pct"],
        }
    return dict(matrix)


def budget_status_summary(budget_records: Iterable[Dict[str, Any]], gl_records: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    budget_total = total_budget(budget_records)
    actual_total = total_actual(gl_records)
    variance_total = variance(actual_total, budget_total)
    return {
        "total_budget": budget_total,
        "total_actual": actual_total,
        "variance": variance_total,
        "utilization_pct": budget_utilization_pct(actual_total, budget_total),
        "status": budget_status(actual_total, budget_total),
    }
