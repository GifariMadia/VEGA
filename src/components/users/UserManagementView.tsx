import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  Edit3, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  X,
  Check,
  Lock,
  Mail,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole } from '../../types';

export const UserManagementView: React.FC = () => {
  const { 
    users, 
    currentUser, 
    isAdmin, 
    updateUser, 
    resetUserPassword, 
    addUser, 
    t,
    language
  } = useAuth();

  // Modals state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [resettingUser, setResettingUser] = useState<UserProfile | null>(null);
  const [tempPassword, setTempPassword] = useState('TempPass@2026');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // New user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Viewer');
  const [newDept, setNewDept] = useState('Application & Development');

  // If not admin, block view
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          {language === 'ID' ? 'Akses Terbatas' : 'Access Restricted'}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          {language === 'ID' 
            ? 'Tata Kelola Pengguna & Hak Akses dibatasi hanya untuk Administrator. Untuk mencoba modul ini, gunakan pengalih peran demo di header untuk beralih ke Administrator.' 
            : 'User & Access Governance is restricted to Administrators only. To test or explore this module, use the demo role switcher in the header to switch to Administrator.'}
        </p>
      </div>
    );
  }

  // Handle Edit User Submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUser(editingUser);
    setEditingUser(null);
  };

  // Handle Password Reset Submit
  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    resetUserPassword(resettingUser.id, tempPassword);
    setResetSuccessMessage(language === 'ID'
      ? `Kata sandi untuk ${resettingUser.username} berhasil di-reset menjadi "${tempPassword}"`
      : `Password for ${resettingUser.username} has been reset to "${tempPassword}"`);
    setTimeout(() => {
      setResetSuccessMessage(null);
      setResettingUser(null);
    }, 2000);
  };

  // Handle Add New User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim() || !newFullName.trim()) return;

    addUser({
      username: newUsername.trim(),
      fullName: newFullName.trim(),
      email: newEmail.trim(),
      role: newRole,
      status: 'Active',
      department: newDept,
    });

    setNewUsername('');
    setNewFullName('');
    setNewEmail('');
    setShowAddUserModal(false);
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header and Add User Button */}
      <div 
        id="user-mgmt-header"
        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1E5EFF]" />
            <span>{t.userMgmtTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.userMgmtSubtitle} • {language === 'ID' ? 'Sinkronisasi Identitas Supabase' : 'Supabase Identity Synchronization'}
          </p>
        </div>

        <button
          id="add-user-btn"
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E5EFF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.addUser}</span>
        </button>
      </div>

      {/* Users Table Card */}
      <div 
        id="users-table-container"
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">{t.colUsername}</th>
                <th className="py-3 px-4">{t.colFullName}</th>
                <th className="py-3 px-4">{t.colEmail}</th>
                <th className="py-3 px-4">{t.colRole}</th>
                <th className="py-3 px-4">{t.colStatus}</th>
                <th className="py-3 px-4">{t.colLastLogin}</th>
                <th className="py-3 px-4 text-right">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isCurrent = currentUser?.id === user.id;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{user.username}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-100 text-[#1E5EFF] px-1.5 py-0.2 rounded font-sans font-bold">
                            {language === 'ID' ? 'Anda' : 'You'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{user.fullName}</div>
                      <div className="text-[11px] text-slate-400">{user.department}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {user.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        user.role === 'Administrator'
                          ? 'bg-blue-50 text-[#1E5EFF] border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {user.role === 'Administrator'
                          ? (language === 'ID' ? 'Administrator' : 'Administrator')
                          : (language === 'ID' ? 'Pengamat (Viewer)' : 'Viewer')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        user.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {user.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {user.status === 'Active' 
                          ? (language === 'ID' ? 'Aktif' : 'Active') 
                          : (language === 'ID' ? 'Ditangguhkan' : 'Suspended')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {user.lastLogin}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`edit-user-btn-${user.id}`}
                          onClick={() => setEditingUser(user)}
                          className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition font-medium cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{t.btnEdit}</span>
                        </button>
                        <button
                          id={`reset-pwd-btn-${user.id}`}
                          onClick={() => {
                            setResettingUser(user);
                            setTempPassword(`TempPass@${Math.floor(1000 + Math.random() * 9000)}`);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition font-medium cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>{t.btnResetPwd}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {t.editUserModalTitle}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ID' ? 'Nama Lengkap' : 'Full Name'}</label>
                <input
                  type="text"
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ID' ? 'Peran Pengguna' : 'Assigned Role'}</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E5EFF] font-bold"
                >
                  <option value="Administrator">{language === 'ID' ? 'Administrator (Akses Penuh)' : 'Administrator (Full Access)'}</option>
                  <option value="Viewer">{language === 'ID' ? 'Viewer (Hanya Baca)' : 'Viewer (Read-Only)'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ID' ? 'Status Akun' : 'Account Status'}</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as 'Active' | 'Suspended' })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E5EFF] font-bold"
                >
                  <option value="Active">{language === 'ID' ? 'Aktif' : 'Active'}</option>
                  <option value="Suspended">{language === 'ID' ? 'Ditangguhkan (Diblokir dari Login)' : 'Suspended (Blocked from Login)'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ID' ? 'Departemen' : 'Department'}</label>
                <input
                  type="text"
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1E5EFF] hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1E5EFF] flex items-center justify-center mx-auto border border-blue-100">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-base text-slate-900">
              {t.resetPwdModalTitle}
            </h3>

            <p className="text-xs text-slate-500">
              {language === 'ID' 
                ? `Buat kata sandi sementara untuk ` 
                : `Generate a temporary password for `}
              <strong className="text-slate-800">{resettingUser.fullName}</strong> ({resettingUser.email}).
            </p>

            {resetSuccessMessage ? (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 text-xs font-bold animate-in zoom-in-95">
                ✓ {resetSuccessMessage}
              </div>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ID' ? 'Kata Sandi Sementara yang Dibuat' : 'Temporary Generated Password'}
                  </label>
                  <input
                    type="text"
                    required
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full p-2.5 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResettingUser(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#1E5EFF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    {t.confirmReset}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add New User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {t.addUser}
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.colUsername}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. analyst_sarah"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ID' ? 'Nama Lengkap' : 'Full Name'}</label>
                <input
                  type="text"
                  required
                  placeholder="Sarah Pratiwi"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ID' ? 'Email Korporat' : 'Work Email'}</label>
                <input
                  type="email"
                  required
                  placeholder="sarah.pratiwi@it-ops.vega.corp"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t.colRole}</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E5EFF] font-bold"
                >
                  <option value="Administrator">{language === 'ID' ? 'Administrator (Akses Penuh)' : 'Administrator (Full Access)'}</option>
                  <option value="Viewer">{language === 'ID' ? 'Viewer (Hanya Baca)' : 'Viewer (Read-Only)'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{language === 'ID' ? 'Departemen' : 'Department'}</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1E5EFF] hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  {language === 'ID' ? 'Buat Pengguna' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
