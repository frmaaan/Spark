"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { LogIn, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [appName, setAppName] = useState("StacX SPKL");

  useEffect(() => {
    async function loadAppName() {
      const { getSettings } = await import("@/lib/actions/settingActions");
      const result = await getSettings();
      if (result.success && result.data.app_name) {
        setAppName(result.data.app_name);
      }
    }
    loadAppName();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      router.push("/");
      router.refresh(); // Memaksa layout mengevaluasi ulang status login
    } else {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-in-up">
      {/* Header Logo/Icon */}
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 bg-primary border-[3px] border-black flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform">
          <KeyRound size={28} className="text-white" />
        </div>
      </div>

      <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">LOGIN SISTEM</h1>
          <p className="text-sm font-medium text-zinc-600">Masuk untuk mengakses {appName}</p>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 mb-6 text-sm font-bold text-center">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="brutal-label block mb-2 text-xs">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              placeholder="Masukkan username Anda..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="brutal-label block text-xs">PASSWORD</label>
              <a 
                href={`https://wa.me/6283821740439?text=${encodeURIComponent("Halo Admin, saya lupa password akun StacX SPKL saya. Mohon bantuannya untuk mereset.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-black text-zinc-500 hover:text-primary transition-colors uppercase tracking-widest"
              >
                LUPA PASSWORD?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface-light border-[3px] border-black px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white border-[3px] border-black px-6 py-4 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-transform active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_#111827] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogIn size={18} />
            )}
            MASUK
          </button>
        </form>

        <div className="mt-8 text-center border-t-[3px] border-black pt-6">
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-2">
            Belum punya akun?
          </p>
          <Link 
            href="/register" 
            className="text-sm font-black text-primary hover:underline underline-offset-4"
          >
            MINTA AKSES KE ADMIN
          </Link>
        </div>
      </div>
    </div>
  );
}
