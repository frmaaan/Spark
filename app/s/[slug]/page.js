import { notFound } from "next/navigation";
import { getScheduleBySlug } from "@/lib/actions/scheduleActions";
import { getSession } from "@/lib/session";
import SchedulePublicView from "@/components/SchedulePublicView";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getScheduleBySlug(slug);
  if (!result.success) return { title: "Jadwal Tidak Ditemukan", robots: { index: false } };
  return {
    title: `Jadwal Shift — ${result.data.teamName}`,
    robots: { index: false, follow: false, nocache: true },
    other: { referrer: "no-referrer" },
  };
}

export default async function SchedulePublicPage({ params }) {
  const { slug } = await params;
  const result = await getScheduleBySlug(slug);
  if (!result.success) notFound();

  const session = await getSession();
  const userRole = session?.role ?? null;

  return <SchedulePublicView schedule={result.data} userRole={userRole} />;
}
