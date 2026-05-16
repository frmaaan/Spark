"use client";

import { useEffect, useState, useCallback } from "react";
import { GraduationCap, Loader2, Pencil, Trash2, Save, Eye, Plus, Minus, X, CheckCircle2, FolderOpen, Share2, Link2, Link2Off } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import Toast from "./Toast";
import { deleteElearningQuestion, getElearningQuestions, saveElearningQuestion, getTeamsForElearning, generatePublicSlug } from "@/lib/actions/elearningActions";

const initialForm = {
  title: "",
  description: "",
  accessStatus: "TEAM",
  teamId: "",
  items: [{ question: "", answer: "" }],
};

export default function BankSoalManager() {
  const [materials, setMaterials] = useState([]);
  const [teams, setTeams] = useState([]);
  const [meta, setMeta] = useState({ role: "USER", teamId: null, teamName: null, userName: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "", confirmText: "OK", type: "primary", action: null });
  const [sharingId, setSharingId] = useState(null);
  
  // STATE BARU: Untuk mengontrol visibilitas Modal Form
  const [isFormOpen, setIsFormOpen] = useState(false); 

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const result = await getElearningQuestions();
    const teamsResult = meta.role === "ADMIN" ? await getTeamsForElearning() : { success: true, data: [] };

    if (result.success) {
      setMaterials(result.data || []);
      setMeta({
        role: result.role || "USER",
        teamId: result.teamId || null,
        teamName: result.teamName || null,
        userName: result.userName || "",
      });
    } else {
      setToast({ message: result.error || "Gagal memuat materi", type: "error" });
    }
    if (teamsResult.success) setTeams(teamsResult.data || []);
    setLoading(false);
  }, [meta.role]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (!meta.teamId && !editingMaterial) {
      setForm((prev) => (prev.accessStatus === "PRIVATE" ? prev : { ...prev, accessStatus: "PRIVATE", teamId: "" }));
    }
  }, [meta.teamId, editingMaterial]);

  const closeConfirm = useCallback(() => setConfirmState({ isOpen: false, title: "", message: "", confirmText: "OK", type: "primary", action: null }), []);

  const resetForm = useCallback(() => {
    setEditingMaterial(null);
    setForm({
      title: "", description: "", accessStatus: meta.teamId ? "TEAM" : "PRIVATE", teamId: meta.teamId ? String(meta.teamId) : "", items: [{ question: "", answer: "" }],
    });
    // Menutup form saat direset (baik karena batal atau selesai menyimpan)
    setIsFormOpen(false);
  }, [meta.teamId]);

  const openEditConfirm = useCallback((question) => {
    setConfirmState({ isOpen: true, title: "Edit Materi", message: "Materi ini akan dimuat ke form untuk diubah. Lanjutkan?", confirmText: "Edit", type: "primary", action: { kind: "start-edit", question } });
  }, []);

  const openDeleteConfirm = useCallback((question) => {
    setConfirmState({ isOpen: true, title: "Hapus Materi", message: `Yakin ingin menghapus "${question.title}"?`, confirmText: "Hapus", type: "danger", action: { kind: "delete", id: question.id } });
  }, []);

  const openPreview = useCallback((material) => setPreviewMaterial(material), []);
  const closePreview = useCallback(() => setPreviewMaterial(null), []);

  const handleShare = useCallback(async (material) => {
    setSharingId(material.id);
    const result = await generatePublicSlug(material.id);
    setSharingId(null);
    if (!result.success) {
      setToast({ message: result.error, type: "error" });
      return;
    }
    if (result.revoked) {
      setToast({ message: "Link publik berhasil dicabut. Materi tidak lagi bisa diakses dari luar.", type: "success" });
    } else {
      setToast({ message: "Link publik berhasil dibuat!", type: "success" });
    }
    await loadQuestions();
  }, [loadQuestions]);

  const copyToClipboard = useCallback((slug) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setToast({ message: "Link berhasil disalin ke clipboard!", type: "success" });
    });
  }, []);

  const openSaveConfirm = useCallback(() => {
    const isEdit = !!editingMaterial;
    setConfirmState({ isOpen: true, title: isEdit ? "Simpan Perubahan" : "Simpan Soal", message: "Simpan materi ke database?", confirmText: "Simpan", type: "primary", action: { kind: "save" } });
  }, [editingMaterial]);

  const setItemField = useCallback((index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }, []);

  const addItemRow = useCallback(() => setForm((prev) => ({ ...prev, items: [...prev.items, { question: "", answer: "" }] })), []);
  const removeItemRow = useCallback((index) => setForm((prev) => ({ ...prev, items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items })), []);

  const handleConfirm = useCallback(async () => {
    const action = confirmState.action;
    closeConfirm();
    if (!action) return;

    if (action.kind === "start-edit") {
      const material = action.question;
      setEditingMaterial(material);
      setForm({
        title: material.title || "", description: material.description || "", accessStatus: material.accessStatus || "TEAM", teamId: material.teamId ? String(material.teamId) : "",
        items: material.items?.length > 0 ? material.items.map((item) => ({ question: item.question || "", answer: item.answer || "" })) : [{ question: "", answer: "" }],
      });
      // Buka form ketika edit disetujui
      setIsFormOpen(true);
      return;
    }

    if (action.kind === "delete") {
      setDeletingId(action.id);
      const result = await deleteElearningQuestion(action.id);
      if (result.success) {
        setToast({ message: "Materi dihapus", type: "success" });
        if (editingMaterial?.id === action.id) resetForm();
        await loadQuestions();
      } else setToast({ message: result.error, type: "error" });
      setDeletingId(null);
      return;
    }

    if (action.kind === "save") {
      setSubmitting(true);
      const result = await saveElearningQuestion({ id: editingMaterial?.id, ...form });
      if (result.success) {
        setToast({ message: "Data berhasil disimpan", type: "success" });
        resetForm(); // Ini otomatis akan menutup form karena ada `setIsFormOpen(false)` di dalamnya
        await loadQuestions();
      } else setToast({ message: result.error, type: "error" });
      setSubmitting(false);
    }
  }, [closeConfirm, confirmState.action, editingMaterial, form, loadQuestions, resetForm]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!form.title.trim()) return setToast({ message: "Judul materi wajib diisi", type: "error" });
    if (form.accessStatus === "TEAM" && !meta.teamId && meta.role !== "ADMIN") return setToast({ message: "Pilih status PRIBADI jika tidak memiliki tim", type: "error" });
    if (!form.items.some((item) => item.question.trim() && item.answer.trim())) return setToast({ message: "Isi minimal 1 Q&A", type: "error" });
    openSaveConfirm();
  }, [form, meta, openSaveConfirm]);

  return (
    <div className="space-y-8 p-4 md:p-8 bg-[#fafaf9] min-h-screen text-gray-900 font-sans relative">
      
      {/* HEADER: Soft Brutalism + Button Pembuat Materi */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-fade-in-up border-b-[3px] border-black pb-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#fde047] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] rounded-lg flex items-center justify-center flex-shrink-0">
            <GraduationCap size={28} className="text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-1">E-Learning Base</h1>
            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">Manajemen Materi & Bank Soal</p>
          </div>
        </div>

        {/* TOMBOL UTAMA: Pemicu Form Card */}
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="bg-[#dcfce7] border-[3px] border-black px-5 py-3 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-[#bbf7d0] transition-colors shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          <Plus size={18} /> Buat Materi Baru
        </button>
      </div>

      {/* FORM SECTION (MODAL CARD OVERLAY) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <section className="w-full max-w-4xl bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#000] rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="bg-[#e0e7ff] text-black p-4 border-b-[3px] border-black flex items-center justify-between shrink-0">
              <h2 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <Pencil size={16} /> {editingMaterial ? "Edit Materi" : "Buat Materi Baru"}
              </h2>
              {/* Tombol Tutup Form */}
              <button onClick={resetForm} type="button" className="bg-white border-[2px] border-black rounded-md p-1.5 hover:bg-gray-100 active:translate-y-[2px] transition-all shadow-[2px_2px_0px_0px_#000]">
                <X size={18} className="font-black" />
              </button>
            </div>

            {/* Container scrollable untuk isi form */}
            <div className="overflow-y-auto p-6 bg-[#fafaf9]">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block font-black uppercase text-xs mb-2 text-gray-700">Judul Materi</label>
                  <input
                    value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full border-[3px] border-black p-3 font-semibold rounded-lg bg-white focus:bg-[#fefce8] outline-none transition-colors shadow-[2px_2px_0px_0px_#000]"
                    placeholder="Misal: Dasar ReactJS"
                  />
                </div>

                <div>
                  <label className="block font-black uppercase text-xs mb-2 text-gray-700">Deskripsi Singkat</label>
                  <textarea
                    value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full border-[3px] border-black p-3 font-semibold rounded-lg bg-white focus:bg-[#fefce8] outline-none resize-none transition-colors shadow-[2px_2px_0px_0px_#000]"
                    placeholder="Rangkuman materi ini..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-black uppercase text-xs mb-2 text-gray-700">Hak Akses</label>
                    <select
                      value={form.accessStatus} onChange={(e) => setForm((prev) => ({ ...prev, accessStatus: e.target.value }))}
                      className="w-full border-[3px] border-black p-2.5 font-bold rounded-lg bg-white cursor-pointer shadow-[2px_2px_0px_0px_#000]"
                    >
                      <option value="TEAM">Khusus Tim</option>
                      <option value="PRIVATE">Hanya Saya</option>
                    </select>
                  </div>

                  {meta.role === "ADMIN" && (
                    <div>
                      <label className="block font-black uppercase text-xs mb-2 text-gray-700">Pilih Tim</label>
                      <select
                        value={form.teamId} onChange={(e) => setForm((prev) => ({ ...prev, teamId: e.target.value }))}
                        className="w-full border-[3px] border-black p-2.5 font-bold rounded-lg bg-white cursor-pointer shadow-[2px_2px_0px_0px_#000]"
                      >
                        <option value="">Global / Tanpa Tim</option>
                        {teams.map((team) => (<option key={team.id} value={team.id}>{team.nama}</option>))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Q&A SECTION */}
                <div className="border-t-[3px] border-dashed border-gray-300 pt-5">
                  <label className="block font-black uppercase text-xs text-gray-700 mb-4">Daftar Tanya Jawab (Q&A)</label>

                  <div className="space-y-4 mb-4">
                    {form.items.map((item, index) => (
                      <div key={index} className="border-[3px] border-black rounded-xl p-4 bg-white relative">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-black bg-black text-white px-2 py-0.5 rounded text-[10px] uppercase">Soal {index + 1}</span>
                          {form.items.length > 1 && (
                            <button 
                              type="button" onClick={() => removeItemRow(index)} 
                              className="text-red-500 hover:text-red-700 font-black uppercase text-xs flex items-center gap-1 transition-colors"
                            >
                              <Minus size={14} /> Hapus
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <input
                            value={item.question} onChange={(e) => setItemField(index, "question", e.target.value)}
                            className="w-full border-b-[3px] border-black p-2 font-bold bg-transparent outline-none focus:bg-[#f8fafc] transition-colors"
                            placeholder="Tulis Pertanyaan..."
                          />
                          <textarea
                            value={item.answer} onChange={(e) => setItemField(index, "answer", e.target.value)}
                            rows={2}
                            className="w-full border-[3px] border-transparent focus:border-black p-2 font-medium bg-[#f8fafc] rounded-lg outline-none resize-none transition-all"
                            placeholder="Tulis Jawaban..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button" onClick={addItemRow} 
                    className="w-full bg-[#dcfce7] border-[3px] border-black px-4 py-3 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-[#bbf7d0] transition-colors shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                  >
                    <Plus size={16} /> Tambah Soal Baru
                  </button>
                </div>

                {/* Submit Actions */}
                <div className="flex gap-3 pt-4 border-t-[3px] border-black mt-6">
                  <button
                    type="submit" disabled={submitting}
                    className="flex-1 bg-[#fde047] border-[3px] border-black rounded-xl font-black uppercase p-3 flex items-center justify-center gap-2 hover:bg-[#facc15] shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-70 mt-2"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {editingMaterial ? "Update Data" : "Simpan Data"}
                  </button>
                  <button
                    type="button" onClick={resetForm}
                    className="bg-white border-[3px] border-black rounded-xl font-black uppercase p-3 flex items-center justify-center gap-2 hover:bg-gray-100 shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all mt-2"
                  >
                    <X size={18} /> Batal
                  </button>
                </div>
              </form>
            </div>

          </section>
        </div>
      )}

      {/* LIST SECTION (Sekarang mengambil layar penuh karena grid dihilangkan) */}
      <section className="flex flex-col gap-4">
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000] rounded-xl p-4 flex items-center justify-between">
          <h2 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
            <FolderOpen size={18} /> Database Materi
          </h2>
          <span className="bg-[#dbeafe] text-black px-3 py-1 rounded-full font-black text-xs border-[2px] border-black">
            {materials.length} Total Data
          </span>
        </div>

        <div className="flex-1">
          {loading ? (
            <div className="bg-white border-[3px] border-black rounded-xl p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 size={36} className="animate-spin text-black" />
              <span className="font-black uppercase tracking-widest text-sm">Menyiapkan Data...</span>
            </div>
          ) : materials.length === 0 ? (
            <div className="bg-white border-[3px] border-black rounded-xl p-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-[#f3f4f6] border-[3px] border-black rounded-2xl flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_#000]">
                <CheckCircle2 size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Belum Ada Materi</h3>
              <p className="text-sm font-medium text-gray-500 mt-2">Materi yang Anda buat akan muncul di sini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {materials.map((material) => (
                <div key={material.id} className="bg-white border-[3px] border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] transition-all flex flex-col justify-between h-full gap-4">
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-black text-lg uppercase leading-tight">{material.title}</h3>
                      <span className={`px-2 py-0.5 border-[2px] border-black rounded text-[10px] font-black uppercase ${material.accessStatus === "TEAM" ? "bg-[#dcfce7]" : "bg-[#fef08a]"}`}>
                        {material.accessStatus === "TEAM" ? "TIM" : "PRIBADI"}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-600 line-clamp-2 mb-3">{material.description || "Tidak ada deskripsi yang ditambahkan."}</p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="px-2 py-1 bg-gray-100 rounded border-[2px] border-black text-[10px] font-black uppercase">
                        {material.itemCount} Tanya Jawab
                      </span>
                      <span className="text-xs font-bold text-gray-400">
                        Oleh: {material.createdByName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t-[2px] border-dashed border-gray-200">
                    <button 
                      onClick={() => openPreview(material)} 
                      className="flex-1 bg-[#bfdbfe] border-[3px] border-black rounded-lg font-black uppercase text-[10px] py-2 px-3 hover:bg-[#93c5fd] shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} /> Detail
                    </button>

                    {material.accessStatus === "TEAM" && (
                      material.publicSlug ? (
                        <>
                          <button
                            onClick={() => copyToClipboard(material.publicSlug)}
                            className="flex-1 bg-[#dcfce7] border-[3px] border-black rounded-lg font-black uppercase text-[10px] py-2 px-3 hover:bg-[#bbf7d0] shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
                          >
                            <Link2 size={14} /> Link
                          </button>
                          <button
                            onClick={() => handleShare(material)}
                            disabled={sharingId === material.id}
                            className="flex-1 bg-[#fee2e2] border-[3px] border-black rounded-lg font-black uppercase text-[10px] py-2 px-3 hover:bg-[#fecaca] shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {sharingId === material.id ? <Loader2 size={14} className="animate-spin" /> : <Link2Off size={14} />} Cabut
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleShare(material)}
                          disabled={sharingId === material.id}
                          className="flex-1 bg-[#fef9c3] border-[3px] border-black rounded-lg font-black uppercase text-[10px] py-2 px-3 hover:bg-[#fde047] shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {sharingId === material.id ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />} Share
                        </button>
                      )
                    )}
                    
                    <button 
                      onClick={() => openEditConfirm(material)} 
                      className="bg-white border-[3px] border-black rounded-lg font-black uppercase text-[10px] py-2 px-3 hover:bg-gray-100 shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    
                    <button 
                      onClick={() => openDeleteConfirm(material)} 
                      disabled={deletingId === material.id} 
                      className="bg-[#ef4444] text-white border-[3px] border-black rounded-lg font-black uppercase text-[10px] py-2 px-3 hover:bg-[#dc2626] shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {deletingId === material.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Hapus
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} confirmText={confirmState.confirmText} type={confirmState.type} onConfirm={handleConfirm} onCancel={closeConfirm} />

      {/* PREVIEW MODAL */}
      {previewMaterial && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black rounded-2xl shadow-[8px_8px_0px_0px_#000] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="bg-[#fde047] p-5 border-b-[4px] border-black flex justify-between items-start">
              <div>
                <span className="bg-white text-black border-[2px] border-black rounded text-[10px] px-2 py-1 font-black uppercase mb-3 inline-block shadow-[2px_2px_0px_0px_#000]">Preview Detail</span>
                <h2 className="text-2xl font-black uppercase tracking-tight">{previewMaterial.title}</h2>
              </div>
              <button onClick={closePreview} className="bg-white border-[3px] border-black rounded-lg p-2 hover:bg-gray-100 active:translate-y-[2px] transition-all shadow-[2px_2px_0px_0px_#000]">
                <X size={20} className="font-black" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-[#fafaf9]">
              <div className="mb-6 bg-white border-[3px] border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_#000]">
                <p className="font-bold text-gray-700 leading-relaxed">{previewMaterial.description || "Tidak ada rincian deskripsi."}</p>
              </div>

              <div className="space-y-4">
                {Array.isArray(previewMaterial.items) && previewMaterial.items.length > 0 ? previewMaterial.items.map((item, index) => (
                  <div key={index} className="border-[3px] border-black rounded-xl bg-white overflow-hidden shadow-[4px_4px_0px_0px_#000]">
                    <div className="border-b-[3px] border-black p-2.5 bg-[#e0e7ff] font-black uppercase text-xs flex gap-2 items-center">
                      <span className="bg-black text-white px-2 py-0.5 rounded-sm">Q&A</span>
                      <span>Bagian {index + 1}</span>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <span className="inline-block bg-[#dcfce7] border-[2px] border-black px-2 py-0.5 rounded text-[10px] font-black uppercase mb-2">Tanya</span>
                        <p className="font-bold text-base">{item.question}</p>
                      </div>
                      <div className="pt-3 border-t-[3px] border-dashed border-gray-200">
                        <span className="inline-block bg-[#f3f4f6] border-[2px] border-black px-2 py-0.5 rounded text-[10px] font-black uppercase mb-2">Jawab</span>
                        <p className="font-bold text-gray-700">{item.answer}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 border-[3px] border-black rounded-xl text-center font-black uppercase text-lg bg-white shadow-[4px_4px_0px_0px_#000]">Belum ada data Q&A</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}