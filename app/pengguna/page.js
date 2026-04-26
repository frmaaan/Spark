"use client";

import { useState, useEffect, useCallback } from "react";
import { getUsers, addUser, deleteUser, updateUser } from "@/lib/actions/userActions";
import UserForm from "@/components/UserForm";
import UserTable from "@/components/UserTable";
import Toast from "@/components/Toast";
import { Users } from "lucide-react";

export default function PenggunaPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const result = await getUsers();
    if (result.success) setUsers(result.data);
    setLoading(false);
  }

  const handleAddUser = useCallback(async (formData) => {
    const result = await addUser(formData);
    if (result.success) {
      setUsers((prev) => [result.data, ...prev]);
      setToast({ message: "Pengguna berhasil ditambahkan!", type: "success" });
      return true;
    } else {
      setToast({ message: result.error, type: "error" });
      return false;
    }
  }, []);

  const handleDeleteUser = useCallback(async (id) => {
    const result = await deleteUser(id);
    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setToast({ message: "Pengguna berhasil dihapus (data SPKL tetap tersimpan)", type: "success" });
    } else {
      setToast({ message: result.error, type: "error" });
    }
  }, []);

  // Handler untuk memulai mode edit
  const handleStartEdit = useCallback((user) => {
    setEditingUser(user);
    // Scroll ke atas agar form terlihat
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Handler untuk menyimpan perubahan edit
  const handleEditUser = useCallback(async (id, formData) => {
    const result = await updateUser(id, formData);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? result.data : u))
      );
      setEditingUser(null);
      setToast({ message: "Data pengguna berhasil diperbarui!", type: "success" });
      return true;
    } else {
      setToast({ message: result.error, type: "error" });
      return false;
    }
  }, []);

  // Handler untuk membatalkan edit
  const handleCancelEdit = useCallback(() => {
    setEditingUser(null);
  }, []);

  return (
    <div className="space-y-12">
      {/* PAGE HEADER */}
      <div className="flex items-center gap-4 animate-fade-in-up">
        <div className="w-12 h-12 bg-primary border-2 border-primary flex items-center justify-center flex-shrink-0">
          <Users size={22} className="text-white" />
        </div>
        <div>
          <p className="brutal-label mb-0.5">MENU</p>
          <h1 className="text-2xl font-black text-text-dark uppercase tracking-tight leading-tight">
            DATA PENGGUNA
          </h1>
          <p className="text-xs text-text-muted uppercase tracking-wider mt-0.5">
            Kelola data karyawan
          </p>
        </div>
      </div>

      {/* FORM INPUT (juga untuk edit) */}
      <UserForm
        onAddUser={handleAddUser}
        editingUser={editingUser}
        onEditUser={handleEditUser}
        onCancelEdit={handleCancelEdit}
      />

      {/* TABEL DATA */}
      <UserTable
        users={users}
        loading={loading}
        onDeleteUser={handleDeleteUser}
        onEditUser={handleStartEdit}
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