// app/page.js
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Users, FileText, ClipboardList, ArrowUpRight, CheckCircle2, ListTodo, Clock } from "lucide-react";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/actions/settingActions";
import { getTodos } from "@/lib/actions/todoActions";
import { redirect } from "next/navigation";
import Greeting from "@/components/Greeting";
import TaskManager from "@/components/TaskManager";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Filter query jika bukan ADMIN
  const userWhere = { deletedAt: null };
  const spklWhere = {};

  if (session.role !== "ADMIN") {
    userWhere.accountId = session.id;
    spklWhere.accountId = session.id;
  }

  const [userCount, spklCount, settingsResult, todosResult] = await Promise.all([
    prisma.user.count({ where: userWhere }),
    prisma.spkl.count({ where: spklWhere }),
    getSettings(),
    getTodos()
  ]);

  const appName = settingsResult.data.app_name || "SPARK";
  const todos = todosResult?.success ? todosResult.data : [];
  const userTeamId = todosResult?.userTeamId || null;

  // Hitung statistik todo
  const todoPending = todos.filter(t => t.status === "TODO").length;
  const todoInProgress = todos.filter(t => t.status === "IN_PROGRESS").length;
  const todoDone = todos.filter(t => t.status === "DONE").length;

  return (
    <div className="space-y-10">
      {/* PAGE HEADER */}
      <div className="animate-fade-in-up">
        <Greeting userName={session.nama} />
        <p className="brutal-label mb-3">DASHBOARD</p>

        <h1 className="text-2xl md:text-3xl font-black text-text-dark uppercase tracking-tight">
          {appName}
        </h1>

        <p className="text-sm text-text-muted mt-2">
          Sistem Pengelolaan Administrasi Rekap Kerja.
        </p>
      </div>

      {/* STATISTIK RINGKAS */}
      <section>
        <p className="brutal-label mb-4">RINGKASAN</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Stat: Karyawan */}
          <div
            className="bg-white border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-primary rounded-[6px] flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <p className="text-3xl font-black text-text-dark leading-none">{userCount}</p>
            </div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Karyawan</p>
          </div>

          {/* Stat: Dokumen SPKL */}
          <div
            className="bg-white border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-primary rounded-[6px] flex items-center justify-center">
                <FileText size={18} className="text-white" />
              </div>
              <p className="text-3xl font-black text-text-dark leading-none">{spklCount}</p>
            </div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Dokumen SPKL</p>
          </div>

          {/* Stat: Tugas Pending */}
          <div
            className="bg-white border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-zinc-400 rounded-[6px] flex items-center justify-center">
                <ListTodo size={18} className="text-white" />
              </div>
              <p className="text-3xl font-black text-text-dark leading-none">{todoPending}</p>
            </div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">To Do</p>
          </div>

          {/* Stat: In Progress */}
          <div
            className="bg-white border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-yellow-400 rounded-[6px] flex items-center justify-center">
                <Clock size={18} className="text-white" />
              </div>
              <p className="text-3xl font-black text-text-dark leading-none">{todoInProgress}</p>
            </div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">In Progress</p>
          </div>

          {/* Stat: Tugas Selesai */}
          <div
            className="bg-white border-2 border-primary p-5 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up"
            style={{ animationDelay: "0.25s" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-green-500 rounded-[6px] flex items-center justify-center">
                <CheckCircle2 size={18} className="text-white" />
              </div>
              <p className="text-3xl font-black text-text-dark leading-none">{todoDone}</p>
            </div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Selesai</p>
          </div>

        </div>
      </section>

      {/* AKSI CEPAT */}
      <section>
        <p className="brutal-label mb-4">AKSI CEPAT</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/pengguna"
            id="quick-action-pengguna"
            className="group bg-white border-2 border-primary p-6 shadow-[4px_4px_0px_0px_#111827] hover:shadow-[6px_6px_0px_0px_#111827] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all animate-fade-in-up rounded-2xl flex items-center gap-4"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="w-11 h-11 border-2 border-primary rounded-[6px] flex items-center justify-center group-hover:bg-primary transition-colors flex-shrink-0">
              <Users size={20} className="text-primary group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-text-dark uppercase tracking-tight">KELOLA PENGGUNA</h3>
              <p className="text-xs text-text-muted mt-0.5">Tambah atau hapus data karyawan</p>
            </div>
            <ArrowUpRight size={15} className="text-text-muted group-hover:text-primary transition-colors ml-auto flex-shrink-0" />
          </Link>

          <Link
            href="/spkl"
            id="quick-action-spkl"
            className="group bg-white border-2 border-primary p-6 shadow-[4px_4px_0px_0px_#111827] hover:shadow-[6px_6px_0px_0px_#111827] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all animate-fade-in-up rounded-2xl flex items-center gap-4"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="w-11 h-11 border-2 border-primary rounded-[6px] flex items-center justify-center group-hover:bg-primary transition-colors flex-shrink-0">
              <ClipboardList size={20} className="text-primary group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-text-dark uppercase tracking-tight">BUAT SPKL BARU</h3>
              <p className="text-xs text-text-muted mt-0.5">Input & export ke Excel</p>
            </div>
            <ArrowUpRight size={15} className="text-text-muted group-hover:text-primary transition-colors ml-auto flex-shrink-0" />
          </Link>
        </div>
      </section>

      {/* TASK MANAGER (Full Width) */}
      <section>
        <TaskManager
          initialTodos={todos}
          userTeamId={userTeamId}
          currentUserId={session.id}
          userName={session.nama}
        />
      </section>
    </div>
  );
}