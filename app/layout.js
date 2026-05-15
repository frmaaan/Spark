import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import DonationModal from "@/components/DonationModal";
import AutoLogout from "@/components/AutoLogout";
import { cookies, headers } from "next/headers";
import { decrypt } from "@/lib/session";
import { getSettings } from "@/lib/actions/settingActions";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "SPARK",
  description: "Sistem Pengelolaan Administrasi Rekap Kerja",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SPARK",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const session = token ? await decrypt(token) : null;
  const isLoggedIn = !!session;
  const isPublicPreviewRoute = pathname.startsWith("/s/") || pathname.startsWith("/p/");
  const useAppShell = isLoggedIn && !isPublicPreviewRoute;

  // Fetch settings for Donation Modal if logged in
  let settings = null;
  if (useAppShell) {
    const settingsResult = await getSettings();
    if (settingsResult.success) {
      settings = settingsResult.data;
    }
  }

  return (
    <html lang="id" className={`${inter.variable} h-full`}>
      <body className="bg-surface font-sans antialiased text-black" suppressHydrationWarning={true}>
        {useAppShell ? (
          <div className="min-h-screen flex flex-col md:flex-row">
            <AutoLogout />
            <Sidebar userName={session?.nama} userRole={session?.role} appName={settings?.app_name} />

            {/* Spacer Sidebar untuk Desktop */}
            <div className="hidden md:block w-[300px] flex-shrink-0 border-r-[3px] border-black bg-surface-light" />

            {/* Area Konten Utama */}
            <main className="flex-1 min-w-0 flex flex-col">
              <div className="pt-24 md:pt-12 pb-12 px-8 md:pl-20 md:pr-16 lg:pl-24 lg:pr-20 w-full max-w-7xl">
                {settings && settings.donation_enabled === "true" && (
                  <DonationModal
                    donationText={settings.donation_text}
                    account1={settings.account_1}
                    account2={settings.account_2}
                  />
                )}
                <div className="animate-fade-in-up">
                  {children}
                </div>
              </div>
            </main>
          </div>
        ) : (
          <main className={isPublicPreviewRoute ? "min-h-screen bg-surface" : "min-h-screen flex items-center justify-center bg-surface p-6"}>
            {children}
          </main>
        )}
      </body>
    </html>
  );
}