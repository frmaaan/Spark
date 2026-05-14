"use client";

import { useState, useEffect, useCallback } from "react";
import { getUsers } from "@/lib/actions/userActions";
import { saveSpkl, getSpklList, deleteSpkl } from "@/lib/actions/spklActions";
import { exportSpklToExcel } from "@/lib/excelExport";
import SpklForm from "@/components/SpklForm";
import SpklHistory from "@/components/SpklHistory";
import Toast from "@/components/Toast";
import { FileText } from "lucide-react";

export default function SpklPage() {
  const [users, setUsers] = useState([]);
  const [spklList, setSpklList] = useState([]);
  const [userRole, setUserRole] = useState("USER");
  const [currentAccountId, setCurrentAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // State untuk mode edit draft
  const [editingSpkl, setEditingSpkl] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    // Ambil data users dan spkl histori secara paralel
    const [usersResult, spklResult] = await Promise.all([
      getUsers(),
      getSpklList()
    ]);

    if (usersResult.success) setUsers(usersResult.data);
    if (spklResult.success) {
      setSpklList(spklResult.data);
      setUserRole(spklResult.role);
      setCurrentAccountId(spklResult.currentAccountId || null);
    }
    setLoading(false);
  }

  const handleSave = useCallback(
    async (rows, status, spklId) => {
      const result = await saveSpkl(rows, status, spklId);
      
      if (result.success) {
        setToast({
          message: status === "FINAL"
            ? "SPKL final tersimpan & file Excel berhasil dibuat!"
            : "SPKL berhasil disimpan sebagai Draft!",
          type: "success",
        });

        // Jika mode ekspor (FINAL), lakukan pengunduhan Excel
        if (status === "FINAL" && result.data?.rows) {
          exportSpklToExcel(result.data.rows);
          // Memicu event agar Donation Modal muncul
          setTimeout(() => {
            window.dispatchEvent(new Event("showDonationModal"));
          }, 1000); // Jeda 1 detik agar pengguna fokus pada file yang terunduh dulu
        }

        // Keluar dari mode edit jika ada
        setEditingSpkl(null);

        // Refresh list
        loadData();
        return true;
      } else {
        setToast({ message: result.error, type: "error" });
        return false;
      }
    },
    []
  );

  const handleEditDraft = useCallback((spkl) => {
    setEditingSpkl(spkl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingSpkl(null);
  }, []);

  const handleDeleteSpkl = useCallback(async (id) => {
    const result = await deleteSpkl(id);
    if (result.success) {
      setToast({ message: "SPKL berhasil dihapus", type: "success" });
      if (editingSpkl && editingSpkl.id === id) {
        setEditingSpkl(null);
      }
      loadData();
    } else {
      setToast({ message: result.error, type: "error" });
    }
  }, [editingSpkl]);

  return (
    <div className="space-y-12">

      {/* PAGE HEADER */}
      <div className="flex items-center gap-4 animate-fade-in-up">
        <div className="w-12 h-12 bg-primary border-2 border-primary flex items-center justify-center flex-shrink-0">
          <FileText size={22} className="text-white" />
        </div>
        <div>
          <p className="brutal-label mb-0.5">MENU</p>
          <h1 className="text-2xl font-black text-text-dark uppercase tracking-tight leading-tight">
            INPUT SPKL
          </h1>
          <p className="text-xs text-text-muted uppercase tracking-wider mt-0.5">
            Buat Surat Perintah Kerja Lembur Baru
          </p>
        </div>
      </div>

      {/* FORM */}
      <SpklForm 
        users={users} 
        loading={loading} 
        onSave={handleSave} 
        editingSpkl={editingSpkl}
        onCancelEdit={handleCancelEdit}
      />

      {/* HISTORI SPKL */}
      <SpklHistory 
        spklList={spklList}
        userRole={userRole}
        currentAccountId={currentAccountId}
        loading={loading}
        onEdit={handleEditDraft}
        onDelete={handleDeleteSpkl}
      />

      {/* TOAST */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
