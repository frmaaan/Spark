// components/TaskManager.js
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, Trash2, Plus, Users, User, Loader2,
  Share2, RefreshCcw, AlignLeft, List, KanbanSquare,
  ArrowRight, ArrowLeft, PlayCircle, ClipboardList, X, MessageCircle, Pencil, Save
} from "lucide-react";
import { addTodo, updateTodoStatus, deleteTodo, shareTodo, unshareTodo, archiveOldTodos, getHistories, updateHistory, deleteHistory, saveHistoryAndClearTodos } from "@/lib/actions/todoActions";
import ConfirmModal from "@/components/ConfirmModal";
// Import updateTemplate & deleteTemplate ditambahkan di sini
import { getTemplates, useTemplate, addTemplate, updateTemplate, deleteTemplate } from "@/lib/actions/templateActions";

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
    emoji: "❌",
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

const BOARD_STATUS_FLOW = ["TODO", "IN_PROGRESS", "DONE"];
const LIST_STATUS_FLOW = ["TODO", "DONE"];

function normalizeTodoStatus(value) {
  const raw = String(value || "").toUpperCase().trim();
  if (raw === "TODO" || raw === "TO_DO") return "TODO";
  if (raw === "IN_PROGRESS" || raw === "INPROGRESS" || raw === "PROGRESS") return "IN_PROGRESS";
  if (raw === "DONE" || raw === "SELESAI" || raw === "FINISH" || raw === "FINISHED") return "DONE";
  return "TODO";
}

function getNextStatus(current, flow) {
  if (current === "IN_PROGRESS" && !flow.includes("IN_PROGRESS")) return "DONE";
  const idx = flow.indexOf(current);
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
}

function getPrevStatus(current, flow) {
  if (current === "IN_PROGRESS" && !flow.includes("IN_PROGRESS")) return "TODO";
  const idx = flow.indexOf(current);
  return idx > 0 ? flow[idx - 1] : null;
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
function TaskCard({ todo, currentUserId, userTeamId, isPending, startTransition, compact = false, draggable = false, onDragStart, onDragEnd, isDragging = false, onChangeStatus, statusFlow }) {
  const next = getNextStatus(todo.status, statusFlow);
  const prev = getPrevStatus(todo.status, statusFlow);

  return (
    <div
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(todo.id));
        onDragStart?.(event);
      }}
      onDragEnd={onDragEnd}
      className={`p-3 border-2 rounded-[6px] transition-all group ${todo.status === "DONE" ? "bg-zinc-50 border-zinc-200 opacity-70" : "bg-white border-primary-light hover:border-primary"} ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "opacity-50 ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform cursor-pointer"
          disabled={isPending}
          onClick={() => {
            const target = todo.status === "DONE" ? "TODO" : (next || "TODO");
            onChangeStatus?.(todo.id, target);
          }}
          title={todo.status === "DONE" ? "Buka Kembali" : `Pindah ke ${STATUS_CONFIG[next || "TODO"].label}`}
        >
          {todo.status === "DONE" ? (
            <CheckCircle2 size={16} className="text-success" />
          ) : todo.status === "IN_PROGRESS" ? (
            <PlayCircle size={16} className="text-yellow-500" />
          ) : (
            <Circle size={16} className="text-text-light" />
          )}
        </button>

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
            <button onClick={() => onChangeStatus?.(todo.id, prev)} disabled={isPending} title={`← ${STATUS_CONFIG[prev].label}`} className="text-text-light hover:text-text-dark transition-colors p-1 hover:bg-surface-light rounded">
              <ArrowLeft size={13} />
            </button>
          )}
          {next && (
            <button onClick={() => onChangeStatus?.(todo.id, next)} disabled={isPending} title={`→ ${STATUS_CONFIG[next].label}`} className="text-text-light hover:text-primary transition-colors p-1 hover:bg-surface-light rounded">
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
function KanbanColumn({ statusKey, todos, currentUserId, userTeamId, isPending, startTransition, onChangeStatus, isDraggingOver = false, onDragOver, onDrop, draggedTodoId, onCardDragStart, onCardDragEnd, statusFlow }) {
  const cfg = STATUS_CONFIG[statusKey];
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
      className={`${cfg.bg} border-2 ${cfg.border} rounded-[8px] p-3 flex flex-col transition-all ${isDraggingOver ? "ring-2 ring-primary shadow-[4px_4px_0px_0px_#111827]" : ""}`}
    >
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
            <TaskCard
              key={todo.id}
              todo={todo}
              currentUserId={currentUserId}
              userTeamId={userTeamId}
              isPending={isPending}
              startTransition={startTransition}
              compact
              draggable
              isDragging={draggedTodoId === todo.id}
              onDragStart={() => onCardDragStart?.(todo)}
              onDragEnd={onCardDragEnd}
              onChangeStatus={onChangeStatus}
              statusFlow={statusFlow}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================
// WHATSAPP SHARE HELPER
// ============================
function generateWhatsAppText(todos, userName, reportTitle = "Task Report") {
  if (todos.length === 0) return "";

  let text = ` *${reportTitle}*\n`;
  text += `━━━━━━━━━━━━━━━━━━\n`;

  todos.forEach((todo) => {
    const emoji = todo.status === "DONE" ? "✅" : todo.status === "TODO" ? "❌" : "🔄";
    text += `${emoji} ${todo.task}\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━\n`;
  return text;
}

function shareToWhatsApp(todos, userName, reportTitle) {
  const text = generateWhatsAppText(todos, userName, reportTitle);
  const encoded = encodeURIComponent(text);
  const isDesktop = typeof window !== "undefined" && window.matchMedia?.("(min-width: 768px)").matches;
  const url = isDesktop
    ? `https://web.whatsapp.com/send?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank");
}

// ============================
// MAIN COMPONENT
// ============================
export default function TaskManager({ initialTodos = [], userTeamId, currentUserId, userName = "User" }) {
  const router = useRouter();
  const [view, setView] = useState("board");
  const [task, setTask] = useState("");
  const [description, setDescription] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [isTeamTask, setIsTeamTask] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [todos, setTodos] = useState(initialTodos);
  const [draggedTodoId, setDraggedTodoId] = useState(null);
  const [draggedTodoStatus, setDraggedTodoStatus] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

  // Template modal & Creation
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [usingTemplate, setUsingTemplate] = useState(null);
  const [showCreateTemplateForm, setShowCreateTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null); // Mode Edit
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateItems, setNewTemplateItems] = useState([""]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  // History & Others
  const [reportTitle, setReportTitle] = useState("Task Report");
  const [histories, setHistories] = useState([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [editingHistory, setEditingHistory] = useState(null);
  const [historyEditBackup, setHistoryEditBackup] = useState(null);
  const [showSaveBeforeShareModal, setShowSaveBeforeShareModal] = useState(false);
  const [saveBeforeShareLoading, setSaveBeforeShareLoading] = useState(false);
  const [showDeleteHistoryModal, setShowDeleteHistoryModal] = useState(false);
  const [historyIdToDelete, setHistoryIdToDelete] = useState(null);

  const effectiveReportTitle = (reportTitle || "").trim() || "Task Report";

  useEffect(() => { setTodos(initialTodos); }, [initialTodos]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await archiveOldTodos(); } catch (err) {}
      try {
        const res = await getHistories();
        if (mounted && res.success) setHistories(res.data || []);
      } catch (err) {}
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const storedTitle = window.sessionStorage.getItem("stacx_report_title");
    if (storedTitle && storedTitle.trim()) setReportTitle(storedTitle.trim());
  }, []);

  useEffect(() => {
    const normalized = (reportTitle || "").trim();
    if (!normalized) {
      window.sessionStorage.removeItem("stacx_report_title");
      return;
    }
    window.sessionStorage.setItem("stacx_report_title", normalized);
  }, [reportTitle]);

  async function handleMoveTodoStatus(todoId, newStatus) {
    if (editingHistory) {
      setTodos((prev) => prev.map((todo) => (todo.id === todoId ? { ...todo, status: normalizeTodoStatus(newStatus) } : todo)));
      return;
    }

    const previousTodos = todos;
    setTodos((prev) => prev.map((todo) => (todo.id === todoId ? { ...todo, status: normalizeTodoStatus(newStatus) } : todo)));

    const result = await updateTodoStatus(todoId, normalizeTodoStatus(newStatus));
    if (!result.success) {
      setTodos(previousTodos);
      return;
    }
    router.refresh();
  }

  function handleDragStart(todo) {
    setDraggedTodoId(todo.id);
    setDraggedTodoStatus(todo.status);
  }

  function handleDragEnd() {
    setDraggedTodoId(null);
    setDraggedTodoStatus(null);
    setDragOverStatus(null);
  }

  function handleDropOnStatus(statusKey) {
    if (draggedTodoId === null) return;
    if (draggedTodoStatus !== statusKey) handleMoveTodoStatus(draggedTodoId, statusKey);
    handleDragEnd();
  }

  const todosByStatus = {
    TODO: todos.filter(t => t.status === "TODO"),
    IN_PROGRESS: todos.filter(t => t.status === "IN_PROGRESS"),
    DONE: todos.filter(t => t.status === "DONE"),
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

  // === Modal Template Logic ===
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
      const templateTitle = (result.title || "Task Report").trim();
      setReportTitle(templateTitle);
      closeTemplateModal();
    }
    setUsingTemplate(null);
  }

  function closeTemplateModal() {
    setShowTemplateModal(false);
    setShowCreateTemplateForm(false);
    setEditingTemplateId(null);
    setNewTemplateTitle("");
    setNewTemplateItems([""]);
  }

  // === Create & Update Template Logic ===
  function handleAddTemplateItem() {
    setNewTemplateItems([...newTemplateItems, ""]);
  }

  function handleRemoveTemplateItem(index) {
    setNewTemplateItems(newTemplateItems.filter((_, i) => i !== index));
  }

  function handleTemplateItemChange(index, val) {
    const updated = [...newTemplateItems];
    updated[index] = val;
    setNewTemplateItems(updated);
  }

  // Masuk ke Mode Edit Template
  function handleEditTemplate(tpl) {
    setEditingTemplateId(tpl.id);
    setNewTemplateTitle(tpl.title);
    setNewTemplateItems(tpl.items && tpl.items.length > 0 ? tpl.items : [""]);
    setShowCreateTemplateForm(true);
  }

  // Hapus Template
  async function handleDeleteTemplate(id) {
    if (!window.confirm("Apakah Anda yakin ingin menghapus template ini?")) return;
    try {
      const res = await deleteTemplate(id);
      if (res.success) {
        setTemplates(templates.filter(t => t.id !== id));
      } else {
        alert(res.error || "Gagal menghapus template. Akses mungkin ditolak.");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    }
  }

  // Submit Form (Create & Update)
  async function submitTemplateForm(e) {
    e.preventDefault();
    if (!newTemplateTitle.trim()) return;
    const validItems = newTemplateItems.map(i => i.trim()).filter(Boolean);
    if (validItems.length === 0) return;

    setIsCreatingTemplate(true);
    try {
      let res;
      if (editingTemplateId) {
        // Mode Update
        res = await updateTemplate(editingTemplateId, newTemplateTitle.trim(), validItems);
      } else {
        // Mode Create
        res = await addTemplate(newTemplateTitle.trim(), validItems);
      }

      if (res.success) {
        setNewTemplateTitle("");
        setNewTemplateItems([""]);
        setEditingTemplateId(null);
        setShowCreateTemplateForm(false);
        
        // Refresh list template
        setLoadingTemplates(true);
        const templatesRes = await getTemplates();
        if (templatesRes.success) setTemplates(templatesRes.data);
        setLoadingTemplates(false);
      } else {
        alert(res.error || "Gagal menyimpan template.");
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsCreatingTemplate(false);
    }
  }

  // === History Logic ===
  function openHistoryPanel() { setShowHistoryPanel(true); }
  async function handleRefreshHistories() {
    const res = await getHistories();
    if (res.success) setHistories(res.data || []);
  }

  function clearBoardLocal() {
    setTodos([]); setTask(""); setDescription(""); setShowDesc(false);
  }

  function handleEditHistoryClick(history) {
    if (todos.length > 0) {
      const ok = window.confirm("Terdapat Kanban/ToDo baru — jika lanjut, board saat ini akan hilang. Lanjutkan?");
      if (!ok) return;
    }
    const items = JSON.parse(history.items || "[]");
    const mapped = items.map((it, idx) => ({ id: `hist-${history.id}-${idx}`, task: it.task, description: it.description || "", status: normalizeTodoStatus(it.status), tipe: it.tipe || "PERSONAL", authorId: it.authorId || null }));
    setHistoryEditBackup(todos);
    setTodos(mapped);
    setEditingHistory({ id: history.id, title: history.title });
    setShowHistoryPanel(false);
    setView("board");
  }

  async function handleSaveHistoryEdits(newTitle, newItems) {
    if (!editingHistory) return;
    startTransition(async () => {
      await updateHistory(editingHistory.id, newTitle, newItems);
      setEditingHistory(null);
      setHistoryEditBackup(null);
      await handleRefreshHistories();
    });
  }

  function handleCancelHistoryEdit() {
    if (historyEditBackup) setTodos(historyEditBackup);
    setHistoryEditBackup(null);
    setEditingHistory(null);
  }

  function handleDeleteHistory(id) {
    setHistoryIdToDelete(id);
    setShowDeleteHistoryModal(true);
  }

  async function handleConfirmDeleteHistory() {
    if (!historyIdToDelete) return;
    const res = await deleteHistory(historyIdToDelete);
    if (res.success) await handleRefreshHistories();
    setShowDeleteHistoryModal(false);
    setHistoryIdToDelete(null);
  }

  function handleShareHistory(history) {
    const items = JSON.parse(history.items || "[]");
    const fakeTodos = items.map(it => ({ task: it.task, status: it.status }));
    shareToWhatsApp(fakeTodos, userName, (history.title || "").trim() || effectiveReportTitle);
  }

  return (
    <div className="bg-white border-2 border-primary p-6 md:p-8 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
      {/* Header + View Toggle */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="brutal-label">TASK MANAGER</p>
        <div className="flex items-center gap-2 flex-wrap">
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
        {editingHistory && (
          <div className="mb-4 bg-yellow-50 border-2 border-yellow-300 rounded-[6px] p-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-yellow-800">MODE EDIT HISTORI AKTIF</p>
              <p className="text-xs text-yellow-700 mt-1">Snapshot histori sudah dimuat ke board. Edit langsung di kanban/list, lalu simpan kembali ke histori.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
              <input
                type="text"
                value={editingHistory.title}
                onChange={(e) => setEditingHistory((prev) => ({ ...prev, title: e.target.value }))}
                className="min-w-[220px] border-2 border-yellow-400 rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
              />
              <button
                onClick={() => {
                  const itemsToSave = todos.map((t) => ({ task: t.task, description: t.description || "", status: t.status, tipe: t.tipe || "PERSONAL", authorId: t.authorId || null }));
                  handleSaveHistoryEdits(editingHistory.title || `Snapshot ${new Date().toISOString().slice(0,10)}`, itemsToSave);
                }}
                className="px-3 py-2 bg-primary text-white border-2 border-text-dark text-[11px] font-black uppercase"
              >
                Simpan Histori
              </button>
              <button onClick={handleCancelHistoryEdit} className="px-3 py-2 bg-zinc-200 text-black border-2 border-black text-[11px] font-black uppercase">
                Batal Edit
              </button>
            </div>
          </div>
        )}

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
            <button type="button" onClick={() => setShowDesc(!showDesc)} className="text-[11px] font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1 px-1">
              <AlignLeft size={12} /> {showDesc ? "Tutup Deskripsi" : "Deskripsi"}
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

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={openTemplateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-surface-light border-2 border-primary rounded-[4px] hover:bg-primary hover:text-white transition-colors shadow-[2px_2px_0px_0px_#111827] active:translate-y-[1px] active:shadow-none"
          >
            <ClipboardList size={13} /> GUNAKAN TEMPLATE
          </button>
          {todos.length > 0 && (
            <>
              <button
                onClick={() => setShowSaveBeforeShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-surface-light border-2 border-primary rounded-[4px] hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors shadow-[2px_2px_0px_0px_#111827] active:translate-y-[1px] active:shadow-none"
              >
                <MessageCircle size={13} /> SHARE WHATSAPP
              </button>

              <ConfirmModal
                isOpen={showSaveBeforeShareModal}
                title="Simpan ke Histori sebelum Share?"
                message={"Pilih 'Simpan & Bagikan' untuk menyimpan snapshot saat ini ke histori, atau pilih 'Bagikan tanpa menyimpan' untuk langsung membagikan."}
                onCancel={async () => {
                  setShowSaveBeforeShareModal(false);
                  shareToWhatsApp(todos, userName, effectiveReportTitle);
                }}
                onConfirm={async () => {
                  setSaveBeforeShareLoading(true);
                  try {
                    const result = await saveHistoryAndClearTodos(effectiveReportTitle || `Snapshot ${new Date().toISOString().slice(0,10)}`, todos);
                    if (!result?.success) {
                      window.alert(result?.error || "Gagal menyimpan histori.");
                      return;
                    }
                    if (result.data) setHistories((prev) => [result.data, ...prev]);
                    else await handleRefreshHistories();
                    
                    clearBoardLocal();
                    setReportTitle("");
                    shareToWhatsApp(todos, userName, effectiveReportTitle);
                  } catch (err) {
                  } finally {
                    setSaveBeforeShareLoading(false);
                    setShowSaveBeforeShareModal(false);
                  }
                }}
                confirmText={saveBeforeShareLoading ? 'Menyimpan...' : 'Simpan & Bagikan'}
                cancelText="Bagikan tanpa menyimpan"
                type="primary"
              />
            </>
          )}
          <button
            onClick={openHistoryPanel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-surface-light border-2 border-primary rounded-[4px] hover:bg-surface hover:text-white transition-colors shadow-[2px_2px_0px_0px_#111827] active:translate-y-[1px] active:shadow-none"
          >
            <List size={13} /> HISTORY
          </button>
        </div>

        <div className="mb-5 bg-surface-light border-2 border-primary rounded-[6px] p-3">
          <label className="block text-[11px] font-black uppercase tracking-wider text-text-dark mb-2">
            Judul TodoList / Kanban
          </label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-full border-2 border-primary rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            placeholder="Task Report"
          />
          <p className="text-[10px] text-text-muted mt-2">Jika dikosongkan, judul otomatis menggunakan <span className="font-bold">Task Report</span>.</p>
        </div>

        {view === "list" && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {todos.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8 italic">Belum ada tugas saat ini.</p>
            ) : (
              todos.map((todo) => (
                <TaskCard 
                  key={todo.id} 
                  todo={todo} 
                  currentUserId={currentUserId} 
                  userTeamId={userTeamId} 
                  isPending={isPending} 
                  startTransition={startTransition} 
                  draggable={false} 
                  onChangeStatus={handleMoveTodoStatus} 
                  statusFlow={LIST_STATUS_FLOW} 
                />
              ))
            )}
          </div>
        )}

        {view === "board" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {BOARD_STATUS_FLOW.map((statusKey) => (
              <KanbanColumn
                key={statusKey}
                statusKey={statusKey}
                todos={todosByStatus[statusKey]}
                currentUserId={currentUserId}
                userTeamId={userTeamId}
                isPending={isPending}
                startTransition={startTransition}
                onChangeStatus={handleMoveTodoStatus}
                isDraggingOver={dragOverStatus === statusKey}
                onDragOver={() => setDragOverStatus(statusKey)}
                onDrop={() => handleDropOnStatus(statusKey)}
                draggedTodoId={draggedTodoId}
                onCardDragStart={handleDragStart}
                onCardDragEnd={handleDragEnd}
                statusFlow={BOARD_STATUS_FLOW}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== PANEL HISTORY ===== */}
      {showHistoryPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] p-6 max-w-2xl w-full animate-fade-in-up max-h-[84vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-[3px] border-black pb-3 mb-4">
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight">Histori ToDo / Kanban</h3>
                <p className="text-[11px] text-text-muted mt-1">Snapshot tersimpan yang bisa diedit atau langsung dibagikan.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleRefreshHistories} className="px-3 py-1.5 border-2 border-black bg-zinc-100 text-[11px] font-black uppercase hover:bg-zinc-200">Refresh</button>
                <button onClick={() => setShowHistoryPanel(false)} className="px-3 py-1.5 border-2 border-black bg-white text-[11px] font-black uppercase hover:bg-zinc-100">Tutup</button>
              </div>
            </div>

            {histories.length === 0 ? (
              <div className="py-12 text-center text-text-muted border-2 border-dashed border-primary-light rounded-[8px]">Belum ada histori.</div>
            ) : (
              <div className="space-y-3">
                {histories.map(h => {
                  const items = JSON.parse(h.items || "[]");
                  const todoCount = items.filter((i) => normalizeTodoStatus(i.status) === "TODO").length;
                  const progressCount = items.filter((i) => normalizeTodoStatus(i.status) === "IN_PROGRESS").length;
                  const doneCount = items.filter((i) => normalizeTodoStatus(i.status) === "DONE").length;

                  return (
                  <div key={h.id} className="p-4 border-2 border-primary rounded-[8px] bg-surface-light shadow-[3px_3px_0px_0px_#111827] hover:bg-white hover:shadow-[4px_4px_0px_0px_#111827] transition-all active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#111827]">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-sm uppercase tracking-wide text-text-dark truncate">{h.title || "Task Report"}</p>
                        <p className="text-[11px] text-text-muted mt-1">{new Date(h.createdAt).toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] font-black px-2 py-1 border rounded bg-zinc-200 border-zinc-300">TODO: {todoCount}</span>
                          <span className="text-[10px] font-black px-2 py-1 border rounded bg-yellow-100 border-yellow-300">PROGRESS: {progressCount}</span>
                          <span className="text-[10px] font-black px-2 py-1 border rounded bg-green-100 border-green-300">DONE: {doneCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap md:justify-end">
                        <button
                          onClick={() => handleEditHistoryClick(h)}
                          title="Edit histori"
                          className="w-9 h-9 flex items-center justify-center border-2 border-black bg-primary text-white rounded-[4px] shadow-[2px_2px_0px_0px_#111827] hover:brightness-110 transition-all active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#111827]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleShareHistory(h)}
                          title="Share WhatsApp"
                          className="w-9 h-9 flex items-center justify-center border-2 border-black bg-green-600 text-white rounded-[4px] shadow-[2px_2px_0px_0px_#111827] hover:bg-green-700 transition-all active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#111827]"
                        >
                          <MessageCircle size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(h.id)}
                          title="Hapus histori"
                          className="w-9 h-9 flex items-center justify-center border-2 border-black bg-red-500 text-white rounded-[4px] shadow-[2px_2px_0px_0px_#111827] hover:bg-red-600 transition-all active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#111827]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteHistoryModal}
        title="Hapus Histori?"
        message="Histori yang dihapus tidak dapat dikembalikan."
        onConfirm={handleConfirmDeleteHistory}
        onCancel={() => {
          setShowDeleteHistoryModal(false);
          setHistoryIdToDelete(null);
        }}
        confirmText="Hapus"
        cancelText="Batal"
        type="danger"
      />

      {/* ===== MODAL TEMPLATE (LIST, CREATE, UPDATE) ===== */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] p-6 max-w-md w-full animate-fade-in-up max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-[3px] border-black pb-3 mb-5">
              <div className="flex items-center gap-2">
                <ClipboardList size={20} className="text-primary" />
                <h3 className="font-black text-lg uppercase tracking-tight">
                  {showCreateTemplateForm 
                    ? (editingTemplateId ? "Edit Template" : "Buat Template Baru") 
                    : "Pilih Template"}
                </h3>
              </div>
              <button onClick={closeTemplateModal} className="hover:text-danger transition-colors">
                <X size={24} />
              </button>
            </div>

            {showCreateTemplateForm ? (
              // FORM PEMBUATAN / EDIT TEMPLATE
              <form onSubmit={submitTemplateForm} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-text-dark mb-2">Nama Template</label>
                  <input
                    value={newTemplateTitle}
                    onChange={e => setNewTemplateTitle(e.target.value)}
                    required
                    placeholder="Contoh: Laporan Harian"
                    className="w-full border-2 border-primary rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-light"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-text-dark mb-2">Daftar Tugas</label>
                  {newTemplateItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        required
                        value={item}
                        onChange={e => handleTemplateItemChange(idx, e.target.value)}
                        placeholder="Contoh: Cek email..."
                        className="flex-1 border-2 border-primary-light rounded-[4px] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-light"
                      />
                      {newTemplateItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTemplateItem(idx)}
                          className="p-1.5 text-text-light hover:text-danger hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddTemplateItem}
                    className="mt-2 text-[11px] font-black uppercase tracking-wider text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Tambah Tugas
                  </button>
                </div>
                
                <div className="flex items-center gap-2 justify-end pt-4 border-t-2 border-dashed border-primary-light">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTemplateForm(false);
                      setEditingTemplateId(null);
                      setNewTemplateTitle("");
                      setNewTemplateItems([""]);
                    }}
                    className="px-4 py-2 bg-zinc-200 text-black border-2 border-black text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#111827] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#111827] transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingTemplate}
                    className="px-4 py-2 bg-primary text-white border-2 border-text-dark text-[11px] font-black uppercase shadow-[2px_2px_0px_0px_#111827] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#111827] transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isCreatingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {editingTemplateId ? "Simpan Perubahan" : "Simpan Template"}
                  </button>
                </div>
              </form>
            ) : (
              // DAFTAR TEMPLATE (DAN TOMBOL BUAT BARU)
              <>
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setEditingTemplateId(null);
                      setNewTemplateTitle("");
                      setNewTemplateItems([""]);
                      setShowCreateTemplateForm(true);
                    }}
                    className="w-full flex justify-center items-center gap-1.5 px-3 py-2.5 text-[11px] font-black uppercase tracking-wider bg-surface-light text-primary border-2 border-dashed border-primary rounded-[4px] hover:border-solid hover:bg-primary hover:text-white transition-all"
                  >
                    <Plus size={14} /> Buat Template Baru
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
                    <p className="text-sm text-text-muted font-bold">Belum ada template tersimpan.</p>
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
                            
                            {/* Actions Bawah: Info & Tombol Edit/Hapus */}
                            <div className="flex items-center gap-3 mt-3">
                              <p className="text-[10px] text-text-light flex-shrink-0">{tpl.items.length} item</p>
                              <div className="w-[1px] h-3 bg-zinc-300"></div>
                              <button
                                onClick={() => handleEditTemplate(tpl)}
                                className="text-[10px] flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
                                title="Edit Template"
                              >
                                <Pencil size={11} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(tpl.id)}
                                className="text-[10px] flex items-center gap-1 text-text-muted hover:text-danger transition-colors"
                                title="Hapus Template"
                              >
                                <Trash2 size={11} /> Hapus
                              </button>
                            </div>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}