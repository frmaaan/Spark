import { getSettings } from "@/lib/actions/settingActions";

export default async function manifest() {
  let appName = "StacX SPKL";
  
  try {
    const result = await getSettings();
    if (result.success && result.data?.app_name) {
      appName = result.data.app_name;
    }
  } catch (error) {
    console.error("Failed to load app name for manifest", error);
  }

  return {
    name: appName,
    short_name: appName,
    description: "Aplikasi Surat Perintah Kerja Lembur",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
