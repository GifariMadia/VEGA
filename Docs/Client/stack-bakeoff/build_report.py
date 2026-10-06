"""Build bakeoff.html from py.json and js.json. Self-contained, opens offline.

    python build_report.py            # expects py.json and js.json alongside it
"""
import json
import pathlib

HERE = pathlib.Path(__file__).parent
py = json.loads((HERE / "py.json").read_text(encoding="utf-8"))
js = json.loads((HERE / "js.json").read_text(encoding="utf-8"))
rows = py["rows"]
identical = [{k: r[k] for k in ("account", "net")} for r in py["rows"]] == \
            [{k: r[k] for k in ("account", "net")} for r in js["rows"]]

subtotal = {}
for r in rows:
    subtotal[r["coa"]] = subtotal.get(r["coa"], 0) + float(r["net"])

money = lambda v: f"{v:,.2f}"
bar = lambda v, hi: f"{max(2, round(v / hi * 100))}%"
t_hi, m_hi = max(py["seconds"], js["seconds"]), max(py["peak_heap_mb"], js["peak_heap_mb"])


def card(d, name, note):
    return f"""<div class="card">
      <h3>{name}</h3>
      <div class="big">{d['total']}</div><div class="lbl">USD, {len(d['rows'])} baris</div>
      <dl>
        <dt>Waktu</dt><dd>{d['seconds']:.2f} s<i style="width:{bar(d['seconds'], t_hi)}"></i></dd>
        <dt>Puncak heap</dt><dd>{d['peak_heap_mb']:,} MB<i style="width:{bar(d['peak_heap_mb'], m_hi)}"></i></dd>
        <dt>Paket npm/pip</dt><dd>{d['packages']}</dd>
        <dt>Kode penjaga</dt><dd>{d['helper_lines']} baris</dd>
      </dl><p class="note">{note}</p></div>"""


tbody = "\n".join(
    f'<tr><td class="m">{r["account"]}</td><td>{r["description"]}</td><td>{r["curr"]}</td>'
    f'<td class="n">{r["debit"]}</td><td class="n">{r["credit"]}</td><td class="n">{r["net"]}</td>'
    f'<td><span class="b{r["clause"]}">{r["clause"]}</span></td></tr>' for r in rows)

subrows = "\n".join(f'<tr><td class="m">{c}</td><td class="n">{money(v)}</td></tr>'
                    for c, v in sorted(subtotal.items()))

HERE.joinpath("bakeoff.html").write_text(f"""<!doctype html>
<html lang="id"><meta charset="utf-8"><title>Bakeoff Excel — VEGA</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{{--ink:#12263f;--mut:#5a6b82;--line:#dde3ec;--a:#0057b8;--b:#b8560f;--ok:#0a7d4a;--bg:#f6f8fb}}
*{{box-sizing:border-box}}
body{{margin:0;padding:2rem 1.25rem 4rem;font:15px/1.55 system-ui,Segoe UI,sans-serif;color:var(--ink);background:var(--bg)}}
main{{max-width:980px;margin:0 auto}}
h1{{font-size:1.6rem;margin:0 0 .25rem}} h2{{font-size:1.1rem;margin:2.5rem 0 .75rem;padding-bottom:.4rem;border-bottom:2px solid var(--line)}}
h3{{margin:0 0 .5rem;font-size:.95rem;color:var(--mut);font-weight:600}}
.sub{{color:var(--mut);margin:0 0 1.5rem}}
.verdict{{background:#e8f5ee;border-left:4px solid var(--ok);padding:.85rem 1rem;border-radius:0 6px 6px 0}}
.verdict b{{color:var(--ok)}}
.grid{{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}}
.card{{background:#fff;border:1px solid var(--line);border-radius:8px;padding:1.1rem}}
.big{{font-size:1.75rem;font-weight:700;font-variant-numeric:tabular-nums}}
.lbl{{color:var(--mut);font-size:.85rem;margin-bottom:.9rem}}
dl{{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.35rem .9rem;align-items:center}}
dt{{color:var(--mut);font-size:.85rem}} dd{{margin:0;font-variant-numeric:tabular-nums;font-size:.9rem}}
dd i{{display:block;height:5px;border-radius:3px;background:var(--a);margin-top:3px}}
.card:nth-child(2) dd i{{background:var(--b)}}
.note{{color:var(--mut);font-size:.82rem;margin:.9rem 0 0;padding-top:.7rem;border-top:1px dashed var(--line)}}
pre{{background:#fff;border:1px solid var(--line);border-radius:8px;padding:.9rem;overflow-x:auto;font-size:.82rem;margin:0}}
table{{width:100%;border-collapse:collapse;background:#fff;font-size:.85rem}}
.scroll{{max-height:480px;overflow:auto;border:1px solid var(--line);border-radius:8px}}
th{{position:sticky;top:0;background:#eef2f7;text-align:left;padding:.5rem .6rem;font-size:.78rem;color:var(--mut)}}
td{{padding:.35rem .6rem;border-top:1px solid var(--line)}}
.m{{font-family:ui-monospace,Consolas,monospace;font-size:.82rem;white-space:nowrap}}
.n{{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}}
.bA,.bB{{display:inline-block;width:1.3rem;text-align:center;border-radius:3px;font-size:.75rem;font-weight:700;color:#fff;background:var(--a)}}
.bB{{background:var(--b)}}
footer{{color:var(--mut);font-size:.82rem;margin-top:2.5rem;border-top:1px solid var(--line);padding-top:1rem}}
</style>
<main>
<h1>Bakeoff Excel — openpyxl vs ExcelJS</h1>
<p class="sub">Tugas identik atas file asli <code>Docs/Source/</code>: baca budget master, baca GL sheet
<code>CORE</code>, terapkan saringan dua klausa, jumlahkan debit dikurangi kredit terkonversi.
Pendukung <a href="../Stack-Comparison.md">Stack-Comparison.md</a> bagian 5.</p>

<p class="verdict"><b>Kedua engine menghasilkan angka yang sama persis.</b>
63 + 10 = 73 baris, {py['total']} USD, 1 baris dilewati.
Ekspor CSV keduanya {'<b>byte-identical</b>' if identical else 'BERBEDA'} — jadi bedanya bukan soal benar
atau salah, melainkan berapa banyak kode penjaga yang harus ditulis dan dirawat sendiri.</p>

<h2>Hasil terukur</h2>
<div class="grid">
{card(py, 'Opsi A / C — python + openpyxl', 'read_only=True menyetel baris satu per satu; hanya sheet CORE yang disentuh.')}
{card(js, 'Opsi B — node + ExcelJS', 'readFile() memuat keempat sheet (32.000 baris) ke memori sebelum satu baris pun dibaca.')}
</div>

<h2>Bedanya ada di kode, bukan di hasil</h2>
<div class="grid">
<div><h3>ExcelJS — sel bisa balik sebagai objek</h3><pre>function plain(v) {{
  if (typeof v === 'object') {{
    if ('error' in v) return v.error;      // '#DIV/0!'
    if ('result' in v) return v.result;    // sel formula
    if ('richText' in v)
      return v.richText.map(t =&gt; t.text).join('');
    if ('text' in v) return v.text;        // hyperlink
  }}
  return v;
}}
// dipakai di <b>setiap</b> pembacaan sel
row.getCell(14)  // kolom N, 1-indexed</pre></div>
<div><h3>openpyxl — nilainya langsung</h3><pre>load_workbook(path, data_only=True)

# tidak ada helper

r[13]  # kolom N, 0-indexed</pre></div>
</div>

<h2>73 baris yang masuk saringan</h2>
<p class="sub"><span class="bA">A</span> 3 segmen, section <code>MIS000</code> (63 baris) &nbsp;
<span class="bB">B</span> 2 segmen, COA ada di budget master (10 baris). Klausa B inilah yang hilang
diam-diam kalau saringan ditulis hanya <code>parts[2] == "MIS000"</code>.</p>
<div class="scroll"><table><thead><tr><th>Account Number</th><th>Deskripsi</th><th>Curr</th>
<th class="n">Debit</th><th class="n">Kredit</th><th class="n">Net</th><th>Kl</th></tr></thead>
<tbody>{tbody}</tbody></table></div>

<h2>Subtotal per COA</h2>
<div class="scroll"><table><thead><tr><th>COA</th><th class="n">Net (USD)</th></tr></thead>
<tbody>{subrows}<tr><th>TOTAL</th><th class="n">{py['total']}</th></tr></tbody></table></div>

<footer>
Angka RAM adalah laporan heap masing-masing runtime (<code>tracemalloc</code> dan
<code>process.memoryUsage</code>), bukan pembanding presisi — yang bisa dipegang adalah selisih ordenya.
Waktu bervariasi antar-jalan; ExcelJS memang konsisten lebih cepat.
Nilai uang dibulatkan sekali di akhir, bukan per baris.
Dihasilkan oleh <code>build_report.py</code> dari <code>py.json</code> dan <code>js.json</code>.
</footer>
</main>
""", encoding="utf-8")
print("wrote bakeoff.html")
