"use client";
import { useState } from "react";
import { Trash2, KeyRound, Pencil, Loader2 } from "lucide-react";
import { updateAccountTeam, updateAccountRole } from "@/lib/actions/accountActions";

export default function AccountTable({ accounts, teams, loading, onDelete, onResetPw, toast }) {
  const [editId, setEditId] = useState(null);
  const [editTeam, setEditTeam] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(acc) {
    setEditId(acc.id);
    setEditTeam(acc.team?.id?.toString() || "");
    setEditRole(acc.role);
  }

  async function saveEdit(id) {
    setSaving(true);
    const teamId = editTeam ? parseInt(editTeam) : null;
    const [r1, r2] = await Promise.all([
      updateAccountTeam(id, teamId),
      updateAccountRole(id, editRole),
    ]);
    if (r1.success && r2.success) {
      toast({ message: "Akun berhasil diperbarui!", type: "success" });
    } else {
      toast({ message: r1.error || r2.error, type: "error" });
    }
    setEditId(null);
    setSaving(false);
    // Trigger reload via revalidation
    window.location.reload();
  }

  return (
    <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] overflow-hidden">
      <div className="bg-black text-white p-4 flex items-center justify-between">
        <h2 className="font-black tracking-widest uppercase text-sm">DAFTAR AKUN</h2>
        <span className="font-mono text-xs font-bold bg-white text-black px-2 py-0.5">{accounts.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-surface-light border-b-[3px] border-black">
              <th className="p-3 font-black text-[10px] uppercase tracking-wider border-r-[3px] border-black">Nama</th>
              <th className="p-3 font-black text-[10px] uppercase tracking-wider border-r-[3px] border-black w-24">Role</th>
              <th className="p-3 font-black text-[10px] uppercase tracking-wider border-r-[3px] border-black w-36">Tim</th>
              <th className="p-3 font-black text-[10px] uppercase tracking-wider w-28 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center"><Loader2 size={20} className="animate-spin mx-auto text-primary" /></td></tr>
            ) : accounts.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-xs font-bold text-zinc-400 uppercase">Belum ada akun</td></tr>
            ) : accounts.map((acc) => (
              <tr key={acc.id} className="border-b-[3px] border-black last:border-b-0 hover:bg-yellow-50 transition-colors">
                <td className="p-3 border-r-[3px] border-black">
                  <p className="font-bold text-sm text-black">{acc.nama}</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5">@{acc.username}</p>
                </td>
                <td className="p-3 border-r-[3px] border-black">
                  {editId === acc.id ? (
                    <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full bg-white border-2 border-black px-1 py-1 text-[10px] font-black focus:outline-none">
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  ) : (
                    <span className={`text-[10px] font-black px-2 py-0.5 uppercase tracking-widest border-2 border-black ${acc.role === "ADMIN" ? "bg-red-200 text-red-900" : "bg-blue-200 text-blue-900"}`}>{acc.role}</span>
                  )}
                </td>
                <td className="p-3 border-r-[3px] border-black">
                  {editId === acc.id ? (
                    <div className="flex gap-1">
                      <select value={editTeam} onChange={(e) => setEditTeam(e.target.value)} className="flex-1 min-w-0 bg-white border-2 border-black px-1 py-1 text-[10px] font-bold focus:outline-none">
                        <option value="">— Tanpa —</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
                      </select>
                      <button onClick={() => saveEdit(acc.id)} disabled={saving} className="bg-primary text-white border-2 border-black px-2 py-0.5 text-[10px] font-black shadow-[1px_1px_0px_0px_#000] active:shadow-none active:translate-y-[1px] disabled:opacity-50">{saving ? "..." : "✓"}</button>
                      <button onClick={() => setEditId(null)} className="bg-zinc-200 border-2 border-black px-2 py-0.5 text-[10px] font-black shadow-[1px_1px_0px_0px_#000] active:shadow-none active:translate-y-[1px]">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {acc.team?.nama ? (
                        <span className="bg-zinc-100 text-zinc-700 border border-zinc-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">{acc.team.nama}</span>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                      <button onClick={() => startEdit(acc)} className="text-zinc-300 hover:text-primary transition-colors" title="Edit"><Pencil size={12} /></button>
                    </div>
                  )}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={() => onResetPw(acc)} className="bg-white border-2 border-black p-1.5 hover:bg-blue-500 hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" title="Reset Password"><KeyRound size={14} /></button>
                    <button onClick={() => onDelete(acc.id)} className="bg-white border-2 border-black p-1.5 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" title="Hapus"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
