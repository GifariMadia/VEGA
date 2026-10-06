from __future__ import annotations

import argparse
import os
import sys
from pprint import pprint

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from budget_parser import parse_budget_excel
from db import import_budget_excel, import_gl_excel
from gl_parser import parse_gl_excel


def _print_summary(label: str, parsed: dict) -> None:
    print(f"{label} parsing summary")
    print(f"- File type: {parsed.get('file_type')}")
    print(f"- Reporting period: {parsed.get('reporting_period')}")
    print(f"- Total rows: {parsed.get('total_rows')}")
    print(f"- Accepted rows: {parsed.get('accepted_rows')}")
    print(f"- Rejected rows: {parsed.get('rejected_rows')}")
    print(f"- Missing required columns: {parsed.get('missing_required_columns') or 'none'}")
    print(f"- Unmatched COAs: {parsed.get('unmatched_coas') or 'none'}")
    if parsed.get('validation_errors'):
        print("- Validation errors:")
        for item in parsed['validation_errors'][:5]:
            print(f"  * {item}")
    sample_rows = parsed.get('sample_records') or parsed.get('rows', [])[:5]
    if sample_rows:
        print("- Sample normalized records:")
        pprint(sample_rows[:3])
    else:
        print("- Sample normalized records: none")
    print()


def _print_import_summary(label: str, result: dict) -> None:
    print(f"{label} import summary")
    print(f"- File: {result.get('file_name')}")
    print(f"- Fiscal year: {result.get('fiscal_year')}")
    print(f"- Rows processed: {result.get('row_count')}")
    print(f"- Accepted rows: {result.get('accepted_rows')}")
    print(f"- Rejected rows: {result.get('rejected_rows')}")
    print(f"- Inserted rows: {result.get('inserted_rows')}")
    print(f"- Batch id: {result.get('batch_id')}")
    print(f"- Audit note id: {result.get('audit_note_id')}")
    if result.get('validation_errors'):
        print("- Validation errors:")
        for item in result['validation_errors'][:5]:
            print(f"  * {item}")
    print()


def main() -> None:
    parser = argparse.ArgumentParser(description="VEGA Excel parser and PostgreSQL import tool.")
    subparsers = parser.add_subparsers(dest="command")

    budget_parser = subparsers.add_parser("budget", help="Parse a budget file without inserting to Postgres")
    budget_parser.add_argument("path", help="Path to Excel file")

    gl_parser = subparsers.add_parser("gl", help="Parse a GL file without inserting to Postgres")
    gl_parser.add_argument("path", help="Path to Excel file")

    import_budget_parser = subparsers.add_parser("import-budget", help="Validate and insert a budget file into PostgreSQL")
    import_budget_parser.add_argument("path", help="Path to Excel file")

    import_gl_parser = subparsers.add_parser("import-gl", help="Validate and insert a GL file into PostgreSQL")
    import_gl_parser.add_argument("path", help="Path to Excel file")

    args = parser.parse_args()

    if args.command in {"budget", None} and not hasattr(args, "path"):
        parser.print_help()
        return

    if args.command == "budget":
        parsed = parse_budget_excel(args.path)
        _print_summary("Budget", parsed)
        return

    if args.command == "gl":
        parsed = parse_gl_excel(args.path)
        _print_summary("GL", parsed)
        return

    if args.command == "import-budget":
        result = import_budget_excel(args.path)
        _print_import_summary("Budget", result)
        return

    if args.command == "import-gl":
        result = import_gl_excel(args.path)
        _print_import_summary("GL", result)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
