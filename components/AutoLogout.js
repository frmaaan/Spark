"use client";

import { useEffect, useCallback, useRef } from "react";
import { logout } from "@/lib/auth";

// 10 menit = 10 * 60 * 1000 = 600000 ms
const INACTIVITY_LIMIT = 600000; 

export default function AutoLogout() {
  const timeoutRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      // Waktu habis, logout otomatis
      await logout();
      window.location.href = "/login?error=" + encodeURIComponent("Sesi berakhir karena tidak ada aktivitas selama 10 menit.");
    }, INACTIVITY_LIMIT);
  }, []);

  useEffect(() => {
    // Jalankan timer pertama kali
    resetTimer();

    // Daftar event yang dianggap "aktivitas"
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];

    // Pasang listener
    const handleActivity = () => resetTimer();
    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [resetTimer]);

  return null; // Komponen ini tidak merender UI apa pun
}
