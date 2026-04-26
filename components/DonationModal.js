"use client";

import { useState, useEffect } from "react";
import { X, Heart, Coffee, Copy, Check } from "lucide-react";

// =====================================================================
// KOMPONEN HELPER: PaymentCard
// Ukuran kotak, ikon, dan huruf diperkecil khusus untuk mobile
// =====================================================================
const PaymentCard = ({ bank, name, number, logoColor, logoText }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    // PERUBAHAN: Padding p-2 di mobile, p-3 di desktop. Gap dikurangi di mobile.
    <div className="bg-white border-2 border-black p-2 md:p-3 mb-3 md:mb-4 relative flex items-center gap-2 md:gap-3 shadow-[4px_4px_0px_0px_#111827] transition-all">
      
      {/* Logo Bank/E-Wallet: Diperkecil di mobile (w-12 h-10) */}
      <div className="w-12 h-10 md:w-14 md:h-12 flex-shrink-0 flex items-center justify-center border-2 border-black bg-surface-light shadow-[2px_2px_0px_0px_#a1a1aa]">
        <span className={`font-black tracking-tighter ${logoColor}`}>
          {logoText}
        </span>
      </div>

      {/* Informasi Rekening */}
      <div className="flex-1 min-w-0 text-left">
        <p className="brutal-label mb-0.5 text-[9px] md:text-[10px] truncate text-zinc-500">
          {bank} - {name}
        </p>
        {/* PERUBAHAN: Font size nomor rekening text-base di mobile, text-xl di desktop */}
        <p className="font-mono font-black text-base md:text-xl tracking-widest text-primary truncate">
          {number}
        </p>
      </div>

      {/* Tombol Salin (Copy): Diperkecil di mobile (w-10 h-10) */}
      <button
        onClick={handleCopy}
        className={`
          flex-shrink-0 w-10 h-10 md:w-12 md:h-12 border-2 border-black flex items-center justify-center transition-all
          ${copied 
            ? "bg-[#00cc66] text-black translate-x-[2px] translate-y-[2px] shadow-none" 
            : "bg-surface-light hover:bg-black hover:text-white shadow-[2px_2px_0px_0px_#111827] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          }
        `}
        title="Salin Nomor"
      >
        {copied ? (
          <Check size={18} strokeWidth={3} className="md:w-[20px] md:h-[20px]" />
        ) : (
          <Copy size={16} strokeWidth={2.5} className="md:w-[18px] md:h-[18px]" />
        )}
      </button>
    </div>
  );
};

// =====================================================================
// KOMPONEN UTAMA: DonationModal
// =====================================================================
export default function DonationModal({ donationText, account1, account2 }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 1. Muncul saat pertama kali login
    const hasSeen = sessionStorage.getItem("donation_seen");
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // 2. Muncul saat di-trigger secara manual via event (misal setelah download Excel)
    const handleShowModal = () => {
      setIsOpen(true);
    };

    window.addEventListener("showDonationModal", handleShowModal);
    return () => window.removeEventListener("showDonationModal", handleShowModal);
  }, []);

  function handleClose() {
    setIsOpen(false);
    sessionStorage.setItem("donation_seen", "true");
  }

  if (!isOpen) return null;

  // Fungsi helper memecah string rekening
  // Asumsi format: "BCA: 123456789 A/N Budi" -> bank: "BCA", number: "123456789", name: "A/N Budi"
  const parseAccount = (accStr) => {
    if (!accStr) return null;
    const parts = accStr.split(":");
    if (parts.length < 2) return { bank: "BANK", number: accStr, name: "" };
    
    const bank = parts[0].trim();
    const rest = parts[1].trim();
    const restParts = rest.split(" ");
    const number = restParts[0];
    const name = restParts.slice(1).join(" ");
    
    return { bank, number, name };
  };

  const parsedAcc1 = parseAccount(account1);
  const parsedAcc2 = parseAccount(account2);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
      {/* PERUBAHAN PENTING PADA MODAL:
        1. max-w-sm (di mobile lebih sempit) -> md:max-w-md (kembali normal di desktop)
        2. max-h-[95vh] & overflow-y-auto (mencegah modal terpotong di layar HP kecil/pendek)
      */}
      <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_#111827] md:shadow-[8px_8px_0px_0px_#111827] max-w-sm md:max-w-md w-full relative max-h-[95vh] flex flex-col">
        
        {/* Header - Dibuat sticky agar selalu terlihat saat di-scroll */}
        <div className="bg-primary p-3 md:p-4 border-b-[4px] border-black flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-white">
            <Heart size={18} className="fill-white md:w-[20px] md:h-[20px]" />
            <h2 className="font-black tracking-widest text-sm md:text-lg">DUKUNG SISTEM INI</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-white border-2 border-black hover:bg-zinc-200 active:translate-y-[1px] active:translate-x-[1px] transition-all"
          >
            <X size={16} className="text-black stroke-[3px] md:w-[18px] md:h-[18px]" />
          </button>
        </div>

        {/* Content - Bisa di-scroll jika layar terlalu pendek */}
        <div className="p-4 md:p-8 text-center overflow-y-auto">
          <Coffee size={36} className="mx-auto mb-3 md:mb-4 text-primary md:w-[48px] md:h-[48px]" />
          
          <h3 className="text-lg md:text-xl font-black uppercase mb-2">
            Traktir Kopi Developer
          </h3>
          
          {/* PERUBAHAN: Teks lebih kecil (text-xs) di mobile */}
          <p className="text-xs md:text-sm font-medium text-zinc-600 mb-2 leading-relaxed">
            {donationText || "Terima kasih telah menggunakan StacX SPKL. Jika aplikasi ini membantu pekerjaan Anda menjadi lebih cepat, Anda dapat ikut mendukung pengembangan fitur baru dan perawatan sistem."}
          </p>
          <p className="text-xs md:text-sm font-medium text-zinc-600 mb-5 md:mb-6 leading-relaxed">
            Setiap dukungan kecil sangat berarti bagi kami.
          </p>

          <div className="mb-6 md:mb-8">
            {parsedAcc1 && (
              <PaymentCard 
                bank={parsedAcc1.bank} 
                name={parsedAcc1.name || "A/N Pemilik Rekening"} 
                number={parsedAcc1.number} 
                logoText={parsedAcc1.bank}
                logoColor="text-blue-800 italic text-lg md:text-xl"
              />
            )}
            {parsedAcc2 && (
              <PaymentCard 
                bank={parsedAcc2.bank} 
                name={parsedAcc2.name || "A/N Pemilik Rekening"} 
                number={parsedAcc2.number} 
                logoText={parsedAcc2.bank}
                logoColor="text-blue-500 text-xs md:text-sm"
              />
            )}
          </div>

          <button
            onClick={handleClose}
            className="neu-btn neu-btn-primary w-full text-sm md:text-base py-3 md:py-4"
          >
            Nanti Saja / Tutup
          </button>
        </div>
      </div>
    </div>
  );
}