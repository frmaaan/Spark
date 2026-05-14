import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSchedules, deleteSchedule } from "@/lib/actions/scheduleActions";
import ScheduleListClient from "@/components/ScheduleListClient";

export const metadata = { title: "Jadwal Shift" };

export default async function JadwalPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const result = await getSchedules();
  const schedules = result.success ? result.data : [];

  return <ScheduleListClient schedules={schedules} />;
}
