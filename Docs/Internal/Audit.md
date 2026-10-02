# VEGA Task 13-30 Audit

**Audit date:** 2 October 2026  
**Scope:** baseline only; no application source was changed during the audit.  
**Reference:** numbered tasks in `Docs/Client/Project-Timeline.md` §4, checked against the current code, API Draft, FRD, ERD, Excel Template Spec, handoff, and the supplied dummy workbooks.

## Executive finding

The workspace is a React/Vite + Express + PostgreSQL prototype with standalone Python import scripts, not the documented FastAPI application. Login, COA, and most data shown in the frontend are mock/local state. The only API health endpoint is reachable; the `/api/v1` contract is not implemented. The existing parser runs against the supplied workbooks but does not implement the locked Excel contract and produces materially incorrect/unusable results. This baseline is not safe for financial use.

Two operational gates prevent completing and verifying this scope as-is:

- The workspace has no `.git` directory and no root `.gitignore`. Branching and task commits cannot be made without initializing a repository and defining what files must never be committed. No repository was initialized during this audit.
- PostgreSQL client `psql` is not on `PATH`; the legacy DB-backed summary endpoint returns HTTP 500. A clean-database migration cannot currently be run or verified.

The requested COA CRUD/nonaktifkan scope conflicts with FR-7/BR-16, the API Draft, the COA mockup, and the handoff, all of which make COA read-only and upload-derived. This audit records the conflict; the task request is the newest instruction, but the resulting change must be documented as an explicit product override before implementation.

## Audit commands and observed results

| Check | Observed result |
|---|---|
| `npm install` | Completed successfully. |
| `npm run lint` | Passed (`tsc --noEmit`). |
| `npm run build` | Passed. Vite emitted a chunk-size warning: built JS is 1,207.55 kB (gzip 352.00 kB), above the 500 kB advisory threshold. |
| `npm run api` | Started Express at `http://localhost:4000`. |
| `npm run dev` | Started Vite at `http://localhost:3000`; the SPA returned its HTML shell. |
| `GET /api/health` | HTTP 200: `{"success":true,"service":"vega-api","status":"ok","port":4000}`. This checks process liveness only, not DB readiness. |
| `POST /api/v1/auth/login` | HTTP 404; the documented API namespace is absent. |
| `GET /api/dashboard/summary` | HTTP 500; legacy DB-backed endpoint is not healthy. |
| `npm test` | Failed because package.json has no `test` script. |
| `python -m pytest --version` | Failed: `No module named pytest`. No automated Python test suite is configured. |
| Python environment | Python 3.13.15; installed `psycopg` 3.3.6 and `openpyxl` 3.1.5. |
| PostgreSQL tooling | `psql` is not recognized; no migration/empty-database check was possible. |
| Browser smoke check | Vite served the login page. It visibly offers demo-role access and says it is secured by Supabase; this is not a real-auth verification. |

Parser run on the supplied fixture files:

| Command | Observed output / contract mismatch |
|---|---|
| `python backend/python/main.py budget "Docs/Source/Budget Dummy.xlsx"` | Reports FY2026/2027, 465 rows, 295 accepted, 170 rejected. Example errors say monthly budget columns are missing. It does not read the required `MIS (FC)` Budget band `BD:BO`, skip TOTAL descriptions first, or yield the documented 240 rows / 238 distinct COAs. |
| `python backend/python/main.py gl "Docs/Source/GL Dummy.xlsx"` | Reports 32,379 rows, 32,372 accepted, 7 rejected; samples are from another sheet/layout, `coa_code` includes the entity segment, period is inferred from dates, and amounts use local debit/credit. The required result is 73 scoped CORE rows, FY2026 period 3, actual = converted N − O, total USD 488,981.16. |

The fixture workbooks are present under `Docs/Source/` despite the older spec note saying they are not in the repository. The existing API uses `multer`'s 50 MB size cap but does not perform a preview/confirm gate. Its Python import helpers use parameterized SQL and a database transaction, but automatically mark existing batches replaced and do not delete their child data before importing. Invalid parser rows can still be committed. No batch-cancel endpoint was found.

## Current connection map

```text
React/Vite (src/)
  ├─ AuthContext -> INITIAL_USERS + localStorage + demo role switcher (no auth request)
  ├─ DataContext -> INITIAL_COA/localStorage; attempts GET /api/dashboard/overview
  │                 -> legacy data normalization; most upload/COA/history state stays local
  └─ UploadView -> browser-side xlsx parsing and local DataContext commit

Vite /api proxy -> Express (server.js, port 4000)
  ├─ /api/health -> process-only health response
  ├─ /api/upload/budget|gl -> multer -> uploadController -> Python subprocess
  └─ /api/dashboard/* -> dashboardController -> dashboardService -> PostgreSQL functions/tables

Python backend/python/
  ├─ budget_parser.py + gl_parser.py -> generic header-alias/date-oriented parser
  └─ db.py -> psycopg direct legacy-schema writes (parameterized SQL, transaction context)

PostgreSQL
  └─ db/schema.sql -> legacy names/shapes (e.g. coa_master, upload_batches, budgets,
     gl_transactions, audit_notes); no Alembic migrations or seed script located.

Documented target absent: FastAPI + SQLAlchemy/Alembic + `/api/v1` + JWT/RBAC + one central FE API client.
```

**Broken links:** FE authentication and COA do not use the backend; `/api/v1` does not exist; the FE `/api/dashboard/overview` reads a legacy endpoint that is unhealthy; upload UI parses in the browser while the Express upload endpoint separately invokes a Python parser and commits immediately; parser field/layout semantics do not match the schema or Excel contract. The application therefore has no single end-to-end data path.

## Task status

Status reflects the requested Task 13–30 scope, not the presence of a similarly named screen or script.

| Task | Deliverable | Baseline status | Evidence / gap |
|---:|---|---|---|
| 13 | Python environment and FastAPI skeleton | Parsial / salah stack | Python parser exists; API is Express. No FastAPI application or Python dependency manifest found. |
| 14 | React routing and base layout | Parsial | React/Vite and screens exist, but demo auth/data remain local and are not wired to the target API. |
| 15 | PostgreSQL migration and seed | Belum / parsial | One legacy `db/schema.sql`; no migration framework or seed script. Schema does not match ERD; PostgreSQL cannot be checked locally with `psql`. |
| 16 | Git branch strategy and environment config | Belum | `.env` and `.env.example` exist; no `.git`, branch, or root `.gitignore`. `.env` must be excluded before any commit. |
| 17 | JWT and RBAC architecture | Belum | No JWT verification, server-side user/role dependency, or auth middleware found. UI role switching is not authorization. |
| 18 | Final FE-BE API contract | Parsial | Draft exists, but implementation is legacy `/api/*`; no `/api/v1` types/client or contract tests. |
| 19 | Login/logout, password hashing, JWT, RBAC API | Belum | No auth routes or server-side user table/auth flow found. |
| 20 | COA API CRUD and deactivate | Belum | No COA API routes. Scope conflicts with current FRD/API Draft/mockup's read-only COA; resolve and record the requested override. |
| 21 | Login and role-aware FE | Parsial | Login screen exists but validates against mock users/passwords; role switching and localStorage establish client-only identity. |
| 22 | COA list/add/edit/deactivate FE | Parsial | COA screen exists over fixture/local state; no real API CRUD integration. |
| 23 | Login/COA integration; Admin vs User test | Belum | API login missing; no automated integration tests. |
| 24 | Budget/GL upload endpoints and parser | Parsial / incorrect | Legacy multipart endpoints and Python subprocess exist; upload persists immediately with no preview. Parser does not match the actual documented workbook layout/rows. |
| 25 | Template/type/required-field/unknown-code validation | Rusak | Generic aliases and permissive parsing; the dummy runs demonstrate wrong sheets/columns/values are accepted or partially processed instead of being refused to contract. |
| 26 | Period detection and overwrite, no append | Rusak | GL parser derives month from transaction date and falls back to Aug; required `Pd.` is ignored. Import changes batch status but leaves earlier transaction rows, risking double count. |
| 27 | Atomic save, upload history, cancel | Parsial | Individual Python import wraps writes in a transaction, but invalid rows may still be stored, preview/replace gate absent, child data is not removed, and no cancel API was found. |
| 28 | Upload UI and result/reasons | Parsial | Upload UI exists but parses in-browser and updates local context; does not follow server preview/confirm API. |
| 29 | Upload history UI and cancel | Parsial | Audit/history UI exists over local/context state; backed API history/cancel and enforced Admin-only action absent. |
| 30 | Re-upload, corrupt/shifted-file tests | Belum | No npm test script or pytest installed/suite found; fixture parser output fails the locked contract. |

## Audit conclusion

The app starts and the TypeScript production build passes, but the runtime API, database layer, authorization, and import semantics do not satisfy Tasks 13–30. No financial-data acceptance criterion has passed. The first implementation gates are: establish an auditable Git branch without staging `.env` or client workbooks; choose the canonical backend (the docs specify FastAPI, while the user's top-level instruction permits retaining the existing architecture if the API contract is aligned); record the explicit COA CRUD override; and provide a reachable PostgreSQL instance so migrations and end-to-end tests can be exercised.

No Task 31+ work is included in this audit.