"use client";
import { useState, useEffect } from "react";
import { getAccounts, addAccount, deleteAccount, resetAccountPassword } from "@/lib/actions/accountActions";
import { getTeams, addTeam } from "@/lib/actions/teamActions";
import { getTemplates } from "@/lib/actions/templateActions";
import { ShieldCheck, UserPlus, Loader2, KeyRound, X, Plus, Users, ClipboardList } from "lucide-react";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import AccountTable from "@/components/AccountTable";
import TemplateManager from "@/components/TemplateManager";

export default function AkunPage() {
  const [accounts, setAccounts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("accounts");

  const [formData, setFormData] = useState({ nama: "", username: "", password: "", role: "USER", teamId: "" });
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);

  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: null });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [a, t, tpl] = await Promise.all([getAccounts(), getTeams(), getTemplates()]);
    if (a.success) setAccounts(a.data);
    if (t.success) setTeams(t.data);
    if (tpl.success) setTemplates(tpl.data);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
    const r = await addAccount(fd);
    if (r.success) {
      setAccounts(prev => [r.data, ...prev]);
      setFormData({ nama: "", username: "", password: "", role: "USER", teamId: "" });
      setToast({ message: `Akun ${r.data.nama} berhasil dibuat!`, type: "success" });
    } else setToast({ message: r.error, type: "error" });
    setSubmitting(false);
  }

  async function handleAddTeam(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setAddingTeam(true);
    const r = await addTeam(newTeamName.trim());
    if (r.success) {
      setTeams(prev => [...prev, r.data]);
      setNewTeamName("");
      setToast({ message: `Tim "${r.data.nama}" dibuat!`, type: "success" });
    } else setToast({ message: r.error, type: "error" });
    setAddingTeam(false);
  }

  async function handleDeleteConfirm() {
    const id = confirmState.id;
    setConfirmState({ isOpen: false, id: null });
    if (!id) return;
    const r = await deleteAccount(id);
    if (r.success) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      setToast({ message: "Akun dihapus", type: "success" });
    } else setToast({ message: r.error, type: "error" });
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    setResetting(true);
    const r = await resetAccountPassword(resetModal.id, newPassword);
    if (r.success) {
      setToast({ message: `Password @${resetModal.username} berhasil direset!`, type: "success" });
      setResetModal(null); setNewPassword("");
    } else setToast({ message: r.error, type: "error" });
    setResetting(false);
  }

  const tabs = [
    { id: "accounts", label: "AKUN", icon: UserPlus },
    { id: "teams", label: "TIM", icon: Users },
    { id: "templates", label: "TEMPLATE", icon: ClipboardList },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up relative">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-black border-[3px] border-black flex items-center justify-center flex-shrink-0 shadow-[4px_4px_0px_0px_#a1a1aa]">
          <ShieldCheck size={22} className="text-white" />
        </div>
        <div>
          <p className="brutal-label mb-0.5">ADMIN ONLY</p>
          <h1 className="text-2xl font-black text-black uppercase tracking-tight leading-tight">KELOLA AKUN</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-surface-light border-[3px] border-black overflow-hidden">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition-colors ${activeTab === tab.id ? "bg-black text-white" : "text-text-muted hover:bg-zinc-200"}`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: AKUN */}
      {activeTab === "accounts" && (
        <div className="space-y-8">
          {/* Form Buat Akun */}
          <form onSubmit={handleSubmit} className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#111827]">
            <div className="flex items-center gap-2 mb-5 border-b-[3px] border-black pb-2">
              <UserPlus size={18} />
              <h2 className="text-base font-black uppercase">BUAT AKUN BARU</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="brutal-label block mb-1.5 text-[10px]">NAMA LENGKAP</label>
                <input type="text" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} required placeholder="Budi Santoso" className="w-full bg-surface-light border-[3px] border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="brutal-label block mb-1.5 text-[10px]">USERNAME</label>
                <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required placeholder="budi.s" className="w-full bg-surface-light border-[3px] border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="brutal-label block mb-1.5 text-[10px]">PASSWORD</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required placeholder="Min 6 karakter" className="w-full bg-surface-light border-[3px] border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="brutal-label block mb-1.5 text-[10px]">ROLE</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full bg-surface-light border-[3px] border-black px-3 py-2.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer">
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="brutal-label block mb-1.5 text-[10px]">TIM</label>
                  <select value={formData.teamId} onChange={(e) => setFormData({...formData, teamId: e.target.value})} className="w-full bg-surface-light border-[3px] border-black px-3 py-2.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer">
                    <option value="">— Tanpa —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="w-full mt-5 bg-primary text-white border-[3px] border-black px-6 py-3 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#111827] active:translate-y-[2px] active:shadow-none disabled:opacity-70">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />} BUAT AKUN
            </button>
          </form>

          {/* Tabel Akun */}
          <AccountTable accounts={accounts} teams={teams} loading={loading} onDelete={(id) => setConfirmState({ isOpen: true, id })} onResetPw={(acc) => setResetModal(acc)} toast={setToast} />
        </div>
      )}

      {/* TAB: TIM */}
      {activeTab === "teams" && (
        <div className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#111827]">
          <div className="flex items-center gap-2 mb-5 border-b-[3px] border-black pb-2">
            <Users size={18} />
            <h2 className="text-base font-black uppercase">KELOLA TIM</h2>
          </div>
          <form onSubmit={handleAddTeam} className="mb-5">
            <div className="flex gap-2">
              <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Nama tim baru..." className="flex-1 min-w-0 bg-surface-light border-[3px] border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" required />
              <button type="submit" disabled={addingTeam || !newTeamName.trim()} className="bg-primary text-white border-[3px] border-black px-4 py-2.5 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#111827] active:translate-y-[2px] active:shadow-none disabled:opacity-50 flex items-center gap-1 flex-shrink-0">
                {addingTeam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} BUAT
              </button>
            </div>
          </form>
          {teams.length === 0 ? (
            <p className="text-xs text-zinc-400 italic text-center py-4">Belum ada tim</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {teams.map(t => (
                <div key={t.id} className="bg-surface-light border-2 border-zinc-300 p-3 text-center">
                  <p className="text-xs font-black uppercase tracking-wider">{t.nama}</p>
                  <p className="text-[10px] text-text-muted mt-1">{accounts.filter(a => a.team?.id === t.id).length} anggota</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: TEMPLATE */}
      {activeTab === "templates" && (
        <TemplateManager templates={templates} toast={setToast} />
      )}

      {/* Modal Reset Password */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] p-6 max-w-sm w-full animate-fade-in-up">
            <div className="flex items-center justify-between border-b-[3px] border-black pb-3 mb-5">
              <div className="flex items-center gap-2"><KeyRound size={20} className="text-primary" /><h3 className="font-black text-lg uppercase tracking-tight">Reset Password</h3></div>
              <button onClick={() => { setResetModal(null); setNewPassword(""); }} className="hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <p className="text-sm font-bold text-zinc-600 mb-4">Password baru untuk <span className="text-black bg-yellow-200 px-1 font-mono">@{resetModal.username}</span></p>
            <form onSubmit={handleResetSubmit}>
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 karakter" required minLength={6} className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary mb-5" />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setResetModal(null); setNewPassword(""); }} className="flex-1 bg-white border-[3px] border-black px-4 py-3 font-black text-xs uppercase hover:bg-zinc-100 shadow-[2px_2px_0px_0px_#111827] active:translate-y-0.5 active:shadow-none">Batal</button>
                <button type="submit" disabled={resetting} className="flex-1 bg-primary text-white border-[3px] border-black px-4 py-3 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#111827] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50">{resetting ? <Loader2 size={16} className="animate-spin" /> : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmModal isOpen={confirmState.isOpen} title="Hapus Akun" message="Yakin ingin menghapus akun ini?" onConfirm={handleDeleteConfirm} onCancel={() => setConfirmState({ isOpen: false, id: null })} />
    </div>
  );
}