import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ScheduleUploader from "@/components/ScheduleUploader";

export const metadata = { title: "Upload Jadwal Shift" };

export default async function JadwalUploadPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  return <ScheduleUploader />;
}
