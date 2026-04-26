// =============================================================
// 📚 SCRIPT SEEDER — Membuat Akun Pertama
// =============================================================
// Jalankan script ini dengan: node scripts/seed.js
// =============================================================

const { PrismaClient } = require("../app/generated/prisma/index.js");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Mulai membuat akun admin pertama...");

  // Cek apakah akun sudah ada
  const existing = await prisma.account.findUnique({
    where: { username: "admin" },
  });

  if (existing) {
    console.log("Akun admin sudah ada di database!");
    return;
  }

  // Enkripsi password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash("admin123", saltRounds);

  // Buat akun
  await prisma.account.create({
    data: {
      nama: "Administrator",
      username: "admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Berhasil membuat akun Admin!");
  console.log("Username : admin");
  console.log("Password : admin123");
}

main()
  .catch((e) => {
    console.error("Terjadi kesalahan:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
