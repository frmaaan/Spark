// app/page.js
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Users, FileText, ClipboardList, ArrowUpRight } from "lucide-react";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/actions/settingActions";
import { getTodos } from "@/lib/actions/todoActions";
import { redirect } from "next/navigation";
import Greeting from "@/components/Greeting";
import TodoList from "@/components/TodoList";

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

  return (
    <div className="space-y-12">
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

      {/* STATISTIK */}
      <section>
        <p className="brutal-label mb-4">STATISTIK SISTEM</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Card: Total Pengguna */}
          <div
            className="bg-white border-2 border-primary p-8 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up flex flex-col justify-between"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="brutal-label mb-2">TOTAL PENGGUNA</p>
                <p className="text-4xl font-black text-text-dark leading-none">
                  {userCount}
                </p>
              </div>
              <div className="w-11 h-11 bg-primary rounded-[6px] flex items-center justify-center flex-shrink-0">
                <Users size={22} className="text-white" />
              </div>
            </div>

            <div className="border-t-2 border-dashed border-primary-light pt-5">
              <p className="text-sm text-text-muted mb-4">
                Karyawan terdaftar {session.role === "ADMIN" ? "di sistem" : "oleh Anda"}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-light border border-zinc-200 rounded-[6px] px-4 py-3">
                  <p className="brutal-label mb-1">STATUS</p>
                  <p className="text-sm font-bold text-text-dark">Aktif</p>
                </div>
                <div className="bg-surface-light border border-zinc-200 rounded-[6px] px-4 py-3">
                  <p className="brutal-label mb-1">AKSES ANDA</p>
                  <p className="text-sm font-black text-primary uppercase tracking-widest">{session.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Total SPKL */}
          <div
            className="bg-white border-2 border-primary p-8 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up flex flex-col justify-between"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="brutal-label mb-2">TOTAL DOKUMEN</p>
                <p className="text-4xl font-black text-text-dark leading-none">
                  {spklCount}
                </p>
              </div>
              <div className="w-11 h-11 bg-primary rounded-[6px] flex items-center justify-center flex-shrink-0">
                <FileText size={22} className="text-white" />
              </div>
            </div>

            <div className="border-t-2 border-dashed border-primary-light pt-5">
              <p className="text-sm text-text-muted mb-4">
                Surat lembur yang telah dibuat
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-light border border-zinc-200 rounded-[6px] px-4 py-3">
                  <p className="brutal-label mb-1">PERIODE</p>
                  <p className="text-sm font-bold text-text-dark">Bulan Ini</p>
                </div>
                <div className="bg-surface-light border border-zinc-200 rounded-[6px] px-4 py-3">
                  <p className="brutal-label mb-1">FORMAT</p>
                  <p className="text-sm font-bold text-text-dark">Excel</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* QUICK ACTIONS */}
      {/* QUICK ACTIONS & TO-DO LIST */}
      <section>
        {/* Hapus tulisan AKSI CEPAT dari sini, pindahkan ke dalam kolom kiri */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ========================================= */}
          {/* KOLOM KIRI: BUNGKUS KEDUA LINK DI SINI */}
          {/* ========================================= */}
          <div>
            <p className="brutal-label mb-4">AKSI CEPAT</p>
            <div className="flex flex-col gap-6">

              <Link
                href="/pengguna"
                id="quick-action-pengguna"
                className="group bg-white border-2 border-primary p-8 shadow-[4px_4px_0px_0px_#111827] hover:shadow-[6px_6px_0px_0px_#111827] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all animate-fade-in-up rounded-2xl flex flex-col h-full"
                style={{ animationDelay: "0.15s" }}
              >
                <div className="flex items-center justify-between mb-8">
                  <p className="brutal-label">MANAJEMEN DATA</p>
                  <ArrowUpRight
                    size={15}
                    className="text-text-muted group-hover:text-primary transition-colors"
                  />
                </div>
                <div className="border-t-2 border-dashed border-primary-light pt-6 mt-auto flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-primary rounded-[6px] flex items-center justify-center group-hover:bg-primary transition-colors flex-shrink-0">
                    <Users
                      size={20}
                      className="text-primary group-hover:text-white transition-colors"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text-dark uppercase tracking-tight">
                      KELOLA PENGGUNA
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      Tambah atau hapus data karyawan
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/spkl"
                id="quick-action-spkl"
                className="group bg-white border-2 border-primary p-8 shadow-[4px_4px_0px_0px_#111827] hover:shadow-[6px_6px_0px_0px_#111827] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all animate-fade-in-up rounded-2xl flex flex-col h-full"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="flex items-center justify-between mb-8">
                  <p className="brutal-label">INPUT DOKUMEN</p>
                  <ArrowUpRight
                    size={15}
                    className="text-text-muted group-hover:text-primary transition-colors"
                  />
                </div>
                <div className="border-t-2 border-dashed border-primary-light pt-6 mt-auto flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-primary rounded-[6px] flex items-center justify-center group-hover:bg-primary transition-colors flex-shrink-0">
                    <ClipboardList
                      size={20}
                      className="text-primary group-hover:text-white transition-colors"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text-dark uppercase tracking-tight">
                      BUAT SPKL BARU
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      Input & export ke Excel
                    </p>
                  </div>
                </div>
              </Link>

            </div>
          </div>
          {/* ========================================= */}
          {/* AKHIR KOLOM KIRI */}
          {/* ========================================= */}

          {/* ========================================= */}
          {/* KOLOM KANAN: TO-DO LIST */}
          {/* ========================================= */}
          <div>
            <p className="brutal-label mb-4 lg:text-transparent lg:select-none hidden lg:block">.</p> {/* Spacer agar sejajar dengan label AKSI CEPAT */}
            <TodoList
              initialTodos={todos}
              userTeamId={userTeamId}
              currentUserId={session.id}
            />
          </div>

        </div>
      </section>

      {/* PANDUAN */}
      <section>
        <div
          className="bg-white border-2 border-primary p-8 shadow-[4px_4px_0px_0px_#111827] rounded-2xl animate-fade-in-up"
          style={{ animationDelay: "0.25s" }}
        >
          <div className="flex items-center justify-between mb-5">
            <p className="brutal-label">PANDUAN</p>
            <ClipboardList size={16} className="text-text-muted" />
          </div>
          <div className="border-t-2 border-dashed border-primary-light pt-6">
            <h3 className="text-sm font-black text-text-dark uppercase tracking-tight mb-5">
              CARA MENGGUNAKAN
            </h3>
            <ol className="space-y-4">
              {[
                ["Masukkan data karyawan", "Menu Data Pengguna"],
                ["Buat SPKL baru", "Menu Input SPKL"],
                ["Export ke file Excel", "Klik Simpan & Buat SPKL"],
              ].map(([text, highlight], i) => (
                <li
                  key={i}
                  className="flex items-start gap-4 text-sm text-text-muted"
                >
                  <span className="w-7 h-7 border-2 border-primary bg-surface-light text-primary text-xs font-black flex items-center justify-center flex-shrink-0 rounded-[6px]">
                    {i + 1}
                  </span>
                  <span className="mt-1">
                    {text} di menu{" "}
                    <strong className="text-text-dark font-bold">
                      {highlight}
                    </strong>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}