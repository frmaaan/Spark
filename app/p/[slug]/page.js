import { notFound } from "next/navigation";
import { BookOpen, ExternalLink } from "lucide-react";
import { getElearningMaterialBySlug } from "@/lib/actions/elearningActions";
import { getAppNamePublic } from "@/lib/actions/settingActions";

// ─── Security: blok semua crawler & cache ───────────────────
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getElearningMaterialBySlug(slug);
  const appName = await getAppNamePublic();

  if (!result.success) {
    return {
      title: "Materi Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${result.data.title} — ${appName}`,
    description: result.data.description || "Materi bank soal yang dibagikan.",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
    other: { referrer: "no-referrer" },
  };
}

export default async function PublicPreviewPage({ params }) {
  const { slug } = await params;
  const [result, appName] = await Promise.all([
    getElearningMaterialBySlug(slug),
    getAppNamePublic(),
  ]);

  if (!result.success) notFound();

  const material = result.data;

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">

      {/* ── TOP BRAND HEADER ─────────────────────────────── */}
      <header className="bg-[#111827] border-b-[3px] border-black px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#fde047] border-[2px] border-black flex items-center justify-center rounded">
            <BookOpen size={16} className="text-black" />
          </div>
          <span className="text-white font-black text-sm uppercase tracking-widest">
            {appName}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider hidden sm:block">
          Halaman Berbagi Materi
        </span>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Judul & meta ringkas */}
        <section className="bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] overflow-hidden">
          <div className="bg-[#fde047] border-b-[3px] border-black p-6">
            <span className="inline-block bg-white border-[2px] border-black text-[10px] font-black uppercase px-2 py-1 rounded shadow-[2px_2px_0px_0px_#000] mb-3">
              Preview Materi
            </span>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black leading-tight">
              {material.title}
            </h1>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Jumlah soal */}
            <span className="inline-flex w-fit items-center gap-2 bg-[#dbeafe] border-[2px] border-black px-3 py-1.5 rounded text-[11px] font-black uppercase">
              {material.itemCount} Soal
            </span>

            {/* Deskripsi — hanya tampil jika ada */}
            {material.description && (
              <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-line bg-[#f8fafc] border-[2px] border-black rounded-xl p-4">
                {material.description}
              </p>
            )}
          </div>
        </section>

        {/* ── DAFTAR Q&A ───────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-600">
              Daftar Pertanyaan &amp; Jawaban
            </h2>
            <span className="bg-[#dbeafe] border-[2px] border-black px-2 py-0.5 rounded text-[10px] font-black uppercase">
              {material.itemCount} Item
            </span>
          </div>

          {Array.isArray(material.items) && material.items.length > 0 ? (
            material.items.map((item, index) => (
              <article
                key={index}
                className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] overflow-hidden"
              >
                <header className="flex items-center gap-3 px-5 py-3 bg-[#f3f4f6] border-b-[3px] border-black">
                  <span className="bg-black text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    {index + 1}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Pertanyaan &amp; Jawaban
                  </span>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Pertanyaan */}
                  <div className="p-5 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-black">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Pertanyaan</p>
                    <div className="bg-[#f8fafc] border-[2px] border-black rounded-xl p-4 text-sm font-semibold text-gray-900 whitespace-pre-line leading-relaxed">
                      {item.question}
                    </div>
                  </div>
                  {/* Jawaban */}
                  <div className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Jawaban</p>
                    <div className="bg-[#ecfccb] border-[2px] border-black rounded-xl p-4 text-sm font-semibold text-gray-900 whitespace-pre-line leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="bg-white border-[3px] border-black rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_#000]">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Belum ada soal di materi ini.</p>
            </div>
          )}
        </section>
      </main>

      {/* ── FOOTER WATERMARK ─────────────────────────────── */}
      <footer className="border-t-[3px] border-black bg-[#111827] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white">
            <div className="w-6 h-6 bg-[#fde047] border-[2px] border-black rounded flex items-center justify-center">
              <BookOpen size={12} className="text-black" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest">
              Dibagikan via <span className="text-[#fde047]">{appName}</span>
            </p>
          </div>
          <a
            href="/"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#fde047] hover:text-white transition-colors"
          >
            <ExternalLink size={12} />
            Buka {appName}
          </a>
        </div>
      </footer>
    </div>
  );
}
