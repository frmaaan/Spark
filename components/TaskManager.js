// components/TaskManager.js
"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  CheckCircle2, Circle, Trash2, Plus, Users, User, Loader2, 
  Share2, RefreshCcw, AlignLeft, List, KanbanSquare,
  ArrowRight, ArrowLeft, PlayCircle, ClipboardList, X, MessageCircle
} from "lucide-react";
import { addTodo, updateTodoStatus, deleteTodo, shareTodo, unshareTodo } from "@/lib/actions/todoActions";
import { getTemplates, useTemplate } from "@/lib/actions/templateActions";

// Status config — warna senada dengan design system (monokrom + aksen)
const STATUS_CONFIG = {
  TODO: {
    label: "TO DO",
    bg: "bg-surface-light",
    border: "border-primary-light",
    dot: "bg-text-light",
    dotBorder: "border-text-muted",
    badge: "bg-zinc-200 text-text-dark border-zinc-300",
    count: "bg-zinc-200 text-text-dark border-zinc-300",
    textColor: "text-text-muted",
    emptyText: "Tidak ada tugas baru",
    emoji: "⬜",
  },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    dot: "bg-yellow-400",
    dotBorder: "border-yellow-500",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
    count: "bg-yellow-100 text-yellow-700 border-yellow-300",
    textColor: "text-yellow-600",
    emptyText: "Tidak ada tugas yang sedang dikerjakan",
    emoji: "🔄",
  },
  DONE: {
    label: "SELESAI",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-success",
    dotBorder: "border-success-hover",
    badge: "bg-green-100 text-green-800 border-green-200",
    count: "bg-green-100 text-green-700 border-green-200",
    textColor: "text-green-500",
    emptyText: "Belum ada tugas yang selesai",
    emoji: "✅",
  },
};

const STATUS_FLOW = ["TODO", "IN_PROGRESS", "DONE"];

function getNextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}
function getPrevStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  return idx > 0 ? STATUS_FLOW[idx - 1] : null;
}

// ============================
// STATUS BADGE
// ============================
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

// ============================
// TASK CARD
// ============================
function TaskCard({ todo, currentUserId, userTeamId, isPending, startTransition, compact = false }) {
  const next = getNextStatus(todo.status);
  const prev = getPrevStatus(todo.status);

  return (
    <div className={`p-3 border-2 rounded-[6px] transition-all group ${todo.status === "DONE" ? "bg-zinc-50 border-zinc-200 opacity-70" : "bg-white border-primary-light hover:border-primary"}`}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">
          {todo.status === "DONE" ? (
            <CheckCircle2 size={16} className="text-success" />
          ) : todo.status === "IN_PROGRESS" ? (
            <PlayCircle size={16} className="text-yellow-500" />
          ) : (
            <Circle size={16} className="text-text-light" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${todo.status === "DONE" ? "line-through text-text-muted" : "text-text-dark"}`}>
            {todo.task}
          </p>
          {todo.description && !compact && (
            <p className={`text-[11px] mt-1 leading-relaxed line-clamp-2 ${todo.status === "DONE" ? "line-through text-text-light" : "text-text-muted"}`}>
              {todo.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <StatusBadge status={todo.status} />
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${todo.tipe === "TEAM" ? "bg-zinc-800 text-white border-zinc-800" : "bg-white text-text-muted border-zinc-200"}`}>
              {todo.tipe === "TEAM" ? "TIM" : "PRIBADI"}
            </span>
            {todo.tipe === "TEAM" && (
              <span className="text-[9px] text-text-muted">
                {todo.authorId === currentUserId ? "Anda" : todo.author?.nama}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {prev && (
            <button onClick={() => startTransition(() => updateTodoStatus(todo.id, prev))} disabled={isPending} title={`← ${STATUS_CONFIG[prev].label}`} className="text-text-light hover:text-text-dark transition-colors p-1 hover:bg-surface-light rounded">
              <ArrowLeft size={13} />
            </button>
          )}
          {next && (
            <button onClick={() => startTransition(() => updateTodoStatus(todo.id, next))} disabled={isPending} title={`→ ${STATUS_CONFIG[next].label}`} className="text-text-light hover:text-primary transition-colors p-1 hover:bg-surface-light rounded">
              <ArrowRight size={13} />
            </button>
          )}
          {todo.tipe === "PERSONAL" && todo.authorId === currentUserId && userTeamId && (
            <button onClick={() => startTransition(() => shareTodo(todo.id))} disabled={isPending} title="Bagikan ke Tim" className="text-text-light hover:text-primary transition-colors p-1">
              <Share2 size={12} />
            </button>
          )}
          {todo.tipe === "TEAM" && todo.authorId === currentUserId && (
            <button onClick={() => startTransition(() => unshareTodo(todo.id))} disabled={isPending} title="Jadikan Personal" className="text-text-light hover:text-yellow-600 transition-colors p-1">
              <RefreshCcw size={12} />
            </button>
          )}
          {todo.authorId === currentUserId && (
            <button onClick={() => startTransition(() => deleteTodo(todo.id))} disabled={isPending} title="Hapus" className="text-text-light hover:text-danger transition-colors p-1">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================
// KANBAN COLUMN
// ============================
function KanbanColumn({ statusKey, todos, currentUserId, userTeamId, isPending, startTransition }) {
  const cfg = STATUS_CONFIG[statusKey];
  return (
    <div className={`${cfg.bg} border-2 ${cfg.border} rounded-[8px] p-3 flex flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} border ${cfg.dotBorder}`}></div>
          <span className="text-[11px] font-black uppercase tracking-wider text-text-dark">{cfg.label}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.count}`}>
          {todos.length}
        </span>
      </div>
      <div className="space-y-2 flex-1 max-h-[400px] overflow-y-auto pr-1">
        {todos.length === 0 ? (
          <p className={`text-[11px] ${cfg.textColor} text-center py-8 italic`}>{cfg.emptyText}</p>
        ) : (
          todos.map((todo) => (
            <TaskCard key={todo.id} todo={todo} currentUserId={currentUserId} userTeamId={userTeamId} isPending={isPending} startTransition={startTransition} compact />
          ))
        )}
      </div>
    </div>
  );
}

// ============================
// WHATSAPP SHARE HELPER
// ============================
function generateWhatsAppText(todos, userName) {
  if (todos.length === 0) return "";

  const total = todos.length;
  const done = todos.filter(t => t.status === "DONE").length;
  const inProgress = todos.filter(t => t.status === "IN_PROGRESS").length;

  let text = `📋 *Task Report*\n`;
  text += `━━━━━━━━━━━━━━━━━━\n`;

  todos.forEach((todo) => {
    const emoji = STATUS_CONFIG[todo.status].emoji;
    text += `${emoji} ${todo.task}\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `📊 *Progress: ${done}/${total} selesai*`;
  if (inProgress > 0) text += ` | 🔄 ${inProgress} in progress`;
  text += `\n👤 Oleh: ${userName}`;

  return text;
}

function shareToWhatsApp(todos, userName) {
  const text = generateWhatsAppText(todos, userName);
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
}

// ============================
// MAIN COMPONENT
// ============================
export default function TaskManager({ initialTodos = [], userTeamId, currentUserId, userName = "User" }) {
  const [view, setView] = useState("board");
  const [task, setTask] = useState("");
  const [description, setDescription] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [isTeamTask, setIsTeamTask] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [usingTemplate, setUsingTemplate] = useState(null); // template id

  // Group by status
  const todosByStatus = {
    TODO: initialTodos.filter(t => t.status === "TODO"),
    IN_PROGRESS: initialTodos.filter(t => t.status === "IN_PROGRESS"),
    DONE: initialTodos.filter(t => t.status === "DONE"),
  };

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

  async function openTemplateModal() {
    setShowTemplateModal(true);
    setLoadingTemplates(true);
    const result = await getTemplates();
    if (result.success) setTemplates(result.data);
    setLoadingTemplates(false);
  }

  async function handleUseTemplate(templateId) {
    setUsingTemplate(templateId);
    const result = await useTemplate(templateId, isTeamTask);
    if (result.success) {
      setShowTemplateModal(false);
    }
    setUsingTemplate(null);
  }

  return (
    <div className="bg-white border-2 border-primary p-6 md:p-8 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
      {/* Header + View Toggle */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="brutal-label">TASK MANAGER</p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Team/Personal Toggle */}
          {userTeamId && (
            <div className="flex bg-surface-light border-2 border-primary rounded-[4px] overflow-hidden text-[10px] font-black">
              <button type="button" onClick={() => setIsTeamTask(false)} className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${!isTeamTask ? "bg-primary text-white" : "text-text-muted hover:text-text-dark"}`}>
                <User size={11} /> PERSONAL
              </button>
              <button type="button" onClick={() => setIsTeamTask(true)} className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${isTeamTask ? "bg-primary text-white" : "text-text-muted hover:text-text-dark"}`}>
                <Users size={11} /> TIM
              </button>
            </div>
          )}
          {/* View Toggle */}
          <div className="flex bg-surface-light border-2 border-primary rounded-[4px] overflow-hidden text-[10px] font-black">
            <button onClick={() => setView("list")} className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${view === "list" ? "bg-primary text-white" : "text-text-muted hover:text-text-dark"}`}>
              <List size={11} /> LIST
            </button>
            <button onClick={() => setView("board")} className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${view === "board" ? "bg-primary text-white" : "text-text-muted hover:text-text-dark"}`}>
              <KanbanSquare size={11} /> BOARD
            </button>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-dashed border-primary-light pt-5">
        {/* Form Tambah */}
        <form onSubmit={handleAdd} className="mb-4 bg-surface-light p-3 border-2 border-primary-light rounded-[6px]">
          <div className="flex gap-2">
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder={isTeamTask ? "Tugas baru untuk Tim..." : "Tugas baru..."}
              className="flex-1 min-w-0 border-2 border-primary rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              disabled={isPending}
            />
            <button
              type="submit"
              disabled={isPending || !task.trim()}
              className="bg-primary text-white px-3 py-2 rounded-[4px] border-2 border-text-dark shadow-[2px_2px_0px_0px_#111827] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#111827] transition-all disabled:opacity-50 flex items-center gap-1 text-xs font-black flex-shrink-0"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              TAMBAH
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowDesc(!showDesc)}
              className="text-[11px] font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1 px-1"
            >
              <AlignLeft size={12} />
              {showDesc ? "Tutup Deskripsi" : "Deskripsi"}
            </button>
          </div>
          {showDesc && (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail opsional..."
              className="w-full border-2 border-primary-light rounded-[4px] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[60px] bg-white mt-2"
              disabled={isPending}
            />
          )}
        </form>

        {/* Action buttons: Template + WhatsApp */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={openTemplateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-surface-light border-2 border-primary rounded-[4px] hover:bg-primary hover:text-white transition-colors shadow-[2px_2px_0px_0px_#111827] active:translate-y-[1px] active:shadow-none"
          >
            <ClipboardList size={13} /> GUNAKAN TEMPLATE
          </button>
          {initialTodos.length > 0 && (
            <button
              onClick={() => shareToWhatsApp(initialTodos, userName)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-surface-light border-2 border-primary rounded-[4px] hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors shadow-[2px_2px_0px_0px_#111827] active:translate-y-[1px] active:shadow-none"
            >
              <MessageCircle size={13} /> SHARE WHATSAPP
            </button>
          )}
        </div>

        {/* ===== VIEW: LIST ===== */}
        {view === "list" && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {initialTodos.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8 italic">Belum ada tugas saat ini.</p>
            ) : (
              initialTodos.map((todo) => (
                <TaskCard key={todo.id} todo={todo} currentUserId={currentUserId} userTeamId={userTeamId} isPending={isPending} startTransition={startTransition} />
              ))
            )}
          </div>
        )}

        {/* ===== VIEW: BOARD (Kanban) ===== */}
        {view === "board" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STATUS_FLOW.map((statusKey) => (
              <KanbanColumn
                key={statusKey}
                statusKey={statusKey}
                todos={todosByStatus[statusKey]}
                currentUserId={currentUserId}
                userTeamId={userTeamId}
                isPending={isPending}
                startTransition={startTransition}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== MODAL: PILIH TEMPLATE ===== */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] p-6 max-w-md w-full animate-fade-in-up max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-[3px] border-black pb-3 mb-5">
              <div className="flex items-center gap-2">
                <ClipboardList size={20} className="text-primary" />
                <h3 className="font-black text-lg uppercase tracking-tight">Pilih Template</h3>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="hover:text-danger transition-colors">
                <X size={24} />
              </button>
            </div>

            {isTeamTask && (
              <p className="text-[11px] font-bold text-text-muted bg-zinc-100 border-2 border-zinc-200 px-3 py-2 rounded mb-4">
                ℹ️ Tugas dari template akan dibuat sebagai tugas <span className="text-text-dark">TIM</span>
              </p>
            )}

            {loadingTemplates ? (
              <div className="py-12 text-center">
                <Loader2 size={24} className="animate-spin mx-auto text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-text-muted font-bold">Belum ada template.</p>
                <p className="text-xs text-text-light mt-1">Admin perlu membuat template terlebih dahulu di halaman Kelola Akun.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="border-2 border-primary-light rounded-[6px] p-4 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-text-dark uppercase">{tpl.title}</p>
                        <div className="mt-2 space-y-1">
                          {tpl.items.map((item, i) => (
                            <p key={i} className="text-[11px] text-text-muted flex items-center gap-1.5">
                              <Circle size={10} className="text-text-light flex-shrink-0" /> {item}
                            </p>
                          ))}
                        </div>
                        <p className="text-[10px] text-text-light mt-2">{tpl.items.length} item</p>
                      </div>
                      <button
                        onClick={() => handleUseTemplate(tpl.id)}
                        disabled={usingTemplate === tpl.id}
                        className="bg-primary text-white px-3 py-2 text-[10px] font-black uppercase border-2 border-text-dark shadow-[2px_2px_0px_0px_#111827] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#111827] transition-all disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                      >
                        {usingTemplate === tpl.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        PAKAI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
