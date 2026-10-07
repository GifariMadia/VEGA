# VEGA Budget vs Actual Tracker

For the 7 October presentation, run `./Start-Presentation.ps1` and open `http://127.0.0.1:3000`. The app uses PostgreSQL configured in a local `.env` file. Never commit `.env`, passwords, database dumps, or presentation credentials. See [the presentation walkthrough](Docs/Presentation-7-Oct.md) and [the QA report](output/qa/VEGA-QA-Report-2026-10-07.md).

VEGA imports the department's annual budget and monthly General Ledger workbooks, validates them before storage, and keeps upload history in PostgreSQL. The browser uses the FastAPI service for authentication, COA management, uploads, and history; credentials and role checks are enforced by the server.

## Requirements

- Windows 10/11
- Python 3.11 or newer (3.13 also works)
- Node.js 20 or newer and npm
- PostgreSQL 18, reachable from the host machine

## First-time setup

From the repository root in PowerShell:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
npm install
Copy-Item .env.example .env
```

Edit `.env` locally. Set the real PostgreSQL host, database, username and password. Set `JWT_SECRET_KEY` to a private random value with at least 32 characters. Set `SEED_ADMIN_USERNAME`, `SEED_ADMIN_FULL_NAME`, and `SEED_ADMIN_PASSWORD`; the seed password must be at least 12 characters. Never commit `.env` or put production credentials in source control. The included `.env.example` is a template only.

Create the empty PostgreSQL database and role using the organization's approved DBA process, then run:

```powershell
npm run migrate
npm run seed
```

The migration creates the schema. The idempotent seed inserts the `MIS000` department and the configured first administrator. It does not create or print a default password.

For a presentation database populated from the included demo workbooks, use the project-specific PostgreSQL migration workflow documented in [Docs/Presentation-7-Oct.md](Docs/Presentation-7-Oct.md). Do not run it against a shared or production database without an approved backup and DBA approval.

## Run locally

Use two PowerShell terminals from the repository root:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

Open `http://localhost:3000`. FastAPI listens on `http://localhost:8000`; `/api/v1/docs` is the OpenAPI reference, `/api/v1/health` checks process health, and `/api/v1/health/ready` checks the database connection.

For the one-process presentation server, build the frontend and serve it with FastAPI:

```powershell
npm run demo
```

This command requires a configured PostgreSQL database and serves the compiled app at port 3000. `Start-Presentation.ps1` is the Windows shortcut for the same presentation mode. `npm run demo:sqlite` is retained only for the old isolated SQLite demo and is not the supported presentation database.

## Verify

```powershell
npm run lint
npm run build
npm test
```

The Python suite uses the anonymized/approved fixture workbooks under `Docs/Source/` and requires no live database. The API integration suite uses an isolated in-memory SQLite database for deterministic transaction and RBAC checks. Release acceptance and migration verification must also be run against an empty PostgreSQL database, followed by an authorized GL-vs-pivot reconciliation; SQLite tests are not a substitute for either check.

The verified PostgreSQL suite can be run against a disposable database by setting `VEGA_TEST_DATABASE_URL` to a database whose name starts with `vega_test_`. Never point the test suite at the presentation database.

## Upload behavior

Only `.xlsx` workbooks are accepted. The Budget parser reads the `MIS (FC)` sheet, locates the Budget band, validates month order and per-row annual totals. The GL parser reads `CORE`, takes the fiscal period from `Pd.`, and calculates converted debit minus converted credit. Preview does not write to the database. A loaded fiscal year/month requires an explicit replacement decision. A save or replacement is atomic; cancelling a saved batch removes its rows and does not restore an earlier version.

Budget and GL uploads register new COA automatically on confirmation. Manual COA creation remains available and Budget imports do not deactivate accounts missing from the file. Preview lists these accounts as warnings and does not create them. Confirmation creates the accounts and transactions together; accounts absent from Budget carry zero budget. API callers may explicitly request strict master-COA validation by passing register_new_coas=false. Transactions explicitly outside MIS000 are filtered before validating their amounts or periods.

COA is searchable and supports create, edit, and soft-deactivate through admin-only API operations, per the implementation scope agreed for this handoff. Users have read access to COA, upload history, and the overview; admin writes are checked on the server.

## Production acceptance

Local PostgreSQL 18.1 migrations and data transfer have now been verified, including both roles, dashboard totals, GL preview/cancel and pg_dump backup creation. Restore testing, official Finance pivot reconciliation and acceptance on the department production host remain required.

## What changed from the base code

The base project was a frontend/mock-data prototype. This handoff adds a working FastAPI and PostgreSQL data path while keeping the existing visual direction intact:

- Added PostgreSQL configuration, Alembic migrations, seed data, safe migration/backup helpers, and the persistent `auth_sessions` table.
- Replaced mock dashboard values with calculations from uploaded Budget and GL workbooks, including fiscal-year Apr–Mar mapping, monthly/quarterly/category filters, variance, projection, and signed bars for negative amounts.
- Added real Excel validation and preview/confirm/cancel/replacement flows. Budget reads `MIS (FC)` and GL reads `CORE` with fiscal period from `Pd.`.
- Restored two-role RBAC: Administrator can upload/manage data and users; Viewer can read dashboard, matrix, COA, history, and CSV exports.
- Added server-enforced logout/session revocation, role refresh, password validation, pagination, COA management, upload history, and detailed validation errors.
- Added responsive browser QA, build/type checks, PostgreSQL integration tests, and the end-to-end QA report under `output/qa/`.

The ZIP supplied as a flow/UI reference was not used as source code and was not modified.
