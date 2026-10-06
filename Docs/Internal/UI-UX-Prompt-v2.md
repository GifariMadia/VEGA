# VEGA — UI/UX Design Prompt v2

**Version:** v2, 28 Aug 2026. Supersedes [UI-UX-Prompt.md](UI-UX-Prompt.md), which is kept as
the record of the original brief. Everything below is current; nothing needs reading alongside
v1.

**Purpose:** a single, self-contained brief for designing VEGA's interface. Paste it into a
design tool (Figma Make, v0, Claude) or hand it to a designer. It is written to be read
without any other document open.

**Deliverable it feeds:** `UI-UX.md` (Phase 2: low-fi wireframes, then hi-fi mockups).

**The one instruction that outranks every other line in this document:**

> **UX over UI.** The client asked for usability, not decoration. A screen that answers the
> user's question in one glance and is plain wins over a screen that is beautiful and makes
> them think. Spend the effort on information hierarchy, wording, states, and error
> recovery. Spend as little as possible on visual invention.

---

## 0. Client review, 28 Aug 2026 — decisions that supersede sections below

The client reviewed the layout candidates and the clickable prototype. Seven decisions came
out of that review. Where a section further down disagrees with this table, this table wins,
and the section has been corrected in place.

| | Decision | Sections it changed |
|---|---|---|
| 1 | Layout is the clickable prototype's, with L2's vertical sidebar. The sidebar collapses to a 64 px icon rail and back to 214 px, toggled from its own footer; the choice is remembered per browser. Five hand-written inline SVG icons, one per nav item, stroked with `currentColor`. | §4.2, §7 |
| 2 | Every chart names the period it covers in its own caption, derived from the loaded data rather than from a user's selection. No range picker. | §4.2 |
| 3 | The monthly matrix is a **page of its own**, second in the sidebar, not a view toggle on the dashboard. The client wanted it reachable in one click. | §4.2a |
| 4 | The replace decision moves onto the Upload screen as a panel that names the batch already stored for that period, carrying both `GANTI DATA` and the cancel action. | §4.3, §4.4 |
| 5 | Upload history becomes the audit trail. It keeps every batch, not only replaced ones, and a replaced batch opens to show the version it replaced. | §4.4 |
| 6 | Audit entries carry notes. Append-only, written by administrators, read by everyone; a note that can be deleted is not an audit note. | §4.4 |
| 7 | The Settings screen is gone. Backups run outside the app as a scheduled `pg_dump` on the host, which the User Manual states. | §4.7 |
| 8 | The dashboard's second chart is **grouped bars, budget vs actual per COA category**, with the gap percentage under each pair. The quarterly trend line is dropped: with one month of GL loaded it drew a flat line and a lot of empty space. | §4.2 |
| 9 | **Under budget is amber, not grey.** Grey did not register as something to look at. Over budget stays red. | §7 |
| 10 | Cards on a row stretch to equal height, and the absorption card runs full width beneath them. The previous layout left a column of dead space where a short card sat beside a tall one. | §4.2 |
| 11 | **Interface copy carries no design argument.** Every note that existed to defend a design decision is out. | §6.0 |

**What decision 5 protects.** The client's own words were that the screen should hold the
files that were replaced or modified. Taken literally, a month uploaded once and never
replaced would leave no trace anywhere in the interface, and the screen's whole purpose is to
answer *where did this number come from*. So the screen keeps every batch and marks the
replaced ones, which satisfies the request without losing the traceability.

**What decision 9 overrides.** Grey for underspend was our choice, argued from the risk of
crying wolf in month 1 of 12. The client looked at it and said they would not notice it. Their
screen, their call: under budget is amber (`#B54708` on `#FFFAEB`, border `#FEDF89`). The
zero-tolerance rule does not move, only the colour. ALOKASI stays neutral, because it is
outside the comparison entirely.

**What decision 11 fixes.** The prototype's copy read like a defence of the mockup rather than
an interface. Three of the strings the client quoted back:

> "Six accounts carry the entire June gap. Everything past the black tick was overspent;
> accounts with no tick have no budget line at all."
> "Grey, never amber. Underspend in month 1 of 12 is normal, and colouring it would cry wolf
> all year."
> "months loaded counts periods holding GL data, not months elapsed"

None of that helps somebody reading a budget. See §6.0 for the rule that replaces it.

**What decision 6 costs outside the interface.** Notes are new stored data: an `audit_note`
child of `AuditLog`, append-only, with no `updated_at` because there is no update.
`Requirements-Spec.md` needs an FR for the note and for the audit trail, FR-27 needs the
Upload screen named as where the replace decision lives, and the backup FR and its retention
NFR come out. Gotcha 2 in `CLAUDE.md` still holds, because `pg_dump` still runs on Windows.
Gotcha 6 loses its stated reason: the one-worker rule existed because the backup timer lived
inside the app, and with that timer gone the rule needs a fresh reason or it goes too.

---

## 1. The brief in one paragraph

VEGA is a **budget vs actual tracker** for one IT department. Someone uploads the
fiscal-year **budget** Excel once a year and the **General Ledger** Excel once a month. VEGA
compares them per chart-of-account (COA) and shows the gap, the over/under-budget status,
and a **year-end projection**. It is a web app served over the department LAN: one host PC
runs it, about six people open it in a browser by hostname. It replaces a manual routine:
filter the GL to IT, split the account code, look up each COA, build a pivot table.

---

## 2. Who uses it, and what they actually want

Two roles. Nothing else.

| | Administrator (1–2 people) | Regular user (4–5 people) |
|---|---|---|
| Who | The person who receives the Excel files | Department lead / staff who need the numbers |
| Frequency | Once a month, ~10 minutes, plus once a year | A few times a month, ~1 minute per visit |
| Can do | Everything below, plus upload, confirm or decline the upload preview, cancel an upload, manage users / settings, run a backup. **Not** edit any figure or any account — those come from the files | **Read only, in the strict sense.** View the dashboard, filter it, see the upload history and the COA list. No action available to them changes stored data. |

**The five questions the whole interface exists to answer.** Rank every design decision
against this list; anything that does not serve one of them is decoration.

1. *Are we still safe until the end of the fiscal year?* ← the client's own words, the
   single most important question in the product
2. *How much of the budget have we spent so far?*
3. *Which accounts are over budget, and by how much?*
4. *Is the number on screen current, or is a month missing?*
5. (Admin only) *Did my upload actually work, and does it match my Excel?*

**Anti-goals.** The user is not exploring data for fun, not building reports, and not
configuring anything. They arrive with one of those five questions and want to leave.

---

## 3. Hard constraints — these are settled, do not design around them

**Data & domain**

1. **The fiscal year runs April → March.** FY26 = April 2026 through March 2027. Never show
   a Jan-Dec axis. Quarters are Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar.
2. **The GL lags one month.** The file received in July contains June's transactions. So the
   newest month on the dashboard is always roughly last month. **The interface must say which
   month the data runs through; this is not a footnote, it is a headline.**
3. **Excel is the only way data enters.** There is no manual entry and no editing of any
   figure, anywhere, by anyone. A correction is made by re-uploading a corrected file.
   *Design consequence:* never show a number in a way that suggests it is editable: no
   inline edit affordances, no pencil icons, no editable-looking table cells on any figure.
4. **An upload is all-or-nothing.** Either the whole file is read exactly as specified and
   stored, or nothing is stored and the previous data stays untouched. There is no partial
   import to design a UI for.
5. **Re-uploading a month replaces that month.** It never adds to it. The user must
   understand this *before* they confirm, not after.
6. **Cancelling an upload does not restore the one it replaced.** Re-uploading June and then
   cancelling leaves June *empty*, not back at its previous version. This is the single most
   dangerous action in the product and its confirmation copy must say exactly that in plain
   words.
7. **The year-end projection is a run rate over the months that actually have data**, not
   over calendar months elapsed. The projection card must state its own basis, e.g.
   *"Based on 3 months of GL data (Apr-Jun)."* A projection whose basis is invisible is a
   number nobody can defend in a meeting.
8. **Status uses a tolerance band, default ±5%**, configurable in settings. Three states:
   **Over budget / On track / Under budget**.

   **Status compares like with like.** Year-to-date actual is judged against the budget for
   *the months that have data*, not against the full-year budget. Comparing three months of
   spending to twelve months of budget makes every account look "under budget" from April to
   February, which turns the status column into noise for eleven months of the year. The
   full-year budget still appears as the total and as the projection's target; it is just
   not what the status is measured against.
9. **When budget = 0 the gap percentage is undefined.** Show `—`, never `0%`, never `∞`,
   never a division error. The absolute gap is still shown.
10. **Only the IT department's rows exist in the pilot.** The department filter is present
    but will usually have one option. Design it so a one-option filter does not look broken.

**Technical**

11. React 18 + Vite, **Recharts** for charts, react-router for routing.
12. **Plain CSS custom properties. No UI framework (no Material, no Tailwind, no shadcn) and
    no state library.** Design something that can be built with hand-written CSS by two
    interns. Every component you draw is a component someone has to write from scratch;
    that is the budget you are spending.
13. Palette: **Omron blue and white.** Blue as the single accent; white/near-white surfaces;
    neutral greys for structure. Semantic colours for status only (see §7).
14. **Desktop browsers on office PCs.** Design for 1366×768 as the small end and 1920×1080 as
    the comfortable one. Responsive down to a narrow window is nice; phone layouts are
    **out of scope**: the mobile version was dropped.
15. Plain HTTP over an isolated LAN. No password reset by email, no SSO, no 2FA. Login is
    username + password.
16. **The interface is bilingual (Indonesian and English) and the user picks.** See §6.1
    for what that means for the design.

---

## 4. Screens

Seven screens. Do not invent an eighth without a reason tied to §2.

### 4.1 Login

The least interesting screen; keep it that way. Centred card, VEGA wordmark, username,
password, one button, and the `ID / EN` language toggle (§6.1). A user who cannot read the
default language must be able to switch before logging in. One error message for a failed
attempt: *"Username or password is
incorrect."* Never reveal which one was wrong. No sign-up, no forgot-password (an admin
resets it), no marketing copy.

### 4.2 Dashboard — the product

Everything else is plumbing. This screen is what the app is.

**Design it so that questions 1-4 in §2 are answered before the user scrolls.** If the
answer to *"are we safe?"* requires a scroll, the layout has failed.

Suggested top-to-bottom order. Challenge it if you have something better, but keep the
priority ranking:

1. **Freshness banner / strip.** *"Showing FY26 · data through June 2026. July's GL has not
   been uploaded yet."* Persistent, unmissable, plain language. It is the difference between
   a number that is right and a number that is trusted.
2. **KPI cards**: Total Budget · Total Actual · Gap (amount + %) · Status. Big numbers,
   quiet labels. The gap card carries the status colour, not the whole row.
3. **The projection card: give it real estate.** This answers question 1. It needs:
   projected year-end spend, projected gap against the annual budget, the resulting status,
   and its own basis line (*"based on N months of GL data"*). Consider stating the
   actionable form too: *"Rp X per month remaining for the last N months to stay in budget."*
   That sentence is worth more than any chart on the page.
4. **Budget vs Actual grouped bars, per COA category.** Two bars per category: budget as an
   outlined bar, actual as a solid one, the gap percentage under each pair with its sign.
   ALLOCATION is left out, since a negative allocation is not spending and would only distort
   the scale. This is the "which categories" answer at a glance, and it is the chart the
   client picked.
5. **Every chart caption names its own period**, in the title, from the data: "Budget vs
   Actual per COA category · Jun 2026". No range picker: the range a chart shows is the range
   the data has. Where the number of loaded months matters to a figure, it is the same
   `months_loaded` the projection divides by, so the two can never disagree on screen.

   *There is no quarterly trend line.* It was in v1 and in the first prototype. With one month
   of GL it drew a flat grey line across three empty quarters, which is a lot of screen for
   "we have one month of data" — a sentence the freshness banner already says.
6. **COA detail table**: code, name, category, budget, actual, gap, gap %, status. Sortable,
   default sort **worst variance first**. The user came for the problems, not for alphabetical
   order. Read-only, and it must look read-only.

**Row heights on this screen.** Cards that share a row stretch to the same height, and a card
that has nothing to sit beside runs the full width instead. The first prototype put a
seven-row card next to a two-card stack and left a column of dead space under the short side;
that space read as a missing feature. The absorption card is now full width, five compact
tiles across, which is also less vertical space than the list it replaced.

**Filters**: fiscal year, quarter or month, COA category, department. Keep them in one row
above the content, always visible, with the active selection legible without opening a
dropdown. Filters must apply to every element below them, and it must be obvious they did.

**The sidebar**

214 px expanded, 64 px collapsed, toggled from a control in the sidebar's own footer, not from
a hamburger in the header: the rail shrinks, it never disappears, and the two gestures should
not look alike. Collapsed, each item keeps its `aria-label` and a native `title` tooltip, so
the label stays reachable in both states without a tooltip component. The state lives in
`localStorage`; six users and one preference do not need an endpoint. Below 1024 px it starts
collapsed. Collapsing matters most on the monthly matrix, where it returns 150 px to twelve
month columns on a 1366 px screen.

**Design notes for the dashboard**

- Currency is IDR at department scale: millions to billions. Full precision in the table,
  abbreviated on chart axes and KPI cards (`Rp 1,2 M`). Pick one convention and hold it
  across every screen; state it in the mockup.
- Negative gap versus positive gap must be distinguishable without relying on colour alone:
  a sign, an arrow, or a word. Roughly 1 in 12 men has a colour-vision deficiency, and six
  users is a small enough sample to include one.
- **Do not build a donut chart of spend by category** unless it answers a question in §2.
  It usually does not.

### 4.2a Monthly matrix (its own page, second in the sidebar, all roles)

12 columns Apr-Mar by COA account, the shape of the pivot the client already works in, with
the total pinned at the right. A month with no GL reads `—`, never `0`.

It is a page rather than a view toggle on the dashboard because the client asked for it in one
click, and because at 1366 px it wants the whole width: twelve month columns plus code and
name do not fit beside a projection card. The table scrolls horizontally inside its own
container; the page never scrolls sideways. A row opens the same account detail the dashboard
table opens.

### 4.3 Upload (admin only)

A ten-minute monthly ritual done by one person under mild time pressure. Optimise for
*getting it right the first time*, not for looking impressive.

Design it as an explicit sequence, with the user always able to see which step they are on:

1. **Choose what is being uploaded**: Budget (annual) or General Ledger (monthly). These
   behave differently enough that guessing is worse than asking.
2. **Get the template.** A visible link to download the standard Excel template, right where
   someone about to upload the wrong-shaped file would see it.
3. **Pick the file.** Drag-drop plus a file picker. Show the filename, size, and an obvious
   way to change the choice before committing.
4. **Preview: the system reports what it found, before anything is stored.** Which sheet it
   read, which fiscal year and month, how many rows were read / accepted / rejected, the total
   amount, and a sample of rows exactly as it understood them. **The period is read from the
   file's own fiscal-period column, never from the transaction dates and never typed by the
   user.** This screen always appears, and it has two buttons: confirm, or decline and store
   nothing. Design the decline path as a first-class outcome, not a greyed-out afterthought;
   it is how someone who grabbed last month's file gets out without damage.

   If the file covers a month that is already loaded, that is a **second** question asked after
   the preview is confirmed, in plain words: *"June 2026 is already loaded. Uploading this file
   will replace it. A backup is taken automatically first."*
5. **Result.** Two possible outcomes, and they must look completely different:

   **Refused**: nothing was stored, existing data is untouched. Say that first, in the
   first line, before any detail; a wall of errors with no reassurance reads like the
   database just broke. Then list **every** problem at once so the admin can fix them in one
   pass: row number, what is wrong, what was expected. Long lists need to be scannable and
   ideally exportable. Common cases to design for: wrong sheet, a column that moved, an
   unknown account code, a negative or non-numeric amount, a comma used as the decimal mark,
   no usable rows at all.

   **Imported**: show the **import summary**: rows read, rows imported, rows rejected,
   month(s) detected, and **the total amount extracted**. That total exists so the admin can
   compare it against the Excel's own total in one second. **This is the most important
   moment in the admin flow, the number that proves the system read the file correctly.
   Give it the visual weight of a KPI, not the weight of a log line.** Then offer the obvious
   next step: *View the dashboard*.

Parsing a GL takes a few seconds. Show real progress or a clear working state, never a
frozen button.

### 4.3a The stored-period panel (on the Upload screen)

Once the preview has identified the file's period, and only if that period already holds data,
the Upload screen shows a panel naming what is stored: period, rows, total, who uploaded it,
when. `GANTI DATA` and the cancel action both live in that panel. The two-step commit does not
change: the preview writes nothing, the replace decision comes only after the preview is
accepted, and declining writes nothing.

This gives replacing and cancelling one home. The audit trail records; it does not act.

### 4.4 Audit trail (all roles can view; administrators can add notes)

A table of **every** batch: date, who, kind, filename, fiscal year, month(s), rows, status
(Recorded / Replaced / Cancelled / Refused). This is the traceability answer (*where did this
number come from*), so make it readable rather than dense, and keep the batches nobody ever
replaced — those are most of the answer.

A row opens. Inside:

- **The version it replaced**, when there is one: filename, uploader, timestamp, rows, total,
  next to the same facts for the version that took its place.
- **Notes.** Append-only. An administrator adds one; nobody edits or deletes one; every note
  carries its author and time. A regular user reads the same notes. Say the rule on the
  screen, because an append-only field with no explanation reads as a bug.

No action column. Cancelling a batch happens in the stored-period panel on the Upload screen
(§4.3a), where its confirmation dialog states the consequence in plain words: *"Cancelling
this upload removes June 2026's data. It does not restore the version this upload replaced.
June will be empty until a correct file is uploaded."* Confirm button labelled with the action
(`Cancel this upload`), never `OK`.

### 4.5 COA list (read-only, all roles)

**Not a CRUD screen. There is no New button, no row menu, no edit pencil, no delete.** The
account list is built from the uploaded workbooks, so a table is all it is: code, name,
category, department, active/inactive, and a marker for accounts VEGA auto-registered from a
GL row that had no budget line. Search and filter by category.

Say why, once, on the screen: a short line such as *"This list comes from the uploaded files.
To change an account, correct the Excel file and upload it again."* Otherwise the first
question every admin asks is where the edit button went.

**Users (§4.6) is the only create/edit surface in the entire product.**

### 4.6 Users (admin only)

CRUD: username, full name, role (Administrator / Regular user), active. Admin sets and resets
passwords. Show password rules at the point of entry, not after a failed submit.

### 4.7 Settings — removed

There is no Settings screen and no sixth nav item. Backups run outside the app: a scheduled
`pg_dump` on the host PC, described in the User Manual. Nothing else was on the page. The
status rule is zero tolerance and was never configurable (FR-36), the interface language
toggle belongs in the sidebar where people look for it, and a page with nothing on it is
worse than a page that is not there.

---

## 5. States — design these, do not leave them to the developers

Every screen needs all five. In a data-import product the unhappy paths are most of the
product, and leaving them undesigned is how an app ends up feeling broken.

| State | What it must do |
|---|---|
| **Loading** | Skeletons over spinners for the dashboard, so the layout does not jump. A visible working state on upload. |
| **Empty — nothing uploaded yet** | The first-run dashboard. Do not show zeros: zeros look like "we spent nothing". Say *"No budget loaded for FY26 yet"* and point an admin to the upload screen. A regular user sees who to ask instead. |
| **Partial — the common case all year** | Budget loaded, some months of GL loaded. The dashboard's normal condition. Missing months are visibly missing, not silently zero — this is the highest-value state in the whole design and the easiest one to get wrong. |
| **Error** | Say what happened, whether anything was stored, and what to do next. Never a raw stack trace or a bare code. |
| **Denied** | A regular user who reaches an admin URL directly is refused by the server. Design that page: explain the role restriction, offer a link back to the dashboard. Do not merely hide buttons — the restriction is enforced server-side and the UI must explain it, not just conceal it. |

---

## 6. Wording rules

### 6.0 No sentence on screen defends a design decision

The rule, and it outranks everything else in this section: **a string earns its place by
helping somebody read a budget.** Nothing on screen exists to explain why the interface is
built the way it is.

Keep: what a number is, which period it covers, what a button is about to do, what to fix in a
refused file, what will be lost before a destructive confirm.

Cut: why a colour was chosen, what the rejected alternative would have looked like, what the
server returns, what a loading skeleton matches, how many accounts add up to the total the
reader can already see, and any sentence whose real audience is a reviewer of the mockup.

Two limits that keep it honest:

- A chart or card caption is **one line**. If it needs two, the chart is wrong, not the caption.
- A note under a card is **one short sentence, or it goes**. There is no third option.

The one exception is the component sheet and the flow diagram in the design deliverable
itself. Those pages exist for reviewers, and design rationale belongs there.



The interface is read by finance-literate people who are not developers.

- Prefer plain words to accounting jargon where both are exact: **Gap** over *Variance*,
  **Actual** over *Realisation*, **Over budget** over *Unfavourable*.
- Never surface system vocabulary: no `batch_id`, no `COA_ID`, no `422`, no `null`, no
  `NaN`. Unknown means `—`.
- Error messages name the fix, not the failure: *"Column 'Account Number' was expected in
  column C but was not found. Download the standard template and re-check the header row."*
- Confirmation buttons say the action: `Replace June 2026`, `Cancel this upload`,
  `Delete user`. Never `OK` / `Yes`.
- Dates in a fiscal context always carry the year: `Jun 2026`, not `June`. FY labels are
  written `FY26 (Apr 2026 – Mar 2027)` on first appearance on a screen.

### 6.1 Bilingual interface — Indonesian and English, user's choice

**Decided:** the user picks the language. **Not** a per-user account setting stored in the
database: a toggle in the header that remembers itself in the browser. Two dictionaries in
one file, no i18n library; the app is far too small to earn one, and the library would be the
single biggest dependency in the frontend.

Design consequences, all of them mandatory:

- **A language toggle lives in the header on every screen, and on the login screen**. The
  login page is the first thing a new user sees, and it must not be readable in only one of
  the two languages. Render it as a plain `ID / EN` pair, not a flag icon (flags mean
  countries, not languages) and not a dropdown for two options.
- **Design every layout for the longer string.** Indonesian labels run roughly 15-30% longer
  than English: `Over budget` becomes `Melebihi anggaran`. If a KPI card or a table header
  only fits in English, it is broken. **Draw the tight screens (the KPI row, the table
  header, the filter bar) in Indonesian first**, then confirm English fits inside that
  space. Never the other way around.
- **Fixed-width buttons and fixed-width table columns are forbidden.** Let content size them.
- Mock up at least the dashboard and the upload result screen in **both** languages. One
  language is not a finished mockup.

**Vocabulary: settle this table before hi-fi and keep the two columns in sync.** Financial
terms the department already uses in English stay in English in both modes; only the
surrounding interface translates.

| Concept | English | Indonesian |
|---|---|---|
| Budget | Budget | Budget *(kept — the department's own word)* |
| Actual spend | Actual | Actual *(kept)* |
| Budget − Actual | Gap | Selisih |
| Over budget | Over budget | Melebihi anggaran |
| On track | On track | Sesuai rencana |
| Under budget | Under budget | Di bawah anggaran |
| Chart of account | COA | COA *(kept)* |
| Year-end projection | Year-end projection | Proyeksi akhir tahun |
| Upload | Upload | Unggah |
| Data through Jun 2026 | Data through Jun 2026 | Data sampai Jun 2026 |

Everything the *server* generates and the user reads (upload rejection reasons above all)
must translate too, or the most important screen in the admin flow ends up half-English.
Decide early whether the backend returns a message code that the frontend renders, or a
finished sentence. **A message code is the correct answer**; otherwise every error string
lives in two places, in two languages.

**Number and date formatting does not follow the language toggle.** The currency is IDR and
the users are Indonesian, so Indonesian formatting is used in both modes and a figure never
changes shape when someone flips the switch: `Rp 1.200.000.000`: full stop as the thousands
separator, comma as the decimal mark. Month names are the one exception and do follow the
toggle.

### 6.2 Number format — decided

Short in the summary, exact in the detail.

| Where | Format | Example |
|---|---|---|
| KPI cards, projection card | Abbreviated, one decimal | `Rp 1,2 M` |
| Chart axes and data labels | Abbreviated, no decimal where it fits | `Rp 1,2 M` |
| COA table, import summary total | **Full precision, never rounded** | `Rp 1.200.000.000` |
| Percentages | One decimal, always signed | `+7,3%` · `−2,1%` |
| Unknown or undefined | `—` | |

Abbreviation units: **rb** (ribu, 10³), **jt** (juta, 10⁶), **M** (miliar, 10⁹). Keep those
same units in English mode rather than switching to K/M/B; `M` meaning *miliar* on one
toggle setting and *million* on the other is a 1000× misreading waiting to happen.

The full-precision rule for the **import summary total** is not stylistic. That number exists
to be compared digit-for-digit against the Excel's own total; rounding it destroys its only
purpose.

---

## 7. Visual system — keep it small

- **Colour:** **Omron Blue `#166FC0`** (RGB 22, 111, 192 · CMYK 89/42/0/25 · Pantone 2175 C)
  as the only accent: primary buttons, active nav, links, the primary series in every chart.
  Derive tints and shades from it rather than introducing a second brand hue. Neutral greys
  for structure, near-white surfaces. Semantic colours reserved *exclusively* for budget
  status: over budget, on track, under budget. If a colour appears anywhere it does not mean
  status, the status colours stop working.

  Ship it as CSS custom properties from the start: one place to change, and the mockup and
  the code cannot drift:

  ```css
  :root {
    --omron-blue: #166FC0;
    --omron-blue-dark: #10528F;   /* hover / pressed */
    --omron-blue-tint: #E8F1FA;   /* selected rows, subtle fills */
  }
  ```

  **Chart caution:** the budget series and the actual series must not both be blue-ish. Make
  budget the neutral reference (grey or an outlined bar) and actual the blue; the eye should
  land on what was spent.
- **Status colour: decided.** Colour marks the accounts that need action, and nothing else:

  | Status | Colour | Why |
  |---|---|---|
  | **Over budget** | Red `#B42318` on `#FEF3F2`, border `#FECDCA` | The problem the client opens the app for. |
  | **On track** | Quiet green — a pill, not a filled row | Exact equality only. The rule is zero tolerance; there is no band. |
  | **Under budget** | Amber `#B54708` on `#FFFAEB`, border `#FEDF89` | Client decision, 28 Aug 2026: grey did not register. |
  | **ALOKASI** | Neutral, dashed outline | Outside the comparison. A negative allocation is a transfer, not spending. |

  Amber for under budget replaces the grey v1 specified. The v1 argument was that colouring
  underspend in month 1 of 12 would cry wolf all year; the client looked at grey and said they
  would not notice it, which is the failure mode that actually matters. Red stays reserved for
  over budget, so the two never compete: red is the alarm, amber is the thing to look at, green
  and neutral recede. The **"lowest absorption"** list stays on the dashboard as well, full
  width under the charts, because a colour on a row says *which* account and the list says
  *how much*.

  Never rely on colour alone: every status pill carries its word, and every gap figure carries
  its sign.
- **Branding:** a **VEGA wordmark only**, set in the same font stack as the rest of the
  interface, in Omron Blue, with the tagline available as small muted text on the login screen
  and nowhere else. No logo file, no image asset, no external font. If a company logo is
  supplied later it drops into the header slot next to the wordmark; leave room for that and
  do not design around a logo that does not exist yet.
- **Type:** one system font stack, four sizes at most, two weights. Tabular figures for every
  number in a column so digits align; non-negotiable in a financial table.
- **Density:** comfortable, not cramped. Six users reading on office monitors, not a trading
  desk.
- **Components to design, and no more:** button (primary/secondary/danger), text input,
  select, table, card, badge/status pill, modal, toast, banner, file drop zone, tab, skeleton.
  That list is the design system. Anything beyond it needs a justification.
- **Accessibility floor:** visible keyboard focus, 4.5:1 text contrast, labelled inputs, real
  `<table>` semantics, status never conveyed by colour alone, dialogs that trap focus and
  close on `Esc`.

---

## 8. Deliverables

1. **Low-fidelity wireframes** of all seven screens plus the five states from §5 for the
   dashboard and the upload flow. Grey boxes. Get the hierarchy and the wording right here;
   this is where the UX work actually happens.
2. **Hi-fi mockups** in Figma, Omron blue/white, in this priority order: dashboard → upload
   flow (including the preview, the declined path, and the refused and imported results) →
   upload history → login → COA list → users → settings. **Dashboard and upload result in both languages** (§6.1); the rest in Indonesian,
   which is the longer of the two and therefore the harder fit.
3. **A one-page component sheet**: the §7 list, each in its states (default, hover, focus,
   disabled, error).
4. **A short flow diagram** of the admin's monthly ritual: log in → upload → check the preview
   and confirm → confirm replace if the month is already loaded → read the import summary →
   check the dashboard.
5. **The string table**: every UI label with its Indonesian and English form, in one sheet.
   It is the design deliverable that becomes the frontend's dictionary file verbatim, so
   writing it during design costs nothing and skipping it costs a rewrite.

Realistic figures throughout: IDR at department scale, real COA names, one account genuinely
over budget and one genuinely under. **Never mock up with `Lorem ipsum` or `$1,234`;** a
dashboard mocked with fake-shaped numbers hides every layout problem that real numbers cause.

---

## 9. Acceptance checklist

The design is done when someone who has never seen VEGA can:

- [ ] Open the dashboard and say, within five seconds, whether the department is on track
      for the year, and say what that judgement is based on.
- [ ] Tell which month the data runs through, without asking anyone.
- [ ] Name the two worst-performing COAs without using a filter.
- [ ] Upload a GL and know, from the result screen alone, whether the figures match their
      Excel.
- [ ] Read a refused upload and know that nothing was stored and what to fix.
- [ ] Understand, before confirming, that re-uploading June replaces June.
- [ ] Understand, before confirming, that cancelling an upload leaves that month empty.
- [ ] Find nothing on the dashboard that looks editable, because nothing is.
- [ ] Say which period each chart covers by reading the chart, without opening a filter.
- [ ] Reach the monthly matrix in one click and tell an empty month from a zero one.
- [ ] Notice an under-budget account without being told where to look.
- [ ] Read every caption and note on the dashboard and find nothing that explains the design.
- [ ] Collapse the sidebar, still name every icon, and find it collapsed on the next visit.
- [ ] Open a replaced batch in the audit trail and see which file it replaced.
- [ ] Add a note to a batch, then find no way to edit or delete it.

---

## 10. Settled, and still open

**Settled: treat these as constraints, not suggestions**

| | Decision |
|---|---|
| Accent colour | Omron Blue `#166FC0` (§7) |
| Interface language | Bilingual ID/EN, user toggles it, remembered in the browser (§6.1) |
| Number format | Abbreviated in cards and charts, full precision in tables (§6.2); Indonesian formatting in both languages |
| Status colour | Over = red, on track = green, **under = amber** (client decision 9, §7) |
| Branding | VEGA wordmark only, no logo file (§7) |

**Closed since v1**

- **Status tolerance band.** There is no band. The rule is zero tolerance: any difference is
  over or under, rounded to 2 dp once before comparing.
- **Is underspend tracked?** Yes. It carries a colour of its own (§7) and keeps its list on
  the dashboard.

**Still open: confirm with the client, none of them blocks the lo-fi wireframes**

1. **COA → category mapping**: a master list, or a substring of the account code? It decides
   whether the category filter is a clean short list or a long messy one, which changes how
   the filter bar is laid out.
4. **Roughly how many COA rows** does the department have, 20 or 200? Under about 30 the
   dashboard table needs no pagination at all, which removes a component from §7.
