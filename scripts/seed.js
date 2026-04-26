// =============================================================
// 📚 SCRIPT SEEDER — Membuat Akun Pertama (PostgreSQL/Supabase)
// =============================================================
// Jalankan script ini dengan: node scripts/seed.js
// =============================================================

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });

  console.log("Menghubungkan ke database Supabase...");

  // Cek apakah akun admin sudah ada
  const check = await pool.query(
    "SELECT id FROM accounts WHERE username = $1",
    ["admin"]
  );

  if (check.rows.length > 0) {
    console.log("Akun admin sudah ada di database!");
    await pool.end();
    return;
  }

  // Enkripsi password
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // Buat akun admin
  await pool.query(
    `INSERT INTO accounts (nama, username, password, role, created_at) 
     VALUES ($1, $2, $3, $4, NOW())`,
    ["Administrator", "admin", hashedPassword, "ADMIN"]
  );

  console.log("✅ Berhasil membuat akun Admin di Supabase!");
  console.log("Username : admin");
  console.log("Password : admin123");

  await pool.end();
}

main().catch((e) => {
  console.error("Terjadi kesalahan:", e);
  process.exit(1);
});
