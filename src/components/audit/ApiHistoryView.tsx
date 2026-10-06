import { useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { ApiError, api, type UploadBatch } from '../../lib/api';

interface ApiHistoryViewProps {
  isAdmin: boolean;
  refreshKey: string;
  onChanged: () => Promise<void>;
}

export function ApiHistoryView({ isAdmin, refreshKey, onChanged }: ApiHistoryViewProps) {
  const [items, setItems] = useState<UploadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await api.request<{ items: UploadBatch[] }>(`/uploads/batches?page=${page}&page_size=100`);
      setItems(response.data.items);
      setError('');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal memuat riwayat unggahan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [refreshKey, page]);

  const cancel = async (batch: UploadBatch) => {
    const confirmed = window.confirm(`Batalkan ${batch.filename}? Data batch ini akan dihapus. Versi yang pernah diganti tidak dipulihkan.`);
    if (!confirmed) return;
    setBusyId(batch.id);
    try {
      await api.request(`/uploads/batches/${batch.id}/cancel`, { method: 'POST' });
      await refresh();
      await onChanged();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unggahan tidak dapat dibatalkan.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 pb-12">
      <div className="flex items-center justify-end gap-3 text-xs text-slate-600">
        <span>Halaman {page}</span>
        <button className="rounded border px-3 py-2 disabled:opacity-40" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</button>
        <button className="rounded border px-3 py-2 disabled:opacity-40" disabled={loading || items.length < 100} onClick={() => setPage(page + 1)}>Berikutnya</button>
      </div>
      <div className="flex items-end justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div><h1 className="text-lg font-extrabold text-slate-900">Riwayat Unggahan</h1><p className="mt-1 text-xs text-slate-500">Setiap versi tersimpan dan statusnya dapat ditelusuri.</p></div>
        <button aria-label="Muat ulang riwayat" className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => void refresh()} title="Muat ulang"><RefreshCw size={16} /></button>
      </div>
      {error && <p aria-live="polite" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Jenis / periode</th><th className="px-4 py-3">Nama file</th><th className="px-4 py-3">Baris</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th>{isAdmin && <th className="px-4 py-3">Aksi</th>}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => <tr key={item.id}>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{new Date(item.uploaded_at).toLocaleString()}</td>
              <td className="whitespace-nowrap px-4 py-3">{item.kind} · FY{String(item.fiscal_year).slice(-2)} · {item.period_label}</td>
              <td className="max-w-64 truncate px-4 py-3 font-medium">{item.filename}<span className="mt-1 block text-xs font-normal text-slate-500">{item.uploaded_by}</span></td>
              <td className="px-4 py-3 tabular-nums">{item.rows_imported}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums">{item.total_amount}</td>
              <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.status}</span></td>
              {isAdmin && <td className="px-4 py-3">{item.status !== 'CANCELLED' && <button aria-label={`Batalkan ${item.filename}`} className="inline-grid size-8 place-items-center rounded text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={busyId === item.id} onClick={() => void cancel(item)} title="Batalkan unggahan"><Trash2 size={15} /></button>}</td>}
            </tr>)}
            {!loading && items.length === 0 && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={isAdmin ? 7 : 6}>Belum ada riwayat unggahan.</td></tr>}
            {loading && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={isAdmin ? 7 : 6}>Memuat riwayat...</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
