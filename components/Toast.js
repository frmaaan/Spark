// =============================================================
// 📚 TOAST — Komponen Notifikasi Sementara
// =============================================================
//
// KONSEP: Reusable Component
// 
// Toast adalah notifikasi kecil yang muncul sebentar lalu hilang.
// Kita buat sebagai komponen terpisah agar bisa dipakai di mana saja.
//
// KONSEP: useEffect untuk Side Effects
// useEffect digunakan untuk operasi yang bukan rendering:
// - Timer (setTimeout)
// - API calls
// - DOM manipulation
// Kita gunakan untuk auto-hide toast setelah 3 detik.
//
// KONSEP: Conditional Rendering
// {toast && <Toast ... />} → Hanya render jika toast ada nilai
// =============================================================

"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";

/**
 * Props:
 * - message: string → Teks notifikasi
 * - type: "success" | "error" → Jenis notifikasi
 * - onClose: function → Callback saat toast ditutup
 */
export default function Toast({ message, type = "success", onClose }) {
  // useEffect dengan dependency [onClose]:
  // - Jalankan saat komponen muncul (mount)
  // - Set timer 3 detik, lalu panggil onClose
  // - Return cleanup function → clear timer jika komponen
  //   unmount sebelum 3 detik (mencegah memory leak)
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    // Cleanup: batalkan timer jika komponen unmount
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast ${type === "success" ? "toast-success" : "toast-error"}`}>
      {type === "success" ? (
        <CheckCircle size={18} />
      ) : (
        <XCircle size={18} />
      )}
      {message}
    </div>
  );
}
