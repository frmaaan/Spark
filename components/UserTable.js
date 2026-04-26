"use client";

import { useState } from "react";
import { Trash2, Loader2, UserX, Pencil } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

export default function UserTable({ users, loading, onDeleteUser, onEditUser }) {
  const [deletingId, setDeletingId] = useState(null);
  
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
    await onDeleteUser(id);
    setDeletingId(null);
  }

  // ---- LOADING STATE ----
  if (loading) {
    return (
      <div className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl p-8 flex items-center justify-center gap-3">
        <Loader2 size={20} className="animate-spin text-primary" />
        <span className="text-sm text-text-muted">Memuat data pengguna...</span>
      </div>
    );
  }

  // ---- EMPTY STATE ----
  if (users.length === 0) {
    return (
      <div className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl p-10 text-center animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <UserX size={40} className="mx-auto text-text-light mb-3" />
        <h3 className="text-sm font-black text-text-dark uppercase tracking-tight mb-1">
          BELUM ADA DATA
        </h3>
        <p className="text-xs text-text-muted">
          Gunakan form di atas untuk menambahkan data karyawan
        </p>
      </div>
    );
  }

  // ---- DATA TABLE ----
  return (
    <div
      className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up overflow-hidden"
      style={{ animationDelay: "0.1s" }}
    >
      {/* Card Header */}
      <div className="px-8 pt-8 pb-2">
        <div className="flex items-center justify-between mb-4">
          <p className="brutal-label">DATABASE — LIST DATA</p>
          <span className="brutal-label border-2 border-primary px-2 py-0.5 bg-surface-light">
            {users.length} pengguna
          </span>
        </div>
        <div className="border-t-2 border-dashed border-primary-light mb-4" />
        <h2 className="text-sm font-black text-text-dark uppercase tracking-tight mb-4">
          DAFTAR PENGGUNA
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y-2 border-primary bg-surface-light">
              <th className="text-left px-8 py-4 brutal-label w-12">NO.</th>
              <th className="text-left px-8 py-4 brutal-label">FINGER</th>
              <th className="text-left px-8 py-4 brutal-label">NIP / NIK</th>
              <th className="text-left px-8 py-4 brutal-label">NAMA</th>
              <th className="text-right px-8 py-4 brutal-label w-32">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((user, index) => (
              <tr
                key={user.id}
                className="hover:bg-surface-light transition-colors animate-fade-in-up"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <td className="px-8 py-4 font-mono text-xs text-text-light">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="px-8 py-4 font-mono text-sm font-bold text-text-dark">
                  {user.nomorFinger}
                </td>
                <td className="px-8 py-4 font-mono text-sm text-text-muted">
                  {user.nip}
                </td>
                <td className="px-8 py-4 text-sm font-semibold text-text-dark">
                  {user.nama}
                </td>
                <td className="px-8 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Tombol Edit */}
                    <button
                      onClick={() => onEditUser(user)}
                      id={`btn-edit-user-${user.id}`}
                      className="neu-btn text-xs px-3 py-1.5"
                      title="Edit pengguna"
                    >
                      <Pencil size={13} />
                    </button>

                    {/* Tombol Hapus */}
                    <button
                      onClick={() => openConfirmDelete(user.id)}
                      disabled={deletingId === user.id}
                      id={`btn-delete-user-${user.id}`}
                      className="neu-btn neu-btn-danger text-xs px-3 py-1.5 disabled:opacity-50"
                      title="Hapus pengguna"
                    >
                      {deletingId === user.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-1" /> {/* bottom spacing */}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title="Hapus Pengguna"
        message="Yakin ingin menghapus pengguna ini?&#10;(Data SPKL terkait tetap tersimpan)"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmState({ isOpen: false, id: null })}
      />
    </div>
  );
}
