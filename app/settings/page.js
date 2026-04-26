"use client";

import { useState, useEffect } from "react";
import { getSettings, saveSettings } from "@/lib/actions/settingActions";
import { Settings, Save, Loader2, Link2, HandCoins } from "lucide-react";
import Toast from "@/components/Toast";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [settings, setSettings] = useState({
    app_name: "StacX SPKL",
    donation_enabled: "true",
    account_1: "BCA: 123456789 A/N Budi",
    account_2: "DANA: 08123456789 A/N Budi",
    donation_text: "",
  });

  useEffect(() => {
    async function loadSettings() {
      const result = await getSettings();
      if (result.success) {
        setSettings({
          app_name: result.data.app_name || "StacX SPKL",
          donation_enabled: result.data.donation_enabled || "true",
          account_1: result.data.account_1 || "",
          account_2: result.data.account_2 || "",
          donation_text: result.data.donation_text || "",
        });
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    
    const result = await saveSettings(settings);
    if (result.success) {
      setToast({ message: "Pengaturan berhasil disimpan!", type: "success" });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setToast({ message: result.error, type: "error" });
    }
    
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-in-up space-y-8">
      {/* PAGE HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-black border-[3px] border-black flex items-center justify-center flex-shrink-0 shadow-[4px_4px_0px_0px_#a1a1aa]">
          <Settings size={22} className="text-white" />
        </div>
        <div>
          <p className="brutal-label mb-0.5">ADMIN ONLY</p>
          <h1 className="text-2xl font-black text-black uppercase tracking-tight leading-tight">
            PENGATURAN SISTEM
          </h1>
        </div>
      </div>

      {/* FORM PENGATURAN */}
      <form onSubmit={handleSubmit} className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#111827]">
        
        {/* IDENTITAS APLIKASI */}
        <div className="mb-8">
          <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2 border-b-[3px] border-black pb-2">
            <Link2 size={18} /> IDENTITAS APLIKASI
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="brutal-label block mb-2 text-xs">NAMA APLIKASI</label>
              <input
                type="text"
                value={settings.app_name}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Contoh: StacX SPKL"
              />
              <p className="text-[10px] font-bold text-zinc-500 mt-2 uppercase tracking-wide">
                Nama yang akan ditampilkan di Dashboard, Sidebar, dan Halaman Login.
              </p>
            </div>
          </div>
        </div>

        {/* MODAL DONASI */}
        <div className="mb-8">
          <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2 border-b-[3px] border-black pb-2">
            <HandCoins size={18} /> KAMPANYE / DONASI
          </h2>

          <div className="space-y-6">
            {/* TOGGLE ON/OFF */}
            <div>
              <label className="brutal-label block mb-3 text-xs">STATUS MODAL DONASI</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 border-[3px] border-black flex items-center justify-center ${settings.donation_enabled === "true" ? "bg-primary" : "bg-white"}`}>
                    {settings.donation_enabled === "true" && <div className="w-2 h-2 bg-white" />}
                  </div>
                  <input
                    type="radio"
                    name="donation_enabled"
                    value="true"
                    checked={settings.donation_enabled === "true"}
                    onChange={(e) => setSettings({ ...settings, donation_enabled: e.target.value })}
                    className="hidden"
                  />
                  <span className="font-bold text-sm">AKTIF (MUNCUL)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 border-[3px] border-black flex items-center justify-center ${settings.donation_enabled === "false" ? "bg-red-500" : "bg-white"}`}>
                    {settings.donation_enabled === "false" && <div className="w-2 h-2 bg-white" />}
                  </div>
                  <input
                    type="radio"
                    name="donation_enabled"
                    value="false"
                    checked={settings.donation_enabled === "false"}
                    onChange={(e) => setSettings({ ...settings, donation_enabled: e.target.value })}
                    className="hidden"
                  />
                  <span className="font-bold text-sm">MATI (SEMBUNYIKAN)</span>
                </label>
              </div>
              <p className="text-[10px] font-bold text-zinc-500 mt-2 uppercase tracking-wide">
                Jika aktif, modal donasi akan muncul 1 kali setiap ada user yang login ke dashboard.
              </p>
            </div>

            {/* NOMOR REKENING 1 */}
            <div>
              <label className="brutal-label block mb-2 text-xs">REKENING 1 (UTAMA)</label>
              <input
                type="text"
                value={settings.account_1}
                onChange={(e) => setSettings({ ...settings, account_1: e.target.value })}
                className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono"
                placeholder="Contoh: BCA 123456789 A/N Budi"
                disabled={settings.donation_enabled === "false"}
              />
            </div>

            {/* NOMOR REKENING 2 */}
            <div>
              <label className="brutal-label block mb-2 text-xs">REKENING 2 (E-WALLET / LAINNYA)</label>
              <input
                type="text"
                value={settings.account_2}
                onChange={(e) => setSettings({ ...settings, account_2: e.target.value })}
                className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono"
                placeholder="Contoh: DANA 08123456789 A/N Budi"
                disabled={settings.donation_enabled === "false"}
              />
            </div>

            {/* TEKS DONASI */}
            <div>
              <label className="brutal-label block mb-2 text-xs">KALIMAT DONASI</label>
              <textarea
                value={settings.donation_text}
                onChange={(e) => setSettings({ ...settings, donation_text: e.target.value })}
                required={settings.donation_enabled === "true"}
                rows={4}
                className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-y"
                placeholder="Masukkan kalimat donasi di sini..."
                disabled={settings.donation_enabled === "false"}
              />
              {settings.donation_enabled === "false" && (
                <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wide">
                  *Teks tidak dapat diedit karena status modal dimatikan.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={saving}
          className="w-full mt-8 bg-black hover:bg-zinc-800 text-white border-[3px] border-black px-6 py-4 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-transform active:translate-y-[2px] active:translate-x-[2px] active:shadow-none shadow-[4px_4px_0px_0px_#a1a1aa] disabled:opacity-70"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          SIMPAN PENGATURAN
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
