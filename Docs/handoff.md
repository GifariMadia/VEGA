# VEGA — Session Handoff

**Written:** 3 September 2026, seventh revision. The sixth recorded the Gate 2 demo preparation — two generated Excel templates, the template link, the five-month fixture. This one adds the two pieces of work that followed: a **client-data audit of every tracked file**, and the **account fixture rebuilt on the department's real chart of accounts** with the department split out of the account number.

**Branch:** `experiment`. Five commits are pushed; **ten files are changed and not yet committed.**
**HEAD:** `b9718c4` — "docs: add the Gate 2 demo script", authored by Ihsan-p1.

Read §4 for what is committed and what is still in the working tree. Committing is next step 1 in §10.

> `CLAUDE.md` is gitignored on this machine, so its corrections are on disk only and will not appear in any diff. Do not go looking for them in git.

> Filed at `Docs/handoff.md` because the request named that path. The folder convention in `CLAUDE.md` would otherwise place a document written for ourselves in `Docs/Internal/`.

---

## 1. Goal of the current work

Finish the frontend prototype. The user's original rule — *"fokus dulu ke dashboard, kalo sudah cocok lanjut ke bagian lain"* — was satisfied when they accepted the Dashboard, which released the other five screens. Partway through the Upload screen the user said time was short (*"karna waktunya mepet"*) and asked for the whole UI as a single artifact instead of screen-by-screen approval.

**That goal is met.** All six screens are real React running on fixtures, verified in a headless browser, and published as one self-contained HTML file.

**The goal of the 3 September session** was narrower: get the work committed, close the two questions holding up the Dashboard, and fix a colour defect the user found by looking at the screen. All three are done.

**The goal then shifted.** Asked what to work on, the user answered *"semua, untuk sekarang fokus demo ui nya ke client dulu"* — everything eventually, but the client demo first. The demo is **live in a browser** (not the published artifact) at **Gate 2, 5–6 September**. Five things were agreed and all five are built: two real Excel templates behind the download link, the link following the chosen file kind, the fixture extended so the quarterly trend has something to draw, a look at the account table to settle the colour question, and a written walkthrough for whoever drives the laptop.

**The current goal is what came after that**, and it is two things, both finished and both still uncommitted:

1. **Verify that nothing the client would not want published has reached a tracked file.** Asked for after a remark about the private repository. Every value in the sample GL was searched for across every tracked file; one real defect turned up, in the templates written the day before. Full account in §13.
2. **Rename the dashboard's department filter and separate the account number from the department**, then take the department's real chart of accounts into the fixture. Reading the real GL changed the design: the same account code appears under two departments, so the two fields cannot be one. Full account in §14.

The backend still has no feature code. Nothing on any screen talks to an API. Nothing about either piece of work above changes that: both are fixtures, documents and one generator script.

---

## 1a. Three Upload changes — designed, approved, BUILT and verified

Requested on 2 September, after the prototype was published; approved and built the same day. Everything in this section is in the working tree.

### What was asked

1. **Accept older Excel versions**, not only `.xlsx` — some of the client's files are saved in an older format.
2. **An optional purpose/note at upload time**, so an administrator can say why a file is being loaded (the user's example: uploading the May GL with a note explaining it).
3. **When a file is refused, the system itself writes the reasons and sends them to the audit trail**, instead of leaving the administrator to describe the failure from memory.

### Decisions taken with the user

| Question | Answer | Why |
|---|---|---|
| How should `.xls` be handled? | **Accept it, and add a reader library.** | The user was told openpyxl cannot read BIFF `.xls` at all and that the alternatives are `xlrd` (reads `.xls` only, no longer developed) or converting on the host. They chose coverage over dependency count. The library itself is still unchosen — see §8.2. |
| How much refusal detail reaches the audit trail? | **The full reason table, openable on the audit row.** | An administrator should not have to reopen the file to learn why it was refused. It is the same table the Upload screen already renders, so nothing new has to be designed. |

### The design as presented and agreed

- **Extensions.** One `ACCEPTED = [".xlsx", ".xlsm", ".xls"]` list in `upload.js`, read both by `previewFor`'s refusal check and by the file input's `accept`. The refusal reason changes from "not `.xlsx`" to "not an Excel file", and the `onlyXlsx` string changes with it.
- **Purpose.** An optional textarea in Step 2, beneath the file field, with no validation. On commit its text becomes the **first entry in that batch's `notes[]`** — author is the uploader, timestamp is the upload time. This reuses the append-only note structure that already exists, so no new field is invented and the backend needs no column beyond `AuditNote`.
- **Refusal into the audit trail.** `previewFor` already returns the whole `reasons` array. On refusal, Upload records an audit row with status `refused` carrying those reasons plus the purpose, and `Audit.jsx` renders the reason table when that row is opened — replacing today's bare `reasonCount` line.
- **How the two screens share state.** They do not, today: `Upload.jsx` and `Audit.jsx` each hold their own `useState`. The agreed shortcut is to push onto the module-level `AUDIT_BATCHES` array in `demo.js`, marked with a `ponytail:` comment. No store, no state library. In the real application the backend records the refusal, which is where that belongs.

**Files it will touch:** `frontend/src/lib/upload.js`, `frontend/src/lib/upload.test.mjs`, `frontend/src/pages/Upload.jsx`, `frontend/src/pages/Audit.jsx`, `frontend/src/lib/i18n.jsx`, `frontend/src/data/demo.js`, `frontend/src/index.css`, and this document.

**How it will be tested:** tests first — accepted and rejected extensions, and that a refusal record carries the complete reason list — then `node --test` naming the test files explicitly, never the directory (§7).

### What was actually built, and where it differs from the design

The design above was followed. Three things were added to it while building:

- **`auditRecordFor(result, { uploader, purpose, at })` in `upload.js`.** The audit row is built by a pure function rather than inside `Upload.jsx`, because it is the backend's job in the real application and because a row that carries money and reasons needs a test. `Upload.jsx` only pushes what it returns. A refusal is recorded the moment it happens, an acceptance on commit, and a replacement carries the version it replaced.
- **`components/ReasonTable.jsx`.** The refusal table was lifted out of `Upload.jsx` so the audit row renders the same table rather than a second one that could drift from it.
- **`reasonCount` is gone.** The `b4` fixture now carries a real `reasons` array, and the `refusedRows` string was replaced by `refusedReasons` — one shape everywhere, one field and one string fewer.

`previewFor`'s refusal now also returns the `filename`, which the audit row needs. The dropzone's `onlyXlsx` string became `acceptedFormats` (".xlsx, .xlsm, atau .xls").

**Still open:** which library reads `.xls` on the backend (§8.2). The frontend accepts the extension; nothing parses it yet, and nothing will until Task 15.

---

## 1b. FR-45 resolved — the Dashboard rework was already built

**The handoff and `CLAUDE.md` were both wrong.** Every previous revision said the FR-43/FR-47 Dashboard rework was designed but not built, and blocked on the FR-45 trend question. The user pointed out that the chart can already be switched. Reading the code confirms it: all three requirements are in `Dashboard.jsx` and have been since the prototype work.

| Requirement | Where it lives | State |
|---|---|---|
| FR-43 — over-budget account count as a KPI | `Dashboard.jsx:141-150`, the fourth card, replacing "System status". The value is `overCount / compared.length`, so the count carries a denominator beside three rupiah cards | Built |
| FR-45 — quarterly trend | `chartView` state at `Dashboard.jsx:52`, segmented control at `:172-181`, `CategoryChart` / `QuarterChart` swap at `:194-197` | Built |
| FR-47 — every account, `ALOKASI` and GL-auto-registered marked | Table at `Dashboard.jsx:299-307`, `.row-badge` and `.row-badge.alokasi` in `index.css:806+`. `ALOKASI` also sorts to the bottom whatever column is picked | Built |

**So FR-45 does not need rewriting.** The spec asked for a quarterly trend and there is one; the 28 August client review asked for a category chart and there is one; the toggle is what lets both be true. No document change is needed beyond deleting the "blocked" claim.

**What must be corrected instead:** `CLAUDE.md` still carries a paragraph saying the rework is "designed and approved-in-principle but NOT built, and it is blocked on one question." That paragraph is stale and would send the next session off to re-design finished work. Removing it is next step 1 in §10.

The lesson worth keeping: a handoff's claim about what the code does is evidence, not fact. This one survived four revisions because each revision copied it forward instead of checking it against the file.

---

## 1c. Over-budget and under-budget no longer read as the same colour

The user spotted it on the dashboard: the money figures for OVER and UNDER looked alike. They were not the same colour, but they were close enough to be indistinguishable in a table of 13px numerals.

| | Token | Before | After | Hue |
|---|---|---|---|---|
| OVER | `--over-ink` | `#b42318` | `#c01048` | 5° → 341° |
| OVER surface | `--over-bg` / `--over-line` | `#fef3f2` / `#fecdca` | `#fff1f3` / `#fecdd6` | followed the ink into rose |
| UNDER | `--under-ink` | `#b54708` | unchanged | 22° |

Hue distance went from 18° to 41°. The pair now separates by temperature — cool rose against warm amber — rather than by darkness alone, which is what made them collapse into "both red". Contrast on white: OVER 6.2:1, UNDER 5.4:1, both clear of the 4.5:1 floor.

**UNDER was not touched**, because the 28 August client review specifically chose amber over grey for it. Moving OVER instead was the change that left the client's own decision intact. The alternative offered — pushing UNDER to a gold `#9a6608` — was rejected for exactly that reason: it would have made "amber" read olive-brown.

**`--danger: #b42318` was deliberately left alone.** It is a separate token for destructive actions, and a delete button should stay the conventional red. The two never appear as adjacent figures, so they do not compete.

**Two hardcoded hexes in the chart became named constants.** `Dashboard.jsx` painted its axis-tick percentages with literal `#b42318` / `#027a48`. Recharts writes `fill` as an SVG *attribute*, where a CSS variable does not resolve, so those values cannot be read from `index.css` directly. They are now `CHART_OVER`, `CHART_OK` and `CHART_NONE` at `Dashboard.jsx:48-50`, with a comment saying they mirror the tokens and must move with them. This follows the pattern `CHART_BUDGET` and `CHART_ACTUAL` already set.

**The reason is recorded in the CSS itself** (`index.css:44-50`), not only here, so nobody "corrects" the rose back to a conventional red without seeing why it is not one.

**This was verified in a browser on 3 September**, after the fixture work below. Rose and amber separate clearly in the account table's status pills and in the gap column at 13px. The `#a11043` fallback was not needed and the tokens stand as they are. Rough edge 15 is closed.

---

## 1d. The template download link now hands over a real workbook

`href="#template"` did nothing, and a client at a demo clicks it.

**Two templates, not one, and the link follows the file kind.** The link sits directly under the Budget / General Ledger choice, so a single fixed caption over a changing target would be the worst version of it. Choosing Budget gives *Unduh template Budget* → `template-budget-fy26.xlsx`; choosing GL gives *Unduh template General Ledger* → `template-gl.xlsx`. Both carry a `download` attribute so the saved file has a readable name.

**They are generated, not drawn by hand.** `backend/scripts/make_templates.py` writes both from `Docs/Client/Excel-Template-Spec.md` using openpyxl, then **reads them back and asserts the contract**: the budget sheet is named `MIS (FC)` with the band label in row 5, headers in row 6 and nine-digit codes from row 7; the GL sheet is `CORE` with nineteen headers whose columns 12–15 read `Debits, Credits, Debits, Credits` in that order. Run it with the backend virtualenv from the repository root:

```bash
backend/.venv/Scripts/python.exe backend/scripts/make_templates.py
```

**A template is the minimum file VEGA accepts, not a copy of the client's own workbook.** The real budget export carries six twelve-column bands in row 5 and 79 columns; VEGA reads only the band labelled `Budget` and finds it by that label rather than by position (spec §2.2), so the template holds that one band at `H:S`. The client's own file still loads unchanged, because the band is found by its label wherever it sits.

Each workbook has a second sheet, `PETUNJUK`, holding the instructions in Indonesian. It is a separate sheet on purpose: the parser reads the named sheet alone, so prose sitting on it would have to be filtered back out. The budget template's third sample row carries a negative month, which is how it teaches the `ALOKASI` rule without a paragraph.

**The link's icon changed too.** It was `upload`, an arrow pointing up, on a download link. There is now a `download` glyph in `Icon.jsx`, drawn in the same stroke weight as the rest.

`TEMPLATES` lives in `lib/upload.js` beside `KIND` and `ACCEPTED`, keyed by kind, holding the href, the download filename and an **i18n key** rather than a label. The test asserts that every href resolves to a file that exists in `frontend/public/`, so a rename cannot silently re-break the link.

---

## 1e. The fixture loads five months, and that exposed a real defect

**Three months of GL all landed in Q1**, so the Kuartal half of the chart toggle drew a line through a single point. That reads as a broken chart rather than as a young fiscal year, and it was going to be the first thing a client noticed when the toggle was pressed. Offered the choice of saying so out loud, extending the fixture, or hiding the toggle, the user chose to extend: `FISCAL.monthsLoaded` is now **5**, April through August 2026, with September the next expected file. Q1 is whole and Q2 shows two of its three months, marked *sebagian*.

**Extending it uncovered a defect that had been latent.** `splitMonths` cycled three weights that summed to 1 across however many months were asked for. Over five months they summed to **1.73**, the first four months took 139% of the account's actual, and the last month absorbed the remainder as a **negative figure**. The Upload screen showed *Agu 2026 · −Rp 335.412.000*.

The existing test did not catch it, because it asserted only that the months sum back to the account's actual — which they did. A negative August and a correct annual total are perfectly consistent.

The fix is in `splitMonths`: the weights are cycled to length and then **normalised against their own sum**, so a weight list written for one length cannot overspend at another. `SHAPES` also went from three weights to six, so no month repeats inside the loaded range (April and July had been identical). The test now asserts that no loaded month is negative, alongside the sum it already checked.

**This is the demo's most useful lesson so far:** the arithmetic tied out, the tests passed, and the screen still showed money that cannot exist. It was found by looking at the rendered page, not by reading the code.

---

## 2. What the user decided this session

| Question | Answer |
|---|---|
| Should the Worst COA Variance table get its own search box, or reuse the top filter bar? | **Reuse the global scope.** Search feeds `scopeAccounts`, so every KPI, the chart and the table keep describing the same money |
| How should the Upload fixtures decide an outcome, with no API? | Asked for a recommendation (*"sebaiknya gimana?"*) and took **filename-based triggers** — no demo-only control on screen |
| Upload screen shape | **One page, sections growing downward.** Not a wizard, not a modal |
| Where the stored periods live | **Always visible**, not hidden behind a successful preview |
| Replace: same flow as a new upload, or separate? | *"bisa dibuat terpisah ga? jangan disatuin dengan upload baru"* — **two doors, one flow.** A "Ganti berkas" button per stored period enters replace mode with that period as the target; the file's own period must match it |
| Can an already-stored upload be "cancelled"? | *"memagnya kalo sudah di upload bisa di cancel? mending ganti saja dihapus/replace gitu"* — **no.** "Batalkan unggahan" became **"Hapus data [periode]"**, which is what it actually does |
| Publish partial UI or wait? | **Wait until all six screens exist**, then publish once |
| Design skill | *"jangan lupa pake skill impeccable. ini wajib"* — mandatory for all frontend work |
| Should the Upload changes be built now? | *"approve, mulai"* — **yes**, on the design in §1a, unchanged |
| Where does the UI/UX skill rule live? | *"catat di claude.md dan handoff.md"* — **both**: `CLAUDE.md` > Skills and §5a here. `impeccable` before the first line of markup, `ui-ux-pro-max` as the supporting lookup |

**Decided on 3 September:**

| Question | Answer |
|---|---|
| Commit and push the 19 files? | *"commit dan push dulu"* — **yes.** Two commits, `cb3b6be` and `1ce2545`, both authored by Ihsan-p1 alone |
| FR-45, the quarterly trend | *"kan sekarang sudah diubah, jadi client bisa gonta ganti chart nya"* — **the toggle is the answer, and it is already built.** The chart card carries a Kategori / Kuartal segmented control, so the spec's trend and the client review's category chart both exist. FR-45 needs no rewrite. See §1b |
| Which `.xls` reader | *"nanti saya konsul dulu ke client nya"* — **deferred to a client conversation**, not a technical decision. The user asked for a briefing of what the tool can and cannot do; it is in §8.2 |
| Over-budget and under-budget in the same red | *"warna harga ketika under/over jangan sama sama merah, susah bedainnya"* — **Option A: move OVER to rose, keep UNDER amber.** See §1c |

**Decided later on 3 September, when the work turned to the demo:**

| Question | Answer |
|---|---|
| What to work on next | *"semua, untuk sekarang fokus demo ui nya ke client dulu"* — everything eventually, **the client demo first** |
| What form does the demo take? | **The app running live**, not the published artifact. The artifact stays as the thing the client can click on their own afterwards |
| When | **Gate 2, 5–6 September.** Two working days, which is what set the scope below |
| What about other Excel formats for the template? | *"gimana dengan format excel lain?"* — **`.xlsx` only for the templates.** Accepting three formats on upload is tolerance for files the client already has; a template is what we recommend, so it is the current format. Handing out a `.xls` would invite files nothing can parse yet |
| One template or two? | **Two, and the link follows the chosen kind.** Budget and GL are different contracts, and handing over the wrong one costs the administrator a refused upload |
| The Kuartal chart has one data point | **Extend the fixture to five months** rather than explaining an empty chart or hiding the toggle. The user accepted that this makes the invented monthly shape longer, which must still be said out loud at the demo |
| Documents and UI | *"ketika mau bikin teks/docs wajib pake skill /humanizer dan kalo urusan uiux harus pake skill /impeccable"* — both, every time |
| Commit and push | *"oke sudah cocok. push dah commit"* — three commits, pushed |

---

## 3. What was built

### 3.1 Dashboard — search in the account table

`scopeAccounts` gained a `search` clause that matches COA code or name, case-insensitively, with whitespace-only treated as no search. It runs in the **same** function as the category and quarter filters, so the search narrows the arithmetic rather than the rendered rows. An empty-state row appears when nothing matches.

### 3.2 `frontend/src/lib/upload.js` — the preview decision, in one place

Stands in for `POST /upload/preview` until it exists. `previewFor(filename, kind, stored, target)` returns either a refusal with per-row reasons or a full preview (file kind, fiscal year, period, rows read/accepted/rejected, total, `replaces`, sample rows). Rules:

- A file is refused if its extension is not in `ACCEPTED` (`.xlsx`, `.xlsm`, `.xls`) or if its name contains `rusak`, `salah`, `corrupt` or `broken`. **Every problem is listed at once**, each with what was expected — never one error at a time.
- A GL whose month cannot be read is **refused, never guessed**.
- In replace mode the file's period must equal the target period. "Ganti Jun 2026" cannot absorb a July file.
- `rowsRead === rowsAccepted + rowsRejected` always.
- Reading writes nothing. `commit()` in `Upload.jsx` is the only place anything is stored.

Month names parse in both Indonesian and English, long and abbreviated.

### 3.3 Upload screen (`frontend/src/pages/Upload.jsx`)

One page; sections appear as the work progresses. `phase` runs `idle` → `reading` → `preview` or `refused` → `replace` → `done`.

Order down the page: page intro → stored periods (always visible, each row carrying **Ganti berkas** and **Hapus data**) → replace banner when a target is set → Step 1 file kind → Step 2 file picker/dropzone → Step 3 preview or refusal → Step 4 replace decision → Step 5 result.

Both destructive confirmations use the native `<dialog>` element, so the browser supplies the focus trap and Esc handling and no modal component was written. Non-administrators see a `Denied` panel.

**Three ways an upload stops, and only one is dangerous.** Declining at preview writes nothing. BATALKAN at the replace step writes nothing. **Hapus data removes a stored batch and leaves that month empty, with no undo** — that one is worded and coloured differently on purpose.

### 3.4 Matrix, Audit, COA, Users

- **Matrix** — 12 fiscal months by COA. Code and name columns stick while the table scrolls sideways inside its own container; the page never scrolls sideways. **A month with no GL reads `—`, never `0`**, and column totals are computed only over months that carry data.
- **Audit** — every batch newest-first: recorded, replaced, refused, deleted. A row opens to show the version it replaced and its notes. **No action column** — the audit trail records, it does not act. Notes are append-only, and the screen says so, because an append-only field with no explanation reads as a bug.
- **COA** — read-only and it looks read-only: no New button, no row menu, no edit, no delete. It states once where the list comes from, because otherwise the first question is where the edit button went. GL auto-registered accounts carry a badge.
- **Users** — the only CRUD surface in the product (FR-4…FR-6). Username locks when editing, password rules are shown while typing rather than after a rejected submit, and deleting yourself is disabled.

### 3.5 Bundling

`App.jsx` switched from `BrowserRouter` to **`HashRouter`**. An artifact serves one URL, so path routing 404s on reload. The side effect is useful in production too: the FastAPI host will not need an SPA catch-all route.

`dist/` was then folded into a single 0.69 MB HTML file — CSS inlined with the Inter woff2 as a `data:` URI, JS inlined with the closing script tag escaped. **Zero external requests**, which matches the network-isolated host.

Published: **https://claude.ai/code/artifact/94aa674e-ae32-464a-aba4-3e15d0682807**

**That artifact is now behind the working tree.** It was built before the templates, the five-month fixture and the colour fix. If the client is pointed at the link, say which version they are looking at, or republish first.

### 3.6 The templates and the link (§1d)

`backend/scripts/make_templates.py` is the first file in `backend/` that is not scaffolding. It has no dependency beyond openpyxl, which the backend already requires, and it writes into `frontend/public/`, which Vite copies into `dist/` untouched.

### 3.7 `Docs/Internal/Demo-Script.md`

The walkthrough for Gate 2, written for whoever drives the laptop rather than for the client. It carries the screen order, what to say at each stop, **the table of filenames that trigger each upload outcome**, the four caveats to state out loud once each, and one instruction not to press: `Hapus data` empties a stored month with no undo, so it is only demonstrated if the client asks.

---

## 4. Files changed — committed in five commits

| File | Change |
|---|---|
| `frontend/src/lib/analytics.js` | `scopeAccounts` gained the `search` clause |
| `frontend/src/lib/analytics.test.mjs` | 2 tests added (search matching, search + category together). 13 → 15 |
| `frontend/src/lib/upload.js` | **New.** The preview decision, filename-driven. §1a added `ACCEPTED` and `auditRecordFor` |
| `frontend/src/lib/upload.test.mjs` | **New.** 23 tests (14, plus 9 for §1a) |
| `frontend/src/pages/Upload.jsx` | **New.** ~450 lines. §1a added the purpose field and the audit write |
| `frontend/src/components/ReasonTable.jsx` | **New.** The refusal table, shared by Upload and Audit |
| `frontend/src/pages/Matrix.jsx` | **New** |
| `frontend/src/pages/Audit.jsx` | **New.** §1a replaced the `reasonCount` line with the reason table |
| `frontend/src/pages/Coa.jsx` | **New** |
| `frontend/src/pages/Users.jsx` | **New** |
| `frontend/src/pages/Dashboard.jsx` | `filters` carries `search`; search box in the table card head; empty-state row |
| `frontend/src/data/demo.js` | `STORED_PERIODS`, `AUDIT_STATUS`, `AUDIT_BATCHES` (6), `USERS` (6). §1a gave `b4` a real `reasons` array in place of `reasonCount` |
| `frontend/src/lib/i18n.jsx` | ~82 keys for the five new screens, both languages, including per-code rejection reasons. §1a: `fileNotXlsx`/`expectXlsx` → `fileNotExcel`/`expectExcel`, `onlyXlsx` → `acceptedFormats`, `refusedRows` → `refusedReasons`, plus the three purpose strings |
| `frontend/src/index.css` | Blocks for search, Upload, replace mode, matrix sticky columns, audit disclosure, users form. All spacing and radius from tokens. §1a extended the `.field` rules to `textarea` and added `.purpose` |
| `frontend/src/App.jsx` | Six real routes; `Placeholder` gone; `BrowserRouter` → `HashRouter` |
| `frontend/src/components/Icon.jsx` | `search` icon |
| `frontend/eslint.config.js` | `setTimeout` added to the hand-listed browser globals |
| `Docs/Internal/Upload-Screen-Design.md` | **New.** 11 sections; §11 records three document conflicts |
| `Docs/handoff.md` | This document |

All nineteen went into **`cb3b6be`** — "feat(frontend): add five screens and upload flow".

The colour fix is a second commit, **`1ce2545`** — "fix(dashboard): separate over-budget ink from under":

| File | Change |
|---|---|
| `frontend/src/index.css` | `--over-ink` / `--over-bg` / `--over-line` moved to rose; the reason recorded in the token comment |
| `frontend/src/pages/Dashboard.jsx` | Two literal status hexes replaced by `CHART_OVER` / `CHART_OK` / `CHART_NONE` |

The demo preparation is three more commits, `f8b8201..b9718c4`:

| Commit | Files |
|---|---|
| `5067451` feat(upload): serve a real Excel template per file kind | `backend/scripts/make_templates.py` (new), `frontend/public/template-budget-fy26.xlsx` and `template-gl.xlsx` (new, generated), `lib/upload.js` (`TEMPLATES`), `lib/upload.test.mjs` (link test), `pages/Upload.jsx` (link wired to `kind`), `lib/i18n.jsx` (`downloadTemplate` → two keys), `components/Icon.jsx` (`download` glyph) |
| `901e6b6` fix(demo): load five months and stop a negative month | `data/demo.js` (`monthsLoaded: 5`, six-weight `SHAPES`, normalising `splitMonths`, five uploaders and row counts), `lib/analytics.test.mjs` (two-quarter assertion, no-negative-month assertion, and two tests whose hardcoded month assumptions had gone stale) |
| `b9718c4` docs: add the Gate 2 demo script | `Docs/Internal/Demo-Script.md` (new) |

`CLAUDE.md` was corrected in the same session but appears in none of these commits, because it is gitignored on this machine. Two paragraphs changed: the stale "rework not built, blocked on FR-45" claim is gone, and the current-state paragraph now lists all six screens plus the generated templates instead of three screens.

**All five commits are pushed to `origin/experiment`.** Author and committer are `Ihsan-p1 <Ihsan-p1@users.noreply.github.com>` on every one, with no assistant attribution — checked before pushing.

`git push` prints a Dependabot notice about 4 vulnerabilities on the default branch. That is the known react-router advisory and its neighbours — gotcha 8 in `CLAUDE.md`. It is not a new finding and must not be "fixed" with `npm audit fix --force`.

### Not yet committed — ten files

`git diff --stat` reads 11 files changed, 415 insertions, 78 deletions, and one of those eleven is this document.

| File | Change | Section |
|---|---|---|
| `.gitignore` | The client-data rule now separates transaction records from the chart of accounts, and says why | §13 |
| `backend/scripts/make_templates.py` | Sample rows moved off three real COA codes and one real account name onto invented `999…` codes; the GL sample's third section became `OTH000` and its assertion followed | §13 |
| `frontend/public/template-budget-fy26.xlsx` | Regenerated from the above | §13 |
| `frontend/public/template-gl.xlsx` | Regenerated from the above | §13 |
| `frontend/src/data/demo.js` | `RAW_ACCOUNTS` rebuilt on the real MIS chart of accounts (19 rows); `CATEGORIES` replaced by eight derived from the code ranges; new `DEPARTMENTS` export; `FISCAL.department` is `MIS`; every account carries `department`, and two carry `sectionMissing` | §14 |
| `frontend/src/pages/Dashboard.jsx` | The department filter reads `DEPARTMENTS` instead of a hard-coded `IT`; the account table renders a `TANPA SEKSI` badge | §14 |
| `frontend/src/components/AppShell.jsx` | The header composes the department name from `FISCAL.department`, because the label no longer carries it | §14 |
| `frontend/src/lib/i18n.jsx` | `department` is now *Departemen* / *Department*; two strings added for the new badge and its tooltip | §14 |
| `frontend/src/lib/analytics.test.mjs` | The budget-to-date assertion rewritten around per-row rounding; the auto-registration test names a depreciation account | §14 |
| `Docs/Internal/Demo-Script.md` | The KPI denominator, the new badge, and a caveat that the accounts are real while the money is not | §14 |

---

## 5. Architecture decisions and why

**Search narrows the arithmetic, not the rendered rows.** It goes through `scopeAccounts` alongside category and quarter. A second, display-only filter layer would let the KPI cards, the chart and the table disagree about which money they describe. The backend must take the same shape: `GET /dashboard` receives the filter and returns figures already scoped to it.

**Filename triggers, documented but never shown.** With no ingestion API the demo needs some way to produce a refusal, a fresh period and a replace. A visible "simulate failure" control would be a demo artefact leaking into the product; a filename rule is invisible to a viewer and disappears the day the API lands, because `previewFor` is the only thing that gets replaced.

**Two doors, one flow.** The board draws replace as a step inside the upload flow, and per `CLAUDE.md` the board wins where documents disagree. The user's ask was satisfied without contradicting it: replace is a second entry point into the same flow, carrying a target period the file is then validated against. One code path, two ways in.

**"Hapus data", not "Batalkan".** Cancelling implies an undo that does not exist. The button removes a stored month permanently. The board's sentence about cancelling after a replacement describes *there being no undo* — the button itself came from UI-UX §4.4 and was wrong.

**Stored periods are always visible.** §4.3a of the UI brief puts that panel behind a successful preview, which leaves the destructive delete action with no reachable home. Showing the list unconditionally is also simply the answer to "what is loaded?", which is the first thing anyone opens this screen to find out.

**Native `<dialog>` over a modal component.** Focus trap, Esc, backdrop and inertness come from the browser. Writing those by hand is how accessible modals get built badly.

**Absent is not zero.** In the matrix a month with no GL reads `—`. Rendering `0` would claim the department spent nothing that month, and the difference between "no data" and "no spending" is the entire point of the screen.

**`HashRouter`.** Required for the artifact, and it removes the need for an SPA catch-all on the FastAPI host later.

**The account number and the department are separate fields, and the display never rejoins them.** In the real GL, `772001001` posts under both `MIS000` and `GA0000`. A code that identifies two departments is not a key, so storing `772001001-A7744-MIS000` as one string would make every lookup ambiguous and every screen fetch the wrong half. The account number is the code alone, the department is the section segment with its trailing zeros dropped, and the entity segment is asserted rather than stored per row. `ERD.md` §5 already keeps the whole account number beside its section for traceability; this is the same decision reaching the frontend.

**A row in scope with no department is marked, not guessed at.** Two accounts reach the fixture through the second clause of the row filter: their GL account number carries no section, and they are in scope only because their code sits in the budget master. Assigning them to MIS silently would state something the file does not say, so they carry a `TANPA SEKSI` badge and the tooltip explains the clause. This is what FR-23 means by *included, section missing*, made visible.

**Category is derived from the account-code range, and the code says it is a proposal.** Neither workbook has a category column, and there is no COA edit screen for anyone to key one in — which is why open item 5 in `Requirements-Spec.md` §11 calls it load-bearing. The fixture now answers it concretely rather than inventing categories that could never come out of the client's file, and the comment above the mapping says it is our reading of their numbering until they confirm it.

**Totals sum the rows as displayed, not the annual figure scaled in one step.** `summarise` adds up per-account values that are already rounded to the cent, so the total can sit a cent per row away from the exact share. The alternative gives a total that is arithmetically purer and a table that visibly does not add up, which is worse in front of someone holding their own pivot. The test asserts both halves of that trade.

---

## 5a. Working rule: UI/UX work goes through `impeccable`

**Set by the user on 2 September, and recorded in `CLAUDE.md` > Skills as well.**

Every piece of UI/UX work — a new screen, a layout change, a restyle, any edit to `index.css` — **must** start with the `impeccable` skill, before the first line of markup. It is not a review pass to run at the end. `ui-ux-pro-max` is the supporting lookup for what `impeccable` does not cover: contrast ratios, touch targets, chart-type choice, accessibility. Other design skills are allowed only where they genuinely help that pair, and none of them override the plain-CSS, no-framework, Omron-blue direction.

The skills `CLAUDE.md` still refuses by name (`high-end-visual-design`, `industrial-brutalist-ui`, `design-taste-frontend`, `imagegen-*`, `brandkit`) are unaffected by this rule — they are the wrong domain, not a helpful supplement.

`impeccable`'s detector returns `[]` for `Upload.jsx`, `Audit.jsx`, `ReasonTable.jsx` and `index.css` after §1a.

---

## 6. Commands run, and what they returned

**3 September, the audit and the fixture rebuild.** From the repository root unless noted:

| Command | Result |
|---|---|
| A Python pass over `Docs/Source/GL Dummy.xlsx` matching 418 vendors, 4,000 references, 2,933 batch-entry IDs and 1,164 FP numbers against every tracked file | **No hits in any of the four categories** |
| The same pass for 272 real COA codes and 323 account names | Six files carry codes; the table in §13 lists them |
| `git grep` for local paths, `PIB`, vendor-shaped strings, and secret-shaped assignments | Only `backend/app/config.py:12` `secret_key: str = "change-me"`, a placeholder |
| `curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/Ihsan-p1/Vega` | `404` unauthenticated, so the repository is private |
| `backend/.venv/Scripts/python.exe backend/scripts/make_templates.py` | Both workbooks rewritten, then `verified against Docs/Client/Excel-Template-Spec.md` |
| A re-check of the generator and both `.xlsx` against the real code and name sets | `0 real codes, 0 real descriptions` in all three |
| `node --test src/lib/analytics.test.mjs src/lib/upload.test.mjs` (`frontend/`) | Two failures first — one stale, one a real finding (§14) — then **40 pass, 0 fail** |
| `npm run lint` (`frontend/`) | Clean, no output |
| `npm run build` (`frontend/`) | Passes in 6.0s. The >500 kB Recharts warning is pre-existing |

**Rendered verification of the fixture rebuild**, read off the page rather than eyeballed:

| Checked | Result |
|---|---|
| Department filter | label *DEPARTEMEN*, one option, `MIS` |
| Category filter | eight options: Tenaga Kerja, Penyusutan, Subkontrak, Jasa Profesional, Utilitas, Komunikasi, Umum, Alokasi |
| Shell header | *Departemen MIS* |
| Account table | 19 rows |
| Badges | two *dari GL*, two *TANPA SEKSI*, one *ALOKASI* |
| Chart bars | 13 — seven categories of two, less the zero-height budget bar on Penyusutan, which has no budget line |
| Console errors | none |

**3 September, the demo preparation.** From `frontend/` unless noted:

| Command | Result |
|---|---|
| `backend/.venv/Scripts/python.exe backend/scripts/make_templates.py` (repo root) | Both workbooks written, then `verified against Docs/Client/Excel-Template-Spec.md` |
| `node --test src/lib/analytics.test.mjs src/lib/upload.test.mjs` | **40 pass, 0 fail** (38 before) |
| `npm run lint` | Clean, no output |
| `npm run build` | Passes. CSS 25.13 kB (5.52 kB gzip), JS 640.68 kB (188.00 kB gzip). Both templates land in `dist/` |
| `curl` on `:4173` for each template | `200`, 6,999 and 7,122 bytes |
| `git push origin experiment` (repo root) | `f8b8201..b9718c4` |

The `impeccable` hook ran automatically after each UI edit and reported no findings, so the manual detector pass that `context.mjs` asks for when no hook is active was not needed. `polish.md` was the owning playbook and `craft-floor.md` was loaded before the first markup edit, per §5a.

**Rendered verification of the demo changes**, same CDP method as before, against `npm run preview`:

| Checked | Result |
|---|---|
| Dashboard banner | *Menampilkan TA26 · data sampai Agu 2026. GL Sep 2026 belum diunggah.* |
| Projection card | *Berdasarkan 5 bulan data GL (Apr 2026 – Agu 2026)* |
| Chart, Tren Kuartal | Q1 with data, Q2 marked *sebagian*, Q3 and Q4 *belum ada data* |
| Account table colour | OVER rose, UNDER amber, plainly different (§1c closed) |
| Upload, stored periods | Six rows, all totals positive and distinct after the `splitMonths` fix |
| Template link, GL | `Unduh template General Ledger` · `/template-gl.xlsx` · `Template General Ledger.xlsx` |
| Template link, Budget | `Unduh template Budget` · `/template-budget-fy26.xlsx` · `Template Budget FY26.xlsx` |
| Console errors | none |

Two verification gotchas to add to the list below. **A hash change alone does not remount the app**, so a session written into `localStorage` is never read: navigate, then reload once, then screenshot. And the cached Chromium sits one directory deeper than the version folder — `.../win64-<version>/chrome-headless-shell-win64/chrome-headless-shell.exe`.

**3 September, around the colour change.** All from `frontend/` unless noted:

| Command | Result |
|---|---|
| `npm run lint` | Clean, no output |
| `node --test src/lib/analytics.test.mjs src/lib/upload.test.mjs` | **38 pass, 0 fail** — unchanged, as expected: the change is colour only |
| `npm run build` | Passes in 11.14s. The >500 kB Recharts warning is pre-existing |
| impeccable detector over `src/index.css src/pages/Dashboard.jsx` | One finding: `overused-font` on Inter, line 11. **Pre-existing, out of scope, deliberate** — Inter is pinned by the client's mockup. Nothing from this change |
| `git push -u origin experiment` (repo root) | `aa0c908..cb3b6be`, then `cb3b6be..1ce2545`. The branch now tracks `origin/experiment` |

`impeccable` was loaded before the CSS was touched, per §5a: `context.mjs`, then `polish.md` as the owning playbook, then `craft-floor.md`. `context.mjs` reported `NO_PRODUCT_MD` and `PRODUCT_INIT_REQUIRED`; both are expected for a scoped fix to existing code and neither blocks. It also reported a skill update available (v4.1.1 → v4.1.3), which was **not** run — it rewrites the files the session is reading and only takes effect in a later session.

**2 September, after §1a was built.** All from `frontend/`:

| Command | Result |
|---|---|
| `npm run lint` | Clean, no output |
| `npm run build` | Passes in 5.39s. CSS 25.00 kB (5.48 kB gzip), JS 638.31 kB (187.27 kB gzip). The >500 kB warning is pre-existing and comes from Recharts |
| `node --test src/lib/analytics.test.mjs src/lib/upload.test.mjs` | **38 pass, 0 fail** (29 before §1a) |
| impeccable detector | `[]` — no violations |

**Rendered verification**, same method as previous sessions: the Chromium cached by another tool, driven over CDP from throwaway scripts in the session scratchpad, against `npm run preview` on port 4173. All six screens:

```json
{ "matrix_rows": 14, "matrix_cols": 15, "matrix_absent": 135,
  "matrix_no_page_hscroll": true, "matrix_table_scrolls": true,
  "audit_rows": 6, "audit_statuses": "Tercatat,Ditolak,Dihapus",
  "audit_no_action_column": true, "audit_detail_open": true,
  "audit_note_added": 2, "audit_note_immutable": true,
  "coa_rows": 14, "coa_no_crud": true, "coa_says_why": true,
  "users_rows": 6, "users_form": true, "users_password_rules_visible": true,
  "users_self_delete_disabled": true, "dashboard_ok": 4, "console_errors": [] }
```

And the single-file bundle:

```json
{ "login_rendered": true, "font_loaded": true, "no_external_requests": "",
  "after_login_hash": "#/dashboard", "kpis": 4, "matrix": true, "upload": true,
  "audit": true, "coa": true, "users": true,
  "reload_keeps_screen": "#/users|true", "errors": [] }
```

**§1a was verified the same way**, driving the real screens rather than reading the code:

```json
{ "accept": ".xlsx,.xlsm,.xls", "purpose_field": true,
  "format_hint": ".xlsx, .xlsm, atau .xls",
  "refused_shown": true, "refused_reason_rows": 1,
  "refused_reason_text": "Seluruh berkas / Berkas bukan workbook Excel. / Gunakan berkas .xlsx, .xlsm, atau .xls.",
  "audit_top_status": "Ditolak", "audit_top_file": "GL Juli 2026.pdf",
  "audit_detail_reason_rows": 1, "audit_detail_note": "Berkas dari vendor, dicoba dulu.",
  "xls_preview_shown": "preview", "upload_done": true,
  "audit2_top_status": "Tercatat", "audit2_top_file": "GL Agustus 2026.xls",
  "audit2_note": "GL Agustus format lama dari vendor.", "audit2_reason_tables": 0,
  "console_errors": [] }
```

A `.pdf` was refused and its refusal reached the audit trail unaided; a `.xls` was read, stored, and carried its purpose into the batch's first note.

The preview and `http.server` processes were stopped afterwards, and the port checked clear. The driver scripts are throwaway and live in the session scratchpad — **nothing about verification is in the repository**, by design. Verification gotchas, cumulative:

1. **Seed a session `readSession()` accepts** — the key is `vega.session` and it requires a `username` string. The wrong shape redirects to Login and every measurement returns null.
2. **`npm run preview` serves `dist/`** — rebuild first or the change measures as if it never happened.
3. **The cached Chromium is at `chrome-headless-shell-win64/chrome-headless-shell.exe`.** Locate it with `find`, do not assume a path. It is a cached artefact of another tool, not a declared dependency.
4. **Node 22 has a native global `WebSocket`**, so CDP needs no package at all — `fetch` `/json/list` for the page target and talk to it directly. Do not require `ws`; neither it nor puppeteer is installed in `frontend/`.
5. **Seed the session, then reload once, then route by `location.hash` only.** The shell reads the session at mount, so setting `localStorage` without a reload leaves you on Login. After that reload, never reload again: `AUDIT_BATCHES` is module state, and a reload throws away the very rows a §1a run is checking for.
6. **A bash heredoc eats backslashes** — write Windows paths with forward slashes in generated scripts.
7. **`DOM.setFileInputFiles`** drives the file picker for the Upload screen. It needs a real file on disk, but an empty file with the right *name* is enough: `previewFor` reads only the filename.
8. **React re-renders asynchronously** — wait ~400ms after dispatching an event, and set a controlled input's value through the native property setter before dispatching.

---

## 7. Open errors

**No failing check.** Lint, build, the 40 tests and the design detector are all clean, and the rendered page throws no console errors.

**One thing is undone rather than broken: ten files are uncommitted** (§4). Everything below the previous commit exists on disk only, so a lost working tree loses the audit fix and the whole fixture rebuild.

Two open items that are not errors but will become ones if forgotten:

- **The two generated `.xlsx` templates are committed as binaries and nothing forces a regeneration** when `Excel-Template-Spec.md` changes. The generator self-verifies when run; it just is not run automatically.
- **The published artifact is now three revisions behind the working tree** — three months of fixture, no working template link, the old colours, the invented account codes.

Fixed during this session rather than shipped:

- **Three real COA codes and one real account name in `make_templates.py` and both templates.** Found by the audit, not by review (§13).
- **A regression from the filter rename:** the shell header read a bare *"Departemen"* once the label stopped carrying *IT*.
- **A test asserting the wrong invariant.** Budget-to-date was compared against the annual total scaled in one step; the code sums per-row rounded values, and the difference is up to a cent per row (§14).

Fixed in earlier sessions rather than shipped:

- `function Confirm({ ref, ... })` — **React 18 does not pass `ref` as a prop.** Renamed to `dialogRef`.
- ESLint `'setTimeout' is not defined` — the flat config lists browser globals by hand.
- `.field.check` used `flex-direction` under `display: grid`; changed to `display: flex`.
- `.field label` did not style a `<label className="field">` wrapping a `<span>`; added `.field > span`.
- The audit "Digantikan" pill never appeared, because the current May batch is `recorded` and only its nested predecessor was replaced. The pill now sits beside the replaced-version heading.

Two harmless quirks:

- `node --test src/lib/` (directory form) fails on Node 22.14 with `Cannot find module ...\src\lib`. Name the two test files explicitly.
- `npx prettier --check` reports style issues on the source. **The project has no Prettier config and does not use it** — ESLint is the only formatter of record, and it is clean. Do not "fix" the tree with Prettier; it would reformat every file and bury the real diff.

---

## 8. Open questions

Two of the four that stood on 2 September are closed: committing (done, §4) and FR-45 (already built, §1b). A third question is new and belongs to the documents rather than the code — see item 3.

1. **Three document conflicts** recorded in `Upload-Screen-Design.md` §11: `VEGA-Board1.drawio.svg` is a stale duplicate of the board and should be deleted; the board and §4.3 still promise an automatic backup that the client review moved out of the app; §3 constraint 8 still states a ±5% band, which is superseded by zero tolerance.
2. **Which library reads `.xls` — now waiting on the client, not on us.** The user is asking the client directly (*"nanti saya konsul dulu ke client nya"*). The candidates are `xlrd` (a second parsing path to test, no longer developed, `.xls` only) or converting to `.xlsx` on the host with LibreOffice (an external binary on a network-isolated machine). Either one contradicts the "openpyxl, no pandas" line in `CLAUDE.md` only in the sense of adding a *second* reader — openpyxl stays the reader for `.xlsx` and `.xlsm`. Decide before Task 15 and record it in `Stack-Comparison.md`, not only here.

   **The three questions to put to the client:** what format do the GL and budget files actually arrive in — `.xlsx` only, or is `.xls` still in use? If it is, how often? And could it be opened and re-saved as `.xlsx` before upload, or must the app take it as it comes?

   **Why the answer matters:** "`.xlsx` only" means deleting `.xls` from `ACCEPTED` — no dependency, no code, and the gap in §9.12 closes itself. Anything else means a second reader and a second parsing path to test.

   **What the tool can and cannot do today**, for that conversation. Can: all six screens work and are clickable; the Dashboard has four KPI cards, a Kategori/Kuartal chart toggle, a year-end projection, and a sortable, filterable table of every account; upload previews before it stores anything, shows what is already stored for that period, and offers replace or delete; a refused file lands in the audit trail with a reason per row; both languages throughout. Cannot: **every figure is invented**, there is no backend or database, no screen calls an API, the upload decides its outcome from the *filename* rather than the file's contents, `.xls` is accepted by the screen but nothing can parse it, login accepts anything, and nothing survives a page reload. The template link does now hand over a real workbook, which is the one line of that paragraph that has changed. Do not let the client read a demo figure as their own money.

3. **`Requirements-Spec.md` has not caught up with the client, and one part of it now contradicts the product.** The 28 August review moved backups out of the application, but §3.1 still lists scheduled backup as in scope, FR-49 still says *a daily in-app schedule*, FR-51 makes the retention count *an administrator setting* on a Settings screen that no longer exists, and FR-28 makes a backup a precondition of every replacement. NFR-2's stated reason for one worker is the same in-app timer, which `CLAUDE.md` gotcha 6 already records as gone. Either the spec is rewritten around a host-level scheduled task, or the client is told the feature came back into the app. **Decide before FR-28 is implemented**, because it is a rule about what must happen before data is destroyed. The full coverage picture is §12.

---

## 9. Known rough edges

1. **Every figure is a fixture.** Nothing has been checked against a real GL month or the client's Excel pivot.
2. The monthly split in `demo.js` ties out to `actual` by construction, but its **shape across months is invented** and must not be shown to the client as their spending pattern.
3. ~~The template download link is still `#template`.~~ **Closed 3 September** — two generated workbooks, swapping with the chosen kind (§1d).
4. **Login accepts any non-empty username and password.** `POST /auth/login` (FR-1) does not exist.
5. **The Quarter filter now moves**, since five loaded months cover Q1 and part of Q2. Q3 and Q4 still select an empty scope, which is correct behaviour and worth showing rather than avoiding.
6. ~~The quarterly trend is one data point.~~ **Closed 3 September** — the fixture carries two quarters (§1e).
7. **390px (phone) is unusable.** Out of scope; the mobile version is dropped.
8. **`npm audit` reports findings.** Pre-existing and deliberate — see gotcha 8 in `CLAUDE.md`. Never run `npm audit fix --force` in `frontend/`.
9. The chart card's height is set by the projection card beside it, not by the chart.
10. One detector suppression stands: `overused-font=inter`, because Inter is pinned by the client's own mockup.
11. The sidebar is still a tall, mostly empty white card — the accepted cost of *"jangan sticky"*.
12. **The UI now accepts `.xlsm` and `.xls`, and nothing can parse either yet.** The frontend is a fixture, so it does not care; the backend will. Until §8.2 is decided and built, do not tell the client an `.xls` will import — only that the screen no longer refuses it on sight.
13. **A refused upload writes a row into `AUDIT_BATCHES` at module level.** A deliberate `ponytail:` shortcut standing in for the backend, and like every other mutation it dies on reload.
14. ~~`CLAUDE.md` still says the Dashboard rework is unbuilt and blocked.~~ **Closed 3 September** — the paragraph now states what the code does.
15. ~~The new rose has not been seen on a screen.~~ **Closed 3 September** — looked at, and the two colours separate (§1c).
16. **The monthly shape is now five months of invention rather than three.** Extending the fixture made the trend demonstrable and made the fiction longer. Nobody may read that shape as the department's spending pattern, and the demo script says so.
17. **The two templates are committed as binary files.** They are generated, and the generator self-verifies, but nothing forces a regeneration when `Excel-Template-Spec.md` changes. If the spec moves, re-run `make_templates.py` in the same commit.
18. **The templates are pinned to FY26 by name and by content.** `template-budget-fy26.xlsx` carries `Apr '26` through `Mar '27`. A new fiscal year means editing `FY_MONTHS` in the generator and re-running it, not renaming the file.

---

## 9a. The Upload screen's fixture rules

There is no ingestion API yet, so `frontend/src/lib/upload.js` decides an upload's outcome from the **filename**. The rule is written there and here, and deliberately nowhere on screen — a control that exists only to steer a demo does not belong in the product:

| Filename | Outcome |
|---|---|
| anything whose extension is not in `ACCEPTED` (`.xlsx`, `.xlsm`, `.xls`), or containing `rusak` / `salah` / `corrupt` / `broken` | refused, with per-row reasons. A wrong extension is refused as "not an Excel workbook", naming all three accepted formats |
| a GL naming any month from April to August 2026 | preview, then the replace decision |
| a GL naming any other month | preview, stored as a new period |
| a GL whose month cannot be read | refused — a period is never guessed |
| a GL whose month differs from the replace target | refused, naming the period that was expected |
| a budget file | preview, replaces the stored FY budget |

The stored periods (`STORED_PERIODS` in `demo.js`) are derived from the same monthly split the dashboard reads, so the five GL batches sum to the dashboard's Total Actual exactly, and any single month read from `STORED_PERIODS` equals the same month summed from `ACCOUNTS`. That equality holds by construction rather than by assertion: `STORED_PERIODS` computes each total from `ACCOUNTS` itself. What the tests do guarantee is the layer underneath it — the split sums back to each account's actual, and no loaded month is negative.

---

## 10. Next steps, in order

1. **Commit the ten files in §4.** They are the audit fix and the fixture rebuild, and they exist nowhere else. Three commits suit the shapes: the client-data fix (`.gitignore`, the generator, both templates), the fixture rebuild (`demo.js`, `Dashboard.jsx`, `AppShell.jsx`, `i18n.jsx`, the test), and the documents. Author `Ihsan-p1`, no assistant attribution — check before pushing, as before.
2. **Rehearse the demo once, end to end, from `Demo-Script.md`.** Build, preview, sign in, and walk all six screens with the five trigger files ready in one folder. Gate 2 is 5–6 September, so this is the step with a date on it. Watch for the sentence that has to be said the first time the client recognises one of their own account names.
3. **Bring `Requirements-Spec.md` up to date** — the eleven decisions from the 28 August client review, and the backup contradiction in §8.3. Two of its open items can also be closed or answered now: item 9 on interface language, and item 5 on how a COA maps to a category, which §14 answers with a concrete proposal. FR-45 needs no rewrite. See §12 for the rest.
4. **Apply the `Excel-Template-Spec.md` §9 corrections to `Flowchart.md`.** Outstanding since before these sessions.
5. **Resolve the three document conflicts** in §8.1. Deleting `VEGA-Board1.drawio.svg` also removes a duplicate copy of ten real account codes, so it is worth doing for two reasons rather than one.
6. **Client conversation on `.xls`** (§8.2), then record the outcome in `Stack-Comparison.md` — before Task 15, and not only in this handoff. Three more questions are worth the same conversation: whether an account can ever be a revenue line, whether drilling from an account into its GL rows is wanted, and whether exporting the table to Excel should stay at priority C (§13).
7. **Gate 2 (5–6 Sep)**; feature code starts 7 Sep per `Docs/Client/Project-Timeline.md` §4.
8. **When the backend starts:** `POST /auth/login` (FR-1), then `POST /upload/preview` and `POST /upload/commit` mirroring `upload.js` — the preview must write nothing, and must return **reason codes**, not sentences, because `i18n.jsx` already carries both languages for each code. `backend/app/analytics.py` must reproduce `scopeAccounts` (category, quarter **and search**), `byQuarter`, `overAmount`, the variance arithmetic and the projection exactly as `analytics.js` computes them.
9. **Fold `make_templates.py` into the parser when it exists (FR-34).** The requirement asks for templates generated from the same layout constants the parser reads. Today the generator holds its own copies of the sheet names, header rows and column order. When `backend/app/excel.py` exists, both must read one set of constants, or the template and the parser can disagree while each looks right on its own.

---

## 11. Risks, assumptions, environment

**Assumptions**

- The whole frontend runs on `frontend/src/data/demo.js`. **No figure has been seen against a real GL month.**
- The mockup remains authoritative on appearance; the project's own rules remain authoritative on engineering.
- `STORED_PERIODS`, `AUDIT_BATCHES` and `USERS` are shaped the way the API is expected to return them. If the backend returns a different shape, five screens need touching, not one.

**Risks**

- `analytics.js` mirrors what `analytics.py` will compute, and the mirror is now wide: `scopeAccounts` (three axes), `byQuarter`, `overAmount`, the variance rule and the projection. Drift here means the dashboard disagrees with the client's Excel pivot.
- Filtering, search and every mutation are client-side over a fixture. When the API arrives the filter must move to the server, or a filtered page silently describes only the rows the client happened to hold.
- Upload, Audit and Users mutate React state only. **Nothing survives a reload**, and the artifact must be demoed with that said out loud.
- The Chromium used for verification is a cached artefact of another tool, not a declared dependency. Only the verification workflow depends on it.
- **The frontend now promises a format the backend cannot yet read.** Accepting `.xls` in the UI is one line; reading BIFF is a second parser or an external converter (§8.2). The gap is invisible while everything is a fixture and becomes a defect the day ingestion lands.
- **`Upload.jsx` writes into `demo.js`'s `AUDIT_BATCHES`.** Two screens sharing a module-level array is the ponytail stand-in for the backend recording a batch. It is marked as such in the code, and it is the first thing to go when `POST /upload/commit` exists.
- Ultrawide displays beyond 2000px were not inspected; the shell caps at `--shell-max` and centres.
- **The status colours live in two places by necessity.** `index.css` owns the tokens; `Dashboard.jsx:48-50` owns three constants mirroring them, because Recharts writes `fill` as an SVG attribute where a CSS variable does not resolve. Both carry a comment pointing at the other. Change one alone and the chart's percentages drift from the table's figures — a divergence that looks like a data bug, not a colour bug.
- **A handoff claim about the code can go stale and be copied forward.** The "rework not built" line survived four revisions (§1b). Before repeating any claim in this document about what exists, open the file it names.
- **A test that ties out is not a test that is right.** The monthly split summed correctly to the annual total while handing August a negative figure (§1e). The defect was visible on the screen and invisible to the suite. Every money assertion should ask what an absurd value would look like, not only whether the parts add up.
- **The templates state a contract in Indonesian that the parser does not enforce yet.** `PETUNJUK` tells the client which columns matter and what a negative month means. Nothing verifies that a filled-in template actually loads, because there is no loader. The first real ingestion run must be tested against these exact files.
- **The published artifact is older than the working tree.** Anyone pointed at that link sees three months, no working template link, the old colours and invented account codes.
- **The fixture now looks like the client's own ledger, and the figures are still invented.** Real codes, real names, real department, imaginary money. That combination is more convincing than the old one and therefore more dangerous: the moment someone recognises an account, they start reading the amount beside it as theirs. The demo script says when to head that off, and `demo.js` says it at the top of the file.
- **The category mapping is ours, not the client's.** Eight categories read out of the account-code ranges. If the department groups their accounts differently, the chart and the category filter are both wrong, and the fixture will have taught everyone the wrong grouping in the meantime. It is a proposal to confirm, and open item 5 in the spec is where it belongs.
- **Two accounts are in scope with no department of their own.** They carry a badge today. When ingestion is real, the backend has to make the same call — include by budget-master membership, report as section-missing — or those ten GL rows vanish without a word. That is the failure `CLAUDE.md` names as silent.
- **The client-data rule now has a judgement in it.** Transaction records stay out, the chart of accounts may come in where it earns its place. A rule with a judgement is a rule someone can get wrong, so the reasoning sits in `.gitignore` beside the patterns rather than only in this document.
- **Nothing enforces the audit.** It was a one-off pass. A future document could paste a vendor name or a document number and no check would catch it; the same script would have to be run again.

**Assumptions added this session**

- The repository stays private. The chart-of-accounts decision was taken with that in mind, and `curl` on the GitHub API confirmed it at the time rather than assuming it.
- The eighteen MIS accounts in the sample GL are representative of what a real month carries. If the real chart is wider, the fixture understates how long the account table gets.
- `Docs/Source/` is present on this machine. Both the audit and the fixture rebuild read from it, and neither can be repeated on a checkout that does not have it.

**Environment**

- Node 22, Python 3.13, PostgreSQL 18 via psycopg v3 (URL scheme must be `postgresql+psycopg://`).
- Frontend dev on `:5173`, backend on `:8000`, `npm run preview` on `:4173`.
- Backend configuration is read from `backend/.env`, which is gitignored; `backend/.env.example` is the tracked template. The variables it defines, by name only: `DATABASE_URL`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `ALGORITHM`, `APP_NAME`, `DEBUG`. **No value of any of them is reproduced here, and the secret key and the database password must never reach a document, a log, or a command line.** `DATABASE_URL` must use the `postgresql+psycopg://` scheme; a bare `postgresql://` reaches for psycopg2, which is not installed.
- `backend/app/config.py` carries `secret_key: str = "change-me"` as a default. It is a placeholder rather than a secret, but a default that boots is also a default that ships, so removing it and letting startup fail loudly is the safer shape once authentication exists.
- The frontend needs no environment variables. The template links are absolute paths under the site root, so nothing about them changes between the dev server, `npm run preview` and the FastAPI host.
- Both the audit and the fixture rebuild read `Docs/Source/`, which is on this machine only and not in git. Neither can be re-run on a fresh checkout without those workbooks.

**Constraints that shaped the work**

- The production host is network-isolated: nothing may be fetched from the public internet at runtime. The bundle makes zero external requests, which is why the font is embedded.
- Plain CSS custom properties only. No UI framework, no state library, no CSS-in-JS.
- Spacing and radius come from tokens. A raw pixel value in a new rule is a bug, not a decision.
- `Docs/Source/` holds real client data despite the "Dummy" filenames. It is not in git and must never be added.

---

## 12. Where `Requirements-Spec.md` stands

Read this as coverage, not as a to-do list: almost nothing here is late. `Docs/Client/Project-Timeline.md` §4 puts feature code at 7 September, so a backend with no endpoints on 3 September is the plan. What matters is which requirements already have a shape to build against, which have nothing, and which the spec now states wrongly.

**Built in the interface, running on fixtures, no backend behind any of them**

| ID | Where |
|---|---|
| FR-1 | Login screen. It accepts any non-empty credentials, so the form exists and the rule does not |
| FR-4, FR-5, FR-6 | Users screen: create, edit, delete, role, self-delete disabled. The only CRUD surface in the product |
| FR-7, FR-11 | COA screen, read-only by construction, with a badge on GL auto-registered accounts |
| FR-27, FR-29 | The replace decision, showing period, rows, total, uploader and time, with GANTI DATA and cancel |
| FR-31 | Per-row rejection reasons, in `ReasonTable`, shown identically on Upload and in the audit trail |
| FR-32, FR-33 | Batch history, every status, visible to every role; `Hapus data` for a stored batch |
| FR-35 to FR-41 | `lib/analytics.js`, with its own tests. **JavaScript only** — `backend/app/analytics.py` must reproduce it exactly |
| FR-43 to FR-47 | The Dashboard: five KPI figures, category chart, quarterly trend, four filters, the full account table with `ALOKASI` and GL-derived marked |
| FR-54 | The audit trail records every batch. Login and user changes are not recorded anywhere yet |
| FR-55, FR-56 | The preview gate, and the refusal screen that states reasons |

**Partly done**

- **FR-34** — the templates are generated from the reading contract (§1d), but from the generator's own copy of the layout constants, not from the parser's. The requirement is only satisfied when both read one source. See next step 8.
- **FR-42, money as exact decimal** — the frontend works in `Number`, which is correct for a fixture and wrong for the backend. The Python side must use `Decimal` from the first line of ingestion.

**Not started, and not due yet**

Everything the backend owns: FR-2, FR-3, FR-8, FR-9, FR-10, all of ingestion (FR-12 to FR-26), FR-28, FR-30, and the analytics rules as server code. `POST /auth/login` first, then preview and commit, per next step 7.

**Not built and not planned**

- **FR-48, export the on-screen table to Excel or CSV.** Priority C, and nothing on any screen offers it. It is the only functional requirement with no design and no fixture behind it. Say so if a supervisor asks rather than letting it read as an oversight.

**Wrong in the spec, not missing from the code**

- **FR-49 to FR-53, and §3.1.** The 28 August review moved backups out of the application to a scheduled task on the host. The spec still describes a daily in-app schedule (FR-49), an administrator setting for retention (FR-51) on a Settings screen that no longer exists, and an administrator list of backups (FR-52). **FR-28 depends on this**: it makes a backup a precondition of every replacement, which is a rule about protecting data, so it cannot simply be deleted along with the feature. Decide what takes its place before ingestion is written.
- **NFR-2.** One worker is still the right default for six users, but the reason given — the in-app backup timer — no longer exists. `CLAUDE.md` gotcha 6 already says so.
- **§11 item 9, the UI language question.** Answered by what was built: both languages, switchable in the header, on every screen. Close it.
- **§11 item 5, how a COA maps to its category.** Still open and still load-bearing. With no COA edit screen, the category must come out of the workbook or out of the code itself, and the dashboard's category chart and filter depend on it. This is the open item most likely to change ingestion.
- **§11 item 8, one real GL month.** Still the acceptance test that matters (AC-8), and still not requested. The sample amounts are not to scale, so nothing in the fixtures can stand in for it.
- **A tenth open item the spec does not yet list:** which library reads `.xls`, now waiting on the client (§8.2). The screen already accepts the extension.

---

## 13. The UI/UX standards document, and what was taken from it

On 3 September the user brought a Perplexity answer on web UI/UX standards and asked what to make of it. It is not in the repository; this section is the record.

**Its first half is generic web-product advice** — WCAG 2.2 AA, ISO 9241-210, Nielsen's heuristics, Core Web Vitals, a design system built from tokens up, and a `docs/` tree of thirteen files. **Its second half criticises its own first half** for the case at hand, and that criticism is mostly right: for an internal LAN tool with six users and two developers, Core Web Vitals thresholds measure nothing (they are field percentiles from public internet traffic), mobile variants have no audience, formal personas are pointless when the users sit in the same building, and a hand-built component library is a schedule risk.

**What was rejected, and why**

- **Tailwind, shadcn/ui and TanStack Table.** Advice for a project that has not been written yet. Six screens already exist in plain CSS, and `CLAUDE.md` states the no-framework direction as settled. Adopting it two days before Gate 2 means rewriting working UI. The document itself notes its version numbers were not verified.
- **Three new documents (`ui-spec.md`, `design-decisions.md`, `ui-review.md`).** Their content already exists across `UI-UX-Prompt-v2.md`, `Upload-Screen-Design.md`, `Requirements-Spec.md` and `Stack-Comparison.md`. Adding them would break the one-place rule that `CLAUDE.md` sets, which is the rule that keeps `Use-Case.md` and `ERD.md` citing a single set of requirement IDs.
- **WCAG as a compliance target.** Taken in part instead: keyboard reachability, visible focus, 4.5:1 contrast and never signalling status by colour alone. The status pills already carry words (*Melebihi anggaran*, *Di bawah anggaran*), so the last one holds today. Screen-reader support, 24px target size and 200% zoom are consciously skipped for a known desktop user population, and that is a decision rather than an oversight.

**What was taken, and is now real work**

1. **A 1366×768 laptop has never been checked.** That is the corporate laptop resolution most likely in the room, and an eight-column account table under a sidebar is exactly where 768px of height first hurts. Nothing below 1280px wide is supported, which stands, but the short viewport was never looked at.
2. **Negative-number and numeral formatting need one rule.** VEGA writes `−Rp 8.400.000` with a minus. Parentheses are the other convention. Pick one, apply it everywhere, and confirm the tables use tabular figures so columns of digits line up.
3. **FR-48, export to Excel, deserves a conversation rather than its current priority C.** The document's argument is the strongest one available: without export, users go back to Excel and the tool is abandoned. Worth putting to the client at Gate 2.

**Two questions it raised that belong to the client, not to us**

- **Drill-down from an account to its GL line items.** It appears nowhere in `Requirements-Spec.md` and nowhere in the UI. Either it is genuinely not wanted, or it is a gap nobody has noticed.
- **Whether any revenue accounts exist.** The document's advice to store a `variance_type` per account, so that a favourable variance means the opposite for revenue, only matters if revenue lines are in scope. The eighteen MIS accounts in the real GL are all SGA expense, so today the sign convention runs one way and the flag would be a column with one value.

**One correction to the document.** It warns against red/green status because of red-green colour deficiency. VEGA's pair is rose against amber (§1c), which does not sit on that axis, and the status is also written as words. The point is sound in general and already handled here.

---

## 14. Client-data audit, and the account fixture rebuilt on the real chart

Prompted by the user on 3 September: *"saya liat ada beberapa docs yang kamu buat masih mention yang ada di gitignore atau yang seharusnya tidak ditulis, verifikasi ulang semua docs dan .md nya"*.

### What was checked, and how

Every value in `Docs/Source/GL Dummy.xlsx` was extracted and searched for across every tracked file: 418 vendor names, 4,000 references, 2,933 batch-entry IDs, 1,164 FP numbers. **Not one appears anywhere in the repository.** No tracked file carries a local path, and the only hit from a secret scan is `backend/app/config.py:12`, `secret_key: str = "change-me"`, which is a placeholder.

The chart of accounts is a different story, and it was measured rather than guessed:

| File | Real COA codes | Real account names |
|---|---|---|
| `Docs/Internal/Template-Review.md` | 30 | 8 |
| `Docs/Client/Excel-Template-Spec.md` §6 | 26 | 3 |
| `Docs/Client/VEGA-Board.drawio.svg` | 10 | 1 |
| `Docs/Client/VEGA-Board1.drawio.svg` | 10 | 1 |
| `Docs/Internal/Project-Plan.md` | 11 | 0 |
| `Docs/Client/Flowchart.md` | 1 | 0 |

### One real defect, in work from the day before

`backend/scripts/make_templates.py` and both generated templates carried three real COA codes (`740201000`, `770101000`, `772404000`) and one real account name (`Welfare Expense SGA`). A template that ships in the repository has no reason to hold a real account. The sample rows now use `999000001`–`999000003` with names prefixed *Contoh -*, chosen outside the client's numbering so they cannot collide, and the files were regenerated and re-checked: zero real codes, zero real names.

### The rule was inconsistent, and the inconsistency was the finding

`.gitignore` excluded the bakeoff output because it is *"a verbatim dump of the client's chart of accounts — 73 real account numbers with real descriptions and amounts"* — while the tracked spec carried 26 of the same. Asked which way to resolve it, the user asked for a recommendation and took it.

**The two kinds of data are not equally sensitive.** Transaction records name counterparties and dates; the chart of accounts is accounting structure that names nobody. Deleting the codes from the spec's verification table would have cost AC-3, the only mechanical acceptance test available before a real GL month arrives, which is a poor trade for masking numbers in a private repository. `.gitignore` now states the distinction instead of implying a single rule, and bulk generated output stays excluded on its own merits.

### The fixture now uses the department's real accounts

The user asked for the dashboard's *"Departemen IT"* filter to become *Departemen*, sourced from the account numbers, with the number and the department no longer mixed together — *"772001001-A7744-MIS000. MIS itu departement nya"* — and chose to take the real MIS accounts with it.

**Reading the real GL first changed the design.** Its `CORE` sheet holds eight sections, not one: `COMM00` 4,174 rows, `GA0000` 261, `HRD000` 126, `AF0000` 125, `ME0000` 97, `SHP000` 94, **`MIS000` 63**, `SB0000` 1, plus 10 rows with no section at all. And **the same account code appears under two departments** — `772001001` is both `MIS000` and `GA0000` — so the code alone identifies nothing and splitting it from the department is a data correction, not tidying. Asked how wide the filter should be, the user answered *"MIS dulu, tapi rapihin dari MIS0000 jadi MIS"*.

`RAW_ACCOUNTS` is now the real MIS chart: 16 accounts from the budget master keeping their `LABOR SGA` / `EXP SGA` names, plus three cases the fixture used to invent and the real data supplies outright.

| Case | Was | Is now |
|---|---|---|
| GL auto-registration (FR-24) | `52999 Lisensi Tambahan (dari GL)` | `770102000` and `770107001`, the two depreciation accounts. They genuinely have no budget row, because the workbook carries depreciation only inside a subtotal — which is open item 1 in `Requirements-Spec.md` §11 |
| Row filter, clause b (FR-23) | not shown at all | `771501000` and `772404000`, badged `TANPA SEKSI`. Their GL account number has no section; they are in scope because their code is in the budget master |
| `ALOKASI` (FR-37) | `52502 Alokasi Biaya Internal` | `772502000 Internal cost allocation(Expense)`, the account the spec already names as carrying a negative budget |

**Every amount is still invented**, and the file says so at the top. The sample workbook's own figures are not to scale, so using them would misinform rather than inform.

**Categories are our proposal, not the client's.** Neither workbook has a category column, so the eight categories (Tenaga Kerja, Penyusutan, Subkontrak, Jasa Profesional, Utilitas, Komunikasi, Umum, Alokasi) are read from the account-code ranges. That is exactly open item 5 in §11, and the fixture now states a concrete answer to put to the department rather than an invented set of IT categories that could never come out of their file.

### What this cost, and one thing it exposed

Two tests failed on the new numbers. One was stale (it looked for account `52999`) and now names the depreciation account instead. **The other was a real finding.** It asserted that budget-to-date equals the annual total scaled by the loaded months, which held only by luck of the old figures. `summarise` sums the per-row values, each already rounded to the cent, so the two differ by up to a cent per row. That is the correct behaviour — the column on screen has to add up to the card above it — and the test now asserts both halves: the total equals the sum of the displayed rows, and it sits within a cent per row of the exact share. It is the same rounding trap `Stack-Comparison.md` §5 records from the bakeoff.

One regression, caught in the browser: the shell header read a bare *"Departemen"* once the label stopped saying *"Departemen IT"*. It now composes the name from `FISCAL.department`.

Verified on the rendered page: the filter reads MIS, the header reads *Departemen MIS*, the table lists 19 accounts, and the badges come out as two *dari GL*, two *TANPA SEKSI* and one *ALOKASI*.
