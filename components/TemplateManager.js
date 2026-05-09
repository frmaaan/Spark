"use client";
import { useState } from "react";
import { Plus, Minus, Loader2, Trash2, Pencil, X, ClipboardList } from "lucide-react";
import { addTemplate, deleteTemplate, updateTemplate } from "@/lib/actions/templateActions";

export default function TemplateManager({ templates: initialTemplates, toast }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([""]);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editItems, setEditItems] = useState([""]);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    const valid = items.filter(i => i.trim());
    if (!title.trim() || valid.length === 0) return;
    setAdding(true);
    const r = await addTemplate(title.trim(), valid);
    if (r.success) {
      setTemplates(prev => [r.data, ...prev]);
      setTitle(""); setItems([""]);
      toast({ message: `Template "${r.data.title}" dibuat!`, type: "success" });
    } else toast({ message: r.error, type: "error" });
    setAdding(false);
  }

  async function handleDelete(id) {
    const r = await deleteTemplate(id);
    if (r.success) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({ message: "Template dihapus", type: "success" });
    } else toast({ message: r.error, type: "error" });
  }

  function startEdit(tpl) {
    setEditId(tpl.id);
    setEditTitle(tpl.title);
    setEditItems([...tpl.items]);
  }

  async function saveEdit() {
    const valid = editItems.filter(i => i.trim());
    if (!editTitle.trim() || valid.length === 0) return;
    setSaving(true);
    const r = await updateTemplate(editId, editTitle.trim(), valid);
    if (r.success) {
      setTemplates(prev => prev.map(t => t.id === editId ? r.data : t));
      setEditId(null);
      toast({ message: "Template diperbarui!", type: "success" });
    } else toast({ message: r.error, type: "error" });
    setSaving(false);
  }

  return (
    <div className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#111827]">
      <div className="flex items-center gap-2 mb-5 border-b-[3px] border-black pb-2">
        <ClipboardList size={18} />
        <h2 className="text-base font-black uppercase">TEMPLATE TODOLIST</h2>
      </div>

      {/* Form Buat Template */}
      <form onSubmit={handleAdd} className="space-y-3 mb-5">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul template..." className="w-full bg-surface-light border-[3px] border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" required />
        <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">ITEM CHECKLIST:</p>
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-1">
            <input type="text" value={item} onChange={(e) => { const n = [...items]; n[idx] = e.target.value; setItems(n); }} placeholder={`Item ${idx+1}...`} className="flex-1 min-w-0 bg-white border-2 border-zinc-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
            {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_,i) => i !== idx))} className="text-text-light hover:text-danger p-1"><Minus size={14} /></button>}
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, ""])} className="text-[11px] font-bold text-text-muted hover:text-primary flex items-center gap-1"><Plus size={12} /> Tambah Item</button>
        <button type="submit" disabled={adding || !title.trim() || items.filter(i=>i.trim()).length===0} className="w-full bg-primary text-white border-[3px] border-black px-4 py-2.5 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#111827] active:translate-y-[2px] active:shadow-none disabled:opacity-50 flex items-center justify-center gap-1">
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} SIMPAN TEMPLATE
        </button>
      </form>

      {/* Daftar Template */}
      {templates.length === 0 ? (
        <p className="text-xs text-zinc-400 italic text-center py-3">Belum ada template</p>
      ) : (
        <div className="space-y-3 border-t-[3px] border-black pt-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-surface-light border-2 border-zinc-300 p-3">
              {editId === tpl.id ? (
                <div className="space-y-2">
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-white border-2 border-black px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                  {editItems.map((item, idx) => (
                    <div key={idx} className="flex gap-1">
                      <input type="text" value={item} onChange={(e) => { const n = [...editItems]; n[idx] = e.target.value; setEditItems(n); }} className="flex-1 min-w-0 bg-white border border-zinc-300 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary" />
                      {editItems.length > 1 && <button type="button" onClick={() => setEditItems(editItems.filter((_,i)=>i!==idx))} className="text-text-light hover:text-danger p-0.5"><Minus size={12} /></button>}
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditItems([...editItems, ""])} className="text-[10px] font-bold text-text-muted hover:text-primary flex items-center gap-1"><Plus size={10} /> Item</button>
                  <div className="flex gap-1 pt-1">
                    <button onClick={saveEdit} disabled={saving} className="flex-1 bg-primary text-white border-2 border-black px-2 py-1.5 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000] active:shadow-none disabled:opacity-50">{saving ? "..." : "SIMPAN"}</button>
                    <button onClick={() => setEditId(null)} className="bg-zinc-200 border-2 border-black px-2 py-1.5 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000] active:shadow-none">BATAL</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-text-dark uppercase truncate">{tpl.title}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{tpl.items.length} item</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(tpl)} className="text-text-light hover:text-primary transition-colors p-0.5" title="Edit"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(tpl.id)} className="text-text-light hover:text-danger transition-colors p-0.5" title="Hapus"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {tpl.items.map((item, i) => (
                      <p key={i} className="text-[10px] text-text-muted flex items-center gap-1"><span className="text-text-light">•</span> {item}</p>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
