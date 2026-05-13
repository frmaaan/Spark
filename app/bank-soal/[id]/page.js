import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, CalendarDays, ShieldCheck, Users, UserCircle2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { getElearningMaterialById } from "@/lib/actions/elearningActions";

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

export default async function BankSoalPreviewPage({ params }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const result = await getElearningMaterialById(params.id);
  if (!result.success) {
    notFound();
  }

  const material = result.data;
  const isTeam = material.accessStatus === "TEAM";

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary border-2 border-primary flex items-center justify-center flex-shrink-0">
            <BookOpen size={22} className="text-white" />
          </div>
          <div>
            <p className="brutal-label mb-0.5">PREVIEW MATERI</p>
            <h1 className="text-2xl font-black text-text-dark uppercase tracking-tight leading-tight">
              {material.title}
            </h1>
          </div>
        </div>

        <Link href="/bank-soal" className="neu-btn bg-white border-black text-black">
          <ArrowLeft size={16} />
          Kembali
        </Link>
      </div>

      <section className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1 px-3 py-1 border text-[10px] font-bold tracking-widest rounded ${isTeam ? "bg-lime-100 border-lime-300 text-lime-800" : "bg-zinc-100 border-zinc-300 text-zinc-700"}`}>
                {isTeam ? <Users size={10} /> : <ShieldCheck size={10} />}
                {isTeam ? "AKSES TIM" : "PRIBADI"}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 border text-[10px] font-bold tracking-widest rounded bg-surface-light border-black text-black">
                <CalendarDays size={10} /> {formatDate(material.createdAt)}
              </span>
            </div>

            <p className="text-sm text-text-muted whitespace-pre-line leading-relaxed">
              {material.description || "Tidak ada deskripsi materi."}
            </p>

            <div className="flex flex-wrap gap-3 text-xs font-bold text-text-muted">
              <span className="inline-flex items-center gap-2 px-3 py-2 border-2 border-black bg-surface-light">
                <UserCircle2 size={14} /> {material.createdByName}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-2 border-2 border-black bg-surface-light">
                <Users size={14} /> {material.teamName || "Tanpa tim"}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-2 border-2 border-black bg-surface-light">
                {material.itemCount} item
              </span>
            </div>
          </div>

          <div className="w-full lg:w-72 bg-surface-light border-2 border-primary rounded-xl p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-text-muted mb-2">Preview HTML-like</p>
            <div className="bg-white border-2 border-black p-4 space-y-2">
              <div className="h-3 w-2/3 bg-black/10"></div>
              <div className="h-3 w-1/2 bg-black/10"></div>
              <div className="h-3 w-full bg-black/10"></div>
              <div className="h-3 w-5/6 bg-black/10"></div>
            </div>
            <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
              Halaman ini dipakai sebagai preview yang mudah dibaca sebelum materi dipelajari.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-black uppercase tracking-tight">Daftar Pertanyaan & Jawaban</h2>
          <span className="brutal-label border-2 border-primary px-2 py-0.5 bg-surface-light w-max">
            {material.itemCount} item
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {Array.isArray(material.items) && material.items.length > 0 ? material.items.map((item, index) => (
            <article key={`${material.id}-${index}`} className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl overflow-hidden">
              <header className="flex items-center justify-between gap-3 px-5 py-4 bg-surface-light border-b-2 border-primary">
                <p className="text-xs font-black uppercase tracking-widest">Pertanyaan {index + 1}</p>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 border border-black bg-white">Preview</span>
              </header>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-5 border-b-2 lg:border-b-0 lg:border-r-2 border-primary">
                  <p className="text-[11px] font-black uppercase tracking-widest text-text-muted mb-2">Pertanyaan</p>
                  <div className="rounded-xl border-2 border-black bg-[#f8fafc] p-4 whitespace-pre-line text-sm text-text-dark leading-relaxed">
                    {item.question}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-text-muted mb-2">Jawaban</p>
                  <div className="rounded-xl border-2 border-black bg-[#ecfccb] p-4 whitespace-pre-line text-sm text-text-dark leading-relaxed">
                    {item.answer}
                  </div>
                </div>
              </div>
            </article>
          )) : (
            <div className="bg-white border-2 border-primary shadow-[4px_4px_0px_0px_#111827] rounded-2xl p-8 text-center">
              <p className="text-sm text-text-muted">Belum ada item di materi ini.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}