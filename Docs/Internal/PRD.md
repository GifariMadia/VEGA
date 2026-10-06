# Product Requirements Document — VEGA

**VEGA**: Variance Evaluation & Graphical Analytics. A LAN-served budget vs actual tracker for
the MIS/IT department.

> **This document is deliberately thin.** Every rule, figure and column position already lives in
> a numbered document, and a rule stated in two places is a rule that will disagree with itself.
> This PRD covers the product layer only: who it is for, what "done" means as an outcome, what
> ships in which release, and what could sink it. Where it names a requirement it **cites the ID**
> rather than repeating the text.

| Layer | Document |
| --- | --- |
| What the system must do (`FR-`/`NFR-`/`BR-`/`AC-`) | [Requirements-Spec.md](../Client/Requirements-Spec.md) — **the single source for every rule** |
| How it behaves, step by step | [Flowchart.md](../Client/Flowchart.md) |
| Who may do what | [Use-Case.md](../Client/Use-Case.md) |
| What is stored | [ERD.md](../Client/ERD.md) |
| How the Excel files are physically read | [Excel-Template-Spec.md](../Client/Excel-Template-Spec.md) — the locked reading contract |
| Schedule and per-phase tasks | [Project-Plan.md](Project-Plan.md) |
| Why this stack | [Stack-Comparison.md](../Client/Stack-Comparison.md) |
| What the client is shown | [VEGA-Board.drawio.svg](../Client/VEGA-Board.drawio.svg) |

**Precedence.** Where this document disagrees with `Excel-Template-Spec.md` on a figure or a
column, the spec wins. Where it disagrees with the board on behaviour presented to the client, the
board wins. Where it disagrees with `Requirements-Spec.md` on a rule, the Requirements Spec wins;
this document has no authority to introduce a rule.

---

## 1. Problem

The department plans a fixed-cost budget once a fiscal year in Excel and receives a General Ledger
export once a month. Reconciling the two is a manual routine rebuilt from scratch every month:
filter the GL to the department's own rows, split each account number, look each code up in the
budget sheet, pivot to a monthly total, then read off the overspend.

Three things are wrong with that, and each one is a product requirement in disguise:

1. **It is not repeatable.** The work is redone monthly, by hand, with the same opportunity for a
   different mistake each time.
2. **It is not reviewable.** Nobody who did not build the pivot can check it. There is no record
   of which file produced which number.
3. **It does not answer the actual question.** *"Are we still safe until the end of the fiscal
   year?"* is currently answered by intuition. That is the question the department cares about,
   and no artifact in the current process produces a figure for it.

VEGA replaces the routine with an upload, and replaces the intuition with a projection.

## 2. Product vision

> Two Excel files go in. Every figure on the screen traces back to one of them, and the
> year-end position is a number rather than a feeling.

The design consequence of that sentence, stated once because it drives most of the decisions
downstream: **nothing appears on a screen that cannot be traced to an uploaded row.** No manual
entry (BR-1), no stored aggregates that can outlive the upload that produced them (FR-41), and no
inferred or modelled figure, which is why anomaly detection was considered and dropped
(`Requirements-Spec.md` §3.2, `Project-Plan.md` §5).

## 3. Users

Pilot: **one division, about six people.** Roles are two, and only two (FR-3, FR-4).

### Manager — reads, decides, never uploads

Opens the dashboard before a budget discussion and wants the position in one screen: how much is
committed, which accounts are over, and whether the fiscal year ends inside the budget. Will not
learn an upload flow and should never be asked to. Their success condition is that the dashboard
is already correct when they open it.

*Serves:* FR-43…FR-47, FR-39, FR-40.

### Administrator — the one person who feeds the system

Receives the GL file once a month and uploads it. Has been burned by spreadsheets before, so what
they need is not speed but **certainty**: that the file was read correctly, that nothing was
silently dropped, and that a mistake is recoverable. Every rejected row must come back with a
reason (FR-31, BR-13); **every upload shows them a preview of what would be stored before anything
is stored, and declining it writes nothing** (FR-55, FR-56, BR-17); replacing an already-loaded
month must require a second, explicit decision with the stored batch shown to them first (FR-27,
BR-5); and a backup is taken before anything is overwritten (FR-49).

*Serves:* FR-12, FR-19, FR-27…FR-34, FR-55, FR-56, FR-49…FR-53. The COA master they consult
(FR-7…FR-11) is read-only: it is built by their uploads, not maintained by hand (BR-16).

### Regular staff — read-only in the strict sense

Read and filter the dashboard. No action available to them changes stored data, and the
enforcement is a route dependency, not a hidden button (FR-3).

*Serves:* FR-43…FR-47, FR-32.

### Successor / next intern — the user nobody lists

Inherits the system when the internship ends. Their entire experience of the product is the README
and the User Manual (NFR-16, AC-11), plus how much of the layout knowledge sits in one module
rather than scattered through parsers (NFR-15). Named here because a handover artifact that is
nobody's requirement is a handover artifact that does not get written.

## 4. The two journeys that matter

Everything else in the product exists to support these two.

### Monthly close — the Administrator, once a month, ~5 minutes

1. The GL for month M−1 arrives (BR-3). Administrator uploads it.
2. VEGA validates the whole file before writing anything, and reports every problem in one pass
   (AC-5), not the first one it hit.
3. **The preview.** VEGA shows what it read and what it would store (file kind, fiscal year and
   month, rows read / accepted / rejected, total amount, sample rows) and waits. Declining here
   writes nothing at all (FR-55, FR-56, BR-17).
4. If that period is already loaded, VEGA then shows the stored batch (period · rows · total ·
   uploader · time) and waits for **GANTI DATA** or **BATALKAN** (FR-27). It never replaces on its
   own.
5. On confirmation: back up, replace only that period, load, all in one transaction (FR-28, FR-30).
6. The result screen states rows read, imported and rejected, with a reason per rejected row, plus
   any account code that was auto-registered (FR-24, FR-31).

**The failure this journey is designed against:** uploading the same GL twice and doubling the
month. The upload batch is the idempotency key (BR-4).

### "Are we safe?" — the Manager, any time, ~30 seconds

1. Open the dashboard. Filter to the fiscal year, and optionally to a quarter, category or
   department (FR-46).
2. Read the KPI row: total budget, total actual, total variance, over-budget account count,
   year-end projection (FR-43).
3. Read the projection card: at the current run rate, where does the year end, what is left, and
   what is the allowed monthly spend for the rest of it (FR-39, FR-40).
4. Drill into the per-account table for the accounts flagged over budget (FR-47).

**The failure this journey is designed against:** a projection that reads "safe" when it is not.
It divides by the months that actually hold GL data, never by calendar months elapsed (BR-8),
because the GL lags a month, the calendar count understates the run rate every single month.

## 5. Release plan

Milestone dates and per-phase tasks are in [Project-Plan.md](Project-Plan.md) §4 and §7, not
repeated here. This is the product-level cut of what ships when.

| Release | Contents | Priority band |
| --- | --- | --- |
| **MVP — the pilot** | Auth and two roles · user management · a read-only COA list · budget and GL ingestion for one sheet per workbook · the upload preview · the explicit replace decision · variance, status and projection · the dashboard · backup before replacement | All **M** requirements |
| **Pilot hardening** | Password self-change, deactivate/reactivate, batch cancellation, template generation, backup retention and listing, audit log | The **S** requirements |
| **Not committed** | Table export to Excel/CSV | The **C** requirements (FR-48) |

**MVP ingestion scope is one sheet per workbook**: GL sheet `CORE`, budget sheet `MIS (FC)`,
section `MIS000`. The workbook's other entities and sections are read past, not read in
(`Requirements-Spec.md` §3.2).

### Explicitly not built

Listed in full with reasons in `Requirements-Spec.md` §3.2. The three worth restating at product
level because they are the ones a reader expects to find:

- **No desktop app.** The client asked for a LAN web app instead. `desktop/` is cancelled.
- **No entry or edit form for anything that comes out of a workbook**, not for a figure, and not
  for a COA either. Actuals and budgets arrive as Excel exports and are never keyed in; the account
  list is a projection of those same files. A form would be a second source for a value that must
  have exactly one (BR-1, BR-16). The graded CRUD requirement is met by **user management alone**;
  the substitution, and the note to raise it with the supervisor, are in `Requirements-Spec.md` §12.
- **No anomaly detection.** The acceptance test is that every figure matches the client's own
  pivot; an anomaly flag matches nothing, so it would put an unverifiable number on a screen whose
  whole claim is verifiability.

## 6. Success measures

Financial accuracy is the top quality attribute (NFR-11); everything below is secondary to it.

| # | Measure | Target | How it is checked |
| --- | --- | --- | --- |
| 1 | **Figures match the department's own pivot** for one real GL month | Exact | AC-8. If they disagree, VEGA is wrong until proven otherwise |
| 2 | Sample-file figures reproduced exactly | Exact | AC-3, and the fixture tests in `Project-Plan.md` Phase 7 |
| 3 | Monthly close effort | Under 10 minutes, from file received to dashboard current | Timed with the Administrator at UAT |
| 4 | Manager reaches the year-end position without asking anyone to prepare it | Every time | UAT observation |
| 5 | No figure is destroyed without a recoverable copy | Zero incidents | AC-9, NFR-13 |
| 6 | Ingestion of a ~5,000-row GL | Under 30 s on the host PC | NFR-5 |
| 7 | Dashboard render, one fiscal year at pilot scale | Under 2 s | NFR-6 |
| 8 | Handover | A successor sets the system up from the README alone | AC-11 |

Measures 3 and 4 are outcome targets to confirm at UAT, not contractual figures. The current
manual routine has never been timed, so there is no measured baseline to improve on.

## 7. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **The pivot cross-check is left to the last week** | AC-8 is the acceptance test that matters, and it cannot be run on the sample files — their amounts are not to scale | One real GL month is requested early. It is open item #8 in `Requirements-Spec.md` §11 |
| **The client's Excel layout changes** | Every parser assumption moves at once | Every physical layout fact lives in one module (NFR-15). A layout change is a change request, not a defect |
| **The projection is subtly wrong** | The one number the Manager acts on; a wrong "safe" is worse than no figure | BR-8 fixes the divisor; `analytics.py` carries its own tests |
| **Silent row loss during ingestion** | A dropped row is money missing from the variance, and nothing on screen says so | BR-13 — every rejection is reported with a reason, and the header check asserts column positions rather than names |
| **Depreciation budget detail is never supplied** | Two auto-registered accounts carry a zero budget against real spending | Open item #1. Ingestion loads and reports them rather than refusing (BR-12), so it blocks nothing |
| **Ten-week schedule, two interns, full SDLC** | Scope pressure lands on QA and documentation, the two phases that carry the acceptance criteria | MoSCoW bands are the cut order: **C** goes first, then **S** |
| **The host PC or admin rights do not materialise** | Nothing deploys | Open item #7, needed by Phase 8, raised well before it |

## 8. Open items

Nine, all with the department, listed with what each one affects in
`Requirements-Spec.md` §11 and `Project-Plan.md` §8. None blocks development.

The two that carry product consequence rather than a detail:

- **#8, one real GL month.** Without it, measure 1 above cannot be evaluated at all.
- **#9, UI language.** English, Indonesian, or Indonesian labels over English data terms. It
  shapes every screen and every User Manual screenshot, so it is cheapest to answer before Phase 2
  mockups are agreed.
