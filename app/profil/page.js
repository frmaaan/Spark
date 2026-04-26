"use client";

import { useState } from "react";
import { changePassword } from "@/lib/actions/accountActions";
import { UserCircle, KeyRound, Loader2, Save } from "lucide-react";
import Toast from "@/components/Toast";

export default function ProfilePage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setToast({ message: "Password baru tidak cocok!", type: "error" });
      return;
    }

    setLoading(true);
    const result = await changePassword(oldPassword, newPassword);
    
    if (result.success) {
      setToast({ message: "Password berhasil diubah!", type: "success" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setToast({ message: result.error, type: "error" });
    }
    
    setLoading(false);
  }

  return (
    <div className="max-w-2xl animate-fade-in-up">
      {/* PAGE HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-black border-[3px] border-black flex items-center justify-center flex-shrink-0 shadow-[4px_4px_0px_0px_#a1a1aa]">
          <UserCircle size={22} className="text-white" />
        </div>
        <div>
          <p className="brutal-label mb-0.5">PENGATURAN AKUN</p>
          <h1 className="text-2xl font-black text-black uppercase tracking-tight leading-tight">
            PROFIL SAYA
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border-[4px] border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_#111827]">
        <h2 className="text-lg font-black uppercase mb-6 flex items-center gap-2 border-b-[3px] border-black pb-2">
          <KeyRound size={18} /> GANTI PASSWORD
        </h2>

        <div className="space-y-5">
          <div>
            <label className="brutal-label block mb-2 text-xs">PASSWORD LAMA</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="Masukkan password saat ini"
              required
            />
          </div>

          <div>
            <label className="brutal-label block mb-2 text-xs">PASSWORD BARU</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="brutal-label block mb-2 text-xs">KONFIRMASI PASSWORD BARU</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="Ketik ulang password baru"
              required
              minLength={6}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 bg-black hover:bg-zinc-800 text-white border-[3px] border-black px-6 py-4 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-transform active:translate-y-[2px] active:translate-x-[2px] active:shadow-none shadow-[4px_4px_0px_0px_#a1a1aa] disabled:opacity-70"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          SIMPAN PASSWORD BARU
        </button>
      </form>

      {/* TOAST */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
