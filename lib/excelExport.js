// =============================================================
// 📚 EXCEL EXPORT UTILITY
// =============================================================
//
// KONSEP: Client-side file generation
//
// Library 'xlsx' (SheetJS) memungkinkan kita membuat file Excel
// langsung di browser, tanpa perlu server!
//
// ALUR:
// 1. Siapkan data dalam bentuk Array of Objects
// 2. Konversi ke Worksheet (sheet Excel)
// 3. Bungkus dalam Workbook (file Excel)
// 4. Trigger download ke komputer user
//
// TERMINOLOGI EXCEL:
// - Workbook = File Excel (.xlsx)
// - Worksheet = Sheet/tab di dalam workbook
// - Cell = Satu sel (misal A1, B2)
// =============================================================

import * as XLSX from "xlsx-js-style";

/**
 * Export data SPKL ke file Excel
 *
 * @param {Array} rows - Array baris SPKL dari database
 *   Format: [{ user: { nip: "123" }, tanggal: "2026-04-26", keterangan: "Lembur produksi" }]
 */
export function exportSpklToExcel(rows) {
  // STEP 1: Transform data ke format kolom Excel
  const excelData = rows.map((row) => ({
    "NIK": row.user?.nip || "",
    "Date day off": row.tanggal, // Format sudah YYYY-MM-DD
    DESCRIPTION: row.keterangan || "",
  }));

  // STEP 2: Buat Worksheet dari array of objects
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Menerapkan styling ke baris pertama (Header) agar rata tengah (centered)
  // json_to_sheet membuat header di baris ke-0 (0-indexed dalam koordinat utils)
  // Huruf kolom: A, B, C
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ c: C, r: 0 }); // r: 0 adalah baris pertama
    if (!worksheet[address]) continue;
    
    worksheet[address].s = {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  // STEP 3: Atur lebar kolom
  worksheet["!cols"] = [
    { wch: 20 }, // Kolom A: NIK/NIP
    { wch: 25 }, // Kolom B: DATE DAY OFF / TGL SPKL
    { wch: 40 }, // Kolom C: DESCRIPTION
  ];

  // STEP 4: Buat Workbook dan masukkan Worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SPKL");
  // Parameter: (workbook, worksheet, nama_tab)

  // STEP 5: Generate nama file dengan timestamp
  // new Date().toISOString() → "2026-04-26T10:30:00.000Z"
  // .split("T")[0] → "2026-04-26" (ambil tanggal saja)
  const fileName = `SPKL_${new Date().toISOString().split("T")[0]}.xlsx`;

  // STEP 6: Trigger download
  // writeFile() secara otomatis membuat Blob dan trigger download
  // di browser (tanpa perlu server!)
  XLSX.writeFile(workbook, fileName);

  return fileName;
}
