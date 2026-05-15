import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";

// ── Mapping kode shift Excel → kode tampilan ─────────────────
const SHIFT_MAP = {
  "SHIFT 6":  "P6",
  "SHIFT 7":  "P7",
  "SHIFT 8":  "P8",
  "SHIFT 10": "P10",
  "SHIFT 14": "S14",
  "SHIFT 15": "S15",
  "CUTI":     "CT",
  "CT":       "CT",
  "OFF":      "OFF",
};

// Kolom d_01 … d_31
const DAY_COLS = Array.from({ length: 31 }, (_, i) => `d_${String(i + 1).padStart(2, "0")}`);
const IGNORED_COLS = new Set(["ShfPrdCgn1", "ShfPrdCgn2", "ShfPrdCgn3", "count shift"]);

function mapShift(raw) {
  if (!raw) return "";
  const val = String(raw).trim().toUpperCase().replace(/\s+/g, " ");
  const canonical = val.replace(/[:.;,]+$/g, "");
  return SHIFT_MAP[canonical] ?? canonical;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, error: "File tidak ditemukan" }, { status: 400 });
    }

    // Baca file ke buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Log info file untuk debug
    console.log("[jadwal/parse] File name:", file.name, "| Size:", buffer.length, "bytes");

    // Parse Excel — coba xlsx.load terlebih dahulu
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch (loadErr) {
      console.error("[jadwal/parse] xlsx.load gagal:", loadErr.message);
      return NextResponse.json({
        success: false,
        error: `Gagal membaca file Excel. Pastikan file berformat .xlsx (bukan .xls lama atau file rusak). Detail: ${loadErr.message}`,
      }, { status: 400 });
    }

    // Log semua sheet yang ditemukan
    const sheetNames = workbook.worksheets.map((ws) => ws.name);
    console.log("[jadwal/parse] Sheets ditemukan:", sheetNames.length, "→", sheetNames);

    // Ambil sheet pertama — coba beberapa cara
    const worksheet =
      workbook.worksheets[0] ??
      workbook.getWorksheet(1) ??
      workbook.getWorksheet(sheetNames[0]);

    if (!worksheet) {
      return NextResponse.json({
        success: false,
        error: `Sheet tidak ditemukan di file Excel. Total sheet terdeteksi: ${sheetNames.length}. Pastikan file tidak kosong dan berformat .xlsx.`,
      }, { status: 400 });
    }

    console.log("[jadwal/parse] Menggunakan sheet:", worksheet.name, "| Baris:", worksheet.rowCount);

    // Baca header baris pertama untuk mapping kolom → index
    const headerRow = worksheet.getRow(1);
    const colMap = {};
    headerRow.eachCell((cell, colNumber) => {
      const key = String(cell.value || "").trim().toLowerCase().replace(/ /g, "_");
      colMap[key] = colNumber;
    });

    // Validasi kolom wajib
    const required = ["group_id", "schedule_type", "date"];
    for (const col of required) {
      if (!colMap[col]) {
        return NextResponse.json({ success: false, error: `Kolom wajib "${col}" tidak ditemukan di file Excel` }, { status: 400 });
      }
    }

    // Ambil semua nomorFinger yang ada di DB beserta teamId-nya
    const allUsers = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { nomorFinger: true, teamId: true, nama: true },
    });
    const userMap = new Map(allUsers.map((u) => [u.nomorFinger, u]));

    // Ambil nama tim
    const allTeams = await prisma.team.findMany({ select: { id: true, nama: true } });
    const teamMap = new Map(allTeams.map((t) => [t.id, t.nama]));

    // Parse baris data (skip header baris 1)
    const rawRows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const groupId      = String(row.getCell(colMap["group_id"]).value ?? "").trim();
      const scheduleType = String(row.getCell(colMap["schedule_type"]).value ?? "").trim();
      const dateVal      = row.getCell(colMap["date"]).value;

      if (!groupId && !scheduleType) return; // baris kosong

      // Parse tanggal bulan
      let monthStartDate = null;
      if (dateVal instanceof Date) {
        monthStartDate = new Date(dateVal.getFullYear(), dateVal.getMonth(), 1);
      } else if (typeof dateVal === "string" && dateVal.trim()) {
        const d = new Date(dateVal.trim());
        if (!isNaN(d)) monthStartDate = new Date(d.getFullYear(), d.getMonth(), 1);
      }

      // Parse shift d_01 … d_31
      const shifts = {};
      for (let i = 1; i <= 31; i++) {
        const colKey = `d_${String(i).padStart(2, "0")}`;
        const excelKey = colKey; // header di Excel: d_01, d_02, ...
        const colIdx = colMap[excelKey];
        if (colIdx) {
          const raw = row.getCell(colIdx).value;
          shifts[`d${String(i).padStart(2, "0")}`] = mapShift(raw);
        } else {
          shifts[`d${String(i).padStart(2, "0")}`] = "";
        }
      }

      // Lookup user
      const user = userMap.get(groupId);
      let error = null;
      let teamId = null;
      let teamName = null;

      if (!groupId) {
        error = "group_id kosong";
      } else if (!user) {
        error = `group_id "${groupId}" tidak ditemukan di database`;
      } else {
        teamId = user.teamId;
        teamName = teamId ? (teamMap.get(teamId) ?? null) : null;
        if (!teamId) error = `Karyawan "${groupId}" tidak memiliki tim`;
      }

      rawRows.push({
        nomorFinger:   groupId,
        namaKaryawan:  scheduleType,
        monthStartDate,
        teamId,
        teamName,
        shifts,
        error,
      });
    });

    if (rawRows.length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada data ditemukan di file Excel" }, { status: 400 });
    }

    // Ambil monthStartDate dari baris pertama yang valid
    const firstValidDate = rawRows.find((r) => r.monthStartDate)?.monthStartDate ?? null;

    // Group by teamId → satu objek per tim
    const teamGroups = new Map();
    for (const row of rawRows) {
      const key = row.teamId ?? "NO_TEAM";
      if (!teamGroups.has(key)) {
        teamGroups.set(key, {
          teamId:        row.teamId,
          teamName:      row.teamName,
          monthStartDate: row.monthStartDate ?? firstValidDate,
          rows:          [],
        });
      }
      teamGroups.get(key).rows.push({
        nomorFinger:  row.nomorFinger,
        namaKaryawan: row.namaKaryawan,
        shifts:       row.shifts,
        error:        row.error,
      });
    }

    const groups = Array.from(teamGroups.values());
    const hasErrors = rawRows.some((r) => r.error);

    return NextResponse.json({ success: true, groups, hasErrors });
  } catch (err) {
    console.error("Error parsing jadwal Excel:", err);
    return NextResponse.json({ success: false, error: "Gagal memproses file Excel: " + err.message }, { status: 500 });
  }
}
