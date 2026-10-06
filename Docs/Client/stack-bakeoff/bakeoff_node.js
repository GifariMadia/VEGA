// Opsi B — read the GL with ExcelJS.
//
// Identical task to bakeoff_python.py: read the budget master, read GL sheet CORE,
// apply the two-clause row filter, sum converted debit minus credit.
//
//     node bakeoff_node.js <source-dir> [--detail] [--out FILE.csv|FILE.json]
const fs = require('fs');
const ExcelJS = require('exceljs');

const SRC = process.argv[2];
const DETAIL = process.argv.includes('--detail');
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
const t0 = Date.now();

// ExcelJS returns objects for non-plain cells. openpyxl(data_only=True) needs no equivalent.
function plain(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    if ('error' in v) return v.error;                              // '#DIV/0!'
    if ('result' in v) return v.result;                            // formula cell
    if ('richText' in v) return v.richText.map(t => t.text).join('');
    if ('text' in v) return v.text;                                // hyperlink
  }
  return v;
}

const fmt = n => n.toFixed(2);
const pad = (s, n) => String(s).slice(0, n).padEnd(n);

(async () => {
  // --- 1. budget master -> set of COA codes ---
  const bw = new ExcelJS.Workbook();
  await bw.xlsx.readFile(`${SRC}/Budget Dummy.xlsx`);
  const budgetCoa = new Set();
  bw.getWorksheet('MIS (FC)').eachRow((row, n) => {
    if (n < 7) return;
    const desc = plain(row.getCell(2).value);                      // columns are 1-indexed
    if (!desc || String(desc).toUpperCase().includes('TOTAL')) return;
    const code = String(plain(row.getCell(1).value) ?? '').trim();
    if (/^\d{9}$/.test(code)) budgetCoa.add(code);
  });

  // --- 2. GL sheet CORE ---
  const gw = new ExcelJS.Workbook();
  await gw.xlsx.readFile(`${SRC}/GL Dummy.xlsx`);                   // loads all 4 sheets into memory
  const gs = gw.getWorksheet('CORE');

  const hdr = [12, 13, 14, 15].map(i => plain(gs.getRow(1).getCell(i).value));
  if (hdr.join(',') !== 'Debits,Credits,Debits,Credits') {
    console.error(`REJECT: unexpected header in columns L-O: ${hdr}`);
    process.exit(1);
  }

  const rows = [];
  let skipped = 0;
  gs.eachRow((row, n) => {                                          // eachRow skips blank rows
    if (n === 1) return;
    const acct = plain(row.getCell(4).value);
    const period = plain(row.getCell(1).value);
    if (!acct || !period) { skipped++; return; }                    // rules 1 & 2
    const parts = String(acct).split('-');
    let clause;
    if (parts.length === 3 && parts[2] === 'MIS000') clause = 'A';
    else if (parts.length === 2 && budgetCoa.has(parts[0])) clause = 'B';
    else return;
    const debit = plain(row.getCell(14).value) ?? 0;                // by index, never by header name
    const credit = plain(row.getCell(15).value) ?? 0;
    if (typeof debit !== 'number' || typeof credit !== 'number') {
      console.error(`REJECT: non-numeric amount at ${acct}`);       // rule 3
      process.exit(1);
    }
    rows.push({
      account: String(acct), coa: parts[0], description: String(plain(row.getCell(5).value) ?? ''),
      curr: String(plain(row.getCell(10).value) ?? ''), debit, credit,
      net: debit - credit, clause,                                  // raw; rounded only on output
    });
  });

  const elapsed = (Date.now() - t0) / 1000;
  const peakMb = process.memoryUsage().heapUsed / 1e6;
  const total = rows.reduce((s, x) => s + x.net, 0);                // round once, at the end
  const a = rows.filter(x => x.clause === 'A').length;
  const b = rows.length - a;

  // --- 3. output ---
  console.log(`node/exceljs    | clause_a=${a} clause_b=${b} total_rows=${rows.length} | ` +
    `sum_usd=${fmt(total)} | skipped=${skipped} | ${elapsed.toFixed(2)}s | peak heap ${peakMb.toFixed(0)} MB`);

  if (DETAIL) {
    for (const [clause, title] of [['A', '3 segments, section MIS000'], ['B', '2 segments, COA in budget master']]) {
      const hits = rows.filter(x => x.clause === clause);
      console.log(`\nCLAUSE ${clause} - ${title}  (${hits.length} rows)`);
      for (const x of hits) {
        console.log(`  ${pad(x.account, 26)} ${pad(x.description, 34)} ${pad(x.curr, 4)} ` +
          x.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(12));
      }
    }
    console.log(`\nSUBTOTAL PER COA`);
    const subtotal = {};
    for (const x of rows) subtotal[x.coa] = (subtotal[x.coa] ?? 0) + x.net;
    const money = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(14);
    for (const coa of Object.keys(subtotal).sort()) console.log(`  ${coa}  ${money(subtotal[coa])}`);
    console.log(`  ${pad('TOTAL', 9)}  ${money(total)}`);
    console.log(`\nSKIPPED: ${skipped} row(s) - no account number and/or no period`);
  }

  if (OUT) {
    // money is formatted to 2 dp here, on the way out, and nowhere earlier
    const outRows = rows.map(x => ({ ...x, debit: fmt(x.debit), credit: fmt(x.credit), net: fmt(x.net) }));
    if (OUT.endsWith('.json')) {
      fs.writeFileSync(OUT, JSON.stringify({
        engine: 'node/exceljs', seconds: Number(elapsed.toFixed(2)), peak_heap_mb: Math.round(peakMb),
        packages: 97, helper_lines: 14, total: fmt(total), skipped, rows: outRows,
      }, null, 1));
    } else {
      const body = outRows.map(x =>
        `${x.account},"${x.description.replace(/"/g, '""')}",${x.curr},${x.debit},${x.credit},${x.net},${x.clause}`);
      fs.writeFileSync(OUT, 'account,description,curr,debit,credit,net,clause\n' + body.join('\n') + '\n');
    }
    console.log(`wrote ${OUT}`);
  }
})();
