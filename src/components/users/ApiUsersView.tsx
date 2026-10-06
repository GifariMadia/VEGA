import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, Plus, RefreshCw, ShieldCheck, UserCheck, UserX, Pencil } from 'lucide-react';
import { ApiError, api, type UserProfile, type UserRole } from '../../lib/api';
import type { Language } from '../../types';

interface Props { currentUser: UserProfile; language: Language }

const roleLabel = (role: UserRole, id: boolean) => role === 'ADMIN' ? 'Administrator' : (id ? 'Viewer (hanya lihat)' : 'Viewer (read-only)');

export function ApiUsersView({ currentUser, language }: Props) {
  const id = language === 'ID';
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: '', full_name: '', role: 'USER' as UserRole, password: '' });

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await api.request<{ items: UserProfile[] }>('/users');
      setUsers(response.data.items);
      setError('');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : (id ? 'Gagal memuat daftar user.' : 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setNotice('');
    try {
      await action();
      setError('');
      setNotice(success);
      await refresh();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : (id ? 'Permintaan gagal.' : 'Request failed.'));
    } finally {
      setBusy(false);
    }
  };

  const update = (user: UserProfile, body: Record<string, unknown>, success: string) =>
    run(() => api.request(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify(body) }), success);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    await run(async () => {
      await api.request('/users', { method: 'POST', body: JSON.stringify(form) });
      setForm({ username: '', full_name: '', role: 'USER', password: '' });
    }, id ? 'User dibuat.' : 'User created.');
  };

  const resetPassword = (user: UserProfile) => {
    const password = window.prompt(id ? `Password baru untuk ${user.username} (12-72 byte, huruf besar/kecil, angka dan simbol):` : `New password for ${user.username} (12-72 bytes, upper/lowercase, digit and symbol):`);
    if (password) void update(user, { password }, id ? 'Password direset.' : 'Password reset.');
  };
  const editName = (user: UserProfile) => {
    const name = window.prompt(id ? `Nama lengkap untuk ${user.username}:` : `Full name for ${user.username}:`, user.full_name);
    if (name !== null) void update(user, { full_name: name }, id ? 'Nama diperbarui.' : 'Name updated.');
  };

  const input = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[#1E5EFF] focus:outline-none';

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 pb-12">
      <div className="flex items-end justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">{id ? 'Manajemen User' : 'User Management'}</h1>
          <p className="mt-1 text-xs text-slate-500">{id ? 'Dua role: Administrator (unggah, kelola user) dan Viewer (hanya melihat dashboard, COA, riwayat).' : 'Two roles: Administrator (upload, manage users) and Viewer (read-only dashboard, COA, history).'}</p>
        </div>
        <button aria-label={id ? 'Muat ulang' : 'Refresh'} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => void refresh()}><RefreshCw size={16} /></button>
      </div>

      {error && <p aria-live="polite" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}
      {notice && <p aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{notice}</p>}

      <form className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:grid-cols-5" onSubmit={(event) => void create(event)}>
        <label className="text-xs font-semibold text-slate-600">Username<input className={`${input} mt-1`} required minLength={3} pattern="[A-Za-z0-9._\-]+" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">{id ? 'Nama lengkap' : 'Full name'}<input className={`${input} mt-1`} required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">Role<select className={`${input} mt-1`} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}><option value="USER">{roleLabel('USER', id)}</option><option value="ADMIN">{roleLabel('ADMIN', id)}</option></select></label>
        <label className="text-xs font-semibold text-slate-600">Password<input autoComplete="new-password" className={`${input} mt-1`} required minLength={12} placeholder={id ? 'min. 12 karakter' : 'min. 12 characters'} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 self-end rounded-xl bg-[#1E5EFF] px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50" disabled={busy} type="submit"><Plus size={16} />{id ? 'Tambah user' : 'Add user'}</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Username</th><th className="px-4 py-3">{id ? 'Nama' : 'Name'}</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">{id ? 'Aksi' : 'Actions'}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const self = user.id === currentUser.id;
              return (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-mono text-xs">{user.username}{self && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{id ? 'Anda' : 'You'}</span>}</td>
                  <td className="px-4 py-3">{user.full_name}<button aria-label={`Ubah nama ${user.username}`} className="ml-2 rounded p-1 text-slate-500 hover:bg-slate-100" disabled={busy} onClick={() => editName(user)}><Pencil size={13} /></button></td>
                  <td className="px-4 py-3">
                    <select aria-label={`Role ${user.username}`} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs disabled:opacity-50" disabled={busy || self} value={user.role} onChange={(event) => void update(user, { role: event.target.value }, id ? 'Role diperbarui.' : 'Role updated.')}>
                      <option value="USER">{roleLabel('USER', id)}</option><option value="ADMIN">{roleLabel('ADMIN', id)}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.is_active ? (id ? 'Aktif' : 'Active') : (id ? 'Nonaktif' : 'Inactive')}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40" disabled={busy} onClick={() => resetPassword(user)}><KeyRound size={13} />{id ? 'Reset password' : 'Reset password'}</button>
                      <button className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40 ${user.is_active ? 'text-red-700' : 'text-emerald-700'}`} disabled={busy || self} onClick={() => void update(user, { is_active: !user.is_active }, user.is_active ? (id ? 'User dinonaktifkan.' : 'User deactivated.') : (id ? 'User diaktifkan.' : 'User reactivated.'))}>{user.is_active ? <UserX size={13} /> : <UserCheck size={13} />}{user.is_active ? (id ? 'Nonaktifkan' : 'Deactivate') : (id ? 'Aktifkan' : 'Reactivate')}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {loading && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={5}>{id ? 'Memuat...' : 'Loading...'}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck size={13} />{id ? 'Akun tidak dihapus agar riwayat tetap utuh; nonaktifkan untuk mencabut akses. Minimal satu administrator aktif selalu dipertahankan.' : 'Accounts are never deleted so history stays intact; deactivate to revoke access. At least one active administrator is always kept.'}</p>
    </section>
  );
}
