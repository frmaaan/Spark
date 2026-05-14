// =============================================================
// 📚 SERVER ACTIONS — Logic Backend untuk Data Pengguna
// =============================================================

"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function getCurrentAccountContext(session) {
  return await prisma.account.findUnique({
    where: { id: session.id },
    select: { role: true, teamId: true },
  });
}

// =============================================================
// 📖 getUsers() — Ambil semua data pengguna AKTIF
// =============================================================
export async function getUsers() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    // Jika ADMIN, tampilkan semua user aktif.
    // Jika USER biasa, batasi ke tim yang sama. Fallback ke accountId hanya jika akun belum punya tim.
    const whereClause = { deletedAt: null };
    if (session.role !== "ADMIN") {
      const account = await getCurrentAccountContext(session);
      if (!account) return { success: false, error: "Unauthorized" };

      if (account.teamId) {
        whereClause.teamId = account.teamId;
      } else {
        whereClause.accountId = session.id;
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        team: true, // 👈 Membawa data tim untuk ditampilkan di tabel
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Gagal mengambil data pengguna" };
  }
}

// =============================================================
// 📖 addUser(formData) — Tambah pengguna baru
// =============================================================
export async function addUser(formData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const account = await getCurrentAccountContext(session);
  if (!account) return { success: false, error: "Unauthorized" };

  const nomorFinger = formData.get("nomorFinger")?.trim();
  const nip = formData.get("nip")?.trim();
  const nama = formData.get("nama")?.trim();

  // Validasi: semua field harus diisi
  if (!nomorFinger || !nip || !nama) {
    return { success: false, error: "Semua field wajib diisi" };
  }

  if (session.role !== "ADMIN" && !account.teamId) {
    return { success: false, error: "Akun Anda belum terhubung ke tim" };
  }

  try {
    const user = await prisma.user.create({
      data: {
        nomorFinger,
        nip,
        nama,
        accountId: session.id, // Simpan pembuat data ini
        teamId: account.teamId,
      },
    });
    return { success: true, data: user };
  } catch (error) {
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      const targetStr = Array.isArray(target) ? target.join(",") : String(target);
      const isFinger = targetStr.includes("nomor_finger") || targetStr.includes("nomorFinger");
      return {
        success: false,
        error: `${isFinger ? "Nomor Finger" : "NIP/NIK"} sudah terdaftar`,
      };
    }
    console.error("Error adding user:", error);
    return { success: false, error: "Gagal menambahkan pengguna" };
  }
}

// =============================================================
// 📖 updateUser(id, formData) — Edit data pengguna
// =============================================================
export async function updateUser(id, formData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const account = await getCurrentAccountContext(session);
  if (!account) return { success: false, error: "Unauthorized" };

  const nomorFinger = formData.get("nomorFinger")?.trim();
  const nip = formData.get("nip")?.trim();
  const nama = formData.get("nama")?.trim();

  if (!nomorFinger || !nip || !nama) {
    return { success: false, error: "Semua field wajib diisi" };
  }

  try {
    // Pastikan user ini berhak mengubah data
    if (session.role !== "ADMIN") {
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser || existingUser.accountId !== session.id) {
        return { success: false, error: "Akses ditolak" };
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        nomorFinger,
        nip,
        nama,
      },
    });
    return { success: true, data: user };
  } catch (error) {
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      const targetStr = Array.isArray(target) ? target.join(",") : String(target);
      const isFinger = targetStr.includes("nomor_finger") || targetStr.includes("nomorFinger");
      return {
        success: false,
        error: `${isFinger ? "Nomor Finger" : "NIP/NIK"} sudah digunakan pengguna lain`,
      };
    }
    console.error("Error updating user:", error);
    return { success: false, error: "Gagal mengubah data pengguna" };
  }
}

// =============================================================
// 📖 deleteUser(id) — Soft Delete pengguna
// =============================================================
export async function deleteUser(id) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const account = await getCurrentAccountContext(session);
    if (!account) return { success: false, error: "Unauthorized" };

    // Pastikan user ini berhak menghapus data
    if (session.role !== "ADMIN") {
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser || existingUser.accountId !== session.id) {
        return { success: false, error: "Akses ditolak" };
      }
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Gagal menghapus pengguna" };
  }
}