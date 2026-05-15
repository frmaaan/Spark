"use client";

import { useCallback, useMemo } from "react";
import { Download, Users } from "lucide-react";

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

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
  const canonical = compact.replace(/[:.;,]+$/g, "");

  const knownMappings = {
    "SHIFT 6": "P6",
    "SHIFT 7": "P7",
    "SHIFT 8": "P8",
    "SHIFT 10": "P10",
    "SHIFT 14": "S14",
    "SHIFT 15": "S15",
    "CUTI": "CT",
    "CT": "CT",
    P6: "P6",
    P7: "P7",
    P8: "P8",
    P10: "P10",
    S14: "S14",
    S15: "S15",
    OFF: "OFF",
  };

  return knownMappings[canonical] ?? canonical;
}

function getShiftBadge(shift) {
  const value = normalizeShiftValue(shift);
  if (!value) return "-";
  return value;
}

function getShiftTextClass(shift) {
  const value = normalizeShiftValue(shift);
  if (!value) return "text-gray-400";
  if (value === "OFF") return "text-red-600";
  return "text-gray-800";
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

function getToday(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  if (now.getMonth() !== d.getMonth() || now.getFullYear() !== d.getFullYear()) return null;
  return now.getDate();
}

function isDailyWorker(row) {
  const fingerNumber = String(row?.nomorFinger ?? "").replace(/\D/g, "");
  return fingerNumber.length > 0 && fingerNumber.length < 9;
}

export default function SchedulePublicAdminView({ schedule }) {
  const totalDays = daysInMonth(schedule.monthStartDate);
  const today = useMemo(() => getToday(schedule.monthStartDate), [schedule.monthStartDate]);

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
        return { day: dayNum, label: holidayName };
      })
      .filter(Boolean);
  }, [holidayByDay, totalDays]);

  const spklRows = useMemo(() => {
    return schedule.rows
      .filter((row) => !isDailyWorker(row))
      .map((row) => {
        const results = redDateList.map((item) => {
          const shift = getDayShift(row, item.day);
          const earnedSpkl = Boolean(shift && shift !== "OFF");
          return { day: item.day, label: item.label, shift, earnedSpkl };
        });
        return { id: row.id, namaKaryawan: row.namaKaryawan, results };
      })
      .filter((row) => row.results.some((item) => item.earnedSpkl));
  }, [redDateList, schedule.rows]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body { background: white; }
          .team-print-root { padding: 0 !important; }
          .team-print-main { gap: 4px !important; }
          .team-print-bottom-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
            gap: 4px !important;
            align-items: start !important;
          }
          .team-print-bottom-grid > * {
            min-width: 0 !important;
          }
          /* Bottom sections (SPKL + Tanggal Merah) — kompak */
          .team-print-bottom-grid .team-print-section {
            padding: 5px !important;
          }
          .team-print-bottom-grid .team-print-title {
            font-size: 7px !important;
            margin-bottom: 3px !important;
          }
          .team-print-bottom-grid table th,
          .team-print-bottom-grid table td {
            padding: 2px 1px !important;
            font-size: 6px !important;
            line-height: 1.1 !important;
          }
          .team-print-bottom-grid .team-name {
            font-size: 6px !important;
          }
          /* Tanggal merah badges — lebih kecil */
          .team-print-bottom-grid span[title] {
            font-size: 6px !important;
            padding: 1px 4px !important;
            line-height: 1.3 !important;
          }
          /* Section padding umum (jadwal) */
          .team-print-section {
            padding: 6px !important;
          }
          .team-print-title {
            font-size: 8px !important;
            margin-bottom: 3px !important;
          }
          .team-print-note {
            font-size: 7px !important;
            margin-bottom: 4px !important;
          }
          .team-print-schedule { break-inside: avoid; page-break-inside: avoid; }
          .team-print-table { width: 100% !important; table-layout: fixed !important; }
          .team-print-table th,
          .team-print-table td {
            padding: 3px 1px !important;
            font-size: 6.5px !important;
            line-height: 1.1 !important;
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
            font-size: 6.8px !important;
            line-height: 1.1 !important;
            display: inline-block !important;
          }
          .team-print-table .team-name {
            font-size: 7px !important;
            line-height: 1.15 !important;
          }
        }
        @page { size: A4 landscape; margin: 8mm; }
      `}</style>

      <div className="min-h-screen bg-[#fafaf9] flex flex-col team-print-root p-4 md:p-6">
        <main className="team-print-main w-full max-w-none space-y-5">

          {/* Header bar — no print */}
          <div className="no-print bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Preview Jadwal Admin</p>
                <h1 className="text-2xl font-black uppercase">{schedule.teamName}</h1>
                <p className="text-sm font-bold text-gray-500">{formatMonth(schedule.monthStartDate)}</p>
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 bg-[#fde047] border-[2px] border-black rounded-lg font-black uppercase text-xs px-4 py-2 hover:bg-[#facc15] transition-colors shadow-[2px_2px_0px_0px_#000]"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>

          {/* ① JADWAL — full width, on top */}
          <div className="team-print-section bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] overflow-hidden team-print-schedule">
            <div className="bg-[#dcfce7] border-b-[3px] border-black px-5 py-3 flex items-center justify-center gap-2">
              <Users size={16} className="text-black" />
              <h2 className="team-print-title font-black uppercase text-sm text-center">
                Jadwal Tim {schedule.teamName} bulan {getMonthName(schedule.monthStartDate)}
              </h2>
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
                            {isToday && (
                              <span className="team-day-today no-print mt-1 text-[9px] bg-yellow-400 border border-yellow-600 px-1 rounded">
                                HARI INI
                              </span>
                            )}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {schedule.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="sticky left-0 z-10 px-3 py-2 font-black border-r-[2px] border-black bg-white">
                        <span className="team-name inline-flex items-center gap-1.5">{row.namaKaryawan}</span>
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
                            <span className={`team-shift-badge inline-block font-bold uppercase ${getShiftTextClass(shift)}`}>
                              {getShiftBadge(shift)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ② SPKL | Tanggal Merah — side by side below jadwal */}
          <div className="team-print-bottom-grid grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* SPKL Bulan Ini — kiri */}
            <div className="team-print-section bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] p-5 team-print-schedule overflow-x-auto">
              <p className="team-print-title text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">SPKL Bulan Ini</p>
              {spklRows.length === 0 ? (
                <p className="text-sm font-bold text-gray-500">Tidak ada SPKL pada bulan ini.</p>
              ) : (
                <table className="w-auto text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b-[2px] border-black">
                      <th className="px-3 py-2 text-left font-black uppercase tracking-wider border-r-[2px] border-black min-w-[180px]">
                        Nama Karyawan
                      </th>
                      {redDateList.map((item) => (
                        <th
                          key={`${item.day}-${item.label}`}
                          title={item.label}
                          className="px-2 py-2 text-center font-black border-r border-gray-300 min-w-[56px]"
                        >
                          <span className="flex flex-col items-center leading-tight">
                            <span className="text-sm">{item.day}</span>
                            <span className="text-[9px] uppercase tracking-widest">{item.label}</span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {spklRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-black border-r-[2px] border-black bg-white team-name">
                          {row.namaKaryawan}
                        </td>
                        {row.results.map((item) => (
                          <td
                            key={`${row.id}-${item.day}`}
                            className={`px-2 py-2 text-center border-r border-gray-200 font-black ${item.earnedSpkl ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}
                            title={`${item.label} · ${item.earnedSpkl ? "SPKL" : "Tidak dapat SPKL"}`}
                          >
                            {item.earnedSpkl ? "✓" : "x"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Tanggal Merah — kanan */}
            <div className="team-print-section bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] p-5 team-print-schedule">
              <p className="team-print-title text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Tanggal Merah Bulan Ini</p>
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

          </div>

        </main>
      </div>
    </>
  );
}