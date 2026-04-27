"use client";

import { useState } from "react";
import { Loader2, Pencil, Trash2, Download, FileText, CheckCircle2, Clock, User } from "lucide-react";
import { exportSpklToExcel } from "@/lib/excelExport";

import ConfirmModal from "./ConfirmModal";

export default function SpklHistory({ spklList, userRole, loading, onEdit, onDelete }) {
  const [deletingId, setDeletingId] = useState(null);
  const [filterMonth, setFilterMonth] = useState("ALL");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: null });

  function openConfirmDelete(id) {
    setConfirmState({ isOpen: true, id });
  }

  async function handleDeleteConfirm() {
    const id = confirmState.id;
    setConfirmState({ isOpen: false, id: null });

    if (!id) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  }

  function handleDownload(spkl) {
    if (spkl.rows && spkl.rows.length > 0) {
      exportSpklToExcel(spkl.rows);
    } else {
      alert("Tidak ada baris data pada SPKL ini.");
    }
  }

  const filteredList = spklList.filter(spkl => {
    const dateObj = new Date(spkl.createdAt);
    const m = (dateObj.getMonth() + 1).toString();
    const y = dateObj.getFullYear().toString();

    if (filterMonth !== "ALL" && m !== filterMonth) return false;
    if (filterYear !== "ALL" && y !== filterYear) return false;
    return true;
  });

  function handleExportBulanan() {
    const allRows = [];
    filteredList.forEach(spkl => {
      if (spkl.status === "FINAL" && spkl.rows) {
        allRows.push(...spkl.rows);
      }
    });

    if (allRows.length === 0) {
      alert("Tidak ada data SPKL berstatus FINAL untuk diekspor pada filter ini.");
      return;
    }

    exportSpklToExcel(allRows);
  }

  if (loading) {
    return (
      <div className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl p-8 flex items-center justify-center gap-3">
        <Loader2 size={20} className="animate-spin text-primary" />
        <span className="text-sm text-text-muted">Memuat histori SPKL...</span>
      </div>
    );
  }

  if (spklList.length === 0) {
    return (
      <div className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl p-10 text-center animate-fade-in-up mt-8">
        <FileText size={36} className="mx-auto text-text-light mb-3" />
        <h3 className="text-sm font-black text-text-dark uppercase tracking-tight mb-1">
          BELUM ADA HISTORI SPKL
        </h3>
        <p className="text-xs text-text-muted">
          Dokumen SPKL yang Anda simpan akan muncul di sini.
        </p>
      </div>
    );
  }

  // Generate opsi tahun unik dari list SPKL (minimal tahun ini)
  const availableYears = [...new Set(spklList.map(s => new Date(s.createdAt).getFullYear().toString()))];
  if (!availableYears.includes(new Date().getFullYear().toString())) {
    availableYears.push(new Date().getFullYear().toString());
  }

  return (
    <div className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up overflow-hidden mt-8">
      {/* Header & Filter */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <p className="brutal-label mb-1">HISTORI DOKUMEN SPKL</p>
            <h2 className="text-lg font-black text-text-dark uppercase tracking-tight">
              DAFTAR TERSIMPAN
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="neu-select py-1.5 text-xs w-32"
            >
              <option value="ALL">Semua Bulan</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m.toString()}>{new Date(2000, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="neu-select py-1.5 text-xs w-24"
            >
              <option value="ALL">Semua Tahun</option>
              {availableYears.sort((a, b) => b - a).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={handleExportBulanan}
              className="neu-btn neu-btn-success text-xs py-1.5 flex items-center gap-2 ml-2"
            >
              <Download size={14} /> EXPORT LAPORAN
            </button>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-primary-light mb-4" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y-2 border-primary bg-surface-light">
              <th className="text-left px-8 py-4 brutal-label w-16">ID</th>
              <th className="text-left px-8 py-4 brutal-label">TANGGAL DIBUAT</th>
              <th className="text-left px-8 py-4 brutal-label">JML BARIS</th>
              <th className="text-left px-8 py-4 brutal-label">DIBUAT OLEH</th>
              <th className="text-left px-8 py-4 brutal-label">STATUS</th>
              <th className="text-right px-8 py-4 brutal-label">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-8 text-center text-sm font-medium text-text-muted">
                  Tidak ada data yang sesuai dengan filter.
                </td>
              </tr>
            ) : filteredList.map((spkl, index) => {
              const dateObj = new Date(spkl.createdAt);
              const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

              const isDraft = spkl.status === "DRAFT";

              return (
                <tr
                  key={spkl.id}
                  className="hover:bg-surface-light transition-colors animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <td className="px-8 py-4 font-mono text-xs font-bold text-text-dark">
                    #{spkl.id}
                  </td>
                  <td className="px-8 py-4 font-mono text-xs text-text-muted">
                    {formattedDate}
                  </td>
                  <td className="px-8 py-4 text-xs font-semibold text-text-dark">
                    {spkl._count?.rows || spkl.rows?.length || 0} baris
                  </td>
                  <td className="px-8 py-4 text-xs font-medium text-text-dark">
                    {spkl.account?.nama || "Sistem"}
                  </td>
                  <td className="px-8 py-4">
                    {isDraft ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-[10px] font-bold tracking-widest">
                        <Clock size={10} /> DRAFT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 border border-green-300 rounded text-[10px] font-bold tracking-widest">
                        <CheckCircle2 size={10} /> FINAL
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isDraft ? (
                        <button
                          onClick={() => onEdit(spkl)}
                          className="neu-btn bg-yellow-400 border-text-dark text-text-dark text-xs px-3 py-1.5 hover:bg-yellow-500"
                          title="Edit Draft"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownload(spkl)}
                          className="neu-btn neu-btn-primary text-xs px-3 py-1.5"
                          title="Download Excel"
                        >
                          <Download size={13} /> Excel
                        </button>
                      )}

                      {(isDraft || userRole === "ADMIN") && (
                        <button
                          onClick={() => openConfirmDelete(spkl.id)}
                          disabled={deletingId === spkl.id}
                          className="neu-btn neu-btn-danger text-xs px-3 py-1.5 disabled:opacity-50"
                          title="Hapus SPKL"
                        >
                          {deletingId === spkl.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="h-2" />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title="Hapus SPKL"
        message="Yakin ingin menghapus dokumen SPKL ini?&#10;Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmState({ isOpen: false, id: null })}
      />
    </div>
  );
}
