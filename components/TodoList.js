// components/TodoList.js
"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Trash2, Plus, Users, User, Loader2, Share2, RefreshCcw, AlignLeft } from "lucide-react";
import { addTodo, toggleTodo, deleteTodo, shareTodo, unshareTodo } from "@/lib/actions/todoActions";

export default function TodoList({ initialTodos = [], userTeamId, currentUserId }) {
    const [task, setTask] = useState("");
    const [description, setDescription] = useState("");
    const [showDesc, setShowDesc] = useState(false);
    const [isTeamTask, setIsTeamTask] = useState(false);
    const [isPending, startTransition] = useTransition();

    async function handleAdd(e) {
        e.preventDefault();
        if (!task.trim()) return;

        startTransition(async () => {
            await addTodo(task.trim(), description.trim(), isTeamTask)
            setTask("");
            setDescription("");
            setShowDesc(false);
        });
    }

    return (
        <div className="bg-white border-2 border-primary p-6 md:p-8 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between mb-5">
                <p className="brutal-label">TO-DO LIST</p>
                <div className="flex gap-2">
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
            </div>

            <div className="border-t-2 border-dashed border-primary-light pt-6">
                {/* Form Tambah */}
                <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-6 bg-zinc-50 p-4 border-2 border-primary-light rounded-[8px]">
                    <input
                        type="text"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        placeholder={isTeamTask ? "Ketik judul tugas untuk Tim..." : "Ketik judul tugas pribadi..."}
                        className="w-full border-2 border-primary rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        disabled={isPending}
                    />

                    {/* Kotak Deskripsi langsung muncul di bawah input jika showDesc = true */}
                    {showDesc && (
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tambahkan detail/keterangan opsional di sini..."
                            className="w-full border-2 border-primary-light rounded-[6px] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none min-h-[70px] bg-white mt-1"
                            disabled={isPending}
                        />
                    )}

                    {/* Baris Tombol Aksi di bawah */}
                    <div className="flex items-center justify-between mt-1">
                        <button
                            type="button"
                            onClick={() => setShowDesc(!showDesc)}
                            className="text-xs font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1.5 px-1"
                        >
                            <AlignLeft size={14} />
                            {showDesc ? "Tutup Deskripsi" : "Tambah Deskripsi"}
                        </button>

                        <button
                            type="submit"
                            disabled={isPending || !task.trim()}
                            className="bg-primary text-white px-5 py-2 rounded-[6px] border-2 border-text-dark shadow-[2px_2px_0px_0px_#111827] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#111827] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wide"
                        >
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            SIMPAN
                        </button>
                    </div>
                </form>

                {/* Daftar Tugas */}
                <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {initialTodos.length === 0 ? (
                        <p className="text-sm text-text-muted text-center py-4">Belum ada tugas saat ini.</p>
                    ) : (
                        initialTodos.map((todo) => (
                            <li key={todo.id} className={`flex items-start gap-3 p-3 border-2 rounded-[6px] transition-colors ${todo.isDone ? "bg-zinc-50 border-zinc-200" : "bg-surface-light border-primary-light"}`}>
                                <button
                                    onClick={() => startTransition(() => toggleTodo(todo.id, todo.isDone))}
                                    disabled={isPending}
                                    className="mt-0.5 flex-shrink-0 text-primary hover:scale-110 transition-transform"
                                >
                                    {todo.isDone ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} />}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${todo.isDone ? "line-through text-text-muted" : "text-text-dark"}`}>
                                        {todo.task}
                                    </p>

                                    {todo.description && (
                                        <p className={`text-xs mt-1 leading-relaxed ${todo.isDone ? "line-through text-zinc-400" : "text-text-muted"}`}>
                                            {todo.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${todo.tipe === "TEAM" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-zinc-100 text-zinc-600 border-zinc-300"}`}>
                                            {todo.tipe}
                                        </span>
                                        {todo.tipe === "TEAM" && (
                                            <span className="text-[10px] text-text-muted">
                                                oleh: {todo.authorId === currentUserId ? "Anda" : todo.author?.nama}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Tombol Share: Hanya muncul jika tipe PERSONAL, user adalah pembuatnya, dan user punya tim */}
                                    {todo.tipe === "PERSONAL" && todo.authorId === currentUserId && userTeamId && (
                                        <button
                                            onClick={() => startTransition(() => shareTodo(todo.id))}
                                            disabled={isPending}
                                            title="Bagikan ke Tim"
                                            className="text-text-muted hover:text-primary transition-colors flex-shrink-0 p-1"
                                        >
                                            <Share2 size={15} />
                                        </button>
                                    )}
                                    {/* 2. Tombol Tarik Kembali */}
                                    {todo.tipe === "TEAM" && todo.authorId === currentUserId && (
                                        <button
                                            onClick={() => startTransition(() => unshareTodo(todo.id))}
                                            disabled={isPending}
                                            title="Ubah Menjadi Tugas Personal"
                                            className="text-text-muted hover:text-yellow-600 transition-colors flex-shrink-0 p-1"
                                        >
                                            <RefreshCcw size={15} />
                                        </button>
                                    )}
                                    {/* 3. Tombol Hapus */}
                                    {(todo.authorId === currentUserId) && (
                                        <button
                                            onClick={() => startTransition(() => deleteTodo(todo.id))}
                                            disabled={isPending}
                                            title="Hapus Tugas"
                                            className="text-text-muted hover:text-red-500 transition-colors flex-shrink-0 p-1"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}