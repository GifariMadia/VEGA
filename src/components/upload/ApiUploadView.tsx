import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react';
import { ApiError, api } from '../../lib/api';

interface PreviewData {
  preview_id: string | null;
  kind: 'BUDGET' | 'GL';
  sheet_read: string | null;
  fiscal_year: number | null;
  period: number | null;
  period_label: string;
  rows_read: number;
  rows_accepted: number;
  rows_rejected: number;
  rows_filtered: number;
  total_amount: string;
  sample_rows: Array<Record<string, string | number | null>>;
  warnings: Array<{ row?: number; issue: string }>;
  duplicates: Array<{ row: number; coa_code: string; issue: string }>;
  errors: Array<{ row?: number | null; issue: string; expected?: string }>;
  already_loaded: { exists: boolean; existing_batch: null | { filename: string; rows_imported: number; total_amount: string; uploaded_by: string; uploaded_at: string } };
}

interface ApiUploadViewProps {
  isAdmin: boolean;
  onSaved: () => Promise<void>;
}

export function ApiUploadView({ isAdmin, onSaved }: ApiUploadViewProps) {
  const [kind, setKind] = useState<'BUDGET' | 'GL'>('GL');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [replaceGate, setReplaceGate] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setPreview(null);
    setReplaceGate(false);
    setResult('');
    setError('');
  };

  const dropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const selected = event.dataTransfer.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(null);
    setReplaceGate(false);
    setResult('');
    setError('');
  };

  const inspect = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    setPreview(null);
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file);
    form.append('register_new_coas', 'true');
    try {
      const response = await api.request<PreviewData>('/uploads/preview', { method: 'POST', body: form });
      setPreview({ ...response.data, errors: response.errors ?? response.data.errors ?? [] });
      setResult('');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'File tidak dapat diperiksa.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision: 'CONFIRM' | 'REPLACE' | 'CANCEL') => {
    if (!preview?.preview_id) return;
    if (decision === 'CONFIRM' && preview.already_loaded.exists) {
      setReplaceGate(true);
      return;
    }
    if (decision === 'REPLACE' && !window.confirm(`Ganti data ${preview.period_label} yang sudah tersimpan? Jika simpan gagal, perubahan akan dibatalkan.`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await api.request<{ batch_id?: number; rows_imported?: number; total_amount?: string }>('/uploads/confirm', { method: 'POST', body: JSON.stringify({ preview_id: preview.preview_id, decision }) });
      if (decision === 'CANCEL') {
        setResult('Preview dibatalkan. Tidak ada data yang disimpan.');
      } else {
        setResult(`Unggahan berhasil: ${response.data.rows_imported} baris · ${response.data.total_amount} · batch ${response.data.batch_id}.`);
        await onSaved();
      }
      setPreview(null);
      setReplaceGate(false);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Keputusan unggahan gagal.');
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) return <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Fungsi unggah hanya tersedia untuk Administrator.</p>;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 pb-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-extrabold text-slate-900">Unggah Data Anggaran &amp; GL</h1>
        <p className="mt-1 text-xs text-slate-500">Validasi dan pratinjau dilakukan sebelum data disimpan.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 shadow-sm">
        <span className="flex items-center gap-2 text-[#1E5EFF]"><span className="grid size-6 place-items-center rounded-full bg-[#1E5EFF] text-[11px] text-white">1</span>Pilih &amp; validasi data</span>
        <span className="h-px w-8 bg-slate-300" />
        <span className={`flex items-center gap-2 ${preview?.preview_id ? 'text-[#1E5EFF]' : ''}`}><span className={`grid size-6 place-items-center rounded-full text-[11px] ${preview?.preview_id ? 'bg-[#1E5EFF] text-white' : 'bg-slate-100 text-slate-500'}`}>2</span>Pratinjau</span>
        <span className="h-px w-8 bg-slate-300" />
        <span className={`flex items-center gap-2 ${result ? 'text-emerald-700' : ''}`}><span className={`grid size-6 place-items-center rounded-full text-[11px] ${result ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>3</span>Status penyimpanan</span>
      </div>
      {result && <p aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{result}</p>}
      {error && <p aria-live="polite" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {[{ value: 'BUDGET', label: 'Budget (Tahunan)', desc: 'Alokasi anggaran awal untuk satu fiscal year.' }, { value: 'GL', label: 'General Ledger (Bulanan)', desc: 'Realisasi aktual untuk satu periode bulanan.' }].map((option) => <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition ${kind === option.value ? 'border-[#1E5EFF] ring-1 ring-blue-100' : 'border-slate-200/80'}`} key={option.value}>
          <input checked={kind === option.value} className="mt-1 size-4 accent-blue-700" name="upload-kind" onChange={() => { setKind(option.value as 'BUDGET' | 'GL'); setPreview(null); }} type="radio" />
          <span><span className={`block text-sm font-bold ${kind === option.value ? 'text-[#1E5EFF]' : 'text-slate-800'}`}>{option.label}</span><span className="mt-1 block text-xs text-slate-500">{option.desc}</span></span>
        </label>)}
      </div>

      {kind === 'GL' && <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">COA baru otomatis didaftarkan saat upload dikonfirmasi. Budget tetap 0 sampai tersedia pada unggahan Budget.</p>}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-3 text-xs font-bold text-slate-700">Pilih berkas sumber</div>
        <div className="group rounded-2xl border-2 border-dashed border-blue-300 bg-slate-50/70 px-4 py-8 text-center transition hover:border-[#1E5EFF] hover:bg-blue-50/40" onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
          <FileSpreadsheet className="mx-auto mb-3 text-[#1E5EFF]" size={28} />
          <label className="cursor-pointer text-sm font-semibold text-slate-700" htmlFor="api-upload-file">Seret file Excel ke sini atau klik untuk memilih</label>
          <input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" id="api-upload-file" onChange={chooseFile} ref={fileInput} type="file" />
          {file && <p className="mx-auto mt-3 w-fit rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
        <button className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#1E5EFF] px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!file || busy} onClick={() => void inspect()} type="button">
          {busy ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />} Baca &amp; validasi
        </button>
      </div>

      {preview && !preview.preview_id && <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-red-800"><AlertTriangle size={18} /> File ditolak</h2>
        <p className="mt-1 text-sm text-slate-600">Tidak ada data yang disimpan. Data sebelumnya tidak berubah.</p>
        <ul className="mt-4 divide-y divide-slate-100">{preview.errors.map((item, index) => <li className="py-3 text-sm" key={`${item.row}-${index}`}><span className="font-semibold text-slate-800">{item.row ? `Baris ${item.row}: ` : ''}{item.issue}</span>{item.expected && <span className="mt-1 block text-slate-500">Diharapkan: {item.expected}</span>}</li>)}</ul>
      </section>}

      {preview?.preview_id && !replaceGate && <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FileSpreadsheet className="text-blue-700" size={19} /> Pratinjau · FY{String(preview.fiscal_year).slice(-2)} · {preview.period_label}</h2>
        <p className="text-sm text-slate-500">Sheet {preview.sheet_read} · {preview.rows_read} dibaca · {preview.rows_accepted} diterima · {preview.rows_rejected} ditolak · {preview.rows_filtered} di luar cakupan</p>
        <p className="text-2xl font-bold tabular-nums text-slate-900">{preview.total_amount}</p>
        {preview.already_loaded.exists && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Periode sudah memiliki unggahan aktif. Pratinjau dulu; langkah berikutnya meminta keputusan penggantian terpisah.</p>}
        {preview.errors.length > 0 && <ul className="space-y-1 text-sm text-red-700">{preview.errors.map((item, index) => <li key={index}>{item.row ? `Baris ${item.row}: ` : ''}{item.issue}</li>)}</ul>}
        {preview.warnings.map((item, index) => <p className="text-xs text-amber-700" key={index}>{item.row ? `Baris ${item.row}: ` : ''}{item.issue}</p>)}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button className="h-10 rounded-xl bg-[#1E5EFF] px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || preview.errors.length > 0} onClick={() => void decide('CONFIRM')} type="button">{preview.already_loaded.exists ? 'Lanjut ke keputusan ganti' : 'Konfirmasi & simpan'}</button>
          <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={busy} onClick={() => void decide('CANCEL')} type="button">Batalkan pratinjau</button>
        </div>
      </section>}

      {replaceGate && preview?.preview_id && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-950">Ganti data {preview.period_label}?</h2>
        <p className="mt-2 text-sm text-amber-900">Tersimpan: {preview.already_loaded.existing_batch?.filename} · {preview.already_loaded.existing_batch?.rows_imported} baris · {preview.already_loaded.existing_batch?.total_amount} · oleh {preview.already_loaded.existing_batch?.uploaded_by}.</p>
        <div className="mt-4 flex gap-2">
          <button className="h-10 rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800" disabled={busy} onClick={() => void decide('REPLACE')} type="button">Ganti data</button>
          <button className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700" disabled={busy} onClick={() => void decide('CANCEL')} type="button">Batalkan</button>
        </div>
      </section>}
      {(preview?.duplicates ?? []).map((item, index) => <p className="text-xs text-amber-700" key={index}>{item.issue}: {item.coa_code}, baris {item.row}</p>)}
      {preview?.preview_id && preview.sample_rows.length > 0 && <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{Object.keys(preview.sample_rows[0]).map((key) => <th className="px-3 py-2 font-semibold" key={key}>{key}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{preview.sample_rows.slice(0, 5).map((row, index) => <tr key={index}>{Object.values(row).map((value, cell) => <td className="max-w-56 truncate px-3 py-2" key={cell}>{value === null ? '—' : String(value)}</td>)}</tr>)}</tbody></table></div>}
    </section>
  );
}
