"use client";

import { useState, useEffect } from "react";
import { getAccounts, addAccount, deleteAccount, resetAccountPassword, updateAccountTeam } from "@/lib/actions/accountActions";
import { getTeams, addTeam } from "@/lib/actions/teamActions";
import { getTemplates, addTemplate, updateTemplate, deleteTemplate } from "@/lib/actions/templateActions";
import { ShieldCheck, UserPlus, Trash2, Loader2, KeyRound, X, Plus, Pencil, Users, ClipboardList, Minus, Check, GripVertical } from "lucide-react";
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
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [draggingTemplateItemIndex, setDraggingTemplateItemIndex] = useState(null);
  const [dragOverTemplateItemIndex, setDragOverTemplateItemIndex] = useState(null);

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: null, type: "account" });

  // State untuk tab/section
  const [activeSection, setActiveSection] = useState("accounts"); // accounts, teams, templates

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

  function startEditTemplate(template) {
    setEditingTemplateId(template.id);
    setTemplateTitle(template.title);
    setTemplateItems(template.items?.length ? template.items : [""]);
    setActiveSection("templates");
  }

  function cancelEditTemplate() {
    setEditingTemplateId(null);
    setTemplateTitle("");
    setTemplateItems([""]);
    setDraggingTemplateItemIndex(null);
    setDragOverTemplateItemIndex(null);
  }

  function moveTemplateItem(fromIndex, toIndex) {
    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;

    setTemplateItems((prev) => {
      const nextItems = [...prev];
      const [movedItem] = nextItems.splice(fromIndex, 1);
      const targetIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      nextItems.splice(targetIndex, 0, movedItem);
      return nextItems;
    });
  }

  function handleTemplateItemDragStart(index) {
    setDraggingTemplateItemIndex(index);
    setDragOverTemplateItemIndex(index);
  }

  function handleTemplateItemDrop(targetIndex) {
    moveTemplateItem(draggingTemplateItemIndex, targetIndex);
    setDraggingTemplateItemIndex(null);
    setDragOverTemplateItemIndex(null);
  }

  function handleTemplateItemDragEnd() {
    setDraggingTemplateItemIndex(null);
    setDragOverTemplateItemIndex(null);
  }

  async function handleTemplateSubmit(e) {
    e.preventDefault();
    const validItems = templateItems.map((item) => item.trim()).filter(Boolean);
    if (!templateTitle.trim() || validItems.length === 0) return;

    setAddingTemplate(true);

    const result = editingTemplateId
      ? await updateTemplate(editingTemplateId, templateTitle.trim(), validItems)
      : await addTemplate(templateTitle.trim(), validItems);

    if (result.success) {
      if (editingTemplateId) {
        setTemplates((prev) =>
          prev.map((tpl) =>
            tpl.id === editingTemplateId
              ? { ...tpl, title: templateTitle.trim(), items: validItems }
              : tpl
          )
        );
        setToast({ message: "Template berhasil diperbarui!", type: "success" });
        cancelEditTemplate();
      } else {
        setTemplates((prev) => [result.data, ...prev]);
        setTemplateTitle("");
        setTemplateItems([""]);
        setToast({ message: `Template "${result.data.title}" berhasil dibuat!`, type: "success" });
      }
    } else {
      setToast({ message: result.error, type: "error" });
    }

    setAddingTemplate(false);
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
        
        {/* PAGE HEADER */}
        <div className="flex items-start gap-4 md:gap-6 pb-6 border-b-2 border-slate-200">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-surface-light border-[3px] border-black flex items-center justify-center flex-shrink-0 shadow-[4px_4px_0px_0px_#111827] rounded-sm">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-bold text-primary uppercase tracking-widest mb-1">🔐 Admin Only</p>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight">
              Kelola Akun Login
            </h1>
            <p className="text-xs md:text-sm text-slate-600 uppercase tracking-wider mt-2 font-semibold">
              Buat akun, atur tim, kelola template, dan reset password dengan mudah
            </p>
          </div>
        </div>

        {/* SECTION TABS */}
        <div className="flex flex-wrap gap-2 md:gap-4">
          {[
            { id: "accounts", label: "Daftar Akun", icon: "👥" },
            { id: "teams", label: "Kelola Tim", icon: "👔" },
            { id: "templates", label: "Template", icon: "📋" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-bold text-sm md:text-base uppercase tracking-wider transition-all ${
                activeSection === tab.id
                  ? "bg-primary text-white shadow-[4px_4px_0px_0px_#111827] border-2 border-black"
                  : "bg-card text-text-muted border-2 border-surface-light hover:border-primary hover:bg-surface-light"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* SIDEBAR: FORM & QUICK ACTIONS */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* FORM TAMBAH AKUN */}
            {activeSection === "accounts" && (
                <div className="bg-white border-[3px] border-slate-300 rounded-xl p-6 shadow-[4px_4px_0px_0px_#111827] hover:shadow-[6px_6px_0px_0px_#111827] transition-shadow">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-slate-200">
                  <div className="w-8 h-8 bg-surface-light rounded-lg flex items-center justify-center">
                    <UserPlus size={18} className="text-primary" />
                  </div>
                  <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wide">Buat Akun Baru</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2.5">Nama Lengkap</label>
                    <input
                      type="text"
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      required
                      placeholder="Contoh: Budi Santoso"
                      className="w-full bg-surface-light border-2 border-surface-light px-4 py-3 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2.5">Username (Untuk Login)</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                      placeholder="Contoh: budi.s"
                      className="w-full bg-surface-light border-2 border-surface-light px-4 py-3 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2.5">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      placeholder="Minimal 6 karakter"
                        className="w-full bg-surface-light border-2 border-surface-light px-4 py-3 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2.5">Tipe Akses (Role)</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-surface-light border-2 border-surface-light px-4 py-3 text-sm font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer"
                    >
                      <option value="USER">User Biasa</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2.5">Tim / Divisi</label>
                    <select
                      value={formData.teamId}
                      onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                      className="w-full bg-surface-light border-2 border-surface-light px-4 py-3 text-sm font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all appearance-none cursor-pointer"
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
                    className="w-full mt-2 bg-primary text-white border-2 border-black px-6 py-3.5 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 rounded-lg transition-all shadow-[4px_4px_0px_0px_#111827] active:scale-95 disabled:opacity-60"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin text-primary" /> : <UserPlus size={18} />}
                    Buat Akun
                  </button>
                </form>
              </div>
            )}

            {/* FORM TAMBAH TIM */}
            {activeSection === "teams" && (
              <div className="bg-white border-[3px] border-slate-300 rounded-xl p-6 shadow-[4px_4px_0px_0px_#111827]">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-slate-200">
                  <div className="w-8 h-8 bg-surface-light rounded-lg flex items-center justify-center">
                    <Users size={18} className="text-primary" />
                  </div>
                  <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wide">Buat Tim Baru</h2>
                </div>

                <form onSubmit={handleAddTeam} className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Nama tim baru..."
                      className="flex-1 min-w-0 bg-surface-light border-2 border-surface-light px-4 py-3 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder-slate-400"
                      required
                    />
                      <button
                        type="submit"
                        disabled={addingTeam || !newTeamName.trim()}
                        className="bg-primary hover:bg-primary-hover text-white border-2 border-black px-4 py-3 font-bold text-sm uppercase rounded-lg shadow-[2px_2px_0px_0px_#111827] hover:shadow-[4px_4px_0px_0px_#111827] flex items-center gap-1.5 flex-shrink-0 transition-all disabled:opacity-50"
                      >
                        {addingTeam ? <Loader2 size={16} className="animate-spin text-primary" /> : <Plus size={16} />}
                        BUAT
                      </button>
                  </div>
                </form>

                <div className="mt-6 pt-6 border-t-2 border-slate-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Daftar Tim Yang Tersedia:</p>
                  {teams.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-4">Belum ada tim dibuat</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {teams.map((t) => (
                        <span key={t.id} className="bg-surface-light text-primary border-2 border-primary px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-[1px_1px_0px_0px_#111827]">
                          {t.nama}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TEMPLATE SECTION */}
            {activeSection === "templates" && (
              <div className="bg-white border-[3px] border-slate-300 rounded-xl p-6 shadow-[4px_4px_0px_0px_#111827] space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-200">
                  <div className="w-8 h-8 bg-surface-light rounded-lg flex items-center justify-center">
                    <ClipboardList size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-wide">
                      {editingTemplateId ? "Edit Template" : "Buat Template"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">
                      {editingTemplateId ? "Perbarui judul dan item checklist" : "Buat template checklist baru"}
                    </p>
                  </div>
                </div>

                {/* Form buat template */}
                <form onSubmit={handleTemplateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2.5">Judul Template</label>
                    <input
                      type="text"
                      value={templateTitle}
                      onChange={(e) => setTemplateTitle(e.target.value)}
                      placeholder="Contoh: Daily Check-in"
                      className="w-full bg-card border-2 border-surface-light px-4 py-3 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-slate-400"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">Item Checklist:</label>
                    <div className="space-y-2.5">
                      {templateItems.map((item, idx) => (
                        <div
                          key={idx}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverTemplateItemIndex(idx);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleTemplateItemDrop(idx);
                          }}
                          className={`flex items-center gap-2 rounded-lg border-2 p-2 transition-all ${
                            dragOverTemplateItemIndex === idx
                              ? "bg-surface-light border-primary"
                              : "bg-card border-surface-light"
                          } ${draggingTemplateItemIndex === idx ? "opacity-60" : ""}`}
                        >
                          <button
                            type="button"
                            draggable
                            onDragStart={() => handleTemplateItemDragStart(idx)}
                            onDragEnd={handleTemplateItemDragEnd}
                            className="flex-shrink-0 text-slate-400 hover:text-primary cursor-grab active:cursor-grabbing p-1"
                            title="Geser item"
                          >
                            <GripVertical size={16} />
                          </button>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const newItems = [...templateItems];
                              newItems[idx] = e.target.value;
                              setTemplateItems(newItems);
                            }}
                            placeholder={`Item ${idx + 1}...`}
                            className="flex-1 min-w-0 bg-card border-2 border-surface-light px-3.5 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-slate-400"
                          />
                          {templateItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setTemplateItems(templateItems.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-500 transition-colors p-2 flex-shrink-0"
                            >
                              <Minus size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingTemplateItemIndex !== null) {
                            moveTemplateItem(draggingTemplateItemIndex, templateItems.length);
                            setDraggingTemplateItemIndex(null);
                            setDragOverTemplateItemIndex(null);
                          }
                        }}
                        className="h-3 rounded-full border border-dashed border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTemplateItems([...templateItems, ""])}
                      className="text-xs font-bold text-primary hover:text-primary transition-colors mt-3 flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Tambah Item
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {editingTemplateId && (
                      <button
                        type="button"
                        onClick={cancelEditTemplate}
                        className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-300 px-4 py-3.5 font-bold text-sm uppercase rounded-lg shadow-[2px_2px_0px_0px_#111827] hover:shadow-[4px_4px_0px_0px_#111827] transition-all"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={addingTemplate || !templateTitle.trim() || templateItems.filter(i => i.trim()).length === 0}
                      className="w-full bg-primary text-white border-2 border-black px-4 py-3.5 font-bold text-sm uppercase rounded-lg shadow-[4px_4px_0px_0px_#111827] active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                    >
                      {addingTemplate ? <Loader2 size={16} className="animate-spin text-primary" /> : <Plus size={16} />}
                      {editingTemplateId ? "Update" : "Simpan Template"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* MAIN CONTENT: TABEL ATAU LIST */}
          <div className="lg:col-span-2">
            {/* DAFTAR AKUN */}
            {activeSection === "accounts" && (
              <div className="bg-white border-[3px] border-slate-300 rounded-xl shadow-[4px_4px_0px_0px_#111827] overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 md:p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Users size={20} />
                    </div>
                    <div>
                      <h2 className="font-black tracking-widest uppercase text-sm md:text-base">Daftar Akun Terdaftar</h2>
                      <p className="text-xs text-white/70 mt-0.5">{accounts.length} total akun</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold bg-white/20 text-white px-3 py-1.5 rounded-lg">
                    {accounts.length} TOTAL
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-300">
                        <th className="p-4 font-black text-xs uppercase tracking-widest text-slate-700 border-r border-slate-200">Nama / Username</th>
                        <th className="p-4 font-black text-xs uppercase tracking-widest text-slate-700 border-r border-slate-200 w-24">Role</th>
                        <th className="p-4 font-black text-xs uppercase tracking-widest text-slate-700 border-r border-slate-200 w-40">Tim</th>
                        <th className="p-4 font-black text-xs uppercase tracking-widest text-slate-700 w-32 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                            <td colSpan={4} className="p-12 text-center">
                            <Loader2 size={32} className="animate-spin mx-auto text-primary" />
                          </td>
                        </tr>
                      ) : accounts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-sm font-bold text-slate-400 uppercase">
                            📭 Belum ada akun terdaftar
                          </td>
                        </tr>
                      ) : (
                        accounts.map((account) => (
                          <tr key={account.id} className="border-b border-slate-200 hover:bg-surface-light transition-colors last:border-b-0">
                            <td className="p-4 border-r border-slate-200">
                              <p className="font-bold text-sm text-slate-900">{account.nama}</p>
                              <p className="text-xs font-mono font-medium text-slate-500 mt-1">@{account.username}</p>
                            </td>
                            <td className="p-4 border-r border-slate-200">
                              <span className={`text-xs font-bold px-3 py-1.5 uppercase tracking-widest rounded-full border-2 ${account.role === "ADMIN" ? "bg-danger text-white border-danger" : "bg-surface-light text-primary border-primary"}`}>
                                {account.role}
                              </span>
                            </td>
                            <td className="p-4 border-r border-slate-200">
                              {editingTeamAccountId === account.id ? (
                                /* Mode Edit Tim: Inline Dropdown */
                                <div className="flex items-center gap-2">
                                  <select
                                    value={editingTeamValue}
                                    onChange={(e) => setEditingTeamValue(e.target.value)}
                                    className="flex-1 bg-card border-2 border-surface-light px-3 py-2 text-xs font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
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
                                      className="bg-success hover:bg-success-hover text-black border-2 border-success p-2 text-xs rounded-lg shadow-[2px_2px_0px_0px_#111827] hover:shadow-[4px_4px_0px_0px_#111827] active:scale-95 transition-all"
                                      title="Simpan"
                                    >
                                      {savingTeam ? <Loader2 size={14} className="animate-spin text-primary" /> : <Check size={14} />}
                                    </button>
                                  <button
                                    onClick={() => setEditingTeamAccountId(null)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 border-2 border-slate-400 p-2 text-xs rounded-lg transition-all"
                                    title="Batal"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                /* Mode Tampil: Badge + Tombol Edit */
                                <div className="flex items-center gap-2">
                                  {account.team?.nama ? (
                                    <span className="bg-surface-light text-primary border-2 border-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                      {account.team.nama}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-xs">—</span>
                                  )}
                                  <button
                                    onClick={() => startEditTeam(account)}
                                    className="text-slate-400 hover:text-primary transition-colors p-1.5"
                                    title="Ubah Tim"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setResetModal(account)}
                                  className="bg-white hover:bg-primary text-slate-600 hover:text-white border-2 border-slate-300 p-2.5 rounded-lg transition-all shadow-[2px_2px_0px_0px_#111827] hover:shadow-[4px_4px_0px_0px_#111827] hover:border-black active:scale-95"
                                  title="Reset Password"
                                >
                                  <KeyRound size={16} />
                                </button>
                                <button
                                  onClick={() => openConfirmDelete(account.id)}
                                  className="bg-white hover:bg-danger text-slate-600 hover:text-white border-2 border-slate-300 p-2.5 rounded-lg transition-all shadow-[2px_2px_0px_0px_#111827] hover:shadow-[4px_4px_0px_0px_#111827] hover:border-danger active:scale-95"
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
            )}

            {/* DAFTAR TEMPLATE */}
            {activeSection === "templates" && (
              <div className="space-y-4">
                <div className="bg-white border-[3px] border-slate-300 rounded-xl shadow-[4px_4px_0px_0px_#111827] p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-slate-200">
                    <div className="w-10 h-10 bg-surface-light rounded-lg flex items-center justify-center">
                      <ClipboardList size={20} className="text-primary" />
                    </div>
                    <div>
                      <h2 className="font-black uppercase text-base text-slate-900">Daftar Template</h2>
                      <p className="text-xs text-slate-600 mt-0.5">{templates.length} template tersedia</p>
                    </div>
                  </div>

                  {templates.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-8">📭 Belum ada template dibuat</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className={`border-2 p-4 rounded-lg transition-all ${
                            editingTemplateId === tpl.id
                              ? "bg-card border-primary shadow-[4px_4px_0px_0px_#111827]"
                              : "bg-surface-light border-surface-light hover:shadow-[4px_4px_0px_0px_#111827]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-900 uppercase truncate">{tpl.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{tpl.items.length} items</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditTemplate(tpl)}
                                className="text-slate-400 hover:text-primary transition-colors flex-shrink-0 p-1 hover:bg-surface-light rounded"
                                title="Edit Template"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => openConfirmDelete(tpl.id, "template")}
                                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 p-1 hover:bg-red-50 rounded"
                                title="Hapus Template"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5 pt-3 border-t border-slate-200">
                            {tpl.items.map((item, i) => (
                              <p key={i} className="text-xs text-slate-600 flex items-center gap-2">
                                <span className="text-slate-300">✓</span> {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DAFTAR TIM */}
            {activeSection === "teams" && (
              <div className="bg-white border-[3px] border-slate-300 rounded-xl shadow-[4px_4px_0px_0px_#111827] p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-slate-200">
                  <div className="w-10 h-10 bg-surface-light rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-black uppercase text-base text-slate-900">Tim Yang Tersedia</h2>
                    <p className="text-xs text-slate-600 mt-0.5">{teams.length} tim</p>
                  </div>
                </div>

                {teams.length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-8">📭 Belum ada tim dibuat</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teams.map((t) => (
                      <div key={t.id} className="bg-surface-light border-2 border-primary px-4 py-3 rounded-lg">
                        <p className="text-sm font-bold text-primary">{t.nama}</p>
                        <p className="text-xs text-primary mt-1.5">
                          {accounts.filter(a => a.team?.id === t.id).length} anggota
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL RESET PASSWORD */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-[3px] border-slate-300 shadow-2xl p-6 md:p-8 max-w-sm w-full rounded-xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-light rounded-lg flex items-center justify-center">
                  <KeyRound size={20} className="text-primary" />
                </div>
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">Reset Password</h3>
              </div>
              <button 
                onClick={() => { setResetModal(null); setNewPassword(""); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-700 mb-6">
              Masukkan password baru untuk akun <span className="bg-surface-light text-primary px-2.5 py-1 rounded font-mono text-xs font-bold">@{resetModal.username}</span>
            </p>

            <form onSubmit={handleResetSubmit}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2.5">Password Baru</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                  className="w-full bg-surface-light border-2 border-surface-light px-4 py-3 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder-slate-400"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setResetModal(null); setNewPassword(""); }}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-300 px-4 py-3 font-bold text-xs uppercase rounded-lg transition-all shadow-[2px_2px_0px_0px_#111827] hover:shadow-[4px_4px_0px_0px_#111827]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 bg-primary text-white border-2 border-black px-4 py-3 font-bold text-xs uppercase rounded-lg transition-all shadow-[4px_4px_0px_0px_#111827] flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {resetting ? <Loader2 size={16} className="animate-spin text-primary" /> : "Simpan"}
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
