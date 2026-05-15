"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Loader2, Save, AlertTriangle, CheckCircle2, ArrowLeft, Copy, ExternalLink, CalendarDays } from "lucide-react";
import Link from "next/link";
import { saveSchedules } from "@/lib/actions/scheduleActions";
import Toast from "@/components/Toast";

const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function formatMonth(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

// Jumlah hari dalam sebulan
function daysInMonth(dateStr) {
  if (!dateStr) return 31;
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// Cek apakah hari ke-n adalah Minggu
function isSunday(dateStr, dayNum) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const dayDate = new Date(d.getFullYear(), d.getMonth(), dayNum);
  return dayDate.getDay() === 0;
}

const SHIFT_COLORS = {
  P6:  "bg-[#fef9c3] text-yellow-800",
  P7:  "bg-[#fef9c3] text-yellow-800",
  P8:  "bg-[#fef9c3] text-yellow-800",
  P10: "bg-[#fef9c3] text-yellow-800",
  S14: "bg-[#dbeafe] text-blue-800",
  S15: "bg-[#dbeafe] text-blue-800",
  OFF: "text-red-600 font-black",
  CT: "text-green-600 font-black",
  "":  "text-gray-300",
};

export default function ScheduleUploader() {
  const [stage, setStage] = useState("upload"); // upload | preview | done
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [hasErrors, setHasErrors] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  // ── Upload & Parse ────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setToast({ message: "Hanya file Excel (.xlsx / .xls) yang didukung", type: "error" });
      return;
    }

    setParsing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/jadwal/parse", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.success) {
        setToast({ message: data.error || "Gagal memproses file", type: "error" });
        return;
      }

      setGroups(data.groups);
      setHasErrors(data.hasErrors);
      setStage("preview");
    } catch (e) {
      setToast({ message: "Terjadi kesalahan saat memproses file", type: "error" });
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Save ─────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    // Filter hanya groups yang punya baris valid
    const validGroups = groups.map((g) => ({
      ...g,
      rows: g.rows.filter((r) => !r.error),
    })).filter((g) => g.rows.length > 0);

    const result = await saveSchedules({ groups: validGroups });
    if (result.success) {
      setResults(result.results);
      setStage("done");
      setToast({ message: `${result.results.length} jadwal berhasil disimpan!`, type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
    setSaving(false);
  }, [groups]);

  const copyLink = useCallback((slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`);
    setToast({ message: "Link berhasil disalin!", type: "success" });
  }, []);

  // ── Render: Upload Zone ───────────────────────────────────
  if (stage === "upload") {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4 border-b-[3px] border-black pb-6">
          <Link href="/jadwal" className="inline-flex items-center gap-2 bg-white border-[3px] border-black rounded-xl font-black uppercase text-xs px-4 py-2 shadow-[2px_2px_0px_0px_#000] hover:bg-gray-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
            <ArrowLeft size={16} /> Kembali
          </Link>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Upload Jadwal Shift</h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Unggah file Excel jadwal bulanan</p>
          </div>
        </div>

        <div
          className={`border-[4px] border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${dragging ? "border-black bg-[#fde047]" : "border-gray-300 bg-white hover:border-black hover:bg-[#fafaf9]"}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onInputChange} />
          {parsing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="animate-spin text-black" />
              <p className="font-black uppercase tracking-widest text-sm">Memproses file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-[#a5f3fc] border-[3px] border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_#000]">
                <Upload size={36} className="text-black" />
              </div>
              <div>
                <p className="font-black text-xl uppercase tracking-tight mb-2">Seret & Lepas File di Sini</p>
                <p className="font-bold text-sm text-gray-500">atau klik untuk memilih file</p>
                <p className="font-mono text-xs text-gray-400 mt-3">Format: .xlsx | .xls</p>
              </div>
            </div>
          )}
        </div>

        {/* Panduan format */}
        <div className="bg-white border-[3px] border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_#000]">
          <h3 className="font-black uppercase text-xs tracking-widest mb-3">Format Kolom Excel yang Diharapkan</h3>
          <div className="overflow-x-auto">
            <table className="text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  {["group_id","schedule_type","date","d_01","d_02","...","d_31"].map((h) => (
                    <th key={h} className="px-3 py-2 border border-gray-600 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50">
                  {["001","Lionel Messi","2026-05-01","SHIFT 6","OFF","...","SHIFT 14"].map((v, i) => (
                    <td key={i} className="px-3 py-2 border border-gray-200">{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs font-bold text-gray-500 mt-3">Kolom ShfPrdCgn1/2/3 dan count shift akan diabaikan otomatis.</p>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ── Render: Preview ───────────────────────────────────────
  if (stage === "preview") {
    const totalValid = groups.reduce((acc, g) => acc + g.rows.filter((r) => !r.error).length, 0);
    const totalError = groups.reduce((acc, g) => acc + g.rows.filter((r) => r.error).length, 0);

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 border-b-[3px] border-black pb-6">
          <button onClick={() => setStage("upload")} className="inline-flex items-center gap-2 bg-white border-[3px] border-black rounded-xl font-black uppercase text-xs px-4 py-2 shadow-[2px_2px_0px_0px_#000] hover:bg-gray-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
            <ArrowLeft size={16} /> Upload Ulang
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black uppercase tracking-tight">Preview Jadwal</h1>
            <div className="flex gap-3 mt-1">
              <span className="text-xs font-black text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded">{totalValid} baris valid</span>
              {totalError > 0 && <span className="text-xs font-black text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded">{totalError} baris error (akan dilewati)</span>}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || totalValid === 0}
            className="inline-flex items-center gap-2 bg-[#fde047] border-[3px] border-black rounded-xl font-black uppercase text-sm px-5 py-3 shadow-[4px_4px_0px_0px_#000] hover:bg-[#facc15] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Simpan & Buat Link
          </button>
        </div>

        {/* Tabel per grup tim */}
        {groups.map((group, gi) => {
          const days = daysInMonth(group.monthStartDate);
          return (
            <div key={gi} className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] overflow-hidden">
              {/* Group header */}
              <div className="bg-[#a5f3fc] border-b-[3px] border-black px-5 py-3 flex items-center gap-3">
                <CalendarDays size={18} />
                <h2 className="font-black uppercase text-sm">{group.teamName || "Tanpa Tim"}</h2>
                <span className="text-xs font-black text-gray-600">— {formatMonth(group.monthStartDate)}</span>
                <span className="ml-auto bg-white border-[2px] border-black px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  {group.rows.filter((r) => !r.error).length} valid · {group.rows.filter((r) => r.error).length} error
                </span>
              </div>

              {/* Scroll tabel */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b-[2px] border-black">
                      <th className="sticky left-0 z-10 bg-[#f8fafc] border-r-[2px] border-black px-3 py-2 text-left font-black uppercase tracking-wider min-w-[160px]">Nama Karyawan</th>
                      <th className="border-r-[2px] border-black px-2 py-2 font-black uppercase text-center min-w-[40px]">No Finger</th>
                      {Array.from({ length: days }, (_, i) => {
                        const dayNum = i + 1;
                        const sun = isSunday(group.monthStartDate, dayNum);
                        return (
                          <th
                            key={dayNum}
                            className={`px-1 py-2 font-black text-center min-w-[40px] ${sun ? "border-l-2 border-r-2 border-red-400 bg-red-50 text-red-600" : "border-r border-gray-200"}`}
                          >
                            {dayNum}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className={`border-b border-gray-100 ${row.error ? "bg-red-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit border-r-[2px] border-black px-3 py-1.5 font-bold">
                          {row.error ? (
                            <div className="flex items-start gap-1.5">
                              <AlertTriangle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="text-red-700">{row.namaKaryawan || "—"}</span>
                                <p className="text-[9px] font-bold text-red-500 leading-tight">{row.error}</p>
                              </div>
                            </div>
                          ) : row.namaKaryawan}
                        </td>
                        <td className="border-r-[2px] border-black px-2 py-1.5 text-center font-mono text-gray-500">{row.nomorFinger}</td>
                        {Array.from({ length: days }, (_, i) => {
                          const key = `d${String(i + 1).padStart(2, "0")}`;
                          const val = row.shifts?.[key] ?? "";
                          const sun = isSunday(group.monthStartDate, i + 1);
                          const colorClass = SHIFT_COLORS[val] ?? "text-gray-700";
                          return (
                            <td
                              key={i}
                              className={`px-1 py-1.5 text-center font-bold ${sun ? "border-l border-r border-red-200 bg-red-50/50" : "border-r border-gray-100"} ${colorClass}`}
                            >
                              {val || "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ── Render: Done ─────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] overflow-hidden">
        <div className="bg-[#dcfce7] border-b-[3px] border-black p-6 flex items-center gap-4">
          <CheckCircle2 size={32} className="text-green-700" />
          <div>
            <h2 className="text-xl font-black uppercase">Jadwal Berhasil Disimpan!</h2>
            <p className="text-sm font-bold text-gray-600">{results.length} jadwal dibuat · Bagikan link di bawah</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {results.map((r, i) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${r.slug}`;
            return (
              <div key={i} className="border-[2px] border-black rounded-xl p-4 bg-[#f8fafc]">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Tim ID: {r.teamId ?? "Tanpa Tim"}</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`/s/${r.slug}`}
                    className="flex-1 border-[2px] border-black rounded-lg px-3 py-2 font-mono text-sm bg-white"
                  />
                  <button
                    onClick={() => copyLink(r.slug)}
                    className="inline-flex items-center gap-1.5 bg-[#dcfce7] border-[2px] border-black rounded-lg font-black uppercase text-[10px] px-3 py-2 hover:bg-[#bbf7d0] shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    <Copy size={12} /> Salin
                  </button>
                  <a
                    href={`/s/${r.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-[#e0e7ff] border-[2px] border-black rounded-lg font-black uppercase text-[10px] px-3 py-2 hover:bg-[#c7d2fe] shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    <ExternalLink size={12} /> Buka
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t-[3px] border-black p-5 flex gap-3">
          <Link href="/jadwal" className="flex-1 inline-flex items-center justify-center gap-2 bg-black text-white border-[3px] border-black rounded-xl font-black uppercase text-sm py-3 hover:bg-gray-800 transition-colors">
            Lihat Semua Jadwal
          </Link>
          <button onClick={() => { setStage("upload"); setGroups([]); setResults([]); }} className="flex-1 inline-flex items-center justify-center gap-2 bg-white border-[3px] border-black rounded-xl font-black uppercase text-sm py-3 hover:bg-gray-100 shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
            <Upload size={18} /> Upload Lagi
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
