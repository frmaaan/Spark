import { Phone, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const adminPhone = "6283821740439"; // Ganti dengan nomor WhatsApp Anda
  const message = encodeURIComponent(
    "Halo Admin, saya ingin mendaftar untuk mendapatkan akses ke aplikasi StacX SPKL. Mohon panduannya."
  );
  const waLink = `https://wa.me/${adminPhone}?text=${message}`;

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in-up">
      <div className="mb-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-zinc-600 hover:text-black transition-colors"
        >
          <ArrowLeft size={16} /> Kembali ke Login
        </Link>
      </div>

      <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-yellow-400 border-[4px] border-black flex items-center justify-center rounded-full">
            <ShieldAlert size={36} className="text-black" />
          </div>
        </div>

        <h1 className="text-2xl font-black uppercase tracking-tight mb-4">SISTEM TERTUTUP</h1>

        <p className="text-sm font-medium text-zinc-600 mb-8 leading-relaxed">
          StacX SPKL adalah aplikasi internal yang diproteksi. Untuk alasan keamanan,
          pembuatan akun baru tidak bisa dilakukan secara otomatis melalui sistem.
          <br /><br />
          Anda harus menghubungi Administrator sistem secara langsung untuk dibuatkan
          akun akses khusus.
        </p>

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-green-500 hover:bg-green-600 text-white border-[4px] border-black px-6 py-4 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-transform active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_#111827]"
        >
          <Phone size={18} />
          HUBUNGI ADMIN VIA WA
        </a>
      </div>
    </div>
  );
}
