"use client";

import { useState, useEffect } from "react";
import {
  Save,
  FileSpreadsheet,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Pencil,
  X,
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";

function createEmptyRow() {
  return {
    id: Date.now() + Math.random(),
    userId: "",
    tanggal: "",
    keterangan: "",
  };
}

export default function SpklForm({ users, loading, onSave, editingSpkl, onCancelEdit }) {
  const [rows, setRows] = useState([createEmptyRow()]);
  const [savingStatus, setSavingStatus] = useState(null); // 'DRAFT' atau 'FINAL'
  
  // Confirm Modal state
  const [confirmState, setConfirmState] = useState({ isOpen: false, status: null, validRows: [] });

  // Peringatan Modal state (pengganti alert)
  const [alertState, setAlertState] = useState({ isOpen: false, message: "" });

  // Jika sedang mengedit, isi form dengan data draft
  useEffect(() => {
    if (editingSpkl && editingSpkl.rows.length > 0) {
      setRows(
        editingSpkl.rows.map((r) => ({
          id: r.id, // bisa pakai id dari database atau random
          userId: r.userId.toString(),
          tanggal: r.tanggal,
          keterangan: r.keterangan,
        }))
      );
    } else {
      setRows([createEmptyRow()]);
    }
  }, [editingSpkl]);

  function handleRowChange(index, field, value) {
    setRows((prevRows) => {
      const updated = prevRows.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      );
      const isLastRow = index === prevRows.length - 1;
      if (isLastRow && value !== "") {
        updated.push(createEmptyRow());
      }
      return updated;
    });
  }

  function handleRemoveRow(index) {
    setRows((prevRows) => {
      if (prevRows.length <= 1) return prevRows;
      return prevRows.filter((_, i) => i !== index);
    });
  }

  function handleAddRow() {
    setRows((prevRows) => [...prevRows, createEmptyRow()]);
  }

  async function handleSaveClick(status) {
    // 1. Validasi baris yang setengah terisi
    const hasPartialRows = rows.some((row) => {
      const hasSomeData = row.userId !== "" || row.tanggal !== "" || row.keterangan.trim() !== "";
      const isComplete = row.userId !== "" && row.tanggal !== "" && row.keterangan.trim() !== "";
      return hasSomeData && !isComplete;
    });

    if (hasPartialRows) {
      setAlertState({ isOpen: true, message: "Validasi Gagal: Ada baris yang belum diisi lengkap (Nama, Tanggal, atau Keterangan). Silakan lengkapi atau hapus baris tersebut." });
      return;
    }

    const validRows = rows.filter(
      (row) => row.userId && row.tanggal && row.keterangan.trim()
    );

    if (validRows.length === 0) {
      setAlertState({ isOpen: true, message: "Minimal satu baris SPKL harus diisi lengkap!" });
      return;
    }

    if (status === "FINAL") {
      setConfirmState({ isOpen: true, status, validRows });
    } else {
      executeSave(validRows, status);
    }
  }

  async function executeSave(validRows, status) {
    setSavingStatus(status);
    const spklId = editingSpkl ? editingSpkl.id : null;
    
    // onSave(rows, status, spklId)
    const success = await onSave(validRows, status, spklId);
    
    setSavingStatus(null);
    if (success && status === "FINAL") {
      // Jika berhasil difinalisasi, kosongkan form
      setRows([createEmptyRow()]);
    }
  }

  async function handleConfirmFinal() {
    const { status, validRows } = confirmState;
    setConfirmState({ isOpen: false, status: null, validRows: [] });
    await executeSave(validRows, status);
  }

  const filledRowCount = rows.filter(
    (row) => row.userId && row.tanggal && row.keterangan.trim()
  ).length;

  // ---- LOADING ----
  if (loading) {
    return (
      <div className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl p-8 flex items-center justify-center gap-3">
        <Loader2 size={20} className="animate-spin text-primary" />
        <span className="text-sm text-text-muted">Memuat data...</span>
      </div>
    );
  }

  // ---- EMPTY USERS ----
  if (users.length === 0) {
    return (
      <div className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl p-10 text-center animate-fade-in-up">
        <AlertCircle size={36} className="mx-auto text-primary mb-3" />
        <h3 className="text-sm font-black text-text-dark uppercase tracking-tight mb-1">
          BELUM ADA DATA PENGGUNA
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Tambahkan data karyawan terlebih dahulu di menu Data Pengguna
        </p>
        <a href="/pengguna" className="neu-btn neu-btn-primary text-sm">
          Ke Data Pengguna →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* FORM ROWS CARD */}
      <div
        className={`bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up overflow-hidden ${
          editingSpkl ? "ring-2 ring-yellow-400" : ""
        }`}
        style={{ animationDelay: "0.05s" }}
      >
        {/* Card Header */}
        <div className="p-8 pb-0">
          <div className="flex items-center justify-between mb-4">
            <p className="brutal-label">
              {editingSpkl ? "MODE EDIT DRAFT" : "FORMULIR — MULTI INPUT"}
            </p>
            <div className="flex items-center gap-2">
              <span className="brutal-label border-2 border-primary px-2 py-0.5 bg-surface-light rounded-[4px]">
                {filledRowCount} baris terisi
              </span>
              {editingSpkl && (
                <button 
                  onClick={onCancelEdit}
                  className="bg-red-100 text-red-600 border-2 border-red-600 p-0.5 rounded hover:bg-red-200"
                  title="Batal Edit"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="border-t-2 border-dashed border-primary-light mb-4" />
          <div className="flex items-center gap-2 mb-4">
            {editingSpkl ? (
              <Pencil size={15} className="text-yellow-600" />
            ) : (
              <FileSpreadsheet size={15} className="text-primary" />
            )}
            <h2 className="text-sm font-black text-text-dark uppercase tracking-tight">
              {editingSpkl ? `MENGEDIT DRAFT SPKL #${editingSpkl.id}` : "DATA SPKL"}
            </h2>
          </div>
        </div>

        {/* Column Headers (desktop) */}
        <div className="hidden md:grid md:grid-cols-12 gap-3 px-8 mb-2">
          <div className="col-span-4">
            <span className="brutal-label">NAMA KARYAWAN</span>
          </div>
          <div className="col-span-3">
            <span className="brutal-label">TANGGAL SPKL</span>
          </div>
          <div className="col-span-4">
            <span className="brutal-label">KETERANGAN</span>
          </div>
          <div className="col-span-1" />
        </div>

        {/* Rows */}
        <div className="px-8 pb-3 space-y-3">
          {rows.map((row, index) => {
            // Validasi visual per baris (jika setengah terisi)
            const isPartial = 
              (row.userId !== "" || row.tanggal !== "" || row.keterangan.trim() !== "") &&
              !(row.userId !== "" && row.tanggal !== "" && row.keterangan.trim() !== "");
            
            return (
              <div
                key={row.id}
                className={`grid grid-cols-1 md:grid-cols-12 gap-2 items-start animate-fade-in-up p-2 -mx-2 rounded-lg ${
                  isPartial ? "bg-red-50 border border-red-200" : ""
                }`}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                {/* Dropdown Nama */}
                <div className="md:col-span-4">
                  <label className="brutal-label block mb-1 md:hidden">
                    NAMA KARYAWAN
                  </label>
                  <select
                    value={row.userId}
                    onChange={(e) => handleRowChange(index, "userId", e.target.value)}
                    className={`neu-select ${isPartial && !row.userId ? "border-red-500" : ""}`}
                    id={`spkl-user-${index}`}
                  >
                    <option value="">— Pilih Karyawan —</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.nama} ({user.nip})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tanggal */}
                <div className="md:col-span-3">
                  <label className="brutal-label block mb-1 md:hidden">
                    TANGGAL SPKL
                  </label>
                  <input
                    type="date"
                    value={row.tanggal}
                    onChange={(e) =>
                      handleRowChange(index, "tanggal", e.target.value)
                    }
                    className={`neu-input ${isPartial && !row.tanggal ? "border-red-500" : ""}`}
                    id={`spkl-date-${index}`}
                  />
                </div>

                {/* Keterangan */}
                <div className="md:col-span-4">
                  <label className="brutal-label block mb-1 md:hidden">
                    KETERANGAN
                  </label>
                  <input
                    type="text"
                    value={row.keterangan}
                    onChange={(e) =>
                      handleRowChange(index, "keterangan", e.target.value)
                    }
                    placeholder="Keterangan pekerjaan lembur..."
                    className={`neu-input ${isPartial && !row.keterangan.trim() ? "border-red-500" : ""}`}
                    id={`spkl-desc-${index}`}
                  />
                </div>

                {/* Hapus */}
                <div className="md:col-span-1 flex items-center pt-1 md:pt-0">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="neu-btn neu-btn-danger p-2 text-xs w-full md:w-auto mt-6 md:mt-0"
                      title="Hapus baris"
                      id={`spkl-remove-${index}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tambah Baris */}
        <div className="px-8 pb-8 border-t-2 border-dashed border-primary-light pt-4 mt-1">
          <button
            type="button"
            onClick={handleAddRow}
            className="neu-btn text-xs text-text-muted"
            id="btn-add-row"
          >
            <Plus size={14} />
            Tambah Baris
          </button>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div
        className="flex flex-col sm:flex-row gap-4 animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <button
          onClick={() => handleSaveClick("DRAFT")}
          disabled={savingStatus !== null}
          className={`neu-btn flex-1 ${
            savingStatus !== null ? "opacity-50 cursor-not-allowed" : ""
          } ${editingSpkl ? "bg-yellow-400 text-text-dark border-text-dark hover:bg-yellow-500" : "neu-btn-success"}`}
          id="btn-save-draft"
        >
          {savingStatus === "DRAFT" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          SIMPAN (DRAFT)
        </button>

        <button
          onClick={() => handleSaveClick("FINAL")}
          disabled={savingStatus !== null}
          className={`neu-btn neu-btn-primary flex-1 ${
            savingStatus !== null ? "opacity-50 cursor-not-allowed" : ""
          }`}
          id="btn-save-export-spkl"
        >
          {savingStatus === "FINAL" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={16} />
          )}
          SIMPAN & BUAT SPKL (FINAL)
        </button>
      </div>

      {/* TIPS */}
      <div
        className="bg-white border-2 border-primary p-8 shadow-[2px_2px_0px_0px_#111827] rounded-2xl animate-fade-in-up"
        style={{ animationDelay: "0.15s" }}
      >
        <p className="text-xs text-text-muted leading-relaxed">
          <span className="font-black text-text-dark">💡 TIPS: </span>
          <br/>
          - <b>Simpan (Draft)</b>: Menyimpan pekerjaan sementara. Anda bisa mengeditnya lagi nanti di tabel Histori bawah.
          <br/>
          - <b>Simpan & Buat SPKL (Final)</b>: Mengunci data agar tidak bisa diedit lagi dan langsung mengunduh file Excel.
        </p>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title="Konfirmasi FINAL"
        message="Anda yakin ingin menyimpan SPKL ini sebagai FINAL?&#10;SPKL berstatus FINAL akan dikunci dan Anda tidak bisa mengeditnya lagi."
        confirmText="Ya, Simpan Final"
        type="primary"
        onConfirm={handleConfirmFinal}
        onCancel={() => setConfirmState({ isOpen: false, status: null, validRows: [] })}
      />

      <ConfirmModal
        isOpen={alertState.isOpen}
        title="Peringatan Validasi"
        message={alertState.message}
        confirmText="Mengerti"
        cancelText=""
        type="danger"
        onConfirm={() => setAlertState({ isOpen: false, message: "" })}
        onCancel={() => setAlertState({ isOpen: false, message: "" })}
      />
    </div>
  );
}