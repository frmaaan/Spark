"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";

// =============================================================
// GET ALL ACCOUNTS
// =============================================================
export async function getAccounts() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak" };
    }

    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nama: true,
        username: true,
        role: true,
        createdAt: true,
        // Kita tidak men-select password demi keamanan
      },
    });

    return { success: true, data: accounts };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return { success: false, error: "Gagal mengambil data akun" };
  }
}

// =============================================================
// ADD ACCOUNT
// =============================================================
export async function addAccount(formData) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak" };
    }

    const nama = formData.get("nama")?.trim();
    const username = formData.get("username")?.trim();
    const password = formData.get("password");
    const role = formData.get("role") || "USER";

    if (!nama || !username || !password) {
      return { success: false, error: "Semua field harus diisi" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const account = await prisma.account.create({
      data: {
        nama,
        username,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        nama: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return { success: true, data: account };
  } catch (error) {
    if (error.code === "P2002") {
      return { success: false, error: "Username sudah digunakan" };
    }
    console.error("Error adding account:", error);
    return { success: false, error: "Gagal membuat akun baru" };
  }
}

// =============================================================
// DELETE ACCOUNT
// =============================================================
export async function deleteAccount(id) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { success: false, error: "Akses ditolak" };

  try {
    // Jangan izinkan admin menghapus dirinya sendiri jika itu akun terakhir atau akun utamanya
    // (Bisa dikembangkan lebih lanjut)
    await prisma.account.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("Error deleting account:", error);
    return { success: false, error: "Gagal menghapus akun" };
  }
}

// =============================================================
// RESET PASSWORD (KHUSUS ADMIN)
// =============================================================
export async function resetAccountPassword(accountId, newPassword) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Password minimal 6 karakter" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.account.update({
      where: { id: accountId },
      data: { password: hashedPassword }
    });

    return { success: true };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Terjadi kesalahan saat reset password" };
  }
}

// =============================================================
// GANTI PASSWORD SENDIRI (PROFIL)
// =============================================================
export async function changePassword(oldPassword, newPassword) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Password minimal 6 karakter" };
    }

    // Ambil data akun saat ini untuk memverifikasi password lama
    const account = await prisma.account.findUnique({
      where: { id: session.id }
    });

    if (!account) {
      return { success: false, error: "Akun tidak ditemukan" };
    }

    const isValidPassword = await bcrypt.compare(oldPassword, account.password);
    if (!isValidPassword) {
      return { success: false, error: "Password lama tidak sesuai" };
    }

    // Jika valid, hash dan simpan password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.account.update({
      where: { id: session.id },
      data: { password: hashedPassword }
    });

    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: "Terjadi kesalahan saat mengganti password" };
  }
}
