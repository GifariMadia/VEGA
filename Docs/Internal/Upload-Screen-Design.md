# Upload Screen — Design

**Date:** 2 Sep 2026 · **Status:** approved in chat, ready for an implementation plan
**Screen:** `/upload`, administrators only. Replaces the `Placeholder` route in `frontend/src/App.jsx`.

Sources this design obeys, in order of precedence: `Docs/Client/VEGA-Board.drawio.svg` page 1 (the
flow), `Docs/Internal/UI-UX-Prompt-v2.md` §0 (client decisions) then §4.3, §4.3a, §4.4, §5, §6, §7,
and `Docs/Client/Requirements-Spec.md` FR-27, FR-55, FR-56, BR-17.

---

## 1. What this screen is for

One person, once a month, under mild time pressure, with the GL file their finance system produced.
They need to get it in correctly the first time, and they need to be able to prove afterwards that
VEGA read the same figures their Excel shows. Everything below serves that; nothing else belongs on
the screen.

The screen is **Operate** mode: the tool disappears into the task. Familiar controls, no invention,
no decoration. Its one moment of visual weight is the import total, because that number is the proof.

## 2. Decisions taken before designing

| | Decision | Why |
|---|---|---|
| 1 | Built on fixtures first, like the Dashboard | Backend ingestion is Task 15 (11–13 Sep). Fixtures let the whole flow — including the refused and replace paths — exist and be demoed at Gate 1/2. When the API lands, only the data call changes. |
| 2 | The fixture outcome is decided by the **filename** | The alternatives each carry permanent debt: a dev-only outcome picker ships a control that does not exist in the product, and a `?state=` switch means the refused path is never touched by ordinary use — and that is the path most likely to be wrong. |
| 3 | One page whose sections grow downward — no wizard, no stepper | What has already been chosen stays visible, which is exactly what an admin wants while deciding whether to replace a month. A stepper would hide it at that moment, and costs a component nobody else needs. |
| 4 | A **stored-periods list** is always visible on the screen | §4.3a puts the replace decision behind the preview, which leaves the destructive "cancel a stored batch" (§4.4) with no reachable home — an admin would have to upload a file just to expose the button. A persistent list gives it one, and shows the admin what is already loaded *before* they pick a file. |

## 3. The flow this screen implements

From the board, which wins where documents disagree:

1. Upload one file: budget (fiscal year) or GL (one month).
2. Read it: structure → extract → validate.
3. Failed validation → **refuse the whole file**. Nothing is stored, existing data is untouched,
   reasons are listed per row. (Constraint: an upload is all-or-nothing.)
4. Passed → **preview**, which stores nothing: file kind, fiscal year, period, rows read /
   accepted / rejected, total amount, sample rows. The admin confirms or declines.
5. Confirmed → is that period already loaded?
   - **No** → insert as a new period. Nothing existing is touched.
   - **Yes** → show what is stored (period · rows · total · uploader · time). The admin picks
     `GANTI DATA` or `BATALKAN`.
6. `GANTI DATA` deletes only that period and loads the new file in one transaction.

**The period comes from the file's own fiscal-period column**, never from transaction dates and never
typed by the user. Dates are a cross-check only.

**There are three ways to stop, and only one of them is dangerous.** Declining at the preview writes
nothing. `BATALKAN` at the replace decision writes nothing and leaves the stored period intact.
Cancelling a batch that is already stored removes that month's data and does **not** restore whatever
it replaced — that month is empty until a correct file is uploaded.

## 4. Screen structure, top to bottom

**Page header.** Title and one sentence saying what the screen does.

**Stored periods** — always visible. A compact table: period · rows · total (full precision) ·
uploader · time · action. The FY budget is its own row. The action is `Batalkan unggahan`, and it is
the destructive one; it opens the confirmation described in §6.

**1 · File kind.** A two-option radio group: Budget (annual) or General Ledger (monthly). They behave
differently enough that guessing is worse than asking. The template download link lives here, where
somebody about to upload the wrong-shaped file will see it.

**2 · Choose a file.** Drop zone plus a file picker. Once chosen: filename, size, and an obvious way
to change the choice. A `Baca berkas` button starts the read, which shows a visible working state —
never a frozen button.

**3 · Preview.** File kind · fiscal year · period · rows read / accepted / rejected · **total at full
precision** · five sample rows as VEGA understood them. Two buttons of equal standing:
`Simpan <period>` and `Batalkan, jangan simpan apa pun`. Declining is a first-class outcome, not a
greyed-out afterthought — it is how somebody who grabbed last month's file gets out without damage.

If the file was refused, this section becomes the refusal block instead. **The first line says
nothing was stored and the existing data is untouched**, before any detail; a wall of errors with no
reassurance reads like the database just broke. Then every problem at once, so they can be fixed in
one pass: row number, what is wrong, what was expected.

**4 · Replace decision.** Only when that period already holds data, and only after the preview was
confirmed. The stored row from the list above is brought forward and highlighted, with
`GANTI DATA <period>` (danger) and `BATALKAN` (writes nothing).

**5 · Result.** The import summary: rows read, imported, rejected, period detected, and the total
amount. **The total carries KPI weight and full precision**, because it exists to be compared
digit-for-digit against the Excel's own total in one second. Then the obvious next step: view the
dashboard.

## 5. Visual rules specific to this screen

- **Status colours stay with budget status.** Over/under/on-track red, amber and green mean one thing
  in this product. The replace panel is neutral with a firm border; red appears only on the danger
  button itself.
- **The step numbers earn their place** because the sequence is the information — §4.3 asks that the
  admin always knows which step they are on. They are not decoration.
- **Confirmation uses the native `<dialog>`.** Focus trapping and `Esc` come free from the browser,
  which is the §7 accessibility floor met without writing a modal component. A destructive,
  irreversible action is exactly the case that earns an interruption.
- **The two headline numbers use tabular figures**, like every other figure column in the app.
- Reuse the existing card, table, pill and button vocabulary. If a control here looks different from
  the same control on the dashboard, one of them is wrong.

## 6. Wording

Bilingual, both dictionaries in `frontend/src/lib/i18n.jsx`, following the existing pattern.

- **No sentence promises a backup.** Client decision 7 (§0) moved backups out of the application; they
  are a scheduled `pg_dump` on the host. The board and §4.3 still carry the old "a backup is taken
  automatically first" line and that line must not reach the screen.
- Buttons name their action: `Simpan Juni 2026`, `GANTI DATA JUNI 2026`, `Batalkan unggahan ini` —
  never `OK` or `Ya`.
- The destructive confirmation states the consequence in plain words: cancelling this upload removes
  that month's data, it does not restore the version this upload replaced, and the month stays empty
  until a correct file is uploaded.
- Dates always carry the year: `Jun 2026`.
- No system vocabulary: no `batch_id`, no status codes, no `null`. Unknown is `—`.
- Full precision for the import total and every figure in a table; abbreviated form is for cards and
  charts only.

## 7. Fixture contract

Everything lives in `frontend/src/data/demo.js` beside the existing dashboard fixtures, so there is
one place to delete when ingestion lands.

- `STORED_PERIODS` — the loaded batches: kind, period, rows, total, uploader, uploaded-at. Three GL
  months plus the FY26 budget, consistent with `FISCAL.monthsLoaded`.
- `previewFor(filename, kind)` — returns the parse outcome. The rules, which belong in a comment at
  the function and in the handoff, not on screen:
  - not `.xlsx`, or the name contains `rusak` / `salah` → refused, with a list of per-row reasons
  - GL whose name names an already-loaded month → preview whose period is already stored
  - anything else → preview for a period that is not yet loaded

The function returns the same shape the backend's preview endpoint will: outcome, file kind, fiscal
year, period, counts, total, sample rows, and reasons when refused. That shape is what `Upload.jsx`
reads, so swapping in `fetch` later touches one function.

## 8. States

| State | Here |
|---|---|
| Loading | The read is a visible working state on the button and section, not a spinner over the page. |
| Empty | Nothing uploaded yet: the stored-periods table says so and points at step 1, rather than showing zeros. |
| Error | The refusal block: what happened, that nothing was stored, and what to fix. |
| Denied | A regular user reaching `/upload` is refused by the server; the screen explains the role restriction and links back to the dashboard. Hiding the nav item is a courtesy, not the control. |

## 9. Deliberately not built

Each of these is a real thing that can be added when something asks for it:

- **Exporting the rejection list.** §4.3 calls it "ideally exportable". A scannable list covers the
  need until a real refusal proves otherwise.
- **A percentage progress bar.** The parse takes seconds; a working state is honest and a fake
  percentage is not.
- **Pagination of sample rows.** Five rows is the sample.
- **Real Excel parsing.** That is the backend's job (openpyxl, Task 15). The browser never parses a
  workbook.

## 10. Verification

- The fixture trigger rules get tests in `frontend/src/lib/*.test.mjs` — refused, new period, and
  already-loaded each assert the outcome shape.
- The three paths are then checked in the rendered build (headless Chromium against `npm run preview`,
  the method the handoff documents), plus keyboard focus through the whole flow and the `<dialog>`
  closing on `Esc`.
- `npm run lint` and `npm run build` clean before the work is called done.

## 11. Document conflicts found while writing this

Not blockers, and not to be fixed as part of this work — but they must not be lost:

1. **`Docs/Client/VEGA-Board1.drawio.svg` is an older copy of the board, not a second page.** Its two
   diagram pages have the same names as `VEGA-Board.drawio.svg`; it lacks the preview step, still says
   there are two ways to stop rather than three, and omits the extraction-only rule. Only
   `VEGA-Board.drawio.svg` is tracked in git. Two boards that disagree is two sources of truth —
   delete the older one.
2. **The board and §4.3 still promise an automatic backup before a replace.** Client decision 7 moved
   backups out of the app. The screen copy follows the decision; the board and the brief need
   correcting.
3. **§3 constraint 8 still describes a configurable ±5% tolerance band.** The rule is zero tolerance
   (§10, `Requirements-Spec.md` FR-36) and Settings no longer exists.
