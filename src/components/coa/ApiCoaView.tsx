import { useEffect, useState, type FormEvent } from 'react';
import { Check, CirclePlus, Pencil, Search, X } from 'lucide-react';
import { ApiError, api, type CoaRecord } from '../../lib/api';

interface ApiCoaViewProps {
  isAdmin: boolean;
}

export function ApiCoaView({ isAdmin }: ApiCoaViewProps) {
  const [items, setItems] = useState<CoaRecord[]>([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CoaRecord | null>(null);
  const [form, setForm] = useState({ code: '', name: '', category: '' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), page_size: '100', ...(search.trim() && { search: search.trim() }) });
      if (!includeInactive) params.set('is_active', 'true');
      const result = await api.request<{ items: CoaRecord[]; total: number }>(`/coa?${params}`);
      setItems(result.data.items);
      setTotal(result.data.total);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Gagal memuat daftar COA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [search, includeInactive]);
  useEffect(() => { void refresh(); }, [search, includeInactive, page]);

  const startCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '', category: '' });
    setFormOpen(true);
    setMessage('');
  };

  const startEdit = (item: CoaRecord) => {
    setEditing(item);
    setForm({ code: item.code, name: item.name, category: item.category ?? '' });
    setFormOpen(true);
    setMessage('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await api.request<CoaRecord>(`/coa/${editing.id}`, { method: 'PUT', body: JSON.stringify({ name: form.name.trim(), category: form.category.trim() || null }) });
        setMessage('COA berhasil diperbarui.');
      } else {
        await api.request<CoaRecord>('/coa', { method: 'POST', body: JSON.stringify({ code: form.code.trim(), name: form.name.trim(), category: form.category.trim() || null }) });
        setMessage('COA berhasil ditambahkan.');
      }
      setFormOpen(false);
      setEditing(null);
      setForm({ code: '', name: '', category: '' });
      await refresh();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'COA tidak dapat disimpan.');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (item: CoaRecord) => {
    const action = item.is_active ? 'nonaktifkan' : 'aktifkan';
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} COA ${item.code}?`)) return;
    try {
      await api.request<CoaRecord>(`/coa/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: !item.is_active }) });
      await refresh();
      setMessage(`Status COA ${item.code} diperbarui.`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Status COA tidak dapat diubah.');
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 pb-12">
      <div className="flex items-center justify-end gap-3 text-xs text-slate-600">
        <span>{total} COA · Halaman {page} / {Math.max(1, Math.ceil(total / 100))}</span>
        <button className="rounded border px-3 py-2 disabled:opacity-40" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</button>
        <button className="rounded border px-3 py-2 disabled:opacity-40" disabled={loading || page * 100 >= total} onClick={() => setPage(page + 1)}>Berikutnya</button>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><span className="text-[#1E5EFF]">COA</span> Master</h1>
          <p className="mt-1 text-xs text-slate-500">Cari, kelola, dan nonaktifkan kode akun.</p>
        </div>
        {isAdmin && <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#1E5EFF] px-3.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700" onClick={startCreate}><CirclePlus size={16} /> Tambah COA</button>}
      </div>

      {(error || message) && <p aria-live="polite" className={`rounded-2xl border px-4 py-3 text-xs ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || message}</p>}

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <label className="relative min-w-52 flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-medium outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]" onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode atau nama akun" value={search} />
        </label>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input checked={includeInactive} className="size-4 accent-[#1E5EFF]" onChange={(event) => setIncludeInactive(event.target.checked)} type="checkbox" />
          Tampilkan akun nonaktif
        </label>
      </div>

      {formOpen && (
        <form className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:grid-cols-4" onSubmit={submit}>
          {!editing && <label className="text-xs font-semibold text-slate-600">Kode COA<input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" maxLength={9} minLength={9} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} pattern="[0-9]{9}" required value={form.code} /></label>}
          <label className="text-xs font-semibold text-slate-600">Nama akun<input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" maxLength={255} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} /></label>
          <label className="text-xs font-semibold text-slate-600">Kategori<input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" maxLength={120} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} value={form.category} /></label>
          <div className="flex items-end gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit"><Check size={16} /> Simpan</button>
            <button aria-label="Tutup formulir" className="grid size-10 place-items-center rounded-md border border-slate-300 text-slate-600" onClick={() => { setFormOpen(false); setEditing(null); setForm({ code: '', name: '', category: '' }); }} type="button"><X size={17} /></button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Kode</th><th className="px-4 py-3">Nama akun</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Status</th>{isAdmin && <th className="px-4 py-3">Aksi</th>}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => <tr key={item.id}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">{item.code}</td>
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3 text-slate-600">{item.category || '—'}</td>
                <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs font-semibold ${item.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{item.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                {isAdmin && <td className="whitespace-nowrap px-4 py-3"><button aria-label={`Ubah ${item.code}`} className="mr-2 inline-grid size-8 place-items-center rounded text-slate-500 hover:bg-slate-100" onClick={() => startEdit(item)} title="Ubah"><Pencil size={15} /></button><button className="text-xs font-semibold text-blue-700 hover:underline" onClick={() => void changeStatus(item)}>{item.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></td>}
              </tr>)}
              {!loading && items.length === 0 && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={isAdmin ? 5 : 4}>Tidak ada COA yang cocok.</td></tr>}
              {loading && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={isAdmin ? 5 : 4}>Memuat COA...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
