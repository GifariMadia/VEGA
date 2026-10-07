import React, { useState, useMemo, useEffect } from 'react';
import { 
  Layers, 
  Search, 
  CheckCircle2, 
  Info,
  X,
  Plus,
  AlertCircle,
  Check,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { CoaItem, CoaCategory, ITDepartment } from '../../types';

export const CoaListView: React.FC = () => {
  const { coaList, addNewCoa, selectedFiscalYear } = useData();
  const { t, isAdmin, language } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategory, selectedDepartment, selectedStatus, pageSize]);

  // Selected account for detail view modal
  const [activeDetailItem, setActiveDetailItem] = useState<CoaItem | null>(null);

  // Add New COA modal state (Req 9)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<CoaCategory>('Software');
  const [formDepartment, setFormDepartment] = useState<ITDepartment>('MIS Department');
  const [formRegisterSystem, setFormRegisterSystem] = useState<CoaItem['registerSystem']>('SAP ERP');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formInScope, setFormInScope] = useState(true);
  const [formDescription, setFormDescription] = useState('');
  const [formInitialBudget, setFormInitialBudget] = useState('');
  const today = new Date();
  const [formFiscalYear, setFormFiscalYear] = useState(Number(selectedFiscalYear.slice(2, 6)) || (today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1));
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const resetForm = () => {
    setFormCode('');
    setFormName('');
    setFormCategory('Software');
    setFormDepartment('MIS Department');
    setFormRegisterSystem('SAP ERP');
    setFormStatus('Active');
    setFormInScope(true);
    setFormDescription('');
    setFormInitialBudget('');
    setFormError(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setFormFiscalYear(Number(selectedFiscalYear.slice(2, 6)) || (today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1));
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formCode.trim().toUpperCase();
    const cleanName = formName.trim();

    if (!/^\d{9}$/.test(cleanCode)) {
      setFormError(language === 'ID' ? 'Kode COA harus 9 digit angka, sesuai kode akun pada file Excel.' : 'COA code must contain 9 digits matching the Excel account code.');
      return;
    }

    if (!cleanCode) {
      setFormError(language === 'ID' ? 'Nomor / Kode COA wajib diisi.' : 'COA Code is required.');
      return;
    }

    if (!cleanName) {
      setFormError(language === 'ID' ? 'Nama Akun COA wajib diisi.' : 'COA Account Name is required.');
      return;
    }

    // Check duplicate code
    const isDuplicate = coaList.some((c) => c.code.toUpperCase() === cleanCode);
    if (isDuplicate) {
      setFormError(
        language === 'ID'
          ? `Nomor COA "${cleanCode}" sudah terdaftar dalam sistem. Gunakan nomor akun yang unik.`
          : `COA code "${cleanCode}" already exists. Please use a unique code.`
      );
      return;
    }

    const initialBudgetNum = formInitialBudget.trim() ? Number(formInitialBudget) : undefined;
    if (initialBudgetNum !== undefined && (!Number.isFinite(initialBudgetNum) || initialBudgetNum < 0)) {
      setFormError(language === 'ID' ? 'Budget awal harus berupa angka nol atau positif.' : 'Initial Budget must be zero or positive.'); return;
    }

    const newCoaItem: CoaItem = {
      code: cleanCode,
      accountName: cleanName,
      category: formCategory,
      department: formDepartment,
      registerSystem: formRegisterSystem,
      status: formStatus,
      description: formDescription.trim() || (language === 'ID' ? `${cleanName} terdaftar pada Master COA TI.` : `${cleanName} registered in IT Master COA.`),
      inScope: formInScope,
      fiscalYear: formFiscalYear,
    };

    const res = await addNewCoa(newCoaItem, initialBudgetNum);

    if (!res.success) {
      setFormError(res.message);
      return;
    }

    // Show success notification and highlight the added COA
    setSuccessToast(
      language === 'ID'
        ? `COA ${cleanCode} berhasil didaftarkan ke Master COA dan langsung aktif di seluruh sistem.`
        : `COA ${cleanCode} successfully registered to Master COA and active system-wide.`
    );
    setTimeout(() => setSuccessToast(null), 6000);
    setIsAddModalOpen(false);
    resetForm();
    // Filter to new COA so user immediately sees it in the table
    setSearchQuery(cleanCode);
  };

  const filteredCoa = useMemo(() => {
    return coaList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchCode = item.code.toLowerCase().includes(q);
        const matchName = item.accountName.toLowerCase().includes(q);
        const matchSystem = item.registerSystem.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchSystem && !matchDesc) return false;
      }
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (selectedDepartment !== 'All' && item.department !== selectedDepartment) return false;
      if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
      return true;
    });
  }, [coaList, searchQuery, selectedCategory, selectedDepartment, selectedStatus]);

  const pageCount = Math.max(1, Math.ceil(filteredCoa.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount);
  const pageStart = (visiblePage - 1) * pageSize;
  const paginatedCoa = filteredCoa.slice(pageStart, pageStart + pageSize);
  useEffect(() => { setCurrentPage(page => Math.min(page, pageCount)); }, [pageCount]);

  const getSystemBadgeColor = (sys: string) => {
    switch (sys) {
      case 'SAP ERP': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Oracle Financials': return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'ServiceNow': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Jira Asset': return 'bg-blue-50 text-[#1E5EFF] border-blue-200';
      default: return 'bg-purple-50 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div 
          id="coa-success-toast"
          className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button 
            onClick={() => setSuccessToast(null)}
            className="text-emerald-100 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header and Filter Card */}
      <div 
        id="coa-controls-card"
        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#1E5EFF]" />
              <span>{t.coaTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.coaSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              {filteredCoa.length} / {coaList.length} {language === 'ID' ? 'Akun' : 'Accounts'}
            </div>

            {/* Add New COA Button (Req 9) */}
            {isAdmin ? (
              <button
                id="add-new-coa-button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E5EFF] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition cursor-pointer"
                title={language === 'ID' ? 'Tambah nomor COA baru ke Master COA' : 'Add new COA code to Master COA'}
              >
                <Plus className="w-4 h-4" />
                <span>{t.addNewCoa || (language === 'ID' ? 'Tambah COA Baru' : 'Add New COA')}</span>
              </button>
            ) : (
              <div 
                className="text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl"
                title={language === 'ID' ? 'Ganti ke role Administrator pada header untuk menambah COA baru' : 'Switch to Administrator role in header to add new COA'}
              >
                {language === 'ID' ? 'Admin only: Tambah COA' : 'Admin only: Add COA'}
              </div>
            )}
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {language === 'ID' ? 'Cari Kode / Nama Akun' : 'Search Code / Account Name'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="coa-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.coaSearchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {t.filterCategory}
            </label>
            <select
              id="coa-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
            >
              <option value="All">{t.filterAll}</option>
              {(['Hardware', 'Software', 'Network', 'Consulting', 'Maintenance', 'Training', 'SGA', 'Operational', 'Other'] as CoaCategory[]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {t.filterDepartment}
            </label>
            <select
              id="coa-department-filter"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
            >
              <option value="All">{t.filterAll}</option>
              {(['MIS Department'] as ITDepartment[]).map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {language === 'ID' ? 'Status Akun' : 'Account Status'}
            </label>
            <select
              id="coa-status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
            >
              <option value="All">{language === 'ID' ? 'Semua Status' : 'All Status'}</option>
              <option value="Active">{t.statusActive}</option>
              <option value="Inactive">{t.statusInactive}</option>
            </select>
          </div>
        </div>
      </div>

      {/* COA Table Card */}
      <div 
        id="coa-table-container"
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 font-bold w-28">{t.tableCode}</th>
                <th className="py-3 px-4 font-bold">{t.tableAccount}</th>
                <th className="py-3 px-4 font-bold">{t.tableCategory}</th>
                <th className="py-3 px-4 font-bold">{t.tableDept}</th>
                <th className="py-3 px-4 font-bold">{t.registerSystem}</th>
                <th className="py-3 px-4 font-bold w-24">{language === 'ID' ? 'Status' : 'Status'}</th>
                <th className="py-3 px-4 font-bold text-right w-20">{language === 'ID' ? 'Rincian' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCoa.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    {language === 'ID' 
                      ? 'Tidak ada Chart of Accounts yang cocok dengan pencarian atau filter.' 
                      : 'No Chart of Accounts matching current search or filter.'}
                  </td>
                </tr>
              ) : (
                paginatedCoa.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {item.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {item.accountName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-sm">
                        {item.description}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.department}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getSystemBadgeColor(item.registerSystem)}`}>
                        {item.registerSystem}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        item.status === 'Active' 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                          : 'text-slate-600 bg-slate-100 border-slate-200'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {item.status === 'Active' 
                          ? (language === 'ID' ? 'Aktif' : 'Active') 
                          : (language === 'ID' ? 'Tidak Aktif' : 'Inactive')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        id={`coa-detail-btn-${item.code}`}
                        onClick={() => setActiveDetailItem(item)}
                        className="text-slate-400 hover:text-[#1E5EFF] p-1 rounded-md transition cursor-pointer"
                        title={language === 'ID' ? 'Lihat spesifikasi akun' : 'View account details'}
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span aria-live="polite">{filteredCoa.length ? pageStart + 1 : 0}–{Math.min(pageStart + pageSize, filteredCoa.length)} / {filteredCoa.length} {language === 'ID' ? 'akun' : 'accounts'}</span>
            <label className="flex items-center gap-2">
              {language === 'ID' ? 'Baris per halaman' : 'Rows per page'}
              <select value={pageSize} onChange={event => setPageSize(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                {[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>
          <nav aria-label={language === 'ID' ? 'Halaman daftar COA' : 'COA pagination'} className="flex items-center gap-3">
            <button type="button" disabled={visiblePage === 1} onClick={() => setCurrentPage(visiblePage - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">{language === 'ID' ? 'Sebelumnya' : 'Previous'}</button>
            <span>{language === 'ID' ? 'Halaman' : 'Page'} {visiblePage} / {pageCount}</span>
            <button type="button" disabled={visiblePage === pageCount} onClick={() => setCurrentPage(visiblePage + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">{language === 'ID' ? 'Berikutnya' : 'Next'}</button>
          </nav>
        </div>
      </div>

      {/* Add New COA Modal (Req 9) */}
      {isAddModalOpen && (
        <div 
          id="add-coa-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto"
        >
          <div 
            id="add-coa-modal-dialog"
            className="bg-white w-full max-w-xl rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E5EFF] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {t.addNewCoaModalTitle || 'Tambah Master Chart of Accounts (COA) Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t.addNewCoaModalSubtitle || 'Daftarkan nomor COA baru ke Master COA agar langsung dikenali oleh sistem'}
                  </p>
                </div>
              </div>
              <button
                id="close-add-coa-modal-btn"
                onClick={handleCloseAddModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div 
                id="add-coa-error-banner"
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 font-semibold"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* COA Code */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t.coaCodeLabel || 'Nomor / Kode COA'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="new-coa-code-input"
                    type="text"
                    required
                    pattern="[0-9]{9}"
                    maxLength={9}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder={language === 'ID' ? 'Contoh: 752201099' : 'e.g., 752201099'}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'ID' ? 'Gunakan kode COA 9 digit yang sama dengan file Excel.' : 'Use the same 9-digit COA code as the Excel file.'}
                  </p>
                </div>

                {/* Account Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t.coaAccountNameLabel || 'Nama Akun COA'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="new-coa-name-input"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={language === 'ID' ? 'Contoh: Cloud Security SIEM Automation' : 'e.g., Cloud Security SIEM Automation'}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t.coaCategoryLabel || 'Kategori Belanja'}
                  </label>
                  <select
                    id="new-coa-category-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CoaCategory)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                  >
                    {(['Hardware', 'Software', 'Network', 'Consulting', 'Maintenance', 'Training', 'SGA', 'Operational', 'Other'] as CoaCategory[]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Department (Fixed to MIS) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t.coaDeptLabel || 'Departemen'}
                  </label>
                  <div 
                    id="new-coa-department-fixed"
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-700 flex items-center justify-between"
                  >
                    <span>MIS Department</span>
                    <span className="text-[10px] font-semibold text-[#1E5EFF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      MIS Only
                    </span>
                  </div>
                </div>

                {/* Registered System */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t.coaSystemLabel || 'Sistem Registrasi ERP'}
                  </label>
                  <select
                    id="new-coa-system-select"
                    value={formRegisterSystem}
                    onChange={(e) => setFormRegisterSystem(e.target.value as CoaItem['registerSystem'])}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                  >
                    <option value="SAP ERP">SAP ERP</option>
                    <option value="Oracle Financials">Oracle Financials</option>
                    <option value="ServiceNow">ServiceNow</option>
                    <option value="Jira Asset">Jira Asset</option>
                    <option value="SAP Core GL">SAP Core GL</option>
                    <option value="Workday">Workday</option>
                  </select>
                </div>

                {/* Initial Budget (USD) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t.coaInitialBudgetLabel || 'Budget Anggaran Awal Tahunan (USD, Opsional)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      id="new-coa-budget-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formInitialBudget}
                      onChange={(e) => setFormInitialBudget(e.target.value)}
                      placeholder={language === 'ID' ? 'Contoh: 120000' : 'e.g., 120000'}
                      className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'ID' ? 'Akan dialokasikan rata ke 12 bulan fiskal' : 'Will be allocated evenly across 12 fiscal months'}
                  </p>
                  <label className="mt-2 block text-[11px] font-bold text-slate-700">
                    {language === 'ID' ? 'Tahun fiskal Budget awal' : 'Initial Budget fiscal year'}
                    <input type="number" min={2000} max={2200} required={formInitialBudget !== ''} value={formFiscalYear} onChange={event => setFormFiscalYear(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" />
                  </label>
                </div>
              </div>

              {/* Scope & Status Checkboxes */}
              <div className="flex items-center gap-6 pt-1 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="new-coa-inscope-checkbox"
                    type="checkbox"
                    checked={formInScope}
                    onChange={(e) => setFormInScope(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1E5EFF] focus:ring-[#1E5EFF]"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    {language === 'ID' ? 'Masuk Scope Anggaran TI / MIS' : 'In MIS / IT Budget Scope'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="new-coa-status-checkbox"
                    type="checkbox"
                    checked={formStatus === 'Active'}
                    onChange={(e) => setFormStatus(e.target.checked ? 'Active' : 'Inactive')}
                    className="w-4 h-4 rounded text-[#1E5EFF] focus:ring-[#1E5EFF]"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    {language === 'ID' ? 'Status Aktif (Active)' : 'Active Status'}
                  </span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t.coaDescLabel || 'Deskripsi & Ruang Lingkup Finansial'}
                </label>
                <textarea
                  id="new-coa-desc-input"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={language === 'ID' ? 'Jelaskan cakupan pengeluaran, vendor terkait, atau spesifikasi pos anggaran...' : 'Describe expenditure scope, vendors, or budget specifications...'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E5EFF]"
                />
              </div>

              {/* Info Note */}
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 flex items-start gap-2 text-[11px] text-blue-900">
                <ShieldCheck className="w-4 h-4 text-[#1E5EFF] shrink-0 mt-0.5" />
                <span>
                  {language === 'ID' 
                    ? 'COA yang didaftarkan akan disimpan ke Master COA dan otomatis dikenali oleh mesin validasi saat upload data anggaran maupun Monthly GL.'
                    : 'The registered COA will be stored in Master COA and automatically recognized during budget and Monthly GL data uploads.'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  id="cancel-add-coa-btn"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  {t.cancel || 'Batal'}
                </button>
                <button
                  type="submit"
                  id="submit-add-coa-btn"
                  className="px-5 py-2 bg-[#1E5EFF] text-white font-bold rounded-xl text-xs hover:bg-blue-700 shadow-xs transition cursor-pointer"
                >
                  {t.saveCoaBtn || 'Daftarkan COA ke Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COA Detail Modal */}
      {activeDetailItem && (
        <div 
          id="coa-detail-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div 
            id="coa-detail-modal-dialog"
            className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#1E5EFF] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                  {activeDetailItem.code}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 truncate max-w-[280px]">
                  {activeDetailItem.accountName}
                </h3>
              </div>
              <button
                id="close-coa-detail-modal-btn"
                onClick={() => setActiveDetailItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-bold block">{t.tableCategory}</span>
                  <span className="font-bold text-slate-800">{activeDetailItem.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">{t.tableDept}</span>
                  <span className="font-bold text-slate-800">{activeDetailItem.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">{t.registerSystem}</span>
                  <span className="font-bold text-slate-800">{activeDetailItem.registerSystem}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">{language === 'ID' ? 'Status Akun' : 'Account Status'}</span>
                  <span className="font-bold text-emerald-600">
                    {activeDetailItem.status === 'Active' 
                      ? (language === 'ID' ? 'Aktif' : 'Active') 
                      : (language === 'ID' ? 'Tidak Aktif' : 'Inactive')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">
                  {language === 'ID' ? 'Deskripsi & Ruang Lingkup Finansial:' : 'Financial Purpose & Scope:'}
                </span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-sans">
                  {activeDetailItem.description}
                </p>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-900">
                {language === 'ID'
                  ? 'Catatan: Akun ini aktif dalam sistem VEGA IT Financials dan dapat digunakan langsung untuk proses upload anggaran dan transaksi GL aktual.'
                  : 'Note: This account is active in VEGA IT Financials and can be directly used in budget uploads and actual GL transactions.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="dismiss-coa-detail-btn"
                onClick={() => setActiveDetailItem(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition cursor-pointer"
              >
                {language === 'ID' ? 'Tutup Rincian' : 'Close Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

