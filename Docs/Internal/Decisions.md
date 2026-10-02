# VEGA Implementation Decisions

**Updated:** 2 October 2026

## Task 13-30 overrides

| Topic | Existing documents | Decision for this requested scope | Reason |
|---|---|---|---|
| Backend stack | Project Plan, Stack Comparison, API Draft, and current handoff specify FastAPI; the source workspace currently uses Express. | Implement the target API in FastAPI and keep the React client. | Stack is explicit in the authoritative project docs; the request only says to retain the existing architecture when the documents are not decisive. |
| COA mutation | FRD/API Draft, handoff, and COA mockup define COA as upload-derived and read-only; Timeline Tasks 20/22 still list CRUD. | Implement CRUD and deactivate because the current user request explicitly requires it. Treat this as a product-scope override, not as conformance to FR-7/BR-16. | The latest task instruction is explicit and supersedes the conflicting legacy requirement for this work. |
| Unknown COA on upload | FR-24/BR-12 say auto-register and report; timeline Task 25 and this request say unknown codes should be rejected clearly. | Reject an unknown COA in preview and do not write the file. | The acceptance criterion in the current request is explicit; whole-file refusal avoids silent or unreviewed master-data changes. |
| Budget parser result | Excel Template Spec is locked and supersedes stale formats elsewhere. | Implement the sheet/column/row rules in `Docs/Client/Excel-Template-Spec.md`; use the provided `Docs/Source/` files as test fixtures, but never commit the workbooks. | The spec was verified against the actual fixture files and protects financial correctness. |
| Fiscal period source | Old timeline/presentation wording refers to transaction date; FRD and locked Excel spec say GL `Pd.` is authoritative and `Date` is only a cross-check. | Use `Pd.`; report date disagreement as a warning without changing the period. | The higher-priority FRD and locked file contract resolve the older wording. |
| Local Git state | Workspace has no `.git` repository or `.gitignore`. | Initialize a local repository on `feature/task-13-30`; ignore `.env`, generated files, temporary uploads, and client Excel workbooks before staging. | User explicitly required a new branch and small local commits. No push will be made. |
| Database service | `.env` points to a host that does not resolve; no local PostgreSQL service, `psql`, or Docker is available. | Continue implementation and tests that do not require a live server; do not claim migration or DB integration is verified until PostgreSQL is provided. | Installing or changing the user's database service requires system capabilities not present in this environment. |

## Scope boundary

Only Project Timeline Tasks 13-30 are in scope. Dashboard analytics, backup service, hardening tasks numbered after 30, and deployment are not added as new features here.