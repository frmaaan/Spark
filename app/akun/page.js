"use client";

import { useState, useEffect } from "react";
import { getAccounts, addAccount, deleteAccount, resetAccountPassword, updateAccountTeam } from "@/lib/actions/accountActions";
import { getTeams, addTeam } from "@/lib/actions/teamActions";
import { getTemplates, addTemplate, deleteTemplate } from "@/lib/actions/templateActions";
import { ShieldCheck, UserPlus, Trash2, Loader2, KeyRound, X, Plus, Pencil, Users, ClipboardList, Minus } from "lucide-react";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

export default function AkunPage() {
  const [accounts, setAccounts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // State untuk form tambah akun
  const [formData, setFormData] = useState({
    nama: "",
    username: "",
    password: "",
    role: "USER",
    teamId: "",
  });

  // State untuk form tambah tim
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);

  // State untuk edit tim akun (inline dropdown)
  const [editingTeamAccountId, setEditingTeamAccountId] = useState(null);
  const [editingTeamValue, setEditingTeamValue] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);

  // State untuk Reset Password Modal
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // State untuk template
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateItems, setTemplateItems] = useState([""]);
  const [addingTemplate, setAddingTemplate] = useState(false);

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: null, type: "account" });

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    const [accountsResult, teamsResult, templatesResult] = await Promise.all([
      getAccounts(),
      getTeams(),
      getTemplates()
    ]);
    if (accountsResult.success) setAccounts(accountsResult.data);
    if (teamsResult.success) setTeams(teamsResult.data);
    if (templatesResult.success) setTemplates(templatesResult.data);
    setLoading(false);
  }

  // ========== AKUN HANDLERS ==========
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    const data = new FormData();
    data.append("nama", formData.nama);
    data.append("username", formData.username);
    data.append("password", formData.password);
    data.append("role", formData.role);
    if (formData.teamId) data.append("teamId", formData.teamId);

    const result = await addAccount(data);
    
    if (result.success) {
      setAccounts((prev) => [result.data, ...prev]);
      setFormData({ nama: "", username: "", password: "", role: "USER", teamId: "" });
      setToast({ message: "Akun akses berhasil dibuat!", type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
    
    setSubmitting(false);
  }

  function openConfirmDelete(id, type = "account") {
    setConfirmState({ isOpen: true, id, type });
  }

  async function handleDeleteConfirm() {
    const { id, type } = confirmState;
    setConfirmState({ isOpen: false, id: null, type: "account" });
    if (!id) return;
    
    if (type === "template") {
      const result = await deleteTemplate(id);
      if (result.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setToast({ message: "Template berhasil dihapus", type: "success" });
      } else {
        setToast({ message: result.error, type: "error" });
      }
    } else {
      const result = await deleteAccount(id);
      if (result.success) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        setToast({ message: "Akun berhasil dihapus", type: "success" });
      } else {
        setToast({ message: result.error, type: "error" });
      }
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setToast({ message: "Password minimal 6 karakter", type: "error" });
      return;
    }

    setResetting(true);
    const result = await resetAccountPassword(resetModal.id, newPassword);
    
    if (result.success) {
      setToast({ message: "Password berhasil direset!", type: "success" });
      setResetModal(null);
      setNewPassword("");
    } else {
      setToast({ message: result.error, type: "error" });
    }
    setResetting(false);
  }

  // ========== TIM HANDLERS ==========
  async function handleAddTeam(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setAddingTeam(true);

    const result = await addTeam(newTeamName.trim());
    if (result.success) {
      setTeams((prev) => [...prev, result.data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setNewTeamName("");
      setToast({ message: `Tim "${result.data.nama}" berhasil dibuat!`, type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
    setAddingTeam(false);
  }

  function startEditTeam(account) {
    setEditingTeamAccountId(account.id);
    setEditingTeamValue(account.team?.id?.toString() || "");
  }

  async function saveEditTeam(accountId) {
    setSavingTeam(true);
    const teamId = editingTeamValue ? parseInt(editingTeamValue) : null;
    const result = await updateAccountTeam(accountId, teamId);
    
    if (result.success) {
      // Update state lokal
      setAccounts((prev) => prev.map((acc) => {
        if (acc.id === accountId) {
          const selectedTeam = teams.find(t => t.id === teamId);
          return { ...acc, team: selectedTeam || null };
        }
        return acc;
      }));
      setToast({ message: "Tim akun berhasil diperbarui!", type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
    setEditingTeamAccountId(null);
    setSavingTeam(false);
  }

  return (
    <div className="space-y-12 animate-fade-in-up relative">
      {/* PAGE HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-black border-[3px] border-black flex items-center justify-center flex-shrink-0 shadow-[4px_4px_0px_0px_#a1a1aa]">
          <ShieldCheck size={22} className="text-white" />
        </div>
        <div>
          <p className="brutal-label mb-0.5">ADMIN ONLY</p>
          <h1 className="text-2xl font-black text-black uppercase tracking-tight leading-tight">
            KELOLA AKUN LOGIN
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5 font-bold">
            Buat akun, atur tim, reset password
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI: FORM BUAT AKUN + FORM BUAT TIM */}
        <div className="lg:col-span-1 space-y-6">
          {/* FORM TAMBAH AKUN */}
          <form onSubmit={handleSubmit} className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#111827]">
            <div className="flex items-center gap-2 mb-6 border-b-[3px] border-black pb-2">
              <UserPlus size={18} />
              <h2 className="text-lg font-black uppercase">BUAT AKUN BARU</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="brutal-label block mb-2 text-xs">NAMA LENGKAP</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  required
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="brutal-label block mb-2 text-xs">USERNAME (Untuk Login)</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="Contoh: budi.s"
                  className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="brutal-label block mb-2 text-xs">PASSWORD</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="brutal-label block mb-2 text-xs">TIPE AKSES (ROLE)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer font-black"
                >
                  <option value="USER">USER BIASA</option>
                  <option value="ADMIN">ADMINISTRATOR</option>
                </select>
              </div>

              <div>
                <label className="brutal-label block mb-2 text-xs">TIM / DIVISI</label>
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer font-black"
                >
                  <option value="">— Tanpa Tim —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.nama}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 bg-primary hover:bg-primary-dark text-white border-[3px] border-black px-6 py-4 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-transform active:translate-y-[2px] active:translate-x-[2px] active:shadow-none shadow-[4px_4px_0px_0px_#111827] disabled:opacity-70"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                BUAT AKUN
              </button>
            </div>
          </form>

          {/* FORM TAMBAH TIM BARU */}
          <div className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#111827]">
            <div className="flex items-center gap-2 mb-4 border-b-[3px] border-black pb-2">
              <Users size={18} />
              <h2 className="text-base font-black uppercase">KELOLA TIM</h2>
            </div>

            <form onSubmit={handleAddTeam} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Nama tim baru..."
                  className="flex-1 min-w-0 bg-surface-light border-[3px] border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
                <button
                  type="submit"
                  disabled={addingTeam || !newTeamName.trim()}
                  className="bg-primary text-white border-[3px] border-black px-3 py-2.5 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#111827] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                >
                  {addingTeam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  BUAT
                </button>
              </div>
            </form>

            {/* Daftar tim */}
            {teams.length === 0 ? (
              <p className="text-xs text-zinc-400 italic text-center py-2">Belum ada tim</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <span key={t.id} className="bg-blue-100 text-blue-800 border-2 border-blue-300 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                    {t.nama}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* KELOLA TEMPLATE TODOLIST */}
          <div className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#111827]">
            <div className="flex items-center gap-2 mb-4 border-b-[3px] border-black pb-2">
              <ClipboardList size={18} />
              <h2 className="text-base font-black uppercase">TEMPLATE TODOLIST</h2>
            </div>

            {/* Form buat template */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const validItems = templateItems.filter(i => i.trim());
              if (!templateTitle.trim() || validItems.length === 0) return;
              setAddingTemplate(true);
              const result = await addTemplate(templateTitle.trim(), validItems);
              if (result.success) {
                setTemplates((prev) => [result.data, ...prev]);
                setTemplateTitle("");
                setTemplateItems([""]);
                setToast({ message: `Template "${result.data.title}" berhasil dibuat!`, type: "success" });
              } else {
                setToast({ message: result.error, type: "error" });
              }
              setAddingTemplate(false);
            }} className="mb-4 space-y-3">
              <input
                type="text"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="Judul template..."
                className="w-full bg-surface-light border-[3px] border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">ITEM CHECKLIST:</p>
                {templateItems.map((item, idx) => (
                  <div key={idx} className="flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...templateItems];
                        newItems[idx] = e.target.value;
                        setTemplateItems(newItems);
                      }}
                      placeholder={`Item ${idx + 1}...`}
                      className="flex-1 min-w-0 bg-white border-2 border-zinc-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                    {templateItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTemplateItems(templateItems.filter((_, i) => i !== idx))}
                        className="text-text-light hover:text-danger transition-colors p-1 flex-shrink-0"
                      >
                        <Minus size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setTemplateItems([...templateItems, ""])}
                  className="text-[11px] font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> Tambah Item
                </button>
              </div>

              <button
                type="submit"
                disabled={addingTemplate || !templateTitle.trim() || templateItems.filter(i => i.trim()).length === 0}
                className="w-full bg-primary text-white border-[3px] border-black px-4 py-2.5 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#111827] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {addingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                SIMPAN TEMPLATE
              </button>
            </form>

            {/* Daftar template */}
            {templates.length === 0 ? (
              <p className="text-xs text-zinc-400 italic text-center py-2">Belum ada template</p>
            ) : (
              <div className="space-y-2 mt-4 border-t-[3px] border-black pt-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-2">DAFTAR TEMPLATE:</p>
                {templates.map((tpl) => (
                  <div key={tpl.id} className="bg-surface-light border-2 border-zinc-300 p-3 rounded-[4px]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-text-dark uppercase truncate">{tpl.title}</p>
                        <p className="text-[10px] text-text-muted mt-1">{tpl.items.length} item</p>
                      </div>
                      <button
                        onClick={() => openConfirmDelete(tpl.id, "template")}
                        className="text-text-light hover:text-danger transition-colors flex-shrink-0 p-0.5"
                        title="Hapus Template"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {tpl.items.map((item, i) => (
                        <p key={i} className="text-[10px] text-text-muted flex items-center gap-1">
                          <span className="text-text-light">•</span> {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TABEL DAFTAR AKUN */}
        <div className="lg:col-span-2">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] overflow-hidden">
            <div className="bg-black text-white p-4 flex items-center justify-between">
              <h2 className="font-black tracking-widest uppercase text-sm">DAFTAR AKUN TERDAFTAR</h2>
              <span className="font-mono text-xs font-bold bg-white text-black px-2 py-0.5">
                {accounts.length} TOTAL
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-surface-light border-b-[3px] border-black">
                    <th className="p-4 font-black text-xs uppercase tracking-wider border-r-[3px] border-black">Nama / Username</th>
                    <th className="p-4 font-black text-xs uppercase tracking-wider border-r-[3px] border-black w-24">Role</th>
                    <th className="p-4 font-black text-xs uppercase tracking-wider border-r-[3px] border-black w-40">Tim</th>
                    <th className="p-4 font-black text-xs uppercase tracking-wider w-32 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <Loader2 size={24} className="animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-sm font-bold text-zinc-500 uppercase">
                        Belum ada akun terdaftar
                      </td>
                    </tr>
                  ) : (
                    accounts.map((account) => (
                      <tr key={account.id} className="border-b-[3px] border-black last:border-b-0 hover:bg-yellow-50 transition-colors">
                        <td className="p-4 border-r-[3px] border-black">
                          <p className="font-bold text-sm text-black">{account.nama}</p>
                          <p className="text-xs font-mono font-medium text-zinc-500 mt-1">@{account.username}</p>
                        </td>
                        <td className="p-4 border-r-[3px] border-black">
                          <span className={`text-[10px] font-black px-2 py-1 uppercase tracking-widest border-2 border-black ${account.role === "ADMIN" ? "bg-red-200 text-red-900" : "bg-blue-200 text-blue-900"}`}>
                            {account.role}
                          </span>
                        </td>
                        <td className="p-4 border-r-[3px] border-black">
                          {editingTeamAccountId === account.id ? (
                            /* Mode Edit Tim: Inline Dropdown */
                            <div className="flex items-center gap-1">
                              <select
                                value={editingTeamValue}
                                onChange={(e) => setEditingTeamValue(e.target.value)}
                                className="flex-1 bg-white border-2 border-black px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                                autoFocus
                              >
                                <option value="">— Tanpa Tim —</option>
                                {teams.map((t) => (
                                  <option key={t.id} value={t.id}>{t.nama}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => saveEditTeam(account.id)}
                                disabled={savingTeam}
                                className="bg-green-500 text-white border-2 border-black p-1 text-xs hover:bg-green-600 shadow-[1px_1px_0px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                                title="Simpan"
                              >
                                {savingTeam ? <Loader2 size={12} className="animate-spin" /> : "✓"}
                              </button>
                              <button
                                onClick={() => setEditingTeamAccountId(null)}
                                className="bg-zinc-200 text-black border-2 border-black p-1 text-xs hover:bg-zinc-300 shadow-[1px_1px_0px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                                title="Batal"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            /* Mode Tampil: Badge + Tombol Edit */
                            <div className="flex items-center gap-2">
                              {account.team?.nama ? (
                                <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider">
                                  {account.team.nama}
                                </span>
                              ) : (
                                <span className="text-zinc-400 italic text-xs">—</span>
                              )}
                              <button
                                onClick={() => startEditTeam(account)}
                                className="text-zinc-400 hover:text-primary transition-colors"
                                title="Ubah Tim"
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setResetModal(account)}
                              className="bg-white border-2 border-black p-2 hover:bg-blue-500 hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                              title="Reset Password"
                            >
                              <KeyRound size={16} />
                            </button>
                            <button
                              onClick={() => openConfirmDelete(account.id)}
                              className="bg-white border-2 border-black p-2 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                              title="Hapus Akun"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL RESET PASSWORD */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] p-6 max-w-sm w-full animate-fade-in-up">
            <div className="flex items-center justify-between border-b-[3px] border-black pb-3 mb-5">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-primary" />
                <h3 className="font-black text-lg uppercase tracking-tight">Reset Password</h3>
              </div>
              <button 
                onClick={() => { setResetModal(null); setNewPassword(""); }}
                className="hover:text-red-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm font-bold text-zinc-600 mb-4">
              Masukkan password baru untuk akun <span className="text-black bg-yellow-200 px-1 font-mono">@{resetModal.username}</span>
            </p>

            <form onSubmit={handleResetSubmit}>
              <div className="mb-6">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password baru (Min. 6 char)"
                  required
                  minLength={6}
                  className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setResetModal(null); setNewPassword(""); }}
                  className="flex-1 bg-white border-[3px] border-black px-4 py-3 font-black text-xs uppercase hover:bg-zinc-100 transition-colors shadow-[2px_2px_0px_0px_#111827] active:translate-y-0.5 active:shadow-none"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 bg-primary text-white border-[3px] border-black px-4 py-3 font-black text-xs uppercase hover:bg-primary-dark transition-colors shadow-[2px_2px_0px_0px_#111827] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resetting ? <Loader2 size={16} className="animate-spin" /> : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.type === "template" ? "Hapus Template" : "Hapus Akun"}
        message={confirmState.type === "template" ? "Yakin ingin menghapus template ini?" : "Yakin ingin menghapus akun ini? Semua SPKL miliknya mungkin kehilangan referensi pemilik (meski datanya tetap ada)."}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmState({ isOpen: false, id: null, type: "account" })}
      />
    </div>
  );
}
