// components/KanbanBoard.js
"use client";

import { useState, useTransition } from "react";
import { GripVertical, CheckCircle2, Circle, Trash2, Share2, RefreshCcw, Loader2, Plus, AlignLeft, Users, User, KanbanSquare } from "lucide-react";
import { addTodo, toggleTodo, deleteTodo, shareTodo, unshareTodo } from "@/lib/actions/todoActions";

function KanbanCard({ todo, currentUserId, userTeamId, isPending, startTransition }) {
  return (
    <div className={`p-3 border-2 rounded-[8px] transition-all hover:shadow-md group ${todo.isDone ? "bg-green-50 border-green-200" : "bg-white border-primary-light"}`}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => startTransition(() => toggleTodo(todo.id, todo.isDone))}
          disabled={isPending}
          className="mt-0.5 flex-shrink-0 text-primary hover:scale-110 transition-transform"
        >
          {todo.isDone ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${todo.isDone ? "line-through text-text-muted" : "text-text-dark"}`}>
            {todo.task}
          </p>
          {todo.description && (
            <p className={`text-[11px] mt-1 leading-relaxed line-clamp-2 ${todo.isDone ? "line-through text-zinc-400" : "text-text-muted"}`}>
              {todo.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${todo.tipe === "TEAM" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"}`}>
              {todo.tipe === "TEAM" ? "TIM" : "PRIBADI"}
            </span>
            {todo.tipe === "TEAM" && (
              <span className="text-[9px] text-text-muted">
                {todo.authorId === currentUserId ? "Anda" : todo.author?.nama}
              </span>
            )}
          </div>
        </div>

        {/* Aksi */}
        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {todo.tipe === "PERSONAL" && todo.authorId === currentUserId && userTeamId && (
            <button
              onClick={() => startTransition(() => shareTodo(todo.id))}
              disabled={isPending}
              title="Bagikan ke Tim"
              className="text-zinc-300 hover:text-primary transition-colors p-0.5"
            >
              <Share2 size={13} />
            </button>
          )}
          {todo.tipe === "TEAM" && todo.authorId === currentUserId && (
            <button
              onClick={() => startTransition(() => unshareTodo(todo.id))}
              disabled={isPending}
              title="Jadikan Personal"
              className="text-zinc-300 hover:text-yellow-600 transition-colors p-0.5"
            >
              <RefreshCcw size={13} />
            </button>
          )}
          {todo.authorId === currentUserId && (
            <button
              onClick={() => startTransition(() => deleteTodo(todo.id))}
              disabled={isPending}
              title="Hapus"
              className="text-zinc-300 hover:text-red-500 transition-colors p-0.5"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KanbanBoard({ initialTodos = [], userTeamId, currentUserId }) {
  const [task, setTask] = useState("");
  const [description, setDescription] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [isTeamTask, setIsTeamTask] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pendingTodos = initialTodos.filter(t => !t.isDone);
  const doneTodos = initialTodos.filter(t => t.isDone);

  async function handleAdd(e) {
    e.preventDefault();
    if (!task.trim()) return;
    startTransition(async () => {
      await addTodo(task.trim(), description.trim(), isTeamTask);
      setTask("");
      setDescription("");
      setShowDesc(false);
    });
  }

  return (
    <div className="bg-white border-2 border-primary p-6 md:p-8 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <KanbanSquare size={18} className="text-primary" />
          <p className="brutal-label">KANBAN BOARD</p>
        </div>
        {userTeamId && (
          <div className="flex bg-surface-light border-2 border-primary rounded-[6px] overflow-hidden text-xs font-bold cursor-pointer">
            <button
              type="button"
              onClick={() => setIsTeamTask(false)}
              className={`px-3 py-1 flex items-center gap-1 transition-colors ${!isTeamTask ? "bg-primary text-white" : "text-text-muted hover:text-text-dark"}`}
            >
              <User size={12} /> PERSONAL
            </button>
            <button
              type="button"
              onClick={() => setIsTeamTask(true)}
              className={`px-3 py-1 flex items-center gap-1 transition-colors ${isTeamTask ? "bg-primary text-white" : "text-text-muted hover:text-text-dark"}`}
            >
              <Users size={12} /> TIM
            </button>
          </div>
        )}
      </div>

      <div className="border-t-2 border-dashed border-primary-light pt-5">
        {/* Form Tambah */}
        <form onSubmit={handleAdd} className="mb-6 bg-zinc-50 p-3 border-2 border-primary-light rounded-[8px]">
          <div className="flex gap-2">
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={isTeamTask ? "Tugas baru untuk Tim..." : "Tugas baru..."}
              className="flex-1 min-w-0 border-2 border-primary rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending || !task.trim()}
              className="bg-primary text-white px-3 py-2 rounded-[6px] border-2 border-text-dark shadow-[2px_2px_0px_0px_#111827] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#111827] transition-all disabled:opacity-50 flex items-center gap-1 text-xs font-black flex-shrink-0"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowDesc(!showDesc)}
            className="text-[11px] font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1 mt-2 px-1"
          >
            <AlignLeft size={12} />
            {showDesc ? "Tutup" : "Deskripsi"}
          </button>
          {showDesc && (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail opsional..."
              className="w-full border-2 border-primary-light rounded-[6px] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[60px] bg-white mt-2"
              disabled={isPending}
            />
          )}
        </form>

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column: Belum Selesai */}
          <div className="bg-amber-50/50 border-2 border-amber-200 rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500"></div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">Belum Selesai</span>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                {pendingTodos.length}
              </span>
            </div>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {pendingTodos.length === 0 ? (
                <p className="text-xs text-amber-400 text-center py-6 italic">Semua tugas selesai! 🎉</p>
              ) : (
                pendingTodos.map((todo) => (
                  <KanbanCard key={todo.id} todo={todo} currentUserId={currentUserId} userTeamId={userTeamId} isPending={isPending} startTransition={startTransition} />
                ))
              )}
            </div>
          </div>

          {/* Column: Selesai */}
          <div className="bg-green-50/50 border-2 border-green-200 rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 border border-green-500"></div>
                <span className="text-xs font-black uppercase tracking-wider text-green-800">Selesai</span>
              </div>
              <span className="text-[10px] font-bold text-green-600 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">
                {doneTodos.length}
              </span>
            </div>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {doneTodos.length === 0 ? (
                <p className="text-xs text-green-400 text-center py-6 italic">Belum ada tugas yang selesai</p>
              ) : (
                doneTodos.map((todo) => (
                  <KanbanCard key={todo.id} todo={todo} currentUserId={currentUserId} userTeamId={userTeamId} isPending={isPending} startTransition={startTransition} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
