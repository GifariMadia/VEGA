# VEGA Budget vs Actual Tracker

For the 7 October presentation, run `./Start-Presentation.ps1` and open `http://127.0.0.1:3000`. The app now uses PostgreSQL configured in `.env.postgresql` (also copied to `.env` for normal API commands). Administrator and Viewer accounts and uploaded data were migrated from the local SQLite demo; credentials remain in `tmp/presentation/accounts.txt`. See [the walkthrough](Docs/Presentation-7-Oct.md). Run `npm run demo` to rebuild and start. `npm run demo:sqlite` explicitly starts the preserved older SQLite demo.

VEGA imports the department's annual budget and monthly General Ledger workbooks, validates them before storage, and keeps upload history in PostgreSQL. The browser uses the FastAPI service for authentication, COA management, uploads, and history; credentials and role checks are enforced by the server.

## Requirements

- Windows 10/11
- Python 3.13
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

Edit `.env` locally. Set the real PostgreSQL host, database, username and password. Set `JWT_SECRET_KEY` to a private random value with at least 32 characters. Set `SEED_ADMIN_USERNAME`, `SEED_ADMIN_FULL_NAME`, and `SEED_ADMIN_PASSWORD`; the seed password must be at least 12 characters. Never commit `.env` or put production credentials in source control.

Create the empty PostgreSQL database and role using the organization's approved DBA process, then run:

```powershell
npm run migrate
npm run seed
```

The migration creates the schema. The idempotent seed inserts the `MIS000` department and the configured first administrator. It does not create or print a default password.

## Run locally

Use two PowerShell terminals from the repository root:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

Open `http://localhost:3000`. FastAPI listens on `http://localhost:8000`; `/api/v1/docs` is the OpenAPI reference, `/api/v1/health` checks process health, and `/api/v1/health/ready` checks the database connection.

## Verify

```powershell
npm run lint
npm run build
npm test
```

The Python suite uses the anonymized/approved fixture workbooks under `Docs/Source/` and requires no live database. The API integration suite uses an isolated in-memory SQLite database for deterministic transaction and RBAC checks. Release acceptance and migration verification must also be run against an empty PostgreSQL database, followed by an authorized GL-vs-pivot reconciliation; SQLite tests are not a substitute for either check.

## Upload behavior

Only `.xlsx` workbooks are accepted. The Budget parser reads the `MIS (FC)` sheet, locates the Budget band, validates month order and per-row annual totals. The GL parser reads `CORE`, takes the fiscal period from `Pd.`, and calculates converted debit minus converted credit. Preview does not write to the database. A loaded fiscal year/month requires an explicit replacement decision. A save or replacement is atomic; cancelling a saved batch removes its rows and does not restore an earlier version.

COA is searchable and supports create, edit, and soft-deactivate through admin-only API operations, per the implementation scope agreed for this handoff. Users have read access to COA, upload history, and the overview; admin writes are checked on the server.

## Production acceptance

Local PostgreSQL 18.1 migrations and data transfer have now been verified, including both roles, dashboard totals, GL preview/cancel and pg_dump backup creation. Restore testing, official Finance pivot reconciliation and acceptance on the department production host remain required.
