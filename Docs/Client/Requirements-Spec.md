# Requirements Specification — VEGA

**VEGA**: Variance Evaluation & Graphical Analytics. A budget vs actual tracker for the MIS/IT
department.

This document is the cleaned-up result of requirement gathering with the department. It states
*what* the system must do and why; it does not describe code structure.

Related: [Flowchart.md](Flowchart.md) (behaviour) · [Use-Case.md](Use-Case.md) (actors) ·
[ERD.md](ERD.md) (data) · [Excel-Template-Spec.md](Excel-Template-Spec.md) (the locked reading
contract) · [Job Desc - Magang SI.md](<Job%20Desc%20-%20Magang%20SI.md>) (the graded criteria)

> **Precedence.** Where this document disagrees with
> [Excel-Template-Spec.md](Excel-Template-Spec.md) on a figure, a column position or a rule order,
> **the spec wins**: it is written against the client's real files. Where it disagrees with
> [VEGA-Board.drawio.svg](VEGA-Board.drawio.svg) on behaviour presented to the client, the board
> wins.

---

## 1. Purpose and business problem

The department plans a fixed-cost budget once per fiscal year in Excel, and receives a General
Ledger export once a month. Comparing the two is currently a manual routine, repeated every
month, by hand:

1. Open the GL export and filter it down to the department's own rows.
2. Split each account number to recover the account code and the section.
3. Look each account code up against the budget sheet.
4. Build a pivot to get the monthly total per account.
5. Read off which accounts have overspent, and guess whether the year will end within budget.

Every step is repeated from scratch each month, the result is not reviewable by anyone who did not
build it, and step 5 (the question the department actually cares about, *"are we still safe until
the end of the year?"*) is answered by intuition rather than by a figure.

**VEGA automates steps 1-5.** It ingests both Excel files, stores what it read, and derives the
comparison, the status and the year-end projection at the moment someone opens the dashboard.

### What VEGA is not

It is not a replacement for the accounting system, not a journal-entry tool, and not an approval
workflow. It reads what the accounting system has already produced and compares it to a plan.

---

## 2. Stakeholders

| Stakeholder                                                             | Interest                                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Department head / manager**                                     | The dashboard. Wants the over/under position and the year-end projection without asking anyone to prepare it. |
| **Administrator** (the staff member who handles the monthly file) | Uploading is quick, mistakes are recoverable, and the figures can be shown to be correct.                     |
| **Regular users** (department staff, ~5)                          | Read the dashboard, filter it. Change nothing.                                                                |
| **The interns (development team, 2)**                             | Deliver the full SDLC within ~10 weeks and document it.                                                       |
| **Company IT / network owner**                                    | The host stays isolated from the company network.                                                             |

Pilot scope: **one division, about six users in total.**

---

## 3. Scope

### 3.1 In scope

- Ingesting the fiscal-year budget workbook and the monthly GL workbook from Excel.
- Storing budget and actual figures per account, per month, per fiscal year.
- Deriving variance, status and a year-end projection.
- An analytics dashboard with filters.
- A read-only chart-of-account master, derived from the uploads.
- User and role management.
- Authentication and two roles.
- Scheduled and event-triggered database backup.
- An upload history and an audit log.

### 3.2 Out of scope

| Excluded                                              | Why                                                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **A desktop application**                       | The author decided for a web app on the department LAN instead.`desktop/` is cancelled and must not be created.            |
| **A mobile version**                            | Dropped during requirement gathering.                                                                                        |
| **Manual entry or editing of any figure**       | Every number must trace back to an uploaded file. See BR-1.                                                                  |
| **An expenditure CRUD module**                  | Actuals come from the GL only. See BR-1.                                                                                     |
| **COA create and edit screens**                 | The COA master is a projection of the two workbooks. A second way to change it would let the master disagree with the files every figure is traced to. Corrections go through a re-upload — BR-16, FR-7. |
| **Multi-department and multi-entity reporting** | MVP covers section`MIS000`. The GL workbook's other entities and the other sections are read past, not read in.            |
| **An approval or workflow engine**              | Not asked for.                                                                                                               |
| **AI/ML anomaly detection inside the app**      | Considered and deliberately excluded. The Phase 7 acceptance test is that every figure matches the client's own pivot; an anomaly flag matches nothing, so it would put an unverifiable number on a screen whose whole claim is that every number traces back to a file. |
| **HTTPS**                                       | The host is network-isolated; plain HTTP is an accepted decision that must be stated in the User Manual.                     |

---

## 4. Actors and roles

Two roles, and only two. `role` is an attribute of a user, not a table of its own.

| Role                    | Definition                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Administrator** | Everything a regular user can do, plus: upload files, confirm or decline a replacement, manage users and their roles, download templates, take and list backups. **User management is the only stored data an administrator edits by hand** — every figure and every COA comes from a file. |
| **Regular user**  | **Read-only in the strict sense.** No action available to them changes stored data.                                                                                |

Enforcement is a route-level dependency, not a per-handler check and not hidden buttons. A
regular user who calls an administrator endpoint directly is refused.

Full permission matrix: [Use-Case.md](Use-Case.md) §4.

---

## 5. Functional requirements

Priority uses MoSCoW. **M** = must have for the pilot, **S** = should have, **C** = could have.

### 5.1 Authentication and access control

| ID   | Requirement                                                                                   | Pri |
| ---- | --------------------------------------------------------------------------------------------- | --- |
| FR-1 | A user signs in with a username and a password before reaching any data.                      | M   |
| FR-2 | Passwords are stored hashed and are never recoverable in plaintext.                           | M   |
| FR-3 | Every endpoint that changes data requires the Administrator role, enforced in one place.      | M   |
| FR-4 | An administrator can create, edit, deactivate and reactivate users, and set each user's role. | M   |
| FR-5 | A deactivated user cannot sign in; their history is retained.                                 | S   |
| FR-6 | A user can change their own password.                                                         | S   |

### 5.2 Master data — read-only, derived from the uploads

The **chart-of-account (COA)** master is built by ingestion, not by hand. There is no COA entry
form and no COA edit screen: a wrong code, name or category is corrected by re-uploading a
corrected budget workbook, exactly as a wrong figure is (BR-1, BR-16).

| ID    | Requirement                                                                                                                                                             | Pri |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-7  | The COA master is populated from the budget upload (FR-12) and from GL ingestion (FR-24). An administrator can **list, search and read** COA entries — code, name, category, department, source — and nothing more. No role can create, edit or delete one. | M   |
| FR-8  | COA codes are unique. A duplicate met during ingestion keeps the first occurrence and reports the second (FR-17).                                                       | M   |
| FR-9  | A COA is never deleted. An account that disappears from a re-uploaded budget keeps its stored figures and its history.                                                  | M   |
| FR-10 | The`IT` department record is seeded on first run. The MVP covers that one department; there is no department-management screen.                                       | M   |
| FR-11 | A COA created automatically during ingestion (FR-24) is marked as GL-derived and listed for review, so an administrator can see which accounts the system added on its own. | M   |

### 5.3 Excel ingestion — budget

| ID    | Requirement                                                                                                                                                                           | Pri |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-12 | An administrator uploads the fiscal-year budget workbook and the system stores the twelve monthly figures per account.                                                                | M   |
| FR-13 | The monthly block is located by the band label on the row above the month headers, not by month name and not by a hard-coded column position. A mismatch is reported, not guessed at. | M   |
| FR-14 | Subtotal rows are excluded on the basis of the description column, which is checked before the code column.                                                                           | M   |
| FR-15 | Each row's twelve monthly figures must sum to that row's annual total, within 0.005. A failure lists the offending rows and refuses the file.                                         | M   |
| FR-16 | Negative budget figures are accepted. They are never a rejection reason.                                                                                                              | M   |
| FR-17 | A duplicate account code within one sheet keeps the first occurrence and reports the second.                                                                                          | M   |
| FR-18 | Re-uploading a budget replaces the whole fiscal year for that department, after confirmation (FR-27).                                                                                 | M   |

### 5.4 Excel ingestion — General Ledger

| ID    | Requirement                                                                                                                                                                                                                                                                                           | Pri |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-19 | An administrator uploads one monthly GL workbook; the system reads one designated sheet and ignores the others.                                                                                                                                                                                       | M   |
| FR-20 | Amount columns are addressed by position. Only the converted-to-USD pair is used; the native-currency pair and the exchange rate are stored for traceability and never used in arithmetic.                                                                                                            | M   |
| FR-21 | `actual = converted debit − converted credit` per row. A negative net is valid.                                                                                                                                                                                                                    | M   |
| FR-22 | The period comes from the file's fiscal-period column. The transaction date is a cross-check only, and a disagreement is reported without changing the period.                                                                                                                                        | M   |
| FR-23 | A row belongs to the department when**either** it has three account-number segments whose third is the department section, **or** it has two segments and its account code exists in the budget master. Rows admitted by the second clause are reported as *included, section missing*. | M   |
| FR-24 | An account code with no budget master row is**ingested**, auto-registered with a zero budget, and reported on the upload result. It is not a rejection reason.                                                                                                                                  | M   |
| FR-25 | A file containing more than one distinct fiscal period is refused.                                                                                                                                                                                                                                    | M   |
| FR-26 | Row-level rules are applied in a fixed order: missing account number → skip · missing period → skip · non-numeric amount → refuse the file · both debit and credit filled on one row → refuse the file · otherwise ingest.                                                                    | M   |

### 5.5 Upload lifecycle

**Two confirmations, in this order, and nothing is written before both are past.**

1. **Preview** (FR-55): *is this the right file, read correctly?* Shown after every upload,
   whether or not the period is already loaded. Declining here writes nothing (FR-56).
2. **Replace decision** (FR-27): *may I overwrite what is already stored?* Shown only when that
   period is already loaded, and only after the preview has been accepted.

| ID    | Requirement                                                                                                                                                                                                                                                                  | Pri |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-27 | If the period being uploaded is already loaded, the system shows the stored batch —**period, row count, total amount, uploader, upload time** — and requires the administrator to choose **GANTI DATA** or **BATALKAN**. Replacement is never automatic. | M   |
| FR-28 | On**GANTI DATA**: a backup is taken first, then only that period is deleted and the new file loaded, in one transaction.                                                                                                                                               | M   |
| FR-29 | On**BATALKAN**: nothing is written and the stored batch stays intact.                                                                                                                                                                                                  | M   |
| FR-30 | An upload is atomic: either every row lands or none does.                                                                                                                                                                                                                    | M   |
| FR-31 | The upload result reports rows read, imported and rejected,**with a reason per rejected row**.                                                                                                                                                                         | M   |
| FR-32 | Every upload is recorded as a batch: kind, filename, fiscal year, periods covered, uploader, timestamp, row counts, status. The history is visible to every role.                                                                                                            | M   |
| FR-33 | An administrator can cancel a recorded batch. The User Manual must state that cancelling a batch which already replaced another does**not** restore the replaced figures.                                                                                              | S   |
| FR-34 | The system generates the standard Excel templates it then parses, from the same layout constants the parser reads.                                                                                                                                                           | S   |
| FR-55 | **An upload is a two-step commit.** The file is parsed and fully validated in memory and the result is shown as a **preview** — detected file kind, fiscal year and period, rows read / accepted / rejected, the total amount, and a sample of the rows exactly as the system understood them. **Nothing is written until the administrator confirms.** | M   |
| FR-56 | If the preview is not what the administrator expected, they decline; nothing is written and the stored data is untouched. If validation itself refuses the file, the same screen is what **states the reasons** — per row for a row problem, per file for a layout problem (FR-26, FR-31) — and the remedy is to correct the workbook and upload again (BR-1). | M   |

### 5.6 Analytics

| ID    | Requirement                                                                                                                                                                                                          | Pri |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-35 | `variance = budget − actual`, per account per month, and aggregated per period and fiscal year.                                                                                                                   | M   |
| FR-36 | **Zero tolerance.** Any non-zero variance is `UNDER BUDGET` or `OVER BUDGET`; an exact match is `ON BUDGET`. Round to two decimals once, immediately before the comparison. There is no percentage band. | M   |
| FR-37 | A**negative** monthly budget gets the status `ALOKASI`: its variance is displayed, it is excluded from the over/under comparison and from any over-budget count, and it still contributes to totals.         | M   |
| FR-38 | `variance_pct = variance / abs(monthly budget) × 100`, computed **only** when the monthly budget is non-zero. Otherwise the percentage renders as `—` — never `0%`, never infinity, never an error.   | M   |
| FR-39 | **Year-end projection** = `actual to date / months loaded × 12`, where *months loaded* counts the distinct periods that actually hold GL data — never calendar months elapsed.                           | M   |
| FR-40 | Alongside the projection, the system shows the remaining budget and the allowed average monthly spend for the rest of the year.                                                                                      | M   |
| FR-41 | Every figure is derived at query time. No aggregate is stored, so nothing can go stale after a re-upload.                                                                                                            | M   |
| FR-42 | Money is handled as an exact decimal, never as binary floating point.                                                                                                                                                | M   |

### 5.7 Dashboard

| ID    | Requirement                                                                                                                            | Pri |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-43 | KPI cards: total budget, total actual, total variance, over-budget account count, year-end projection.                                 | M   |
| FR-44 | A budget-versus-actual comparison chart by account or category.                                                                        | M   |
| FR-45 | A quarterly trend view across the fiscal year.                                                                                         | M   |
| FR-46 | Filters: fiscal year, period or quarter, category, department.                                                                         | M   |
| FR-47 | A per-account table showing budget, actual, variance, percentage and status, with`ALOKASI` and unregistered accounts visibly marked. | M   |
| FR-48 | Export of the on-screen table to Excel or CSV.                                                                                         | C   |

### 5.8 Backup and audit

| ID    | Requirement                                                                                                                                                                                  | Pri |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-49 | The database is backed up on three triggers: a daily in-app schedule,**immediately before an upload replaces stored data**, and an administrator request.                              | M   |
| FR-50 | A backup is a complete, self-contained, individually openable copy, written while the application keeps serving. Each copy has its own timestamped name and never overwrites an earlier one. | M   |
| FR-51 | The most recent*N* copies are kept and older ones pruned. *N* is an administrator setting.                                                                                               | S   |
| FR-52 | An administrator can list the existing backups.                                                                                                                                              | S   |
| FR-53 | Restoring is a documented manual administrator procedure in the User Manual, not a button.                                                                                                   | S   |
| FR-54 | Actions that change data — login, upload, replace, master-data change, user change — are written to an audit log recording who, what and when.                                             | S   |

---

## 6. Non-functional requirements

| ID     | Requirement                                               | Target / rationale                                                                                                                                                                       |
| ------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1  | **Deployment shape**                                | One host PC in the department runs the API on`0.0.0.0:8000` as a Windows service, serving the built frontend. Users reach it by hostname in a browser.                                 |
| NFR-2  | **Exactly one worker process**                      | The daily backup timer lives inside the application; N workers would fire N backups.                                                                                                     |
| NFR-3  | **Network isolation**                               | The host is isolated from the company network. Traffic is plain HTTP by accepted decision, stated explicitly in the User Manual.                                                         |
| NFR-4  | **Database location**                               | The database file lives on the host's local disk, never on a network share — network file locking corrupts it.                                                                          |
| NFR-5  | **Ingestion performance**                           | A GL workbook of roughly 5,000 rows is validated and stored in under 30 seconds on the host PC.                                                                                          |
| NFR-6  | **Dashboard responsiveness**                        | A dashboard view renders in under 2 seconds for one fiscal year of data at pilot scale.                                                                                                  |
| NFR-7  | **Concurrency**                                     | Correct behaviour with about six simultaneous users, one of whom may be uploading. Readers are not blocked by a bulk insert.                                                             |
| NFR-8  | **Upload hardening**                                | Extension and MIME check, a size cap, and the workbook opened in read-only mode.                                                                                                         |
| NFR-9  | **Injection and XSS**                               | All database access is parameterised through the ORM; no SQL is built by string concatenation. Rendered values are escaped.                                                              |
| NFR-10 | **Redirect safety**                                 | A redirect target from a query string is never navigated to directly; only known relative paths are allowed.                                                                             |
| NFR-11 | **Financial accuracy is the top quality attribute** | Every figure is cross-checked against the department's own Excel pivot for the same month, on a real GL file.                                                                            |
| NFR-12 | **Auditability**                                    | Every displayed figure traces to a stored upload batch, and every batch to a file someone uploaded.                                                                                      |
| NFR-13 | **Recoverability**                                  | No operation can destroy stored figures without a backup being written first.                                                                                                            |
| NFR-14 | **Browser support**                                 | Current Chrome or Edge on Windows. No support for legacy Internet Explorer.                                                                                                              |
| NFR-15 | **Maintainability**                                 | Every fact about the physical Excel layout lives in one module, so a layout change is a constant edit. All fiscal-calendar logic lives in one module.                                    |
| NFR-16 | **Handover**                                        | A technical README and a User Manual, sufficient for a successor to set the system up and for the department to run it without the interns.                                              |
| NFR-17 | **Documentation language**                          | English, except the material written for the Indonesian audience: the original job description, the client presentation, the stack comparison, and the labels on the presentation board. |

---

## 7. Business rules

These are decisions, not preferences. Each one exists because the alternative produced a wrong
number.

| ID    | Rule                                                                                                                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-1  | **Actuals are GL-upload-only.** There is no manual entry and no editing of any figure. A correction is made by re-uploading a corrected file.                                           |
| BR-2  | **The fiscal year runs April to March.** FY26 = April 2026 → March 2027, labelled by its start year. All fiscal date logic lives in one module.                                        |
| BR-3  | **The GL lags one month.** The file received in month M carries month M−1's transactions.                                                                                              |
| BR-4  | **The upload batch is the idempotency key.** Re-uploading a period replaces that period wholesale; without this, uploading the same GL twice doubles that month.                        |
| BR-5  | **Replacing stored figures always requires an explicit human decision** (FR-27).                                                                                                        |
| BR-6  | **Zero tolerance on status** (FR-36).                                                                                                                                                   |
| BR-7  | **A negative monthly budget is an allocation, not spending capacity** (FR-37).                                                                                                          |
| BR-8  | **The projection divides by months actually loaded** (FR-39).                                                                                                                           |
| BR-9  | **The period comes from the period column, not from a date and not from the uploader** (FR-22).                                                                                         |
| BR-10 | **Only the converted-currency amounts are used, addressed by position** (FR-20).                                                                                                        |
| BR-11 | **The department filter has two clauses** (FR-23).                                                                                                                                      |
| BR-12 | **An unmapped account code is ingested and reported, not rejected** (FR-24).                                                                                                            |
| BR-13 | **A rejected row is never silently dropped** — a dropped row is money missing from the variance (FR-31).                                                                               |
| BR-14 | **Nothing is stored partially** (FR-30).                                                                                                                                                |
| BR-15 | **An annual budget figure is never divided by twelve.** The department's budget is not spread evenly, and one account holds a full-year figure with nothing allocated to a given month. |
| BR-16 | **The COA master is read-only and derived from the uploads** (FR-7). It is corrected the same way a figure is: by re-uploading a corrected workbook. The only stored data edited by hand in VEGA is the user list. |
| BR-17 | **Nothing is written before a human has seen what would be written** (FR-55). Parsing and storing are separate steps, and the preview is the gate between them. |

---

## 8. Data requirements

Entities and their attributes are specified in [ERD.md](ERD.md): `user`, `department`, `coa`,
`budget`, `actual`, `upload_batch`, `audit_log`.

Two shape decisions worth stating here, because both were considered and rejected as tables:

- **There is no `category` entity.** Category is an attribute of a COA. Nothing else in the system
  needs to reference a category by identity.
- **There is no `fiscal_year` entity and no `role` table.** A fiscal year is fully derivable from
  its integer start year, whereas a stored start date is a row that can disagree with the
  calendar. `role` is a constrained attribute with two values.

The physical Excel contract (sheet names, header rows, column indices, the account-number split,
rule order and the canonical verification figures) is
[Excel-Template-Spec.md](Excel-Template-Spec.md). It is deliberately a separate document because
it changes when the client's file changes, and nothing else should have to change with it.

---

## 9. Acceptance criteria

The pilot is accepted when all of the following hold.

| ID    | Criterion                                                                                                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1  | An administrator signs in, manages users and roles through the UI, and reads the COA list without any means of editing it; a regular user is refused on every write — including by calling the endpoint directly. |
| AC-2  | The budget workbook loads and every row's twelve monthly figures reconcile to its annual total.                                                                                        |
| AC-3  | The GL workbook loads and reproduces the canonical verification table in[Excel-Template-Spec.md](Excel-Template-Spec.md) §6 exactly, including the two-clause row count and the total. |
| AC-4  | Re-uploading the same month shows the stored batch and requires a choice;**GANTI DATA** replaces without doubling, **BATALKAN** stores nothing.                            |
| AC-5  | A workbook with a moved column, a non-numeric amount, or more than one period is refused whole, with every problem listed in one pass on the preview screen.                          |
| AC-12 | Every upload shows a preview of what would be stored before anything is stored, and declining it leaves the database byte-for-byte unchanged (FR-55, FR-56).                          |
| AC-6  | An unmapped account code is ingested, auto-registered with a zero budget, and listed on the upload result.                                                                             |
| AC-7  | Status, percentage,`ALOKASI` handling and the projection match a hand-checked spreadsheet for the same data.                                                                         |
| AC-8  | **The dashboard's figures match the department's own Excel pivot for one real GL month.** If they disagree, VEGA is wrong until proven otherwise.                                |
| AC-9  | A backup is taken automatically before a replacement, the file opens independently, and the documented restore returns the database to that state.                                     |
| AC-10 | A second machine on the LAN reaches the application by hostname and uses it.                                                                                                           |
| AC-11 | The technical README and the User Manual are complete, and the User Manual states the plain-HTTP decision explicitly.                                                                  |

> AC-8 cannot be settled with the sample workbooks: their amounts are not to scale: converted
> IDR rows land at 1-3 USD while USD rows carry 20k-200k. One real GL month must be requested
> early enough that this is not the last thing attempted.

---

## 10. Assumptions and constraints

**Assumptions**

1. The Excel files keep the layout recorded in the spec. A layout change is a change request, not
   a defect.
2. One upload represents one fiscal period.
3. The department can supply a host PC that stays on, and local administrator rights on it.
4. Roughly six users, one division. Nothing is designed for departmental rollout.

**Constraints**

1. **Time:** about ten effective weeks, two interns, full SDLC including documentation.
2. **Isolation:** no company-network dependency, no internet dependency at runtime.
3. **No separate database server** to install or hand over.
4. **The dependency set is deliberately small**: no data-analysis framework, no UI framework, no
   client state library, because everything installed becomes somebody else's maintenance.

---

## 11. Open items

Awaiting the department. None blocks development; each shapes a detail.

| # | Question                                                                           | What it affects                                                      |
| - | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1 | Where is the detail behind the depreciation budget that exists only as a subtotal? | The correct budget for the two auto-registered depreciation accounts |
| 2 | Confirm the unregistered-COA policy (FR-24)                                        | Whether ingestion reports or refuses                                 |
| 3 | Do the two section-less account numbers belong to IT?                              | Whether the filter keeps one clause or two                           |
| 4 | Which of each pair of duplicate account codes is authoritative?                    | Master-data cleanliness; both pairs are currently zero               |
| 5 | How does a COA map to its category — a master list, or derived from the code?     | **Now load-bearing.** With no COA edit screen (FR-7), the category must be readable from the workbook or from the code itself; nobody can key it in. Decides the category grouping on the dashboard (FR-44, FR-46). |
| 6 | Backup retention count, and whether a copy goes to a second location               | FR-51                                                                |
| 7 | Host PC address and local administrator rights                                     | Deployment                                                           |
| 8 | **One real GL month**                                                        | AC-8, the acceptance test that matters                               |
| 9 | UI language — English, Indonesian, or Indonesian labels over English data terms   | Frontend copy, and the User Manual screenshots                       |

---

## 12. Traceability to the job description

Every graded item in [Job Desc - Magang SI.md](<Job%20Desc%20-%20Magang%20SI.md>) maps to something
here.

| Job desc section                                              | Covered by                                                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1 Analyse budgeting and actuals business flow               | §1, §7,[Flowchart.md](Flowchart.md)                                                                                                                 |
| §1 Flowchart and Use Case Diagram                            | [Flowchart.md](Flowchart.md), [Use-Case.md](Use-Case.md)                                                                                               |
| §1 Normalised ERD                                            | [ERD.md](ERD.md), §8                                                                                                                                 |
| §2 Wireframe and mockup                                      | FR-43…FR-47, delivered in Phase 2                                                                                                                   |
| §2 Analytics dashboard layout                                | FR-43…FR-47                                                                                                                                         |
| §3 Web/desktop app isolated from the main network            | NFR-1, NFR-3                                                                                                                                         |
| §3 CRUD for master data, budget input, expenditure recording | FR-4…FR-6 (users — the CRUD module), FR-12 (budget by upload), FR-7…FR-11 (COA, read-only).**Both budget entry and expenditure recording are by upload, not by form** — BR-1, BR-16, and §3.2 states why |
| §3 Variance calculation and overbudget/underbudget status    | FR-35…FR-38                                                                                                                                         |
| §3 Credential encryption and access management               | FR-2, FR-3, NFR-8…NFR-10                                                                                                                            |
| §4 Test scenarios                                            | `Test-Plan.md` (Phase 7), acceptance criteria in §9                                                                                               |
| §4 Validate financial accuracy and visualisations            | NFR-11, AC-7, AC-8                                                                                                                                   |
| §4 Debugging and bug fixing                                  | Phase 7                                                                                                                                              |
| §5 Technical documentation / README                          | NFR-16, AC-11                                                                                                                                        |
| §5 User Manual                                               | NFR-16, AC-11, NFR-3                                                                                                                                 |

**One deliberate deviation from the job description.** It asks for a CRUD module covering
*"Master Data Kategori, Input Anggaran, dan Pencatatan Pengeluaran"*: category master data,
budget entry and expenditure recording. Requirement gathering established that both the budget
and the actuals arrive as Excel files and are never keyed in by hand, so an entry form would be a
screen nobody would use, and a second source for a number that must have exactly one. The
department then confirmed the stronger form of the same rule: **VEGA reads and extracts, it does
not maintain.** Everything the system knows about accounts comes out of the two workbooks, and a
correction is a re-upload (BR-16). Category became an attribute of COA rather than an entity for
the same reason: nothing references it by identity.

The CRUD requirement is therefore met by **user and role management** (FR-4…FR-6), the one
place where an administrator genuinely owns the data, while budget, actuals and the COA master
are loaded from files. This is recorded here so the substitution is a documented decision rather
than a gap. **It leaves a single CRUD surface where the job description implies several; raise it
with the supervisor before the Phase 3 checkpoint** rather than at grading.
