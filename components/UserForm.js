"use client";

import { useState, useEffect } from "react";
import { UserPlus, Loader2, Pencil, X } from "lucide-react";

export default function UserForm({ onAddUser, editingUser, onEditUser, onCancelEdit }) {
  const [nomorFinger, setNomorFinger] = useState("");
  const [nip, setNip] = useState("");
  const [nama, setNama] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!editingUser;

  // Saat editingUser berubah, isi form dengan data user yang akan diedit
  useEffect(() => {
    if (editingUser) {
      setNomorFinger(editingUser.nomorFinger || "");
      setNip(editingUser.nip || "");
      setNama(editingUser.nama || "");
    } else {
      setNomorFinger("");
      setNip("");
      setNama("");
    }
  }, [editingUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nomorFinger", nomorFinger);
    formData.append("nip", nip);
    formData.append("nama", nama);

    setSubmitting(true);

    let success;
    if (isEditing) {
      success = await onEditUser(editingUser.id, formData);
    } else {
      success = await onAddUser(formData);
    }

    setSubmitting(false);

    if (success) {
      setNomorFinger("");
      setNip("");
      setNama("");
    }
  }

  function handleCancel() {
    setNomorFinger("");
    setNip("");
    setNama("");
    onCancelEdit();
  }

  const isFormValid =
    nomorFinger.trim() !== "" && nip.trim() !== "" && nama.trim() !== "";

  return (
    <div
      className={`bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl p-8 animate-fade-in-up ${isEditing ? "ring-2 ring-yellow-400" : ""
        }`}
      style={{ animationDelay: "0.05s" }}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="brutal-label">
          {isEditing ? "MODE EDIT DATA" : "FORMULIR INPUT DATA"}
        </p>
        {isEditing ? (
          <Pencil size={16} className="text-yellow-500" />
        ) : (
          <UserPlus size={16} className="text-text-muted" />
        )}
      </div>
      <div className="border-t-2 border-dashed border-primary-light mb-4" />

      <h2 className="text-sm font-black text-text-dark uppercase tracking-tight mb-4">
        {isEditing ? `EDIT PENGGUNA — ${editingUser.nama}` : "TAMBAH PENGGUNA BARU"}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Nomor Finger */}
          <div>
            <label
              htmlFor="nomorFinger"
              className="brutal-label block mb-2"
            >
              NOMOR FINGER
            </label>
            <input
              type="text"
              id="nomorFinger"
              name="nomorFinger"
              value={nomorFinger}
              onChange={(e) => setNomorFinger(e.target.value)}
              placeholder="Contoh: 001"
              className="neu-input"
              required
            />
          </div>

          {/* NIP/NIK */}
          <div>
            <label htmlFor="nip" className="brutal-label block mb-2">
              NIP / NIK
            </label>
            <input
              type="text"
              id="nip"
              name="nip"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Contoh: 1234567890"
              className="neu-input"
              required
            />
          </div>

          {/* Nama */}
          <div>
            <label htmlFor="nama" className="brutal-label block mb-2">
              NAMA LENGKAP
            </label>
            <input
              type="text"
              id="nama"
              name="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Lionel Messi"
              className="neu-input"
              required
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!isFormValid || submitting}
            id={isEditing ? "btn-update-user" : "btn-add-user"}
            className={`neu-btn ${isEditing ? "neu-btn-success" : "neu-btn-primary"} ${!isFormValid || submitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isEditing ? "Menyimpan..." : "Menambah..."}
              </>
            ) : (
              <>
                {isEditing ? <Pencil size={16} /> : <UserPlus size={16} />}
                {isEditing ? "Simpan Perubahan" : "Tambah Pengguna"}
              </>
            )}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              className="neu-btn text-xs"
              id="btn-cancel-edit"
            >
              <X size={16} />
              Batal
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
