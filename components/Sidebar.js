"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Menu,
  X,
  HardHat,
  Settings,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

export default function Sidebar({ userName = "Admin", userRole = "USER", appName = "StacX SPKL" }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Filter menu items based on role
  const menuItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard, description: "Ringkasan & statistik" },
    { label: "Data Pengguna", href: "/pengguna", icon: Users, description: "Kelola data karyawan" },
    { label: "Input SPKL", href: "/spkl", icon: FileText, description: "Buat surat lembur" },
    ...(userRole === "ADMIN" ? [{ label: "Kelola Akun", href: "/akun", icon: ShieldCheck, description: "Manajemen akun login" }] : []),
    ...(userRole === "ADMIN" ? [{ label: "Pengaturan", href: "/settings", icon: Settings, description: "Konfigurasi sistem" }] : []),
  ];

  async function handleLogout() {
    const { logout } = await import("@/lib/auth");
    await logout();
    window.location.href = "/login";
  }

  return (
    <>
      {/* =========================================
          MOBILE TOP BAR (Header khusus HP)
          Ini mencegah tombol melayang menimpa teks
          ========================================= */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-[#e5e5e5] border-b-[3px] border-black z-30 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-white border-[3px] border-black p-1.5 rounded-none shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-black stroke-[3px]" />
          </button>

          {/* Judul mini di Top Bar agar tidak kosong */}
          <div className="flex items-center gap-2">
            <HardHat size={18} className="text-black" />
            <span className="font-black text-sm tracking-widest uppercase mt-0.5 truncate max-w-[150px]">{appName}</span>
          </div>
        </div>
      </div>

      {/* OVERLAY (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* =========================================
          SIDEBAR UTAMA
          ========================================= */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full
          w-[300px] bg-[#f0f0f0] flex flex-col
          border-r-[3px] border-black
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* LOGO AREA */}
        <div className="px-6 py-6 border-b-[3px] border-black bg-white flex-shrink-0 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black border-[3px] border-black shadow-[4px_4px_0px_0px_#a1a1aa] rounded-none flex items-center justify-center flex-shrink-0">
              <HardHat size={24} className="text-white" />
            </div>
            <div className="min-w-0 flex flex-col">
              <h1 className="text-base font-black text-black tracking-widest uppercase leading-none truncate max-w-[150px]" title={appName}>
                {appName}
              </h1>
              <p className="font-mono text-[10px] font-bold text-gray-500 uppercase mt-1 tracking-wider">
                Sistem Kerja Lembur
              </p>
            </div>
          </div>

          {/* Tombol Close (X) khusus mobile dipindah ke dalam Sidebar */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden bg-white border-[3px] border-black p-1 shadow-[2px_2px_0px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all rounded-none"
            aria-label="Close menu"
          >
            <X size={20} className="text-black stroke-[3px]" />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-6 py-10 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    relative flex items-center gap-4 px-4 py-4 rounded-none border-[3px] border-black
                    transition-all duration-200 group
                    ${isActive
                      ? "bg-black text-white translate-x-[4px] translate-y-[4px] shadow-none"
                      : "bg-white text-black shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#000]"
                    }
                  `}
                >
                  <Icon size={22} className={`flex-shrink-0 stroke-[2.5px] ${isActive ? "text-white" : "text-black"}`} />
                  <div className="min-w-0">
                    <span className="block text-sm font-black uppercase tracking-wider truncate">{item.label}</span>
                    <span className={`block font-mono text-[10px] font-bold uppercase truncate mt-0.5 ${isActive ? "text-gray-300" : "text-gray-500"}`}>{item.description}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t-[3px] border-black bg-white flex-shrink-0 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <Link 
              href="/profil"
              onClick={() => setIsOpen(false)}
              className="min-w-0 flex-1 pr-2 hover:opacity-70 transition-opacity group cursor-pointer"
              title="Profil Saya"
            >
              <div className="flex items-center gap-2">
                <UserCircle size={16} className="text-black flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="font-mono text-xs font-black text-black uppercase tracking-widest truncate block">
                  HI, {userName}
                </span>
              </div>
            </Link>
            <span className="font-mono text-[10px] font-bold bg-black text-white px-2 py-1 border-2 border-black flex-shrink-0">
              v.01.0.0
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="neu-btn bg-red-100 border-black hover:bg-red-200 text-black py-2 w-full text-xs flex justify-center shadow-[2px_2px_0px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
          >
            LOGOUT SISTEM
          </button>
        </div>
      </aside>
    </>
  );
}