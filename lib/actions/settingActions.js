"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Nilai default jika database masih kosong
const defaultSettings = {
  app_name: "StacX SPKL",
  donation_enabled: "true",
  account_1: "BCA: 123456789 A/N Budi",
  account_2: "DANA: 08123456789 A/N Budi",
  donation_text: "Terima kasih telah menggunakan aplikasi ini. Jika aplikasi ini membantu pekerjaan Anda menjadi lebih cepat, Anda dapat ikut mendukung pengembangan fitur baru dan perawatan sistem.",
};

// =============================================================
// GET SETTINGS
// =============================================================
export async function getSettings() {
  try {
    const settings = await prisma.setting.findMany();
    
    // Konversi array of key-value menjadi object
    const settingsObj = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    // Merge dengan default agar tidak undefined
    return {
      success: true,
      data: {
        ...defaultSettings,
        ...settingsObj,
      },
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return { success: false, data: defaultSettings }; // Fallback ke default
  }
}

// =============================================================
// SAVE SETTINGS (Hanya untuk Admin)
// =============================================================
export async function saveSettings(settingsObj) {
  try {
    // Validasi sesi & role
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak. Hanya Admin yang dapat mengubah pengaturan." };
    }

    // Upsert setiap pengaturan (update jika ada, insert jika belum ada)
    const promises = Object.entries(settingsObj).map(([key, value]) => {
      return prisma.setting.upsert({
        where: { key },
        update: { value: value.toString() },
        create: { key, value: value.toString() },
      });
    });

    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error("Error saving settings:", error);
    return { success: false, error: "Gagal menyimpan pengaturan" };
  }
}

// =============================================================
// GET APP NAME (Publik — tanpa session, untuk halaman share)
// =============================================================
export async function getAppNamePublic() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "app_name" } });
    return setting?.value || "SPARK";
  } catch {
    return "SPARK";
  }
}
