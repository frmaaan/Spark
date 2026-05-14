"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { CalendarDays, Upload, Trash2, Link2, Link2Off, Loader2, Users, Copy, ExternalLink } from "lucide-react";
import { deleteSchedule } from "@/lib/actions/scheduleActions";
import Toast from "@/components/Toast";

const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function formatMonth(dateStr) {
  const d = new Date(dateStr);
  return `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ScheduleListClient({ schedules: initialSchedules }) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const handleDelete = useCallback(async (id) => {
    if (!confirm("Hapus jadwal ini? Semua data dan link share akan nonaktif.")) return;
    setDeletingId(id);
    const result = await deleteSchedule(id);
    if (result.success) {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      setToast({ message: "Jadwal berhasil dihapus", type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
    setDeletingId(null);
  }, []);

  const copyLink = useCallback((slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`);
    setToast({ message: "Link berhasil disalin!", type: "success" });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-5 border-b-[3px] border-black pb-6">
        <div className="w-14 h-14 bg-[#a5f3fc] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] rounded-lg flex items-center justify-center flex-shrink-0">
          <CalendarDays size={28} className="text-black" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-black uppercase tracking-tight mb-1">Jadwal Shift</h1>
          <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">Manajemen Jadwal Bulanan Per Tim</p>
        </div>
        <Link
          href="/jadwal/upload"
          className="inline-flex items-center gap-2 bg-[#fde047] border-[3px] border-black rounded-xl font-black uppercase text-sm px-5 py-3 shadow-[4px_4px_0px_0px_#000] hover:bg-[#facc15] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
        >
          <Upload size={18} /> Upload Jadwal Baru
        </Link>
      </div>

      {/* List */}
      {schedules.length === 0 ? (
        <div className="bg-white border-[3px] border-black rounded-2xl p-16 text-center shadow-[4px_4px_0px_0px_#000]">
          <div className="w-16 h-16 bg-[#f3f4f6] border-[3px] border-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_#000]">
            <CalendarDays size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight">Belum Ada Jadwal</h3>
          <p className="text-sm font-medium text-gray-500 mt-2">Upload file Excel untuk memulai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] transition-all flex flex-col overflow-hidden"
            >
              {/* Card header */}
              <div className="bg-[#a5f3fc] border-b-[3px] border-black p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">Jadwal Bulan</p>
                <h2 className="text-lg font-black uppercase">{formatMonth(s.monthStartDate)}</h2>
              </div>

              {/* Card body */}
              <div className="p-4 flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Users size={14} />
                  <span>{s.teamName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#dbeafe] border-[2px] border-black px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    {s.rowCount} Karyawan
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    oleh {s.createdByName}
                  </span>
                </div>

                {/* Share link status */}
                {s.publicSlug ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyLink(s.publicSlug)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#dcfce7] border-[2px] border-black rounded-lg font-black uppercase text-[10px] py-2 px-3 hover:bg-[#bbf7d0] transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                      <Copy size={12} /> Salin Link
                    </button>
                    <a
                      href={`/s/${s.publicSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 bg-[#e0e7ff] border-[2px] border-black rounded-lg font-black uppercase text-[10px] py-2 px-3 hover:bg-[#c7d2fe] transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-400">
                    <Link2Off size={12} /> Belum di-share
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="border-t-[3px] border-black p-3 flex justify-end">
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="inline-flex items-center gap-1.5 bg-[#ef4444] text-white border-[2px] border-black rounded-lg font-black uppercase text-[10px] py-2 px-3 hover:bg-[#dc2626] shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                >
                  {deletingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
