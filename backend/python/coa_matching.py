from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


def normalize_coa(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip().replace('"', '').replace("'", '')
    text = re.sub(r"\s+", "", text)
    text = text.replace("-", "") if text.upper().startswith("IT") and re.search(r"\d{5}$", text) else text
    text = text.upper()
    if re.fullmatch(r"IT\d{5}", text):
        return f"IT-{text[2:]}"
    return text


def normalize_coa_for_compare(value: Any) -> str:
    text = normalize_coa(value)
    if text.startswith("IT-"):
        return text
    return re.sub(r"[^A-Z0-9]", "", text)


def match_coa(
    coa_code: Any,
    master_coa_codes: Iterable[str],
    alias_map: Optional[Dict[str, List[str]]] = None,
) -> Optional[str]:
    if coa_code is None:
        return None

    target = normalize_coa_for_compare(coa_code)
    if not target:
        return None

    master = {normalize_coa_for_compare(code): str(code).strip() for code in master_coa_codes}
    if target in master:
        return master[target]

    alias_map = alias_map or {}
    aliases = alias_map.get(str(coa_code).strip(), []) + alias_map.get(str(normalize_coa(coa_code)), [])
    for alias in aliases:
        alias_key = normalize_coa_for_compare(alias)
        if alias_key in master:
            return master[alias_key]

    return None


def partition_unmatched(
    records: Sequence[Dict[str, Any]],
    master_coa_codes: Iterable[str],
    alias_map: Optional[Dict[str, List[str]]] = None,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    matched: List[Dict[str, Any]] = []
    unmatched: List[str] = []
    master_set = {normalize_coa_for_compare(code) for code in master_coa_codes}

    for record in records:
        coa_value = record.get("coa_code")
        normalized = normalize_coa_for_compare(coa_value)
        if not normalized:
            unmatched.append(str(coa_value or "EMPTY"))
            continue

        if normalized in master_set:
            matched.append(record)
            continue

        alias_match = None
        alias_map = alias_map or {}
        aliases = alias_map.get(str(coa_value).strip(), []) if coa_value else []
        for alias in aliases:
            alias_key = normalize_coa_for_compare(alias)
            if alias_key in master_set:
                alias_match = alias
                break

        if alias_match is not None:
            record["coa_code"] = alias_match
            matched.append(record)
        else:
            unmatched.append(str(coa_value or "EMPTY"))

    return matched, sorted(set(unmatched))
