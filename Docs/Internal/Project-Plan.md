# Project Plan — VEGA (Variance Evaluation & Graphical Analytics)

> **VEGA**: Variance Evaluation & Graphical Analytics
> MIS/SI Internship Project: Department Budget Tracker (Budget vs Actual)
> Team: 2 student interns · Target duration: ~10 weeks (2-3 months)
> Repo: https://github.com/Ihsan-p1/Vega
> Source doc: [Job Desc - Magang SI.md](../Client/Job%20Desc%20-%20Magang%20SI.md) · Name: [Project-Name.md](Project-Name.md)
> System design: [Flowchart.md](../Client/Flowchart.md) and [VEGA-Board.drawio.svg](../Client/VEGA-Board.drawio.svg). **Read those for how the system behaves; this document is the schedule.**
> Locked reading contract: [Excel-Template-Spec.md](../Client/Excel-Template-Spec.md). Where this plan and the board disagree, **the board wins.**
> Tagline: *"Every number, clear as starlight. Every insight, connected like a constellation."*

---

## 1. Summary & Goal

Build a **web app served over the department LAN** that imports the fiscal-year **budget** and the monthly **General Ledger** from Excel, compares them per chart-of-account, and presents the gap, the over/under-budget status, and a **year-end projection** in an analytics dashboard.

One host PC in the department runs FastAPI on `0.0.0.0:8000` as a Windows service, serving the built React `dist/`; the other users reach it by hostname in a browser. The host is isolated from the company network. Pilot scope: one division, ~6 users.

The work follows the full SDLC described in the job desc:

1. System Analysis & Design (Flowchart, Use Case, ERD)
2. UI/UX Design (wireframe & mockup)
3. Development (master-data CRUD, Excel ingestion, variance logic, RBAC)
4. Quality Assurance: validate financial-calculation accuracy & visualizations
5. Documentation (technical README + User Manual)

### What changed from the first version of this plan

Requirement gathering turned VEGA from a generic budget-CRUD tracker into an Excel-ingestion + variance analytics app, and the client asked for web instead of desktop:

| First version | Now |
|---|---|
| Installed desktop app (Electron / Tauri / pywebview) | **LAN web app.** `desktop/` is cancelled and must not be created. |
| Mobile version as a stretch goal | **Dropped.** |
| Daily expenditure entry form | **GL upload only.** Actuals are read-only, derived from the monthly GL file. |
| `Category` entity | **COA** master (code, name, category) + **Department**. No `Category` table. |
| `Role` lookup table | `role` is an **enum column** on `user`. |
| Calendar-month periods | **Fiscal year April–March.** FY26 = Apr 2026 → Mar 2027. |
| Variance only | Variance **+ quarterly trend + year-end projection** |
| — | The system **generates the standard Excel templates** it then parses |
| — | Scheduled database backup |
| Upload silently overwrites a loaded period | **The user chooses.** An upload for an already-loaded period shows what is about to be replaced and offers **GANTI DATA** or **BATALKAN**. |

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend/API | **Python 3.13 + FastAPI** | Lightweight for a small team, fast to build, automatic OpenAPI docs at `/docs`. |
| ORM & Migrations | SQLAlchemy 2.0 + Alembic | FastAPI standard, controlled schema migrations. |
| Database | **PostgreSQL 18**, driver `psycopg[binary]` 3.3 (v3, not the older `psycopg2`) | **The client asked for it, and the client understands the trade.** Our own comparison recommended SQLite for this scale ([Stack-Comparison.md](../Client/Stack-Comparison.md) §8) and that analysis is unchanged; the decision above it is the client's. What we get for the cost: exact `NUMERIC` money, concurrent writers, and no future migration. What we pay: a second Windows service to install, back up, document, and hand over. |
| Excel I/O | **openpyxl** | Reads one sheet and writes a template. pandas is not justified by that; add it only if a GL file is large enough to measurably drag. |
| UI | **React 18 + Vite 6** | Large ecosystem, good for dashboards. Built to static files and served by FastAPI in production. |
| Charting | **Recharts** | Budget vs actual bars, quarterly trend line. |
| Routing | react-router-dom | Client-side SPA routing over static files. |
| Styling | Plain CSS custom properties | Omron blue/white. No UI framework and no state library — the app is too small to earn either. |
| Auth | JWT (**PyJWT**) + **`bcrypt` used directly** | passlib is broken on Python 3.13. python-jose is unmaintained; FastAPI's security docs use PyJWT. See CLAUDE.md > Gotchas. |

The two stacks that were weighed against this one, and why they lost, are in [Stack-Comparison.md](../Client/Stack-Comparison.md).

**Deployment shape:** `npm run build` → FastAPI serves `dist/` → uvicorn on `0.0.0.0:8000` as a Windows service with **exactly 1 worker** (the daily backup timer lives inside the app; N workers would fire N backups). Plain HTTP over the isolated LAN by accepted decision, documented in the User Manual.

**Monorepo structure:**

```
Vega/
├── backend/        # FastAPI, models, business logic, auth, ingestion. Serves dist/ in production.
├── frontend/       # React (Vite) — UI, dashboard, upload screens
├── Docs/
│   ├── Plan/       # Job desc, plan, ERD, diagrams, specs, board, user manual
│   └── Source/     # the client's sample workbooks (read-only fixtures)
└── CLAUDE.md
```

---

## 3. Suggested Team Split (2 People)

A **guide, not rigid**: several phases are done together.

- **Person A: Backend & Logic**
  Schema & ERD, FastAPI setup, User CRUD + read-only COA endpoints, Excel ingestion, variance & projection logic, security (RBAC, password hashing), backup.
- **Person B: Frontend & UX**
  Wireframes & mockups (Figma), React frontend, dashboard visualizations, upload screens, technical documentation & User Manual.
- **Done together:** requirements analysis, Flowchart / Use Case / ERD (Phase 1), and QA (Phase 7).

---

## 4. Project Phases

Estimates map to ~10 effective working weeks. Each phase has a **checkpoint** at its end.

### Phase 0 — Project Setup · Week 1 ✅ *complete*

**Goal:** the team's working foundation is ready.

- [x] Initialize Git repository + `.gitignore`.
- [x] Scaffold the monorepo (`backend/`, `frontend/`, `Docs/`).
- [x] Set up the environment (Python venv, Node, `.env.example`) and the linters (**ruff** + `ruff format` for Python, **eslint** for JS).
- [ ] Create a task board (GitHub Projects / Trello / Notion) with items from this plan.
- **Checkpoint:** ✅ repo clones, backend `/health` and frontend both run, `pytest` and both linters pass.

> Two deliberate deviations from the original checklist: **black** is not installed (`ruff format` is its equivalent and is already wired up), and **prettier** is not installed either; eslint alone is enough at this size, and a second formatter would be one more config to keep in sync with eslint.

### Phase 1 — System Analysis & Design · Weeks 1–2 *(together)* ← **current**

**Goal:** understand & document the business flow and data structure.

- [x] Map the department's budget-vs-actual business flow (requirement gathering with the client).
- [x] **Flowchart** of the processes → [Flowchart.md](../Client/Flowchart.md): Excel upload → validation → storage → variance → dashboard. The corrections listed in [Excel-Template-Spec.md](../Client/Excel-Template-Spec.md) §9 are applied.
- [x] **Requirements Spec** → [Requirements-Spec.md](../Client/Requirements-Spec.md): the requirement-gathering result, cleaned up. 54 functional requirements, 17 non-functional, 15 business rules, 11 acceptance criteria, and a traceability table back to the job description.
- [x] **Use Case Diagram** → [Use-Case.md](../Client/Use-Case.md). Actors: **Administrator** vs **Regular User** (plus the backup scheduler as a system actor). 15 use cases; the four that carry traps are written out step by step.
- [x] **Normalized ERD** → [ERD.md](../Client/ERD.md) (Mermaid `erDiagram`). Entities:
  - `user` (id, username, full_name, password_hash, **role enum**, is_active, created_at)
  - `department` (id, code, name), with `IT` seeded first
  - `coa` (id, code, name, category, department_id, is_active, **is_gl_derived**)
  - `budget` (id, fy, **period**, coa_id, amount, batch_id)
  - `actual` (id, fy, **period**, coa_id, amount, account_number, section, txn_date, description, currency, exch_rate, debit_native, credit_native, reference, vendor, row_no, batch_id)
  - `upload_batch` (id, kind, filename, fy, **period**, uploaded_by, uploaded_at, rows_read, rows_imported, rows_rejected, status, replaced_batch_id)
  - `audit_log` (id, user_id, action, entity, entity_id, detail, at)
- [x] **Excel Template Spec** → [Excel-Template-Spec.md](../Client/Excel-Template-Spec.md): **written against the real files**, not against the client's notes. This is the locked reading contract.
- [x] **Presentation board** → [VEGA-Board.drawio.svg](../Client/VEGA-Board.drawio.svg): the whole path from both Excel files to the dashboard, on one canvas, with one traced figure end to end. Page 2 carries the corrections the real files forced.
- [x] **Stack comparison** → [Stack-Comparison.md](../Client/Stack-Comparison.md): three candidate stacks, pros and cons, weighted decision matrix.
- [x] Rewrite the stale docs so the repo has one story (README, this plan, Client-Presentation, Project-Name).
- **Checkpoint:** Flowchart, Requirements Spec, Use Case and ERD agreed and stored in `Docs/`.

> `fy` is an **`int`**, and there is no `fiscal_year` table: FY26 is fully derivable from `2026`, whereas a stored `start_date` is a row that can disagree with the calendar. Likewise `role` is a constrained attribute, documented in the ERD as a domain rather than modelled as a two-row join.

### Phase 2 — UI/UX Design · Weeks 2–3 *(Person B leads)*

**Goal:** visual prototype before coding.

- [ ] Low-fidelity wireframes of all main screens.
- [ ] High-fidelity mockups (Figma), Omron blue/white: login, **dashboard**, upload & import summary, COA list (read-only, no form, no edit button), users, settings.
- [ ] Dashboard layout: KPI cards (total budget / total actual / gap), budget-vs-actual bars by COA category, quarterly trend, projection card, filters (FY, quarter/month, category, department).
- **Checkpoint:** mockups complete & agreed as the development reference.

### Phase 3 — Foundation · Weeks 3–5 *(Person A leads, B starts frontend)*

**Goal:** schema, auth, and master data working.

- [ ] Initialize Alembic and build the schema from the ERD (SQLAlchemy models + first migration, PostgreSQL 18). Create the `vega` role and database first; the cluster locale is `C` by deliberate choice.
- [ ] `fiscal.py` + its tests. The April/March boundary is where this breaks if it breaks.
- [ ] Authentication + **RBAC**, enforced in a **route dependency**, not by hand in each handler.
- [ ] CRUD: **Users** only. This is what satisfies the graded CRUD requirement. **COA gets read/list/search endpoints and nothing else**: the master is written by ingestion, corrected by re-upload (BR-16, FR-7). Do not build a COA form.
- [ ] React shell: routing, layout, login, auth state.
- **Checkpoint:** an admin can log in and manage users through the UI, and read the COA list with no way to change it; a regular user is refused on every write.

### Phase 4 — Excel Ingestion · Weeks 5–6

**Goal:** the monthly file becomes stored data, safely.

Every rule below is fixed by [Excel-Template-Spec.md](../Client/Excel-Template-Spec.md) and page 2 of [VEGA-Board.drawio.svg](../Client/VEGA-Board.drawio.svg), both written against the real files in [Docs/Source/](../Source/). **MVP scope is one sheet per workbook:** GL sheet `CORE` (the workbook also holds `EMC`, `IAB`, `OCBID`, other entities, ignored), budget sheet `MIS (FC)` with its header on row 6.

- [ ] `ingest/layout.py`: **every fact about the physical file layout in one module** (sheet names, header rows, column indices, the `-` split), so a layout change is a constant edit rather than a rewrite.
- [ ] **Budget parser** (`MIS (FC)`):
  - Read the 12 monthly columns `BD:BO` = Apr '26 … Mar '27. The month labels on row 6 are **not unique**: `Apr '26` appears twice. Lock the block by its **row-5 band label = `Budget`**, then assert row 6 below it reads Apr…Mar in order. `BD:BO` is the expected position, not a hardcoded one.
  - Skip a row when **column B contains `TOTAL`**. Check column B *first*: 3 of the 9 subtotal rows carry a number in column A, and row 263 carries `770101000`, which looks like a valid COA. Filtering on column A alone loads `TOTAL SGA DEPRECIATION` as an account and doubles 67,370.88.
  - Column A is mixed-typed (237 text, 6 int, 21 empty), so `str().strip()` before anything else.
  - Per-row check `G == Σ(12 months)`, which holds on 240/240 rows. Do **not** verify against cell `E1`; that figure is a literal and cannot be reconstructed from any row.
  - **Negative amounts are valid and must not be rejected.** `772502000 Internal cost allocation` is −368,593.63 for the FY. See Phase 5 for how they are shown.
  - Duplicate codes (`740199001`, `761001000`, all four rows zero): take the first occurrence, report the second.
- [ ] **GL parser** (`CORE`):
  - **Map columns by index, never by header name.** `L=11` / `M=12` are the native-currency Debits/Credits and are **not used**; `N=13` / `O=14` are the converted-USD pair and **are** used. All four headers are byte-identical, so a name match silently reads L/M and inflates every actual by roughly the exchange rate. The header check must assert indices 11-14 read Debits, Credits, Debits, Credits in order.
  - `actual_row = N − O`. Credit rows legitimately reduce the actual; a negative net is correct, not a reason to reject.
  - **Period comes from `Pd.`, not from the transaction date.** All 4,951 `CORE` rows are `Pd. 03` = June 2026. Date is a cross-check only.
  - **Row filter, two clauses: 63 + 10 = 73 rows.** (a) 3 segments and segment 3 == `MIS000` → 63 rows. (b) 2 segments whose COA exists in the budget master → 10 rows (`772404000-A7744`, `771501000-A7744`). A bare `parts[2] == "MIS000"` drops clause (b) silently. Report each clause-(b) row as *loaded, section missing*.
  - Per-row rule order: (1) `Account Number` empty → skip · (2) `Pd.` empty → skip · (3) `N` or `O` not numeric → **reject the file** · (4) `N` and `O` both filled → reject the file · (5) otherwise load. Row 4953 of the sample file is junk (no `Pd.`, no date, `#DIV/0!` in both amount columns) and exists to make sure rule (3) is written.
  - Unregistered COA: **load it, auto-register with a zero budget, and report it.** Nine rows have no budget master row (`770102000`, `770107001`, both depreciation). Rejecting a 4,952-row file because 9 rows are unmapped would block the other 64 for no gain. *Pending department confirmation, see §8.*
- [ ] **Two-step commit: parse, preview, then store** (FR-55, FR-56, BR-17). Parsing returns a result object; storing is a separate call that takes it. Nothing touches the database until the administrator confirms the preview.
  - Preview payload: file kind, fiscal year, period, rows read / accepted / rejected, total amount, sample rows, and every problem found.
  - A refused file returns the same shape with no confirm token; the reasons are the payload.
  - Declining is a no-op: no batch row, no backup, no audit entry beyond the attempt itself.
- [ ] **Upload flow with an explicit replace decision** (page 1 of the board, node `n65`):
  - After the preview is confirmed, the system checks whether that period is already loaded.
  - **Not loaded** → insert as a new period; nothing existing is touched.
  - **Already loaded** → show a summary of the stored batch (**period · row count · total amount · uploader · upload time**) and make the user choose **GANTI DATA** or **BATALKAN**. Replacing money figures is never automatic.
  - **GANTI DATA** → back up first (6.0), delete only that period, load the new file in one transaction.
  - **BATALKAN** → nothing is written; the existing batch stays intact.
- [ ] Import summary: rows read / imported / rejected, **with a reason per rejected row**. A silently dropped row is money missing from the gap.
- [ ] Template generation (`GET /api/templates/budget.xlsx`, `/api/templates/gl.xlsx`) written from the **same `layout.py` constants the parser reads**, so template and parser cannot drift apart.
- [ ] Upload UI + batch history.
- **Checkpoint:** every upload shows a preview before storing and declining it leaves the database unchanged; re-uploading June replaces it instead of doubling it, and only after the user confirms; cancelling at the confirmation stores nothing; a wrong-header file is refused whole; **total June 2026 actual = 488,981.16 USD across 73 rows** (`MIS000` alone gives 488,973.64 across 63; the 7.51 difference is the ten section-less rows).

> The sample files have arrived, so Phase 4 no longer waits on anything. It stays after Phase 3 because auth and the schema must exist first. **Within Phase 4 the budget parser comes before the GL parser**: the budget upload is what creates the COA master, and the GL row filter's second clause looks accounts up in it (FR-23). Nobody keys a COA in by hand at any point (BR-16).

> **The sample figures are not to scale and must not be read as business facts.** Converted IDR rows land at 1-3 USD while USD rows carry 20k-200k, so June salary reads 1.31 against a 4,989.86 monthly budget. Reproduce these numbers exactly as arithmetic fixtures; do not tune the tolerance, draw a conclusion, or run the "match the client's pivot" test on them.

### Phase 5 — Analytics & Dashboard · Weeks 6–7

**Goal:** the core value of the app.

- [ ] `analytics.py` + tests:
  - `gap = budget − actual`, per COA per month.
  - **Tolerance is zero**. The client confirmed it. Any difference at all is UNDER or OVER; round to 2 decimals *once*, before comparing. There is no ±5% band.
  - `gap_pct = gap / abs(monthly_budget) × 100`, and **only** when the monthly budget is non-zero. Otherwise render `—`: never `0%`, never `∞`, never a division error. This is hit by `771199000`, `771501000` and `771502000`: an annual budget is not spread evenly across months, so a COA can hold an FY figure with a zero June.
  - `abs()` in that formula is not cosmetic: without it a negative budget flips the sign of the percentage.
  - **A negative monthly budget gets the status `ALOKASI`**, is excluded from the under/over comparison and from the over-budget count, but still counts toward totals. `772502000 Internal cost allocation` is a credit back to the department, not spending capacity; the plain formula would report OVERBUDGET on an account that has not spent anything.
- [ ] **Year-end projection** (the client's actual question, *"are we still safe until the end of the year?"*): `actual_to_date / months_loaded × 12`, plus the remaining budget and the allowed monthly spend for the rest of the year.
- [ ] Aggregation endpoints: summary, by-COA, quarterly, projection.
- [ ] React dashboard: KPI cards, charts, filters, projection card.
- **Checkpoint:** the dashboard's figures match a hand-checked spreadsheet for the same test data.

> **The projection divides by `months_loaded`** (the number of distinct months that actually have GL data), **never by calendar months elapsed.** Because the GL lags one month, the calendar count understates the run rate every single month, and would report "safe" when it is not. This is the most likely wrong-number bug in the project.

### Phase 6 — Security & Backup · Weeks 7–8 *(Person A leads)*

**Goal:** basic hardening, and no unrecoverable path.

- [ ] Passwords hashed with `bcrypt`: never plaintext, never reversible.
- [ ] Per-role endpoint protection via the route dependency; input validation and sanitization.
- [ ] Basic OWASP review: SQL injection (ORM/parameterized throughout, no string-built SQL) and XSS.
- [ ] Upload hardening: extension + MIME check, size cap, openpyxl read-only mode.
- [ ] Redirect-target validation: never feed a query-string value such as `?next=` into `navigate()`; allow only known relative paths. Open redirect is a recurring weakness in react-router across versions, so this is written regardless of the installed version.
- [ ] **Backup:** `pg_dump --format=custom` to `backups/vega-<fy>-<timestamp>.dump`, taken in a consistent snapshot and safe while the app is running. Three triggers: a daily in-app timer, **immediately before an upload replaces stored data**, and an admin button. Keep the last N, prune the oldest. Call `pg_dump.exe` by full path and pass the password via `PGPASSWORD` in the subprocess environment, never on the command line.
- **Checkpoint:** cross-role access attempts fail as intended; credentials are stored hashed; a backup file restores and opens.

> The pre-replace backup trigger is the one that earns its keep: replacing an already-loaded month is the only operation that can destroy existing figures.
>
> **There are two different "cancels", and the User Manual must not blur them.** *Cancelling at the replace confirmation* (**BATALKAN**, Phase 4) is completely safe: nothing has been written yet, and the stored batch is untouched. *Cancelling a batch after it has already replaced another* does **not** bring the old figures back: re-uploading June and then cancelling leaves June empty, and the recovery is to upload the correct file or restore a backup. Keeping superseded batches alive so that the second cancel could roll back would double the stored rows and complicate every report, to serve a mistake the confirmation dialog now catches first.

### Phase 7 — QA & Testing · Weeks 8–9 *(together)*

**Goal:** ensure it meets the spec and the numbers are right.

- [ ] `Test-Plan.md`: scenarios and cases per module (CRUD, auth, ingestion, calculations).
- [ ] **Fixture tests against the sample files**: every figure on the board reproduced exactly: 240 budget rows / 238 distinct codes, Σ column G = −67,370.88, 73 in-scope GL rows, June actual 488,981.16 USD, COA `770701000` = 210,740.00 − 13,839.10 = 196,900.90.
- [ ] **Cross-check every figure against the client's own Excel pivot** for the same month, **on a real GL file, not on the sample.** The sample amounts are not to scale and cannot settle this test.
- [ ] Debugging & bug fixing.
- [ ] UAT with the department staff who will actually use it.
- **Checkpoint:** the test-case list passes; the board's figures are reproduced exactly; zero critical bugs.

> **The acceptance test that matters:** if VEGA's gap figure disagrees with the client's existing pivot, VEGA is wrong until proven otherwise. Ask for one real month early enough that this test is not the last thing attempted in week 9.

### Phase 8 — Deployment, Documentation & Reporting · Weeks 9–10 *(B leads docs, A leads deployment)*

**Goal:** handover and internship report.

- [ ] Deploy on the host PC: build the frontend, run uvicorn as a Windows service (1 worker), open TCP 8000, verify access from another machine by hostname.
- [ ] **Technical README** + backend/frontend READMEs: setup, configuration, code structure.
- [ ] **User Manual**: operational guide with screenshots, the monthly upload routine, the backup/restore section, and an explicit statement that LAN traffic is plain HTTP by accepted decision.
- [ ] Internship report (SDLC summary + diagram appendix).
- **Checkpoint:** a second machine on the LAN can use the app; final documents complete; handover done.

---

## 5. Anomaly Detection — Considered, Then Dropped

Recorded here so the decision is not re-litigated later. Two forms were weighed and
**both stay out of the app**; the AI research track that was going to explore the first
is dropped from the project entirely.

- **A machine-learning anomaly model** (Isolation Forest on synthetic data). It could only
  ever be trained on generated rows, never the department's own: 73 in-scope GL rows per
  month is roughly 12 observations per COA per year, and nothing can be fitted to that.
- **A robust z-score (median + MAD) anomaly flag** in `analytics.py`, with no ML at all.
  Rejected on verifiability rather than on statistics. The Phase 7 acceptance test is that
  every figure on the dashboard matches the client's own pivot; an anomaly flag matches
  nothing, so it would put an unconfirmable number on a screen whose entire claim is that
  every number traces back to a file. MAD rather than standard deviation is the right *form*
  of the idea (an outlier inflates the standard deviation that is supposed to catch it),
  and that reasoning is worth keeping if the subject is ever reopened.

---

## 6. Documentation Deliverables

English by default. **Three deliberate exceptions**, all because the reader is Indonesian: [Job Desc - Magang SI.md](../Client/Job%20Desc%20-%20Magang%20SI.md) (kept in its original wording), [Client-Presentation.md](../Client/Client-Presentation.md), [Stack-Comparison.md](../Client/Stack-Comparison.md), and the labels on [VEGA-Board.drawio.svg](../Client/VEGA-Board.drawio.svg).

**Diagram formats, two on purpose:**

- **Mermaid inside markdown** for every diagram that lives in a document (flowchart, use case, ERD). Version-controlled, diffable, no binary blob.
- **draw.io** for the one presentation board, [VEGA-Board.drawio.svg](../Client/VEGA-Board.drawio.svg). Mermaid cannot lay out a single canvas that carries both Excel inputs, the traced figure, the dashboard, and the annotation panels side by side. It is stored as `.drawio.svg`, an SVG that renders anywhere *and* carries its own editable source, so it is not the unopenable binary the rule was written against. Its text is still diffable after decoding.

**Documents are filed by audience, not by topic.** Anything a client, supervisor, or
grader opens lives in `Docs/Client/`; documents written for ourselves live in
`Docs/Internal/`. Numbers 1-5 and 7-11 below are client-facing; number 12 and this plan
are internal, along with `Project-Name.md` and `UI-UX-Prompt.md`.

| # | Doc | Job desc | Status |
|---|---|---|---|
| 1 | [Requirements-Spec.md](../Client/Requirements-Spec.md) | §1 | ✅ done — numbered `FR-`/`NFR-`/`BR-`/`AC-` requirements, the single source for every rule |
| 2 | [Flowchart.md](../Client/Flowchart.md) | §1 | ✅ done — the [Excel-Template-Spec.md](../Client/Excel-Template-Spec.md) §9 corrections are applied |
| 3 | [Use-Case.md](../Client/Use-Case.md) | §1 | ✅ done — 15 use cases, permission matrix, step-by-step for the four that matter |
| 4 | [ERD.md](../Client/ERD.md) | §1 | ✅ done — 7 entities, 3NF, with the rejected alternatives argued |
| 5 | `UI-UX.md` | §2 | to write (Phase 2) |
| 6 | [README.md](../../README.md) + `backend/README.md` + `frontend/README.md` | §5 | ✅ done — root rewritten, both per-package ones written |
| 7 | `User-Manual.md` | §5 | to write (Phase 8) |
| 8 | `Test-Plan.md` | §4 | to write (Phase 7) |
| 9 | [Excel-Template-Spec.md](../Client/Excel-Template-Spec.md) | client | ✅ done — the locked reading contract |
| 10 | [VEGA-Board.drawio.svg](../Client/VEGA-Board.drawio.svg) | presentation | ✅ done — Excel to dashboard on one canvas, + a corrections page |
| 11 | [Stack-Comparison.md](../Client/Stack-Comparison.md) | presentation | ✅ done — 3 stacks, pros/cons, decision matrix |
| 12 | [PRD.md](PRD.md) | product | ✅ done — product layer only (personas, journeys, release cut, success measures, risks); cites `FR-`/`NFR-`/`BR-`/`AC-` IDs, restates no rule |

**Deliberately not written:** a hand-maintained `API.md`. FastAPI already generates OpenAPI at `/docs`, and a second copy goes stale by week 2. The backup runbook is a section inside the User Manual, not its own file.

---

## 7. Milestone Summary

| Week | Milestone |
|---|---|
| 1 | ✅ Repo & tooling ready; requirement gathering done |
| 2 | Requirements Spec + Use Case + ERD + Excel Template Spec |
| 3 | UI/UX mockups agreed |
| 5 | Auth + RBAC + User CRUD working; COA list read-only |
| 6 | Excel ingestion working; re-upload asks before replacing, and is proven idempotent |
| 7 | Variance, status and projection on the dashboard |
| 8 | Security hardening + backup done |
| 9 | QA passed against the client's own figures; UAT |
| 10 | Deployed on the LAN host + README + User Manual + final report |

---

## 8. Still Needed from the Client

### Already answered — do not re-ask

| Question | Answer | Source |
|---|---|---|
| Sample `.xlsx` files | **Delivered.** `Budget Dummy.xlsx` (1.4 MB) and `GL Dummy.xlsx` (3.0 MB) in [Docs/Source/](../Source/) | files on disk |
| Status threshold | **Zero tolerance.** No ±5% band | board, "sudah terjawab" |
| Budget granularity | **Twelve monthly columns** `BD:BO`, and an annual figure is **not** spread evenly — a COA can hold an FY budget with a zero June | budget file |
| FY labelling | **FY26 = Apr 2026 → Mar 2027**, labelled by start year | board header |
| Currency | **USD**, from the converted columns `N`/`O` — the same unit the budget uses, so the two compare directly | GL file |
| MVP scope | Section `MIS000` · GL sheet `CORE` · budget sheet `MIS (FC)`. `COMM00` is out | board page 2 |
| Account-number split | Split on `-`; department is segment 3. `LEFT`/`RIGHT` character counts were the client's manual Excel method, not VEGA's | board, `Excel-Template-Spec.md` |
| GL lag | A file received in July carries June's transactions | requirement gathering |
| *"standar OPEX"* | The budgeting variance calculation, nothing exotic | requirement gathering |

### Still open — from the board, blocking nothing but shaping Phase 4

1. **Where is the detail behind the 67,370.88 depreciation budget?** `TOTAL SGA DEPRECIATION` is filled but every detail row under it is zero. This is the root cause of the 9 unmapped GL rows (`770102000` and `770107001`, 159,937.76).
2. **Unregistered-COA policy, confirm our recommendation:** load the row, auto-register it with a zero budget, and report it. The alternative, rejecting a 4,952-row file over 9 rows, blocks 64 good rows for no gain.
3. **`772404000-A7744` and `771501000-A7744` carry no section segment.** Do they belong to IT? Ten rows, 7.51 USD, small in value, but they decide whether the filter has one clause or two.
4. **Duplicate COA codes `740199001` and `761001000`**: which row is authoritative? All four are zero, so nothing breaks either way, but the master data should not carry both.
5. **COA → Category mapping**: is there a master list, or is Category derived from the COA code?

### Still open — operational, needed by Phase 8

6. **Backup retention** and where the off-machine copy should go.
7. **Host PC**: a fixed address, plus local admin rights to install the Windows service and open TCP 8000.
8. **One real GL month** for the pivot cross-check in Phase 7. The sample amounts are not to scale and cannot settle that test.
