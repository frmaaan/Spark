"use client";

import { useState, useCallback, useMemo } from "react";
import { Search, AlertTriangle, Download, CalendarDays, Sun, Moon, Clock, Users, User } from "lucide-react";

const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAYS_FULL_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const DAYS_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

function formatMonth(dateStr) {
  const d = new Date(dateStr);
  return `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonthName(dateStr) {
  const d = new Date(dateStr);
  return MONTHS_ID[d.getMonth()];
}

function normalizeShiftValue(rawShift) {
  if (!rawShift) return "";
  const value = String(rawShift).trim().toUpperCase();
  const compact = value.replace(/\s+/g, " ");

  const knownMappings = {
    "SHIFT 6": "P6",
    "SHIFT 7": "P7",
    "SHIFT 8": "P8",
    "SHIFT 10": "P10",
    "SHIFT 14": "S14",
    "SHIFT 15": "S15",
    P6: "P6",
    P7: "P7",
    P8: "P8",
    P10: "P10",
    S14: "S14",
    S15: "S15",
    OFF: "OFF",
  };

  return knownMappings[compact] ?? compact;
}

function getShiftIcon(shift) {
  const value = normalizeShiftValue(shift);
  if (!value || value === "OFF") return null;
  if (value.startsWith("P")) return <Sun size={14} className="text-yellow-500" />;
  if (value.startsWith("S")) return <Moon size={14} className="text-blue-500" />;
  return <Clock size={14} className="text-gray-500" />;
}

function getShiftColor(shift) {
  const value = normalizeShiftValue(shift);
  switch (value) {
    case "P6":
      return "bg-amber-100 text-amber-900 border-amber-400";
    case "P7":
      return "bg-emerald-100 text-emerald-900 border-emerald-400";
    case "P8":
      return "bg-cyan-100 text-cyan-900 border-cyan-400";
    case "P10":
      return "bg-orange-100 text-orange-900 border-orange-400";
    case "S14":
      return "bg-blue-100 text-blue-900 border-blue-400";
    case "S15":
      return "bg-violet-100 text-violet-900 border-violet-400";
    case "OFF":
      return "bg-rose-100 text-red-300 border-rose-300";
    case "":
      return "bg-gray-50 text-gray-500 border-gray-200";
    default:
      if (value.startsWith("P")) return "bg-yellow-50 text-yellow-800 border-yellow-300";
      if (value.startsWith("S")) return "bg-sky-50 text-sky-800 border-sky-300";
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

function getShiftBadge(shift) {
  const value = normalizeShiftValue(shift);
  if (!value) return "-";
  return value;
}

function getShiftAccentClass(shift) {
  const value = normalizeShiftValue(shift);
  switch (value) {
    case "P6":
      return "shadow-[0_0_0_1px_rgba(217,119,6,0.25)]";
    case "P7":
      return "shadow-[0_0_0_1px_rgba(5,150,105,0.25)]";
    case "P8":
      return "shadow-[0_0_0_1px_rgba(8,145,178,0.25)]";
    case "P10":
      return "shadow-[0_0_0_1px_rgba(249,115,22,0.25)]";
    case "S14":
      return "shadow-[0_0_0_1px_rgba(37,99,235,0.25)]";
    case "S15":
      return "shadow-[0_0_0_1px_rgba(139,92,246,0.25)]";
    case "OFF":
      return "shadow-[0_0_0_1px_rgba(244,63,94,0.2)]";
    default:
      return "shadow-[0_0_0_1px_rgba(148,163,184,0.18)]";
  }
}

function getShiftTextClass(shift) {
  const value = normalizeShiftValue(shift);
  if (!value) return "text-gray-400";
  if (value === "OFF") return "text-red-600";
  return "text-gray-800";
}

function isSunday(dateStr, dayNum) {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), dayNum).getDay() === 0;
}

function daysInMonth(dateStr) {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function getDayShift(row, dayNum) {
  const key = `d${String(dayNum).padStart(2, "0")}`;
  return normalizeShiftValue(row?.shifts?.[key] ?? "");
}

function getDayName(dateStr, dayNum) {
  const d = new Date(dateStr);
  const date = new Date(d.getFullYear(), d.getMonth(), dayNum);
  return DAYS_ID[date.getDay()];
}

function getDayFullName(dateStr, dayNum) {
  const d = new Date(dateStr);
  const date = new Date(d.getFullYear(), d.getMonth(), dayNum);
  return DAYS_FULL_ID[date.getDay()];
}

function getTodayAndTomorrow(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const today = now.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  if (now.getMonth() !== month || now.getFullYear() !== year) return { today: null, tomorrow: null };
  const tomorrow = today + 1;
  const maxDays = daysInMonth(dateStr);
  return {
    today: today <= maxDays ? today : null,
    tomorrow: tomorrow <= maxDays ? tomorrow : null,
  };
}

export default function SchedulePublicView({ schedule }) {
  const [nameInput, setNameInput] = useState("");
  const [searchedName, setSearchedName] = useState("");
  const [foundRow, setFoundRow] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [verified, setVerified] = useState(false);
  const [viewMode, setViewMode] = useState("team");

  const handleSearch = useCallback(() => {
    if (!nameInput.trim()) return;
    const q = nameInput.trim().toLowerCase();
    const match = schedule.rows.find((r) =>
      r.namaKaryawan.toLowerCase().includes(q)
    );
    setSearchedName(nameInput.trim());
    if (match) {
      setFoundRow(match);
      setNotFound(false);
      setVerified(true);
      setViewMode("team");
    } else {
      setFoundRow(null);
      setNotFound(true);
    }
  }, [nameInput, schedule.rows]);

  const { today, tomorrow } = useMemo(() => getTodayAndTomorrow(schedule.monthStartDate), [schedule.monthStartDate]);
  const totalDays = daysInMonth(schedule.monthStartDate);

  const holidayByDay = useMemo(() => {
    const map = {};
    for (const holiday of schedule.redDates || []) {
      if (holiday?.day) map[holiday.day] = holiday.name;
    }
    return map;
  }, [schedule.redDates]);

  const redDateList = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => i + 1)
      .map((dayNum) => {
        const holidayName = holidayByDay[dayNum] || "";
        if (!holidayName) return null;
        return {
          day: dayNum,
          label: holidayName,
        };
      })
      .filter(Boolean);
  }, [holidayByDay, schedule.monthStartDate, totalDays]);

  const handlePrint = useCallback(() => {
    if (viewMode !== "team") {
      setViewMode("team");
      setTimeout(() => window.print(), 150);
      return;
    }
    window.print();
  }, [viewMode]);

  const handleReset = useCallback(() => {
    setNameInput("");
    setSearchedName("");
    setFoundRow(null);
    setNotFound(false);
    setVerified(false);
    setViewMode("");
  }, []);

  const isMatchedEmployee = useCallback((row) => {
    if (!foundRow) return false;
    if (row.id && foundRow.id) return row.id === foundRow.id;
    return row.namaKaryawan === foundRow.namaKaryawan;
  }, [foundRow]);

  const scheduleControls = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {verified && (
        <>
          <button
            onClick={() => setViewMode("team")}
            className={`inline-flex items-center gap-2 border-[2px] border-black rounded-lg font-black uppercase text-xs px-4 py-2 transition-colors shadow-[2px_2px_0px_0px_#000] ${viewMode === "team" ? "bg-[#dcfce7] text-black" : "bg-white text-black hover:bg-[#f3f4f6]"}`}
          >
            <Users size={14} /> Jadwal Tim 
          </button>
          <button
            onClick={() => setViewMode("personal")}
            className={`inline-flex items-center gap-2 border-[2px] border-black rounded-lg font-black uppercase text-xs px-4 py-2 transition-colors shadow-[2px_2px_0px_0px_#000] ${viewMode === "personal" ? "bg-[#dbeafe] text-black" : "bg-white text-black hover:bg-[#f3f4f6]"}`}
          >
            <User size={14} /> Detail Pribadi
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 bg-[#fde047] text-black border-[2px] border-black rounded-lg font-black uppercase text-xs px-4 py-2 hover:bg-[#facc15] transition-colors shadow-[2px_2px_0px_0px_#000]"
          >
            Ganti Nama
          </button>
        </>
      )}
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 bg-[#fde047] border-[2px] border-black rounded-lg font-black uppercase text-xs px-4 py-2 hover:bg-[#facc15] transition-colors shadow-[2px_2px_0px_0px_#000]"
      >
        <Download size={14} /> Download PDF
      </button>
    </div>
  );

  // ── Stage 1: Name Input ────────────────────────────────
  if (!verified) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#a5f3fc] border-[3px] border-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_#000]">
              <CalendarDays size={32} className="text-black" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Jadwal Shift</h1>
            <p className="text-sm font-bold text-gray-500 mt-1">{schedule.teamName} · {formatMonth(schedule.monthStartDate)}</p>
          </div>

          <div className="bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] p-6">
            <label className="block font-black uppercase text-xs mb-3 text-gray-700">Masukkan Nama Anda</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setNotFound(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Contoh: Budi"
              className="w-full border-[3px] border-black p-3 font-semibold rounded-lg bg-white focus:bg-[#fefce8] outline-none transition-colors shadow-[2px_2px_0px_0px_#000] mb-4"
              autoFocus
            />

            {notFound && (
              <div className="flex items-center gap-2 bg-red-50 border-[2px] border-red-400 rounded-lg p-3 mb-4">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm font-bold text-red-700">
                  Nama &quot;{searchedName}&quot; tidak ditemukan dalam jadwal ini.
                </p>
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={!nameInput.trim()}
              className="w-full bg-[#fde047] border-[3px] border-black rounded-xl font-black uppercase py-3 flex items-center justify-center gap-2 hover:bg-[#facc15] shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
            >
              <Search size={18} /> Cari Jadwal Saya
            </button>
          </div>

          <p className="text-center text-xs font-bold text-gray-400 mt-6 uppercase tracking-widest">
            Nama akan dicocokkan sebagian (partial match)
          </p>
        </div>
      </div>
    );
  }

  // ── Stage 3A: Personal Schedule View ──────────────────────
  if (viewMode === "personal") {
    return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-full { max-width: 100% !important; width: 100% !important; }
        }
        @page { size: A4 landscape; margin: 10mm; }
      `}</style>

      <div className="min-h-screen bg-[#fafaf9] flex flex-col print-full">
        {/* Header */}
        <header className="no-print bg-[#111827] border-b-[3px] border-black px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#a5f3fc] border-[2px] border-black flex items-center justify-center rounded">
              <CalendarDays size={16} className="text-black" />
            </div>
            <span className="text-white font-black text-sm uppercase tracking-widest">Jadwal Shift</span>
          </div>
          {scheduleControls}
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6 print-full">
          {/* Judul cetak */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-black uppercase">Jadwal Shift — {schedule.teamName}</h1>
            <p className="text-sm font-bold">{formatMonth(schedule.monthStartDate)} · {foundRow.namaKaryawan}</p>
          </div>

          {/* Nama & bulan */}
          <div className="no-print bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Jadwal untuk</p>
            <h2 className="text-2xl font-black uppercase">{foundRow.namaKaryawan}</h2>
            <p className="text-sm font-bold text-gray-500">{schedule.teamName} · {formatMonth(schedule.monthStartDate)}</p>
          </div>

          {/* Hari Ini & Besok */}
          {(today || tomorrow) && (
            <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-4">
              {today && (
                <div className={`border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_#000] ${getShiftColor(getDayShift(foundRow, today))}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Hari ini Anda masuk</p>
                  <div className="flex items-center gap-2">
                    {getShiftIcon(getDayShift(foundRow, today))}
                    <span className={`text-2xl font-black ${getShiftTextClass(getDayShift(foundRow, today))}`}>{getDayShift(foundRow, today) || "—"}</span>
                  </div>
                  <p className="text-sm font-bold mt-1">{getDayName(schedule.monthStartDate, today)}, {today}</p>
                  {getDayShift(foundRow, today) === "OFF" && <p className="text-sm font-bold mt-1">Hari Libur / Day Off</p>}
                </div>
              )}
              {tomorrow && (
                <div className={`border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_#000] ${getShiftColor(getDayShift(foundRow, tomorrow))} opacity-80`}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Besok Anda masuk</p>
                  <div className="flex items-center gap-2">
                    {getShiftIcon(getDayShift(foundRow, tomorrow))}
                    <span className={`text-2xl font-black ${getShiftTextClass(getDayShift(foundRow, tomorrow))}`}>{getDayShift(foundRow, tomorrow) || "—"}</span>
                  </div>
                  <p className="text-sm font-bold mt-1">{getDayName(schedule.monthStartDate, tomorrow)}, {tomorrow}</p>
                </div>
              )}
            </div>
          )}

          {/* Tabel lengkap 31 hari */}
          <div className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] overflow-hidden">
            <div className="bg-[#a5f3fc] border-b-[3px] border-black px-5 py-3">
              <h3 className="font-black uppercase text-sm">Jadwal Lengkap — {formatMonth(schedule.monthStartDate)}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b-[2px] border-black">
                    <th className="px-3 py-2 text-left font-black uppercase tracking-wider border-r-[2px] border-black">Tgl</th>
                    <th className="px-3 py-2 text-left font-black uppercase tracking-wider border-r-[2px] border-black">Hari</th>
                    <th className="px-3 py-2 text-left font-black uppercase tracking-wider">Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: totalDays }, (_, i) => {
                    const dayNum = i + 1;
                    const sun = isSunday(schedule.monthStartDate, dayNum);
                    const shift = getDayShift(foundRow, dayNum);
                    const isToday = dayNum === today;
                    return (
                      <tr
                        key={dayNum}
                        className={`border-b border-gray-100 ${sun ? "bg-red-50" : isToday ? "bg-yellow-50" : "hover:bg-gray-50"}`}
                      >
                        <td className={`px-3 py-1.5 font-black border-r-[2px] border-black ${sun ? "text-red-600" : isToday ? "text-yellow-700" : ""}`}>
                          <span className="inline-flex items-center gap-1">
                            {dayNum}
                            {isToday && <span className="text-[9px] bg-yellow-400 border border-yellow-600 px-1 rounded">HARI INI</span>}
                          </span>
                        </td>
                        <td className={`px-3 py-1.5 font-bold border-r-[2px] border-black ${sun ? "text-red-600" : ""}`}>
                          <span className="inline-flex flex-col leading-tight">
                            <span>{getDayName(schedule.monthStartDate, dayNum)}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{getDayFullName(schedule.monthStartDate, dayNum)}</span>
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-block font-bold uppercase ${getShiftTextClass(shift)}`}>{getShiftBadge(shift)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="no-print border-t-[3px] border-black bg-[#111827] px-6 py-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 text-center">
            Jadwal ini dibagikan via sistem · {schedule.teamName} · {formatMonth(schedule.monthStartDate)}
          </p>
        </footer>
      </div>
    </>
    );
  }

  // ── Stage 3B: Team Schedule View ──────────────────────────
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .team-print-root { padding: 0 !important; }
          .team-print-schedule { break-inside: avoid; page-break-inside: avoid; }
          .team-print-table { width: 100% !important; table-layout: fixed !important; }
          .team-print-table th,
          .team-print-table td {
            padding: 2px 1px !important;
            font-size: 7px !important;
            line-height: 1.15 !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
          }
          .team-print-table .sticky {
            position: static !important;
          }
          .team-print-table .team-day-today {
            display: none !important;
          }
          .team-print-table th:first-child,
          .team-print-table td:first-child {
            width: 30mm !important;
            min-width: 30mm !important;
            max-width: 30mm !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .team-print-table th:not(:first-child),
          .team-print-table td:not(:first-child) {
            min-width: 0 !important;
            width: auto !important;
          }
          .team-print-table .team-shift-badge {
            min-width: 0 !important;
            font-size: 6.5px !important;
            line-height: 1.1 !important;
            display: inline-block !important;
          }
        }
        @page { size: A4 landscape; margin: 8mm; }
      `}</style>

      <div className="min-h-screen bg-[#fafaf9] flex flex-col team-print-root">
        <header className="no-print bg-[#111827] border-b-[3px] border-black px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#dcfce7] border-[2px] border-black flex items-center justify-center rounded">
              <Users size={16} className="text-black" />
            </div>
            <span className="text-white font-black text-sm uppercase tracking-widest">Jadwal Tim {schedule.teamName}</span>
          </div>
          {scheduleControls}
        </header>

        <main className="flex-1 w-full px-4 py-6 space-y-5">
          

          <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-4">
            {today && (
              <div className={`border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_#000] ${getShiftColor(getDayShift(foundRow, today))}`}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Hari ini Anda masuk</p>
                <div className="flex items-center gap-2">
                  {getShiftIcon(getDayShift(foundRow, today))}
                  <span className={`text-2xl font-black ${getShiftTextClass(getDayShift(foundRow, today))}`}>{getShiftBadge(getDayShift(foundRow, today)) || "—"}</span>
                </div>
                <p className="text-sm font-bold mt-1">{getDayName(schedule.monthStartDate, today)}, {today}</p>
              </div>
            )}
            {tomorrow && (
              <div className={`border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_#000] ${getShiftColor(getDayShift(foundRow, tomorrow))}`}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Besok Anda masuk</p>
                <div className="flex items-center gap-2">
                  {getShiftIcon(getDayShift(foundRow, tomorrow))}
                  <span className={`text-2xl font-black ${getShiftTextClass(getDayShift(foundRow, tomorrow))}`}>{getShiftBadge(getDayShift(foundRow, tomorrow)) || "—"}</span>
                </div>
                <p className="text-sm font-bold mt-1">{getDayName(schedule.monthStartDate, tomorrow)}, {tomorrow}</p>
              </div>
            )}
          </div>

          <div className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] p-5 team-print-schedule">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Tanggal Merah Bulan Ini</p>
            {redDateList.length === 0 ? (
              <p className="text-sm font-bold text-gray-500">Tidak ada tanggal merah terdeteksi.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {redDateList.map((item) => (
                  <span
                    key={`${item.day}-${item.label}`}
                    className="inline-flex items-center gap-2 bg-red-50 border-[2px] border-red-400 text-red-700 rounded-full px-3 py-1 text-xs font-black"
                    title={item.label}
                  >
                    {item.day} · {item.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] overflow-hidden team-print-schedule">
            <div className="bg-[#dcfce7] border-b-[3px] border-black px-5 py-3">
              <h2 className="font-black uppercase text-sm text-center">Jadwal Tim {schedule.teamName} bulan {getMonthName(schedule.monthStartDate)}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse team-print-table">
                <thead>
                  <tr className="bg-[#f8fafc] border-b-[2px] border-black">
                    <th className="sticky left-0 z-20 bg-[#f8fafc] px-3 py-2 text-left font-black uppercase tracking-wider border-r-[2px] border-black min-w-[220px]">
                      Nama Karyawan
                    </th>
                    {Array.from({ length: totalDays }, (_, i) => {
                      const dayNum = i + 1;
                      const holidayName = holidayByDay[dayNum] || "";
                      const isToday = dayNum === today;
                      const isRed = Boolean(holidayName);
                      return (
                        <th
                          key={dayNum}
                          title={holidayName}
                          className={`px-2 py-2 text-center font-black border-r border-gray-300 min-w-[56px] ${isRed ? "bg-red-100 text-red-700" : ""} ${isToday ? "bg-yellow-100 text-yellow-800" : ""}`}
                        >
                          <span className="flex flex-col items-center leading-tight">
                            <span className="text-sm">{dayNum}</span>
                            <span className="text-[9px] uppercase tracking-widest">{getDayName(schedule.monthStartDate, dayNum)}</span>
                            {isToday && <span className="team-day-today no-print mt-1 text-[9px] bg-yellow-400 border border-yellow-600 px-1 rounded">HARI INI</span>}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {schedule.rows.map((row) => {
                    const matched = isMatchedEmployee(row);
                    return (
                      <tr key={row.id} className={`border-b border-gray-100 ${matched ? "bg-yellow-50" : "hover:bg-gray-50"}`}>
                        <td className={`sticky left-0 z-10 px-3 py-2 font-black border-r-[2px] border-black ${matched ? "bg-yellow-100" : "bg-white"}`}>
                          <span className="inline-flex items-center gap-1.5">
                            {row.namaKaryawan}
                            {matched && <span className="text-[9px] bg-yellow-300 border border-yellow-600 px-1 rounded">ANDA</span>}
                          </span>
                        </td>
                        {Array.from({ length: totalDays }, (_, i) => {
                          const dayNum = i + 1;
                          const shift = getDayShift(row, dayNum);
                          const holidayName = holidayByDay[dayNum] || "";
                          const isToday = dayNum === today;
                          const isRed = Boolean(holidayName);
                          return (
                            <td
                              key={`${row.id}-${dayNum}`}
                              title={holidayName}
                              className={`px-1 py-1 text-center border-r border-gray-200 font-bold ${isRed ? "bg-red-50" : ""} ${isToday ? "bg-yellow-50" : ""}`}
                            >
                              <span className={`team-shift-badge inline-block font-bold uppercase ${getShiftTextClass(shift)}`}>{getShiftBadge(shift)}</span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
