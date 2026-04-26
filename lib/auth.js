"use server";

import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encrypt } from "./session";

// =============================================================
// LOGIN & SEEDER
// =============================================================
export async function login(username, password) {
  try {
    // [AUTO-SEED] Buat akun admin pertama jika belum ada akun sama sekali
    const accountCount = await prisma.account.count();
    if (accountCount === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await prisma.account.create({
        data: {
          nama: "Administrator",
          username: "admin",
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      console.log("Auto-seed: Akun admin berhasil dibuat (admin/admin123)");
    }

    // Cari user berdasarkan username
    const user = await prisma.account.findUnique({
      where: { username },
    });

    if (!user) {
      return { success: false, error: "Username tidak ditemukan" };
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, error: "Password salah" };
    }

    // Buat token sesi
    const sessionData = {
      id: user.id,
      nama: user.nama,
      username: user.username,
      role: user.role,
    };

    const token = await encrypt(sessionData);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 jam
      path: "/",
    });

    return { success: true, data: sessionData };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Terjadi kesalahan sistem" };
  }
}

// =============================================================
// LOGOUT
// =============================================================
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  return { success: true };
}
