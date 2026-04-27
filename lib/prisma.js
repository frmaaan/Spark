// =============================================================
// 📚 PRISMA CLIENT SINGLETON (Prisma 7)
// =============================================================
//
// KONSEP PENTING: "Singleton Pattern"
// 
// Di Next.js development mode, setiap kali kode berubah (hot reload),
// modul di-import ulang. Tanpa singleton, setiap reload akan membuat
// koneksi database BARU → bisa kehabisan koneksi!
//
// Solusi: Simpan instance PrismaClient di global object.
// Global object TIDAK di-reset saat hot reload.
//
// PRISMA 7 PERUBAHAN:
// Di Prisma 7, PrismaClient WAJIB menerima "adapter" parameter.
// Adapter adalah jembatan antara Prisma dan database driver.
// Untuk SQLite, kita pakai @prisma/adapter-better-sqlite3.
//
// ALUR:
// better-sqlite3 → PrismaBetterSqlite3 (adapter) → PrismaClient
// (driver)          (jembatan)                       (ORM)
// =============================================================

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Pakai instance yang sudah ada, atau buat baru
const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Di development, simpan ke global agar tidak dibuat ulang
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
