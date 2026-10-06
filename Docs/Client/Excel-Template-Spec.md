# Excel Template Specification

Status: **locked for MVP** · Last verified against the sample files on 2026-08-06.

This document defines exactly how VEGA reads the two source workbooks. Every rule below was
verified against `Docs/Source/Budget Dummy.xlsx` and `Docs/Source/GL Dummy.xlsx`.

> **Those workbooks are not in this repository.** Only their amounts were scaled. The vendor
> names, document and PIB numbers, batch-entry IDs, and transaction dates are the client's real
> data. They are kept on the host machine under `Docs/Source/`, which `.gitignore` excludes.
> Ask the MIS supervisor for a copy before re-verifying any figure below.

Where a rule and
[VEGA-Board.drawio.svg](VEGA-Board.drawio.svg) disagree, **this document wins**; see
[§8 Board corrections](#8-board-corrections-required).

---

## 1. MVP scope

| Dimension | In scope | Out of scope |
|---|---|---|
| Department | Section `MIS000` only | `COMM00`, `GA0000`, `HRD000`, `AF0000`, `ME0000`, `SHP000`, `SB0000` |
| GL sheet | `CORE` only | `EMC`, `IAB`, `OCBID` |
| Budget sheet | `MIS (FC)` only | — (the workbook has only this sheet) |
| Currency | Converted USD figures only | Native-currency figures (`Debits`/`Credits` in columns L/M) |

**Unit of account: USD.** Budget figures are USD; GL actuals are read from the *converted*
debit/credit pair, which is also USD. The two are therefore directly comparable without any
further conversion. See [§4.4](#44-amounts).

---

## 2. Budget workbook

### 2.1 Identity

- Sheet name: `MIS (FC)`, exact, including the space and parentheses.
- Used range: `A1:CA270`, 270 rows × 79 columns.
- Header row: **6**. Data starts at row **7**.
- No cell in the sheet contains a formula. Loading with `data_only=True` is safe.

Reference cells, informational only:

| Cell | Value |
|---|---|
| `A1` | `FY 2026 Fix Cost ` (note the trailing space) |
| `E1` | `371526.8198169087` — a literal, **not** derived from anything in the sheet |
| `A3` | `Division/Workshop Name : MIS` |
| `BP4` | `FY25 Q2F VS FY26 Budget ` |

### 2.2 Locating the budget columns — the critical rule

Row 6 month labels are **not unique**. `Apr '26` appears twice (`BD` and `BP`); `Apr '25`
appears four times. Month labels alone cannot identify the budget block.

The disambiguator is **row 5**, which carries a band label over each 12-column block:

| Columns | Row 5 band | Row 6 range | Read? |
|---|---|---|---|
| H:S | `Actual` | Apr '25 – Mar '26 | no |
| T:AE | `Q3` | Apr '25 – Mar '26 | no |
| AF:AQ | `Q2` | Apr '25 – Mar '26 | no |
| AR:BC | `Q1` | Apr '25 – Mar '26 | no |
| **BD:BO** | **`Budget`** | **Apr '26 – Mar '27** | **yes** |
| BP:CA | `Gap` | Apr '26 – Mar '27 | no |

**Layout check on upload:** locate the 12-column block whose row-5 label is `Budget`, then
confirm its row-6 labels are the twelve fiscal months in order starting at April. Reject the
file if either half of that pair fails. Do not hard-code `BD:BO` as the only accepted position;
hard-code it as the *expected* position and report a mismatch.

**Why the other five bands are `no`.** `Q1`, `Q2` and `Q3` are successive forecast revisions of
FY25, and `Gap` is a comparison the app derives itself. None of them is an input.

The `Actual` band (`H:S`) is the one that invites a second look, because it is genuine FY25
monthly realisation, the only historical series anywhere in either workbook. It is still not
read, for two reasons that hold independently:

1. **An actual has exactly one source: the GL upload.** If the budget parser also wrote to
   `actual`, one `(fy, month, coa)` could carry two different figures with no rule for which
   wins, and the `actual` table has no column to tell them apart (`budget` has `source`,
   `actual` does not). "Every number traces back to an uploaded file" only survives while there
   is one kind of file per number.
2. **It is the wrong fiscal year.** `H:S` is FY25; the dashboard compares FY26 budget against
   FY26 GL. FY25 actuals have no budget counterpart in this workbook, so the rows could be
   stored but never compared to anything.

Sample evidence, should the band ever be reconsidered: it is **not** a full twelve months. Only
Apr, May, Jun and Jul '25 carry values; Aug '25 through Mar '26 are empty apart from a single
stray cell in Nov '25. Of 240 data rows, 84 have any value at all (69 rows × 4 months, 15 rows ×
1 month); 2,589 of the 2,880 cells are blank. Column C (`FY'25 Actual`) is the sum of the band and
agrees exactly on every row checked. The file was evidently prepared partway through FY25, so a
real FY26 workbook may well arrive with the band filled, but reason 1 above does not depend on
how full it is.

### 2.3 Column map

Zero-based indexes are for `openpyxl` tuples from `values_only=True`.

| Column | Index | Row-6 header | Use |
|---|---|---|---|
| A | 0 | `COA No.` | COA code — primary key |
| B | 1 | `DESCRIPTION` | COA name; also the subtotal marker |
| C | 2 | `FY'25 Actual` | not used |
| D | 3 | `FY'25 Q3 Forecast` | not used |
| E | 4 | `FY'25 Q2 Forecast` | not used |
| F | 5 | `FY'25 Q1 Forecast` | not used |
| G | 6 | `FY'26 Budget` | FY total — used as a cross-check only |
| BD…BO | 55…66 | `Apr '26` … `Mar '27` | **the twelve monthly budget figures** |

June 2026 (fiscal period 3) is column `BF`, index **57**.

### 2.4 Row classification

A row in 7…270 is a **data row** when both hold:

1. Column B is non-empty and does **not** contain the substring `TOTAL` (case-insensitive).
2. Column A, coerced to string and stripped, is a 9-digit numeric code.

Everything else is a subtotal, a section heading, or blank, and is skipped.

Two traps this rule exists to survive:

- **Column A is not consistently typed.** Rows 7-270 hold 237 strings, 6 integers, 21 empties.
  Always `str(value).strip()` before matching.
- **Three subtotal rows carry a number in column A**: row 89 = `123`, row 174 = `1234`,
  row 263 = `770101000`. The last one is a *valid-looking COA code on a subtotal row*. Filtering
  on column A alone would ingest `TOTAL SGA DEPRECIATION` as if it were an account. The `TOTAL`
  test on column B is what prevents that; it must come first.

There are 9 subtotal rows in total: 15, 87, 89, 100, 172, 174, 186, 261, 263.

### 2.5 Validation

| # | Check | Action on failure |
|---|---|---|
| 1 | Sheet `MIS (FC)` exists | reject file |
| 2 | Row 5 has a `Budget` band; row 6 under it reads Apr…Mar | reject file |
| 3 | Row 6 columns A, B, G match the expected headers | reject file |
| 4 | Every data row: `G == sum(BD:BO)`, tolerance 0.005 | reject file, list offending rows |
| 5 | Duplicate COA code within the sheet | accept, report the rows (see below) |
| 6 | At least one data row found | reject file |

Check 4 is the strong one: it holds on **240 of 240** data rows in the sample and catches both a
shifted column block and a corrupted figure.

Negative figures are **valid** and must never be a rejection reason. See
[§5.3](#53-negative-budget).

### 2.6 Verified facts about the sample

- **240 data rows, 238 distinct COA codes.**
- Two codes appear twice, all four rows zero-valued:
  - `740199001`: row 14 `LABOR DIRECT Other Fixed Costs-Labor`, row 99 `LABOR INDIRECT Other Fixed Costs-Labor`
  - `761001000`: row 184 `LABOR SGA Directors' Remuneration`, row 185 `LABOR SGA Other Fixed Costs-Labor`

  Policy: keep the **first** occurrence, report the duplicate in the upload result. Because both
  pairs are entirely zero, the choice has no numeric effect on the sample.
- **Only 19 of the 240 rows carry a non-zero budget.** The real FY26 budget is 19 accounts.
- Sum of column G across all data rows = **−67,370.88**, not zero. The negative is entirely
  attributable to `772502000 Internal cost allocation(Expense)` at −368,593.63.
- Subtotals: `TOTAL SGA LABOR` 103,195.38 · `TOTAL SGA EXPENSES` 198,027.38 ·
  `TOTAL SGA DEPRECIATION` 67,370.88. Their sum is 368,593.64, which is 2,933.18 short of the
  371,526.82 in `E1`.
- **The depreciation budget exists only at subtotal level.** `TOTAL SGA DEPRECIATION` is
  67,370.88 while every depreciation detail row is zero. This is the direct cause of the two
  unregistered GL accounts in [§5.4](#54-unregistered-coa); both are depreciation.

Because `E1` cannot be reproduced from any combination of rows in the sheet, **it is not used as
a verification total.** Check 4 (`G == sum of 12 months`, per row) replaces it.

---

## 3. GL workbook

### 3.1 Identity

- Four sheets: `EMC` (11,999 rows), `IAB` (12,286), **`CORE` (4,953)**, `OCBID` (3,143).
  **Only `CORE` is read.** The other three are different legal entities.
- `CORE`: header row 1, data rows 2-4953 = **4,952 data rows**, 19 columns.

### 3.2 Column map — read by position, not by name

| Column | Index | Header text | Use |
|---|---|---|---|
| A | 0 | `Pd.` | fiscal period — the authoritative period source |
| B | 1 | `Srce.` | not used |
| C | 2 | `Date` | cross-check only |
| D | 3 | `Account Number` | COA + entity + section |
| E | 4 | `Account Description` | shown when a COA is unregistered |
| F–I | 5–8 | `Reference`, `Vendor`, `Seq.`, `Batch-Entry` | stored, not used in analytics |
| J | 9 | `Curr.` | reported, not used in arithmetic |
| K | 10 | `Exch. Rate` | reported, **never** used to compute |
| L | 11 | `Debits` | native currency — **not used** |
| M | 12 | `Credits` | native currency — **not used** |
| **N** | **13** | `Debits` | **converted debit (USD)** — used |
| **O** | **14** | `Credits` | **converted credit (USD)** — used |
| P–S | 15–18 | `Comment`, `FP Number`, `Doc. Number`, `Comment2` | stored, not used |

**L/M and N/O carry byte-identical header text.** There is no `(converted)` suffix anywhere in
the file. A parser that maps columns by header name will silently read the native-currency pair
and produce actuals inflated by roughly the exchange rate. Columns must be addressed by index,
and the header check must assert that indexes 11-14 read `Debits, Credits, Debits, Credits` in
that order.

The relationship `N = L / Exch. Rate` holds on all 63 in-scope rows and can be asserted as a
sanity check, but the value written in N is always the one used. See [§4.4](#44-amounts).

### 3.3 Account Number

Format: hyphen-separated, `COA-ENTITY-SECTION`, e.g. `740201000-A7744-MIS000`.

| Segments | Rows in `CORE` | Meaning |
|---|---|---|
| 3 | 4,941 | normal |
| 2 | 10 | section segment missing |
| 1 | 1 | the junk row, see [§3.5](#35-rejection-and-junk-rows) |

`CORE` has a maximum of **3 segments**. The four-segment `COA-ENTITY-SECTION-MODEL` form occurs
only in sheet `IAB` and is out of scope; do not build parsing for it.

The entity segment is constant `A7744` across all 4,951 parseable rows. Assert it and report a
deviation; do not filter on it.

### 3.4 Row filter — which rows belong to IT/MIS

A row is in scope when **either**:

- it has 3 segments and segment 3 is `MIS000` (**63 rows**); or
- it has 2 segments and its COA code exists in the budget master (**10 rows**).

Total: **73 rows**.

The second clause is not a convenience. The ten section-less rows are
`772404000-A7744 Welfare Expense SGA` (8 rows) and
`771501000-A7744 Handling Charge and Profession` (2 rows). Both are accounts MIS holds a budget
line for. A filter written as `parts[2] == "MIS000"` drops them without a word and understates
those two accounts. Their combined value is small (7.51 USD in the sample) but the silence is the
problem, not the amount.

Every in-scope row taken by the second clause must be listed in the upload result as
*"included, section missing"*.

### 3.5 Rejection and junk rows

**Row 4953 is junk**: `Pd.`, `Date` and `Account Number` are all empty, and columns N and O hold
the *string* `'#DIV/0!'`. Arithmetic on it raises `TypeError`; a bare `float()` raises
`ValueError`; a permissive `try/except` silently books it as zero.

Row-level rules, applied in order:

| # | Condition | Action |
|---|---|---|
| 1 | `Account Number` empty | skip, count as *"skipped: no account"* |
| 2 | `Pd.` empty | skip, count as *"skipped: no period"* |
| 3 | N or O is not a number | **reject the file** and name the row |
| 4 | Both N and O non-zero on the same row | **reject the file** and name the row |
| 5 | Otherwise | ingest |

Rule 3 is a file-level rejection rather than a skip because a `#DIV/0!` in an amount column means
the source spreadsheet miscalculated; the correct fix is upstream, not a silent drop. Rule 1 and
rule 2 both fire on row 4953, so in practice the sample file is caught by rule 1 first; rule 3
remains as the guard for a `#DIV/0!` on an otherwise-complete row.

Rule 4 never fires in the sample (0 of 4,952 rows carry both), which is what makes
[§4.4](#44-amounts) safe.

### 3.6 Period

`Pd.` is the period. In the sample it is `'03'` on 4,951 rows and empty on 1. Period 3 of FY26 is
**June 2026**.

`Date` is a **cross-check only**: warn if a row's date month disagrees with `Pd.`, but never
derive the period from it. All 4,951 dated `CORE` rows fall in June 2026 and agree. (Sheets `IAB`
and `OCBID` do contain rows stamped `Pd. 03` but dated late May, proof that the two can diverge,
even though it does not happen inside `CORE`.)

Reject the file if a single upload contains more than one distinct `Pd.` value, since one upload
batch represents one month.

### 3.7 Verified facts about the sample

- Currency mix across `CORE`: IDR 4,680 · USD 243 · JPY 28 · empty 1.
- In-scope MIS rows: IDR 37 · USD 26 · no JPY.
- **Exchange rate varies row by row, even within IDR**: 17546, 17141, 16828, 16309,
  17521.2121212, 17740.587918 all appear. Recomputing conversion from any single rate is wrong.
- Section distribution: `COMM00` 4,174 · `GA0000` 261 · `HRD000` 126 · `AF0000` 125 · `ME0000` 97
  · `SHP000` 94 · **`MIS000` 63** · none 11 · `SB0000` 1.

---

## 4. Reading rules, restated as code contracts

### 4.1 Period key

`period = (fiscal_year, int(Pd.))` taken from column A of the GL. Never from `Date`.

### 4.2 Fiscal calendar

April-March. FY26 = Apr 2026 → Mar 2027. `Pd. 01` = April, `Pd. 03` = June, `Pd. 12` = March.
All of this lives in `backend/app/fiscal.py` and nowhere else.

### 4.3 GL lag

A GL file received in month M contains month M−1's transactions. This affects when a file is
expected, not how it is parsed.

### 4.4 Amounts

```
actual_row = N - O        # both already in USD; N and O are never both non-zero
```

Columns L, M and `Exch. Rate` are stored for traceability and **never** enter a calculation.
Currency is displayed, not computed with.

### 4.5 Aggregation

`actual(coa, period) = Σ (N − O)` over all in-scope rows with that COA and period. No stored
aggregates; everything is derived at query time. `upload_batch` is the idempotency key:
re-uploading a period replaces that period's rows wholesale.

---

## 5. Analytics rules

### 5.1 Variance

```
variance = budget_month - actual_month
```

Positive variance = spent less than budgeted.

### 5.2 Status — zero tolerance

**Any non-zero gap is a status.** There is no tolerance band.

| Condition | Status |
|---|---|
| `budget < 0` | `ALOKASI` — excluded from comparison, see [§5.3](#53-negative-budget) |
| `round(variance, 2) == 0` | `ON BUDGET` |
| `variance > 0` | `UNDER BUDGET` |
| `variance < 0` | `OVER BUDGET` |

Rounding to 2 decimals before the comparison is not cosmetic: without it, float residue turns an
exact match into a 1e-13 variance and every account reads `OVER` or `UNDER`. Round once, at the
comparison.

This replaces the ±5 % placeholder shown on the board.

### 5.3 Negative budget

`772502000 Internal cost allocation(Expense)` carries a **negative** budget: −368,593.63 for FY26,
−29,083.58 for June. It is an internal cost allocation: a credit back to the department, not
spending capacity.

Under the plain formula it produces `variance = −29,083.58 − 0 = −29,083.58`, i.e. **OVER BUDGET
on an account with zero spend**. The sign convention inverts for negative budgets.

Rule: when `budget_month < 0`, the row is labelled `ALOKASI`, its variance is displayed, and it is
**excluded** from over/under status and from any over-budget count. It still contributes its
figures to totals.

### 5.4 Unregistered COA

Two GL accounts have no row in the budget master, 9 rows in total:

| COA | Rows | Net June | Description |
|---|---|---|---|
| `770102000` | 2 | 25,890.55 | Depreciation of Machinery SGA |
| `770107001` | 7 | 134,047.21 | Depreciation of Fixture and Fitting SGA |

Both are depreciation, the same root cause as the missing depreciation detail rows in
[§2.6](#26-verified-facts-about-the-sample). The budget for these exists, but only inside the
`TOTAL SGA DEPRECIATION` subtotal of 67,370.88.

**Policy (recommended, pending confirmation): ingest, register, report.**

1. The actual is ingested and counted in every total. Dropping 159,937.76 USD of real spend
   because a master row is missing would be a far larger error than a missing budget.
2. The COA is auto-created in the master with budget 0 and a flag marking it GL-derived.
3. The upload result page lists every auto-created COA so an administrator can review it.
4. The account appears on the dashboard with budget 0 and status `OVER BUDGET`, percentage `—`.

The alternative (reject the whole 4,952-row file over 9 rows) makes the file un-ingestable until
the department fixes a budget sheet nobody controls, and blocks the other 64 rows for no reason.
**This contradicts [Flowchart.md](Flowchart.md) §8, which currently says reject-file.** Flowchart
must be patched.

### 5.5 Percentage

```
pct = variance / abs(budget_month) * 100      # only when budget_month != 0
```

When `budget_month == 0` the percentage is undefined and rendered as `—`. It is never rendered as
0 %, ∞, or a division error. Three accounts hit this in the sample: `771199000`, `771501000`, and
`771502000` (which has an FY budget of 11,071.38 but zero allocated to June; the annual budget is
**not** evenly spread across months).

### 5.6 Year-end projection

```
projection = actual_to_date / months_loaded * 12
```

`months_loaded` is the count of **distinct periods that actually have GL data**: 1 in the sample.
Never calendar months elapsed. Because the GL lags a month, calendar months always understate the
run rate and would report "safe" when it is not.

---

## 6. Canonical verification table

June 2026 · `Pd. 03` · FY26 · section `MIS000` plus the section-less in-master rows · 73 GL rows.
Every implementation of the ingest and analytics path must reproduce this table exactly.

| COA | Description | Budget FY | Budget Jun | Actual Jun | Variance | % | Status |
|---|---|---:|---:|---:|---:|---:|---|
| 760101000 | LABOR SGA Salary(Full-time) | 60,582.03 | 4,989.86 | 1.31 | 4,988.56 | 100.0 | UNDER |
| 760102000 | LABOR SGA Bonus(Full-time) | 12,361.43 | 1,017.75 | 22,622.25 | −21,604.50 | −2,122.8 | OVER |
| 760102001 | LABOR SGA THR(Full-time) | 4,451.68 | 370.97 | 44,534.03 | −44,163.06 | −11,904.7 | OVER |
| 760103000 | LABOR SGA Overtime Hours(Full-time) | 513.09 | 42.17 | 1.93 | 40.24 | 95.4 | UNDER |
| 760104000 | LABOR SGA Benefits-Employer's portion | 17,541.59 | 1,157.29 | 9.03 | 1,148.26 | 99.2 | UNDER |
| 760105000 | LABOR SGA Wages (Temporary Worker) | 1,245.86 | 103.82 | 0.00 | 103.82 | 100.0 | UNDER |
| 760106000 | LABOR SGA Cost of Retirement Benefit | 6,499.69 | 541.64 | 44,535.36 | −43,993.72 | −8,122.3 | OVER |
| 770699000 | EXP SGA Repair and Maintenance(Other) | 360.00 | 30.00 | 0.00 | 30.00 | 100.0 | UNDER |
| 770701000 | EXP SGA Subcontract Expense(IT)-G | 172,480.31 | 14,354.36 | 196,900.90 | −182,546.54 | −1,271.7 | OVER |
| 771199000 | EXP SGA Subcontract Expense(Other)-G | 0.00 | 0.00 | 20,402.28 | −20,402.28 | — | OVER |
| 771401000 | EXP SGA Travel Expense(Domestic and Intl) | 300.00 | 25.00 | 0.00 | 25.00 | 100.0 | UNDER |
| 771501000 | EXP SGA Handling Charge and Professional | 0.00 | 0.00 | 4.29 | −4.29 | — | OVER |
| 771502000 | EXP SGA Handling Charge and Professional | 11,071.38 | 0.00 | 2.80 | −2.80 | — | OVER |
| 772001001 | EXP SGA Light and Heat Expense (Electricity) | 5,584.17 | 465.35 | 3.60 | 461.75 | 99.2 | UNDER |
| 772001002 | EXP SGA Light and Heat Expense (Water) | 79.28 | 6.61 | 1.22 | 5.39 | 81.6 | UNDER |
| 772201000 | EXP SGA Communication Line Expense | 66.34 | 5.53 | 2.62 | 2.91 | 52.5 | UNDER |
| 772202000 | EXP SGA Communication Expense(IT) | 1,459.96 | 121.66 | 2.71 | 118.95 | 97.8 | UNDER |
| 772403000 | EXP SGA Office Supply | 252.00 | 21.00 | 2.06 | 18.94 | 90.2 | UNDER |
| 772404000 | EXP SGA Welfare Expense | 3,373.93 | 216.33 | 17.00 | 199.33 | 92.1 | UNDER |
| 772502000 | EXP SGA Internal cost allocation(Expense) | −368,593.63 | −29,083.58 | 0.00 | −29,083.58 | — | ALOKASI |
| 770102000 | Depreciation of Machinery SGA | — | — | 25,890.55 | −25,890.55 | — | OVER · unregistered |
| 770107001 | Depreciation of Fixture and Fitting SGA | — | — | 134,047.21 | −134,047.21 | — | OVER · unregistered |

**Total actual, June 2026 = 488,981.16 USD** (73 rows). The strict-`MIS000`-only filter yields
488,973.64 across 63 rows; the 7.51 difference is the ten section-less rows of
[§3.4](#34-row-filter--which-rows-belong-to-itmis).

### Sample-data warning

The dummy data is **not magnitude-realistic**. IDR rows convert to 1-3 USD while USD rows carry
20k-200k, so June salary reads 1.31 against a monthly budget of 4,989.86. The table above is
correct as an *arithmetic* fixture and must be reproduced exactly, but no business conclusion,
threshold, or "match the client's pivot" exercise may be based on these amounts.

---

## 7. Open questions for the department

| # | Question | Blocks | Status |
|---|---|---|---|
| 1 | Where is the detail behind the 67,370.88 depreciation budget? | correct budget for `770102000`, `770107001` | **open** — department does not know yet |
| 2 | Is `E1` = 371,526.82 meant to reconcile to anything? | nothing — dropped as a verification total | closed, not used |
| 3 | Duplicate codes `740199001`, `761001000` — which row is authoritative? | nothing while both are zero | first-occurrence rule applied |
| 4 | Are `772404000-A7744` / `771501000-A7744` (no section) IT's? | 7.51 USD | included by rule, reported on upload |
| 5 | Unit of account | — | **answered: USD, converted columns** |
| 6 | Over/under threshold | — | **answered: zero tolerance, any gap counts** |
| 7 | Unknown-COA policy | — | **recommended: ingest + auto-register + report** ([§5.4](#54-unregistered-coa)) — awaiting confirmation |
| 8 | Section `COMM00` (4,174 rows) | — | **closed: out of MVP scope** |

---

## 8. Board corrections required

[VEGA-Board.drawio.svg](VEGA-Board.drawio.svg) is the corrected board generated from this document.
[VEGA-Board.drawio.svg](VEGA-Board.drawio.svg) is the **old** export and is now stale. A rendered
drawio SVG cannot be patched in place, because its embedded `mxfile` XML and its drawn geometry
are separate artefacts. Re-export from the `.drawio` source when a picture is needed.

**Wrong on the old board (fixed):**

| On the old board | Correct value |
|---|---|
| `241 kode COA` / `cocok di seluruh 241 baris` | 240 data rows, 238 distinct codes; the `G == Σ12` check holds 240/240 |
| `jumlah seluruh baris rincian kolom G = 0` | −67,370.88 |
| `Debits (konversi)` / `Credits (konversi)` | headers read `Debits` / `Credits`, identical to L/M — the "(konversi)" label does not exist in the file |
| `model — opsional, 2–4 segmen` | `CORE` has max 3 segments; the model segment is `IAB`-only, out of scope — removed |
| Dashboard `772001001` actual `2,22` | **3.60** (4 rows: +2.2473 −0.0308 +1.3966 −0.0149) → variance 461.75 and projection 43.20 |
| GL panel says `2,25`, dashboard says `2,22` for the same row | the row is 2.2473 — the old board disagreed with itself |
| `toleransi ±5%` | zero tolerance |

**Missing on the old board (added):** the row-5 band rule
([§2.2](#22-locating-the-budget-columns--the-critical-rule)); the L/M vs N/O header collision
([§3.2](#32-column-map--read-by-position-not-by-name)); 9 subtotal rows with 3 numeric column-A
values ([§2.4](#24-row-classification)); mixed column-A types; only 19 of 240 rows non-zero; the
two duplicate codes; the `#DIV/0!` junk row; the ten section-less rows; per-row exchange-rate
variation; depreciation budget existing only at subtotal level; the negative budget inverting
status ([§5.3](#53-negative-budget)); `771502000` having an FY budget but zero in June.

**Removed (out of scope):** the `COMM00` question, the `model` segment, and the cross-sheet
"29-30 May" argument (true for `IAB`/`OCBID`, but all 4,951 `CORE` rows are June; the
period-less row 4953 is the in-scope justification for trusting `Pd.` instead).

**Correct and verified, carried over unchanged:** sheet `MIS (FC)`; header row 6, data row 7; 79
columns; columns A/B/C/G/BD/BE/BF/BO; every sample budget figure; the `G = Σ 12 months` rule;
sheet `CORE` with header row 1 and 4,951 rows; all `Pd. 03`; the IDR 4,680 / USD 243 / JPY 28 mix;
entity constant `A7744`; `MIS000` = 63 rows; 9 unmatched rows across 2 codes; `770701000` =
210,740.00 − 13,839.10 = 196,900.90 and its full dashboard row including the 2,362,810.80
projection; `months_loaded = 1`; `variance = budget − actual`; undefined percentage at zero budget.

---

## 9. Downstream changes

**Status: every [Flowchart.md](Flowchart.md) row below is applied.** They are kept here as the
record of what changed and why. The two source-file rows are Phase 3 and Phase 5 work and are
still outstanding; no feature code exists yet.

| Document | Change |
|---|---|
| [Flowchart.md](Flowchart.md) §2 | verification total: replace "compare against the Excel's own total" with the per-row `G == Σ12` check |
| [Flowchart.md](Flowchart.md) §7 rule 2, §3 stage 7, Diagram 1 | period comes from `Pd.`, not from transaction dates |
| [Flowchart.md](Flowchart.md) §8 | remove "negative amount" as a rejection reason; change unknown-COA from reject-file to ingest-and-report |
| [Flowchart.md](Flowchart.md) §2 | add mixed currency and the converted-column rule |
| [Flowchart.md](Flowchart.md) §11 | drop the stale open items (sample files delivered; annual-vs-monthly answered) |
| [Flowchart.md](Flowchart.md) | account number is 3 segments in scope, not "3 segments" as an unqualified claim |
| `backend/app/analytics.py` | zero-tolerance status, `ALOKASI` for negative budget, `—` percentage at zero budget |
| `backend/app/fiscal.py` | `Pd.` → month mapping, April-start |
