# VEGA demo script

For the live walkthrough at Gate 2 (5–6 September 2026). Written for whoever is driving the laptop, not for the client.

The whole demo runs on fixtures. Nothing here touches a database, and no figure on any screen has been checked against the client's own Excel pivot yet. Say that once, early, and then stop apologising for it — the point of this demo is the shape of the product, not the numbers in it.

## Before anyone sits down

```bash
cd frontend
npm run build && npm run preview     # http://localhost:4173
```

`npm run dev` works too, but preview serves the built bundle, which is what the host PC will actually run and which will not reload the page in the middle of a sentence.

Open the browser, sign in once, and leave the Dashboard on screen. The login form accepts any username and password, so use `siti.rahayu` and anything at all. Signing in as that name matters only because the audit trail and the stored periods show it as the uploader.

Check before the client arrives:

- the Dashboard shows **data sampai Agu 2026**, five months of GL
- the language switch in the top right flips every label (ID / EN)
- both template links download a file rather than doing nothing

## The order to walk through

### 1. Dashboard

Start here and stay a while. It is the screen the client asked for.

Four KPI cards across the top: annual budget, actual to date, the gap, and the number of accounts over budget. The fourth card is the one worth pointing at, because it is a count with a denominator (6 / 18) beside three rupiah figures, and it is what FR-43 asked for.

Have an answer ready for that denominator. The card says 18 and the table at the bottom counts 19. The missing one is `772502000 Internal cost allocation(Expense)`, whose monthly budget is negative: it is an allocation, it carries the `ALOKASI` badge, and it is excluded from the over/under comparison by design rather than dropped by accident. Anyone who reads both numbers in the same glance will ask.

Then the chart. It opens on **Per Kategori**. Press **Tren Kuartal** and the same card becomes the quarterly view: Q1 whole, Q2 marked *sebagian* because only two of its three months have arrived, Q3 and Q4 reading *belum ada data* rather than zero. That distinction is deliberate and worth one sentence: an empty quarter is a file that has not arrived, not a quarter with no spending.

Beside the chart, the year-end projection. It divides by the five months that actually carry GL data, not by calendar months, and the amber note underneath says what is left per month to stay inside the budget.

Then the account table at the bottom. Every account, sorted by the largest deviation. Two things to show:

- the search box filters the arithmetic, not just the rows: the KPI cards above follow it
- the badges — `DARI GL` on an account the GL registered by itself, `TANPA SEKSI` on an account whose GL number carries no section and which is in scope because its code sits in the budget master, and `ALOKASI` on a negative monthly budget, which is an allocation and is left out of the over/under comparison entirely

The account codes and names are the department's own, read out of their workbooks, so they should recognise every line. The two `DARI GL` rows are the depreciation accounts, which really do have no budget line of their own. The amounts beside them are not theirs and are not to scale.

Over budget is rose, under budget is amber. If the client asks why under budget is not grey or green: being under budget on an IT line usually means a project has not started, which is information, not good news.

### 2. Matriks Bulanan

Twelve columns, one row per account. Months with no file show `—`, never `0`. Same reason as the empty quarter.

### 3. Unggah

The screen that carries the whole upload flow. There is no ingestion API yet, so the demo decides the outcome from the **name of the file you choose**. Nothing on screen says so, which is the point: a control that exists only to steer a demo does not belong in the product. Prepare the files below beforehand and keep them in one folder. They can be empty; only the names matter. On the machine this was rehearsed on they sit in `Documents\Ihsan_Presuniv\Intern\Intern Project\Demo-Files\`, outside the repository so they cannot be committed by accident. The sixth file is a `.pdf` and the sixth row below is the reason for it.

| File to choose | What the client sees |
|---|---|
| `GL September 2026.xlsx` | preview of a new period, then a normal commit |
| `GL Juni 2026.xlsx` | preview, then the replace decision, because June is already stored |
| `GL rusak.xlsx` | refused, with the reasons listed per row |
| `GL terbaru.xlsx` | refused, because the month cannot be read from the name and a period is never guessed |
| `Budget FY26.xlsx` | preview, replacing the stored budget |
| anything `.pdf` | refused on sight, naming the three accepted formats |

Walk it in this order:

1. **Jenis berkas.** Choose Budget, then GL, and let them see the template link change with it. Click it once — a real workbook downloads, with the sheet name, the header row and a couple of example rows already in place, plus a `PETUNJUK` sheet explaining what each column is for.
2. **Pilih berkas** with `GL September 2026.xlsx`, add a note in *Keperluan unggahan* (that note becomes the first entry in the batch's audit notes and cannot be edited afterwards), and press **Baca berkas**.
3. **The preview.** Read out the fact that nothing has been written yet. Rows read, accepted and rejected, the total, and five sample rows. Declining here writes nothing at all.
4. Confirm it. Then start again with `GL Juni 2026.xlsx` and let the replace decision appear: the stored batch is shown with its period, rows, total, uploader and time, and the choice is **Ganti data** or cancel. Replacement is never automatic.
5. Finish with `GL rusak.xlsx` so they see a refusal and its reason table.

Do not demonstrate **Hapus data** unless they ask. It empties a stored month and there is no undo.

### 4. Jejak Audit

Every batch appears here: recorded, replaced, refused and deleted alike. Open the refused row from step 5 and the same reason table is underneath it, written by the system rather than typed from memory by whoever uploaded the file. Open a replaced row and the version it replaced is readable underneath.

There is no action column on this screen, and that is deliberate: acting on a batch happens on the Upload screen, and the audit trail only records.

### 5. Daftar COA and 6. Pengguna

Short stops. The COA list is read-only on purpose — the account master is written by the budget upload and by GL auto-registration, and a wrong account is corrected by re-uploading a corrected file, never by editing it here.

Users is the one screen with create, edit and delete. If the supervisor asks where the CRUD requirement is satisfied, it is this screen and only this screen.

## Say these out loud, once each

- The accounts are theirs; the money is not. Codes, names and the MIS department come out of their own workbooks, but every rupiah on every screen is invented, and the shape across months most of all. Say this the first time they recognise an account name, because that is the moment they will start reading the figures as real.
- Login accepts anything today. Real authentication is backend work that starts 7 September.
- The upload screen accepts `.xls` and `.xlsm`, and nothing parses either yet. It no longer refuses them on sight, which is not the same as importing them. The reader library is still an open decision.
- The app is built for a desktop browser on the LAN. A phone screen is not supported, and the mobile version was dropped.

## If something goes wrong

Reloading the page resets everything, because nothing is stored anywhere. Any upload, deletion or note made during the demo disappears on refresh, which is a fine way out of a mistake and a bad way to lose your place mid-sentence.
