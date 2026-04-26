import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SettingsLayout({ children }) {
  const session = await getSession();

  // Jika bukan ADMIN, tendang ke dashboard
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  return children;
}
