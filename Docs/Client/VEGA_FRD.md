# VEGA — Functional Requirement Document (FRD)

## Part A — FRD Audit Findings

Findings from converting the Requirements Specification into this FRD. None of these change a
business rule, a figure, or an ID — they are structural/traceability observations only.

| # | Finding | Type | Recommendation |
|---|---|---|---|
| A-1 | FR-55 and FR-56 (the two-step preview/confirm commit) are numbered after FR-34 but describe the *first* two steps of the upload lifecycle described in §5.5, which already contains FR-27–FR-33. They were evidently appended after the rest of §5.5 was numbered. | Numbering / sequencing | No renumbering — IDs are frozen per your instruction. This FRD places FR-55/FR-56 in their *logical* reading position (before FR-27) inside §7.5, with a footnote explaining the ID gap, so a reviewer isn't confused about ordering. |
| A-2 | AC-12 is listed after AC-5, out of numeric sequence, for the same reason (added later, logically belongs beside AC-1). | Numbering / sequencing | Same treatment: kept as AC-12, positioned logically in §15, footnoted. |
| A-3 | The Administrator capability "download templates" (§4 role table) has no dedicated FR — it is implied by FR-34 ("the system generates the standard Excel templates") but FR-34 doesn't state *who* triggers generation or *how* it's exposed (a download endpoint vs. a static file). | Gap | Not invented here. Logged as **TBC-10** in Part 6 of the ERD/consistency deliverable — recommend the department/supervisor confirm whether FR-34 already covers "download," or a new FR is needed, before Phase 3. |
| A-4 | No FR specifies session/token expiry, failed-login lockout, or password complexity rules. FR-1/FR-2 cover sign-in and hashing but not session lifetime or brute-force protection. | Gap | Logged as **TBC-11**. NFR-8/NFR-9 cover upload hardening and injection/XSS, but not auth hardening specifically. |
| A-5 | FR-48 (export to Excel/CSV) is priority **C** (could-have) but is the only FR in §5.7 without an explicit acceptance criterion in §9. It is not required for pilot acceptance; this FRD notes that explicitly under FR-48 rather than inventing an AC for it. | Gap (intentional, per MoSCoW) | No action needed — flagged so it isn't mistaken for an oversight. |
| A-6 | The permission matrix is referenced ("Full permission matrix: Use-Case.md §4") but Use-Case.md was not supplied. | Missing source document | This FRD reconstructs the two-role split from §4's prose and FR-3, but cannot verify it against the actual matrix. Logged as **TBC-1**. |
| A-7 | Nine "Open items" in the source (§11) are still open and directly affect FR-24, FR-23, FR-7/FR-44/FR-46, FR-51, and AC-8. They are carried forward unchanged into §17 of this FRD and into the ERD's TBC list, not resolved by assumption. | Carry-forward | Preserved verbatim in intent; see §17. |

No business rule, monetary formula, status label, or acceptance figure was altered. Every FR/NFR/BR/AC ID below is identical to the source document.

---

## 1. Document Control

| Field | Value |
|---|---|
| Document | VEGA Functional Requirement Document (FRD) |
| Source document | Requirements Specification — VEGA (client-facing, cleaned-up requirement gathering output) |
| Companion documents | Flowchart.md (behaviour) · Use-Case.md (actors, **not supplied — see TBC-1**) · ERD.md / ERD_REVISED.md (data) · Excel-Template-Spec.md (physical file contract — precedence over this FRD on layout figures) · VEGA-Board.drawio.svg (precedence over this FRD on client-facing behaviour) · Job Desc - Magang SI.md (graded criteria) |
| Precedence rule (unchanged from source) | On a figure, column position, or rule order: Excel-Template-Spec.md wins over this FRD. On behaviour shown to the client: VEGA-Board.drawio.svg wins over this FRD. |
| Status | Draft FRD derived from the frozen Requirements Specification; ready for supervisor/department review |
| Version | 1.0 (FRD restructuring pass) |
| Prepared for | MIS/IT department pilot, President University internship deliverable |

---

## 2. Introduction & Background

The MIS/IT department currently reconciles its fixed-cost annual budget against monthly General
Ledger (GL) actuals **by hand**, once a month: filtering the GL export to the department's rows,
splitting each account number into code and section, matching against the budget sheet, pivoting
to a monthly total per account, and finally judging — by intuition, not by a computed figure —
whether the year will end within budget.

This process is redone from scratch every month, is not reviewable by anyone who didn't build the
spreadsheet, and never actually answers the one question the department cares about: *are we still
safe until the end of the fiscal year?*

**VEGA** (Variance Evaluation & Graphical Analytics) automates the five manual steps. It ingests
the two Excel workbooks the department already produces (the annual budget, the monthly GL
export), stores exactly what it read, and derives variance, status, and a year-end projection at
the moment someone opens the dashboard — never in advance, never cached.

VEGA is explicitly **not**: a replacement for the accounting system, a journal-entry tool, or an
approval workflow. It reads what already exists and compares it to a plan.

---

## 3. Objectives

1. Eliminate the manual monthly reconciliation routine (GL filter → account split → lookup →
   pivot → eyeball) by deriving variance, status, and projection automatically from two uploaded
   Excel files.
2. Give the department head a single dashboard answer to "are we on track for the fiscal year,"
   backed by a real, traceable number rather than intuition.
3. Make every figure on screen traceable back to the exact upload batch and source row that
   produced it (NFR-12), so the numbers are defensible without needing whoever built the sheet.
4. Keep the system auditable and recoverable: nothing overwrites stored figures without a human
   confirmation and a backup (BR-5, FR-27, NFR-13).
5. Deliver a working pilot for one division (~6 users) within the ~10-week internship SDLC,
   documented well enough to hand over without the interns (NFR-16).

---

## 4. Scope & Out of Scope

### 4.1 In Scope

- Ingesting the fiscal-year budget workbook and the monthly GL workbook from Excel.
- Storing budget and actual figures per account, per month, per fiscal year.
- Deriving variance, status, and a year-end projection (computed at query time, never stored).
- An analytics dashboard with filters.
- A read-only chart-of-accounts (COA) master, derived entirely from the uploads.
- User and role management (the *only* hand-edited stored data in the system).
- Authentication and exactly two roles: Administrator, Regular user.
- Scheduled and event-triggered database backup.
- An upload history and an audit log.

### 4.2 Out of Scope

| Excluded | Why |
|---|---|
| Desktop application | Decided in favor of a web app on the department LAN. `desktop/` must not be created. |
| Mobile version | Dropped during requirement gathering. |
| Manual entry or editing of any figure | Every number must trace to an uploaded file (BR-1). |
| An expenditure CRUD module | Actuals come from the GL only (BR-1). |
| COA create/edit screens | The COA master is a projection of the two workbooks; a second way to edit it would let the master disagree with the files every figure traces to. Corrections are a re-upload (BR-16, FR-7). |
| Multi-department / multi-entity reporting | MVP covers section `MIS000` only. Other sections/entities in the GL are read past, not read in. |
| Approval / workflow engine | Not requested. |
| AI/ML anomaly detection in-app | Deliberately excluded — an anomaly flag can't be matched against the client's own pivot, and Phase 7 acceptance requires every figure to match that pivot exactly. |
| HTTPS | Host is network-isolated; plain HTTP is an accepted, documented decision (NFR-3). |

---

## 5. Stakeholders & User Roles

### 5.1 Stakeholders

| Stakeholder | Interest |
|---|---|
| Department head / manager | The dashboard: over/under position and year-end projection, without asking anyone to prepare it. |
| Administrator (staff member handling the monthly file) | Uploading is quick, mistakes are recoverable, figures can be shown to be correct. |
| Regular users (~5 department staff) | Read the dashboard, filter it. Change nothing. |
| The interns (development team, 2) | Deliver the full SDLC in ~10 weeks and document it. |
| Company IT / network owner | The host stays isolated from the company network. |

Pilot scope: **one division, ~6 users total.**

### 5.2 Roles

Role is a constrained **attribute of a user** (two values), not a separate table — see ERD §4.2.

| Role | Definition |
|---|---|
| **Administrator** | Everything a Regular user can do, **plus**: upload files, confirm/decline a replacement, manage users and roles, download templates, take and list backups. User management is the *only* stored data an administrator hand-edits — every figure and every COA comes from a file. |
| **Regular user** | Read-only in the strict sense. No action available to them changes stored data. |

Enforcement is a **route-level dependency**, not a per-handler check and not a hidden button (FR-3).
A Regular user calling an Administrator endpoint directly is refused. *(Full permission matrix is
specified in Use-Case.md §4 — not supplied to this review; see **TBC-1**.)*

---

## 6. Business Process Overview

**Current (manual) process, once per month:**
1. Open the GL export → filter to the department's own rows.
2. Split each account number → recover account code + section.
3. Look each account code up against the budget sheet.
4. Build a pivot → monthly total per account.
5. Read off overspent accounts and *guess* whether the year will end within budget.

**VEGA's automated process:**

```
Budget workbook (once/year) ──┐
                               ├─► Preview (FR-55) ─► Confirm ─► [Replace decision if period exists (FR-27)] ─► Store (atomic, FR-30)
GL workbook (once/month)  ────┘

Stored budget + actual  ──►  Query-time derivation (FR-35–FR-42)  ──►  Dashboard (FR-43–FR-47)
                                                                              │
                                                                              ▼
                                                          Department head reads variance,
                                                          status, and year-end projection
                                                          — a real figure, not a guess.
```

Every write to stored data (upload confirm, replace, user change) passes through the same gate:
**a human sees a preview of exactly what will be written, before it is written** (BR-17). Nothing
is stored partially (BR-14) and nothing destructive happens without a backup taken first (NFR-13).

---

## 7. Functional Requirements

Each requirement below preserves its source ID, wording intent, and priority (MoSCoW: **M**ust /
**S**hould / **C**ould). Structured fields (Actor, Precondition, Input, Process, Business Rules,
Output, Exception, Acceptance Criteria) are given **where relevant** — a read-only or
configuration-style FR omits fields that don't apply rather than padding them.

### 7.1 Authentication & Access Control

**FR-1 — Sign-in required (M)**
- *Actor:* Any user.
- *Precondition:* User holds a valid, active account.
- *Input:* Username, password.
- *Process:* Credentials are verified before any data route is reachable.
- *Output:* Authenticated session; access to role-appropriate routes.
- *Exception:* Invalid credentials → access refused, no session issued.
- *AC:* Covered by AC-1 (sign-in as precondition for all role tests).

**FR-2 — Passwords stored hashed (M)**
- *Actor:* System (on account creation/password change).
- *Business Rule:* Password hash is never reversible to plaintext; no plaintext copy is ever stored or logged.
- *Output:* `password_hash` column only (see ERD §2.1).

**FR-3 — Write endpoints require Administrator role, enforced in one place (M)**
- *Actor:* System (route-level dependency), enforced against every user.
- *Process:* A single, centralized authorization check gates every state-changing endpoint — not a per-handler check, not a hidden UI button.
- *Exception:* A Regular user calling an Administrator endpoint directly (e.g., via API) is refused, not merely hidden from the UI.
- *AC:* AC-1 — "a regular user is refused on every write — including by calling the endpoint directly."

**FR-4 — Administrator manages users (M)**
- *Actor:* Administrator.
- *Precondition:* Signed in as Administrator.
- *Input:* Username, full name, password, role, active/inactive state.
- *Process:* Create, edit, deactivate, reactivate a user; set their role.
- *Output:* Updated `user` row; action written to `audit_log` (FR-54).
- *AC:* AC-1.

**FR-5 — Deactivated user cannot sign in; history retained (S)**
- *Process:* `is_active = false` blocks FR-1. The user's prior uploads/audit entries remain attributable (never deleted — see ERD §2.1).

**FR-6 — User changes own password (S)**
- *Actor:* Any signed-in user (self-service, not restricted to Administrator).
- *Process:* Old password verified, new password hashed and stored (FR-2 rule applies).

### 7.2 Master Data — Read-Only, Derived from Uploads

**FR-7 — COA master, read-only (M)**
- *Actor:* Administrator (list/search/read); no role may write.
- *Input:* Populated automatically from budget upload (FR-12) and GL ingestion (FR-24).
- *Output:* Code, name, category, department, source — list/search only. No create/edit/delete UI or endpoint exists for any role.
- *Business Rule:* BR-16 — the *only* correction path is re-uploading a corrected workbook.

**FR-8 — COA codes unique (M)**
- *Process:* Ingestion keeps the first occurrence of a duplicate code within one sheet and reports the second (FR-17 governs the reporting mechanics).

**FR-9 — COA never deleted (M)**
- *Process:* An account that disappears from a re-uploaded budget keeps its stored figures and history — it is not removed. (ERD models this as `is_active` flip, not a delete — see ERD §2.3, §7.)

**FR-10 — IT department seeded on first run (M)**
- *Process:* One department row (`MIS000`) exists from first run; no department-management screen exists (MVP is single-department).

**FR-11 — GL-derived COA flagged for review (M)**
- *Process:* A COA auto-created during GL ingestion (FR-24) is marked `is_gl_derived = true` and listed on the upload result, so an administrator sees what the system added on its own.

### 7.3 Excel Ingestion — Budget

**FR-12 — Budget upload stores 12 monthly figures per account (M)**
- *Actor:* Administrator.
- *Input:* Fiscal-year budget workbook.
- *Process:* Parse, validate (FR-13–FR-17), and stage for preview (FR-55) before storing.
- *Output:* One `budget` row per account per period (12 per account per fiscal year).

**FR-13 — Monthly block located by band label, not position or name (M)**
- *Process:* The parser locates the twelve-month block using the band label on the row above the month headers.
- *Exception:* A label mismatch is **reported**, not guessed at — the file is not silently parsed against the wrong columns.

**FR-14 — Subtotal rows excluded by description column, checked before code (M)**
- *Process:* The description column is evaluated before the code column when deciding whether a row is a subtotal (and therefore excluded).

**FR-15 — Row-level annual reconciliation, tolerance 0.005 (M)**
- *Business Rule:* Each row's 12 monthly figures must sum to that row's stated annual total, within 0.005.
- *Exception:* On failure, **every** offending row is listed and the **whole file is refused** — not a partial import.
- *AC:* AC-2.

**FR-16 — Negative budget figures accepted (M)**
- *Business Rule:* A negative monthly budget is never itself a rejection reason (it becomes `ALOKASI` at analytics time — FR-37).

**FR-17 — Duplicate account code within one sheet: keep first, report second (M)**
- *Output:* Upload result lists the duplicate as a reportable item, not a rejection.

**FR-18 — Re-uploading a budget replaces the whole fiscal year, after confirmation (M)**
- *Process:* Governed by the same replace-decision gate as FR-27 — a budget re-upload replaces the *entire* fiscal year for the department (not just one period, unlike a GL re-upload).
- *AC:* AC-4.

### 7.4 Excel Ingestion — General Ledger

**FR-19 — One designated sheet read; others ignored (M)**
- *Actor:* Administrator.
- *Process:* Only the designated sheet in the monthly GL workbook is read; other sheets in the same file are ignored.

**FR-20 — Only converted-USD debit/credit pair used in arithmetic (M)**
- *Business Rule:* BR-10. Native-currency amounts and the exchange rate are stored for traceability (`debit_native`, `credit_native`, `exch_rate`) but **never** used in any calculation.

**FR-21 — actual = converted debit − converted credit, per row (M)**
- *Business Rule:* A negative net is valid (e.g., a credit/reversal row).

**FR-22 — Period from the file's fiscal-period column, not the transaction date (M)**
- *Business Rule:* BR-9. `txn_date` is a cross-check only; a disagreement between `txn_date` and the period column is **reported**, and the period column still wins — the period is never changed based on the date.

**FR-23 — Two-clause department row filter (M)**
- *Business Rule:* BR-11. A row belongs to the department if **either** (a) it has 3 account-number segments whose 3rd is the department section, **or** (b) it has 2 segments and its account code already exists in the budget master.
- *Output:* Rows admitted via clause (b) are reported as "included, section missing" (stored as `section = null` on `actual`, per ERD §2.5).
- *AC:* AC-3 — the two-clause row count must match the canonical verification table exactly.

**FR-24 — Unmapped account code auto-registered, not rejected (M)**
- *Business Rule:* BR-12. An account code with no budget master row is ingested, auto-registered with a zero budget (`is_gl_derived = true` on the new COA), and reported on the upload result — never a rejection reason.
- *AC:* AC-6.

**FR-25 — File with more than one distinct fiscal period is refused (M)**
- *Exception:* Whole-file refusal (consistent with FR-30's atomicity — nothing partial is stored).

**FR-26 — Row-level rule order, fixed (M)**
- *Process, in order:* missing account number → skip row · missing period → skip row · non-numeric amount → **refuse whole file** · both debit and credit filled on one row → **refuse whole file** · otherwise → ingest.
- *Business Rule:* This order is fixed and must not be re-sequenced — a "refuse file" rule evaluated after a "skip row" rule for the same row would silently under-report the refusal reason.

### 7.5 Upload Lifecycle

> *Reading note (see Audit Finding A-1): FR-55 and FR-56 are the first two steps of this lifecycle
> and are placed here in logical order, ahead of FR-27–FR-33, even though their IDs were assigned
> later in the source document. No ID has been changed.*

**Step 1 of 2 — Preview**

**FR-55 — Two-step commit; preview before write (M)**
- *Actor:* Administrator.
- *Precondition:* A budget or GL file has been selected for upload.
- *Input:* The raw Excel file.
- *Process:* The file is parsed and **fully validated in memory**. The result — detected file kind, fiscal year and period, rows read/accepted/rejected, total amount, and a sample of rows exactly as the system understood them — is shown as a preview.
- *Business Rule:* BR-17 — nothing is written until the administrator explicitly confirms.
- *Output:* On-screen preview only; no database write yet.
- *AC:* AC-12.

**FR-56 — Decline leaves the database untouched; validation failures shown on the same screen (M)**
- *Process:* If the administrator declines the preview, nothing is written and stored data is untouched. If validation itself refuses the file, the *same* preview screen states the reasons — per-row for a row problem (FR-26, FR-31), per-file for a layout problem — and the remedy is to correct the workbook and re-upload (BR-1).
- *Exception:* This is the terminal state for a refused file; there is no partial-accept path.
- *AC:* AC-5, AC-12.

**Step 2 of 2 — Replace decision (only if the period is already loaded, and only after the preview is accepted)**

**FR-27 — Replace decision required if period already loaded (M)**
- *Actor:* Administrator.
- *Precondition:* Preview accepted (FR-55/56) AND the target period/fiscal-year is already loaded.
- *Process:* System shows the **stored batch** — period, row count, total amount, uploader, upload time — and requires an explicit choice: **GANTI DATA** or **BATALKAN**.
- *Business Rule:* BR-5 — replacement is never automatic.
- *AC:* AC-4.

**FR-28 — GANTI DATA: backup first, then atomic replace (M)**
- *Process:* Backup taken first (feeds FR-49) → only that period's rows deleted → new file loaded — **in one transaction**.
- *Business Rule:* BR-4 (batch is the idempotency key), NFR-13 (no destructive op without a prior backup).
- *AC:* AC-4, AC-9.

**FR-29 — BATALKAN: nothing written, stored batch stays intact (M)**
- *AC:* AC-4.

**FR-30 — Upload is atomic (M)**
- *Business Rule:* BR-14 — either every row lands or none does.
- *AC:* AC-4, AC-5, AC-12.

**FR-31 — Upload result reports rows read/imported/rejected, with a reason per rejected row (M)**
- *Business Rule:* BR-13 — a rejected row is never silently dropped; it is money missing from the variance if unreported.
- *AC:* AC-5, AC-6.

**FR-32 — Every upload recorded as a batch (M)**
- *Output:* `upload_batch` row — kind, filename, fiscal year, periods covered, uploader, timestamp, row counts, status. Visible to **every role** (read-only for Regular users).

**FR-33 — Administrator can cancel a recorded batch (S)**
- *Actor:* Administrator.
- *Process:* Batch status → `CANCELLED`; its child rows removed (ERD §7).
- *Exception:* Documented in the User Manual: cancelling a batch that already replaced another does **not** restore the replaced figures.

**FR-34 — System generates standard Excel templates from the same layout constants the parser reads (S)**
- *Business Rule:* NFR-15 — the layout facts live in one module; the generator reads the same constants the parser reads, so a layout change can't desync generation from parsing.
- *Gap noted:* the specific trigger/exposure of "download" is implied by the Administrator role table (§5.2) but not spelled out as its own FR — see Audit Finding A-3 / **TBC-10**.

### 7.6 Analytics — see §11 for full detail (cross-referenced here for completeness)

FR-35–FR-42 are specified in full in §11 (Analytics & Calculation Rules) to keep every formula,
rounding rule, and edge case together in one place, as the source document's own precedence
rules imply (a calculation rule split across two sections is a rule that can silently drift).

### 7.7 Dashboard — see §12

FR-43–FR-48 are specified in §12 (Dashboard Requirements).

### 7.8 Backup & Audit — see §13

FR-49–FR-54 are specified in §13 (Backup & Audit Requirements).

---

## 8. Business Rules

Unchanged from source. These are decisions, not preferences — each exists because the alternative
produced a wrong number.

| ID | Rule |
|---|---|
| BR-1 | Actuals are GL-upload-only. No manual entry, no editing of any figure. A correction is a re-upload. |
| BR-2 | Fiscal year runs April→March. FY26 = April 2026 → March 2027, labelled by start year. All fiscal date logic lives in one module. |
| BR-3 | The GL lags one month: the file received in month M carries month M−1's transactions. |
| BR-4 | The upload batch is the idempotency key. Re-uploading a period replaces it wholesale. |
| BR-5 | Replacing stored figures always requires an explicit human decision (FR-27). |
| BR-6 | Zero tolerance on status (FR-36). |
| BR-7 | A negative monthly budget is an allocation, not spending capacity (FR-37). |
| BR-8 | The projection divides by months **actually loaded** (FR-39). |
| BR-9 | The period comes from the period column, never from a date or the uploader (FR-22). |
| BR-10 | Only converted-currency amounts are used, addressed by position (FR-20). |
| BR-11 | The department filter has two clauses (FR-23). |
| BR-12 | An unmapped account code is ingested and reported, not rejected (FR-24). |
| BR-13 | A rejected row is never silently dropped (FR-31). |
| BR-14 | Nothing is stored partially (FR-30). |
| BR-15 | An annual budget figure is never divided by 12 — some accounts hold a full-year figure with nothing allocated to a given month. |
| BR-16 | The COA master is read-only and derived from uploads (FR-7); corrected only by re-upload. The user list is the *only* hand-edited stored data. |
| BR-17 | Nothing is written before a human has seen what would be written (FR-55). Parsing and storing are separate steps; the preview is the gate. |

---

## 9. Data Requirements

Entities: `user`, `department`, `coa`, `budget`, `actual`, `upload_batch`, `audit_log` — specified
in full in the companion ERD deliverable (Part 4). Two shape decisions carried forward unchanged:

- **No `category` entity.** Category is an attribute of a COA; nothing else references a category by identity.
- **No `fiscal_year` entity, no `role` table.** A fiscal year is fully derivable from its integer start year; `role` is a constrained two-value attribute.

The physical Excel contract (sheet names, header rows, column indices, account-number split, rule
order, canonical verification figures) lives in **Excel-Template-Spec.md**, kept separate because
it changes independently when the client's file changes.

---

## 10. Validation & Error Handling

This section consolidates every validation and error rule scattered across §7.3/§7.4/§7.5 into one
testable reference, without introducing any new rule.

### 10.1 Budget workbook validation (order of evaluation)

| Order | Check | On failure | Source |
|---|---|---|---|
| 1 | Monthly block located by band label | Mismatch **reported**, not guessed | FR-13 |
| 2 | Subtotal rows excluded via description column (checked before code) | Row excluded from ingestion | FR-14 |
| 3 | Duplicate account code within sheet | First kept, second **reported** (not refused) | FR-17 |
| 4 | 12 monthly figures reconcile to annual total, tolerance 0.005 | **Whole file refused**, every offending row listed | FR-15, AC-2 |
| 5 | Negative monthly figure | **Never** a rejection reason | FR-16 |

### 10.2 GL workbook validation (fixed row-level order — do not re-sequence)

| Order | Check | Result | Source |
|---|---|---|---|
| 1 | More than one distinct fiscal period in the file | **Whole file refused** | FR-25 |
| 2 | Missing account number (per row) | Row **skipped** | FR-26 |
| 3 | Missing period (per row) | Row **skipped** | FR-26 |
| 4 | Non-numeric amount (per row) | **Whole file refused** | FR-26 |
| 5 | Both debit and credit filled on one row | **Whole file refused** | FR-26 |
| 6 | Department filter (2-clause) | Row admitted (flagged if clause 2) or excluded | FR-23, BR-11 |
| 7 | Account code not in budget master | **Ingested**, auto-registered at zero budget, reported | FR-24, BR-12 |
| 8 | (Otherwise) | Row ingested | FR-26 |

### 10.3 Upload-level gates (apply after file-level validation passes)

1. **Preview** (FR-55) — always shown, whether or not the period is already loaded. Declining writes nothing (FR-56).
2. **Replace decision** (FR-27) — shown only if the period is already loaded, and only after the preview is accepted. `GANTI DATA` (FR-28) or `BATALKAN` (FR-29).
3. **Atomicity** (FR-30, BR-14) — every row lands or none does, at every stage above.

### 10.4 Error reporting requirement

Every rejected row carries a **reason** (FR-31, BR-13); every file-level refusal lists **every**
problem found in one pass (AC-5) rather than stopping at the first error. Rejected/refused ≠
silently dropped, in all cases.

---

## 11. Analytics & Calculation Rules

All formulas below are **derived at query time only** (FR-41) — no aggregate is ever stored, so
nothing can go stale after a re-upload.

**FR-35 — Variance (M)**
```
variance = budget − actual
```
Computed per account per month, and aggregated per period and fiscal year.

**FR-36 — Zero-tolerance status (M)** *(BR-6)*
- Round to **2 decimals once**, immediately before comparison — never on the way into the database (see ERD §6, `NUMERIC(18,2)`, `Decimal`, never `float`).
- `variance ≠ 0` → `UNDER BUDGET` or `OVER BUDGET`.
- `variance = 0` exactly → `ON BUDGET`.
- **No percentage band** — this is a hard zero-tolerance comparison, not a threshold.

**FR-37 — Negative monthly budget → `ALOKASI` status (M)** *(BR-7)*
- A negative monthly budget's variance is still displayed.
- It is **excluded** from the over/under comparison and from any over-budget count.
- It **still contributes** to totals (KPI cards, FR-43).

**FR-38 — Variance percentage (M)**
```
variance_pct = variance / abs(monthly_budget) × 100   — only when monthly_budget ≠ 0
```
- When `monthly_budget = 0`: renders as **`—`** — never `0%`, never `∞`, never an error.

**FR-39 — Year-end projection (M)** *(BR-8, BR-15)*
```
projection = actual_to_date / months_loaded × 12
```
- `months_loaded` = the count of **distinct periods that actually hold GL data** — **never** calendar months elapsed. (An annual figure is never divided by 12 on its own — BR-15 — that's a distinct rule about budget figures, not this projection formula.)

**FR-40 — Remaining budget and allowed average monthly spend (M)**
- Alongside the projection: remaining budget for the year, and the allowed average monthly spend for the rest of the year (both derived, not stored).

**FR-41 — Query-time derivation only (M)**
- No `variance`, `status`, or `projection` value is ever persisted. Re-querying after a re-upload always reflects the current stored `budget`/`actual` rows.

**FR-42 — Exact decimal arithmetic (M)**
- Money is never binary floating point at any stage of these calculations (ERD §6 enforces this at the database type level as well).

### 11.1 Worked edge cases (for test-case authors — not new rules)

| Scenario | Expected behaviour | Rule |
|---|---|---|
| Monthly budget = 0, actual > 0 | Status computed normally (0 vs 0 comparison only applies if actual is also 0); `variance_pct` = `—` | FR-36, FR-38 |
| Monthly budget = −500, actual = 300 | Status = `ALOKASI`; excluded from over/under count; included in KPI totals | FR-37 |
| Only 3 of 12 periods have GL data loaded | `months_loaded = 3`; projection divides by 3, not by however many calendar months have passed | FR-39, BR-8 |
| variance = 0.004 after rounding | Rounds to 0.00 → `ON BUDGET` (rounding happens once, immediately before comparison) | FR-36 |

---

## 12. Dashboard Requirements

| ID | Requirement | Pri | Notes |
|---|---|---|---|
| FR-43 | KPI cards: total budget, total actual, total variance, over-budget account count, year-end projection | M | Totals *include* `ALOKASI` accounts (FR-37); the over-budget *count* excludes them. |
| FR-44 | Budget-vs-actual comparison chart, by account or category | M | "Category" grouping depends on Open Item #5 (how COA maps to category) — see §17. |
| FR-45 | Quarterly trend view across the fiscal year | M | Fiscal Q1 = periods 1–3 (Apr–Jun) per ERD §3. |
| FR-46 | Filters: fiscal year, period/quarter, category, department | M | Department filter is a no-op at pilot scale (single department) but the field exists. |
| FR-47 | Per-account table: budget, actual, variance, percentage, status — `ALOKASI` and unregistered accounts **visibly marked** | M | "Unregistered" = `is_gl_derived = true` on `coa`. |
| FR-48 | Export on-screen table to Excel/CSV | C | Not required for pilot acceptance (no AC references it) — see Audit Finding A-5. |

---

## 13. Backup & Audit Requirements

| ID | Requirement | Pri |
|---|---|---|
| FR-49 | Backup on three triggers: daily in-app schedule, immediately before a replace, and on administrator request. | M |
| FR-50 | Each backup is a complete, self-contained, individually-openable copy, written while the app keeps serving; unique timestamped name; never overwrites an earlier copy. | M |
| FR-51 | Most recent N copies kept, older pruned; N is an administrator setting. | S |
| FR-52 | Administrator can list existing backups. | S |
| FR-53 | Restore is a documented manual admin procedure in the User Manual — not a UI button. | S |
| FR-54 | Data-changing actions (login, upload, replace, master-data change, user change) are written to an audit log recording who/what/when. | S |

*Note — FR-51's "administrator setting" for retention count N, and FR-52's backup listing, have no
corresponding entity in the current ERD (backups appear to be filesystem artifacts, not database
rows). This is flagged as an ERD/FRD consistency item — see the companion ERD deliverable, §5 and
**TBC-8**.*

---

## 14. Non-Functional Requirements

Unchanged from source, carried forward for completeness (no restructuring needed — these were
already atomic and testable):

| ID | Requirement | Target / Rationale |
|---|---|---|
| NFR-1 | Deployment shape | One host PC, API on `0.0.0.0:8000` as a Windows service, serves the built frontend; reached by hostname. |
| NFR-2 | Exactly one worker process | The daily backup timer lives in-app; N workers would fire N backups. |
| NFR-3 | Network isolation | Host isolated from company network; plain HTTP by accepted decision, stated in the User Manual. |
| NFR-4 | Database location | Local disk only, never a network share (locking corrupts it). |
| NFR-5 | Ingestion performance | ~5,000-row GL workbook validated + stored in <30s on the host PC. |
| NFR-6 | Dashboard responsiveness | <2s render, one fiscal year at pilot scale. |
| NFR-7 | Concurrency | Correct with ~6 simultaneous users, one uploading; readers not blocked by a bulk insert. |
| NFR-8 | Upload hardening | Extension + MIME check, size cap, workbook opened read-only. |
| NFR-9 | Injection/XSS | All DB access parameterised via ORM; rendered values escaped. |
| NFR-10 | Redirect safety | Query-string redirect targets never navigated to directly; only known relative paths allowed. |
| NFR-11 | Financial accuracy (top quality attribute) | Every figure cross-checked against the department's own Excel pivot, same month, real GL file. |
| NFR-12 | Auditability | Every displayed figure traces to a batch; every batch to an uploaded file. |
| NFR-13 | Recoverability | No operation destroys stored figures without a prior backup. |
| NFR-14 | Browser support | Current Chrome/Edge on Windows; no legacy IE. |
| NFR-15 | Maintainability | Every physical Excel-layout fact lives in one module; all fiscal-calendar logic lives in one module. |
| NFR-16 | Handover | Technical README + User Manual sufficient for a successor without the interns. |
| NFR-17 | Documentation language | English, except material for the Indonesian audience (job description, client presentation, stack comparison, presentation-board labels). |

---

## 15. Acceptance Criteria

> *Reading note (Audit Finding A-2): AC-12 is listed after AC-5 in the source, out of numeric
> order, but logically belongs beside AC-1/AC-12 (both concern the preview gate). Positioned here
> in logical reading order; ID unchanged.*

| ID | Criterion |
|---|---|
| AC-1 | Administrator signs in, manages users/roles via UI, reads COA list with no edit path; Regular user refused on every write, including direct endpoint calls. |
| AC-12 | Every upload shows a preview before anything is stored; declining leaves the database byte-for-byte unchanged (FR-55, FR-56). |
| AC-2 | Budget workbook loads; every row's 12 monthly figures reconcile to its annual total. |
| AC-3 | GL workbook loads and reproduces the canonical verification table in Excel-Template-Spec.md §6 exactly — including the two-clause row count and total. |
| AC-4 | Re-uploading the same month shows the stored batch and requires a choice; `GANTI DATA` replaces without doubling, `BATALKAN` stores nothing. |
| AC-5 | A workbook with a moved column, a non-numeric amount, or >1 period is refused whole, every problem listed in one pass on the preview screen. |
| AC-6 | An unmapped account code is ingested, auto-registered at zero budget, and listed on the upload result. |
| AC-7 | Status, percentage, `ALOKASI` handling, and projection match a hand-checked spreadsheet for the same data. |
| AC-8 | Dashboard figures match the department's own Excel pivot for one real GL month. **If they disagree, VEGA is wrong until proven otherwise.** Cannot be settled with sample workbooks (scale mismatch — converted IDR rows land at 1–3 USD, USD rows at 20k–200k). A real GL month must be requested early. |
| AC-9 | Backup taken automatically before a replacement; file opens independently; documented restore returns the database to that state. |
| AC-10 | A second machine on the LAN reaches the application by hostname and uses it. |
| AC-11 | Technical README and User Manual are complete; User Manual states the plain-HTTP decision explicitly. |

---

## 16. Assumptions, Constraints & Dependencies

### Assumptions
1. The Excel files keep the layout recorded in Excel-Template-Spec.md; a layout change is a change request, not a defect.
2. One upload represents one fiscal period.
3. The department supplies a host PC that stays on, with local administrator rights.
4. ~6 users, one division — nothing designed for departmental rollout.

### Constraints
1. Time: ~10 effective weeks, 2 interns, full SDLC including documentation.
2. Isolation: no company-network dependency, no internet dependency at runtime.
3. No separate database server to install or hand over.
4. Deliberately small dependency set: no data-analysis framework, no UI framework, no client-state library.

### Dependencies
- Excel-Template-Spec.md must stay in sync with the client's actual file layout (it, not this FRD, is the source of truth for layout figures).
- One real GL month must be supplied by the department for AC-8 — this is on the critical path for acceptance and cannot be simulated from the sample workbooks.
- Use-Case.md's permission matrix (§4) was not supplied to this review — see TBC-1.

---

## 17. Open Issues / TBC

Carried forward **unchanged** from the source's own Open Items — these are the client's, not
introduced by this FRD pass:

| # | Question | What it affects |
|---|---|---|
| 1 | Where is the detail behind the depreciation budget that exists only as a subtotal? | The correct budget for the two auto-registered depreciation accounts. |
| 2 | Confirm the unregistered-COA policy (FR-24). | Whether ingestion reports or refuses. |
| 3 | Do the two sectionless account numbers belong to IT? | Whether the department filter keeps one clause or two (FR-23). |
| 4 | Which of each pair of duplicate account codes is authoritative? | Master-data cleanliness; both pairs currently zero. |
| 5 | How does a COA map to its category — a master list, or derived from the code? | Now load-bearing: no COA edit screen exists (FR-7), so category must be readable from the workbook or the code itself. Decides FR-44/FR-46 category grouping. |
| 6 | Backup retention count, and whether a copy goes to a second location. | FR-51. |
| 7 | Host PC address and local administrator rights. | Deployment. |
| 8 | One real GL month. | AC-8 — the acceptance test that matters most. |
| 9 | UI language — English, Indonesian, or Indonesian labels over English data terms. | Frontend copy, User Manual screenshots. |

Additional items surfaced by this FRD/ERD review (not in the original Open Items list — see the
companion ERD deliverable for the full numbered TBC list, TBC-1 through TBC-11).

---

## 18. Requirement Traceability Matrix

### 18.1 Job Description → FRD (carried forward, unchanged from source §12)

| Job description section | Covered by |
|---|---|
| §1 Analyse budgeting/actuals business flow | §6, §7, Flowchart.md |
| §1 Flowchart and Use Case Diagram | Flowchart.md, Use-Case.md |
| §1 Normalised ERD | ERD deliverable, §9 |
| §2 Wireframe and mockup | FR-43–FR-47 (Phase 2 deliverable) |
| §2 Analytics dashboard layout | FR-43–FR-47 |
| §3 Web/desktop app isolated from network | NFR-1, NFR-3 |
| §3 CRUD for master data, budget input, expenditure recording | FR-4–FR-6 (users — the actual CRUD surface), FR-12 (budget by upload), FR-7–FR-11 (COA, read-only). **Both budget entry and expenditure recording are by upload, not form — BR-1, BR-16.** See §4.2 (Out of Scope) for why. |
| §3 Variance calc and status | FR-35–FR-38 |
| §3 Credential encryption and access mgmt | FR-2, FR-3, NFR-8–NFR-10 |
| §4 Test scenarios | Test-Plan.md (Phase 7), §15 (this FRD) |
| §4 Validate financial accuracy/visualisations | NFR-11, AC-7, AC-8 |
| §4 Debugging/bug fixing | Phase 7 |
| §5 Technical documentation/README | NFR-16, AC-11 |
| §5 User Manual | NFR-16, AC-11, NFR-3 |

**Deliberate deviation (unchanged from source):** the job description's CRUD module for "Master
Data Kategori, Input Anggaran, dan Pencatatan Pengeluaran" is met by user/role management
(FR-4–FR-6) instead — the one place an administrator genuinely owns the data. Budget, actuals, and
the COA master are loaded from files, never keyed in, because there must be exactly one source for
each figure. Documented as an intentional decision, to be raised with the supervisor before the
Phase 3 checkpoint.

### 18.2 FR/NFR/BR/AC → ERD entity (summary — full table in the companion ERD deliverable, §5)

| Requirement group | Primary ERD entity/entities |
|---|---|
| FR-1, FR-2, FR-4–FR-6, FR-54 (actor) | `user` |
| FR-7–FR-11 | `coa`, `department` |
| FR-12–FR-18 | `budget`, `upload_batch` |
| FR-19–FR-26 | `actual`, `upload_batch`, `coa` (auto-register) |
| FR-27–FR-33, FR-55, FR-56 | `upload_batch` (status, `replaced_batch_id`) |
| FR-35–FR-42 | **No entity** — computed at query time from `budget` + `actual` (ERD §4.3) |
| FR-43–FR-48 | Same as above; no dedicated dashboard entity |
| FR-49–FR-53 | **No entity in current ERD** — see TBC-8 in the companion deliverable |
| FR-54 | `audit_log` |
