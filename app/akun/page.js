"use client";

import { useState, useEffect } from "react";
import { getAccounts, addAccount, deleteAccount, resetAccountPassword } from "@/lib/actions/accountActions";
import { ShieldCheck, UserPlus, Trash2, Loader2, KeyRound, X } from "lucide-react";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

export default function AkunPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // State untuk form tambah akun
  const [formData, setFormData] = useState({
    nama: "",
    username: "",
    password: "",
    role: "USER",
  });

  // State untuk Reset Password Modal
  const [resetModal, setResetModal] = useState(null); // null atau {id, username}
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    const result = await getAccounts();
    if (result.success) setAccounts(result.data);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    const data = new FormData();
    data.append("nama", formData.nama);
    data.append("username", formData.username);
    data.append("password", formData.password);
    data.append("role", formData.role);

    const result = await addAccount(data);
    
    if (result.success) {
      setAccounts((prev) => [result.data, ...prev]);
      setFormData({ nama: "", username: "", password: "", role: "USER" });
      setToast({ message: "Akun akses berhasil dibuat!", type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
    
    setSubmitting(false);
  }

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: null });

  function openConfirmDelete(id) {
    setConfirmState({ isOpen: true, id });
  }

  async function handleDeleteConfirm() {
    const id = confirmState.id;
    setConfirmState({ isOpen: false, id: null });
    
    if (!id) return;
    
    const result = await deleteAccount(id);
    if (result.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setToast({ message: "Akun berhasil dihapus", type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
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
            Buat atau reset password akun user
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORM TAMBAH AKUN */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#111827] sticky top-8">
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
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-surface-light border-b-[3px] border-black">
                    <th className="p-4 font-black text-xs uppercase tracking-wider border-r-[3px] border-black">Nama / Username</th>
                    <th className="p-4 font-black text-xs uppercase tracking-wider border-r-[3px] border-black w-32">Role</th>
                    <th className="p-4 font-black text-xs uppercase tracking-wider w-32 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center">
                        <Loader2 size={24} className="animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-sm font-bold text-zinc-500 uppercase">
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
        title="Hapus Akun"
        message="Yakin ingin menghapus akun ini? Semua SPKL miliknya mungkin kehilangan referensi pemilik (meski datanya tetap ada)."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmState({ isOpen: false, id: null })}
      />
    </div>
  );
}
