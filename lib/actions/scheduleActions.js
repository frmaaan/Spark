"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import Holidays from "date-holidays";

const generateSlug = customAlphabet(
  "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789",
  16
);

const holidayCalendar = new Holidays("ID");

// ── Helpers Timezone (Perbaikan Bug Vercel UTC -> WIB) ────────
function getWIBParts(dateObj) {
  if (!dateObj) return null;
  // Memaksa ekstraksi tanggal ke zona waktu Jakarta terlepas dari setting server
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  
  const parts = formatter.format(dateObj).split("/");
  return {
    month: parseInt(parts[0], 10) - 1, // Kurangi 1 agar sesuai format 0-index JS (0=Jan)
    day: parseInt(parts[1], 10),
    year: parseInt(parts[2], 10),
  };
}

function getPublicRedDates(monthStartDate) {
  const monthDate = new Date(monthStartDate);
  
  // 1. Ekstrak target bulan & tahun dari input (Aman dari pergeseran Vercel)
  const targetWIB = getWIBParts(monthDate);

  const publicHolidays = holidayCalendar
    .getHolidays(targetWIB.year)
    .filter((holiday) => {
      // 2. Ekstrak bulan & tanggal dari data date-holidays ke format WIB
      const holidayWIB = getWIBParts(holiday.start);
      
      // Simpan day (hari) WIB ke objek sementara untuk di-map nanti
      holiday._wibDay = holidayWIB.day; 
      
      // 3. Bandingkan dengan bulan target WIB
      return holiday.type === "public" && holidayWIB.month === targetWIB.month;
    })
    .map((holiday) => {
      return {
        day: holiday._wibDay, // ✅ MENGGUNAKAN HARI YANG SUDAH DIKONVERSI KE WIB
        date: holiday.start.toISOString(), // Biarkan ISOString sebagai raw backup
        name: holiday.name,
      };
    });

  return publicHolidays;
}

// ── Helpers Auth ──────────────────────────────────────────────
async function getCurrentUser() {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const user = await prisma.account.findUnique({
    where: { id: session.id },
    select: { id: true, role: true, teamId: true, nama: true },
  });
  if (!user) return { success: false, error: "Unauthorized" };
  return { success: true, user };
}

// ── SAVE SCHEDULES (bisa multi-tim dari satu upload) ──────────
// payload.groups = array of { teamId, teamName, monthStartDate, rows }
// rows = [{ nomorFinger, namaKaryawan, shifts }] (hanya baris tanpa error)
export async function saveSchedules(payload) {
  try {
    const current = await getCurrentUser();
    if (!current.success) return current;
    const { user } = current;

    const { groups } = payload;
    if (!Array.isArray(groups) || groups.length === 0) {
      return { success: false, error: "Tidak ada data jadwal untuk disimpan" };
    }

    const results = [];

    for (const group of groups) {
      const { teamId, monthStartDate, rows } = group;

      // USER biasa hanya boleh simpan untuk timnya sendiri
      if (user.role !== "ADMIN" && teamId !== user.teamId) continue;

      const validRows = rows.filter((r) => !r.error);
      if (validRows.length === 0) continue;

      const parsedDate = monthStartDate ? new Date(monthStartDate) : new Date();

      // Generate slug unik
      let slug;
      let attempts = 0;
      do {
        slug = generateSlug();
        const existing = await prisma.schedule.findUnique({ where: { publicSlug: slug } });
        if (!existing) break;
        attempts++;
      } while (attempts < 5);

      // Cek apakah sudah ada schedule untuk tim + bulan yang sama → overwrite
      const existingSchedule = await prisma.schedule.findFirst({
        where: {
          teamId: teamId ?? null,
          monthStartDate: parsedDate,
          deletedAt: null,
        },
      });

      if (existingSchedule) {
        // Hapus rows lama lalu update
        await prisma.scheduleRow.deleteMany({ where: { scheduleId: existingSchedule.id } });
        await prisma.schedule.update({
          where: { id: existingSchedule.id },
          data: {
            publicSlug: slug,
            createdBy: user.id,
          },
        });
        await prisma.scheduleRow.createMany({
          data: validRows.map((r) => ({
            scheduleId:   existingSchedule.id,
            nomorFinger:  r.nomorFinger,
            namaKaryawan: r.namaKaryawan,
            shifts:       r.shifts,
          })),
        });
        results.push({ teamId, slug, id: existingSchedule.id, updated: true });
      } else {
        const schedule = await prisma.schedule.create({
          data: {
            teamId:        teamId ?? null,
            createdBy:     user.id,
            monthStartDate: parsedDate,
            publicSlug:    slug,
          },
        });
        await prisma.scheduleRow.createMany({
          data: validRows.map((r) => ({
            scheduleId:   schedule.id,
            nomorFinger:  r.nomorFinger,
            namaKaryawan: r.namaKaryawan,
            shifts:       r.shifts,
          })),
        });
        results.push({ teamId, slug, id: schedule.id, updated: false });
      }
    }

    revalidatePath("/jadwal");
    return { success: true, results };
  } catch (err) {
    console.error("Error saving schedules:", err);
    return { success: false, error: "Gagal menyimpan jadwal: " + err.message };
  }
}

// ── GET LIST SCHEDULES ────────────────────────────────────────
export async function getSchedules() {
  try {
    const current = await getCurrentUser();
    if (!current.success) return current;
    const { user } = current;

    const where = { deletedAt: null };
    if (user.role !== "ADMIN") {
      where.teamId = user.teamId;
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        team: { select: { nama: true } },
        creator: { select: { nama: true } },
        _count: { select: { rows: true } },
      },
      orderBy: [{ monthStartDate: "desc" }, { createdAt: "desc" }],
    });

    return {
      success: true,
      data: schedules.map((s) => ({
        id:            s.id,
        teamId:        s.teamId,
        teamName:      s.team?.nama ?? "Tanpa Tim",
        createdByName: s.creator?.nama ?? "Sistem",
        monthStartDate: s.monthStartDate,
        publicSlug:    s.publicSlug,
        rowCount:      s._count.rows,
        createdAt:     s.createdAt,
      })),
      role: user.role,
    };
  } catch (err) {
    console.error("Error fetching schedules:", err);
    return { success: false, error: "Gagal memuat daftar jadwal" };
  }
}

// ── GET SCHEDULE BY ID (admin view) ──────────────────────────
export async function getScheduleById(id) {
  try {
    const current = await getCurrentUser();
    if (!current.success) return current;
    const { user } = current;

    const schedule = await prisma.schedule.findUnique({
      where: { id: Number(id) },
      include: {
        team: { select: { nama: true } },
        creator: { select: { nama: true } },
        rows: { orderBy: { namaKaryawan: "asc" } },
      },
    });

    if (!schedule || schedule.deletedAt) {
      return { success: false, error: "Jadwal tidak ditemukan" };
    }

    if (user.role !== "ADMIN" && schedule.teamId !== user.teamId) {
      return { success: false, error: "Akses ditolak" };
    }

    return { success: true, data: schedule };
  } catch (err) {
    console.error("Error fetching schedule:", err);
    return { success: false, error: "Gagal memuat jadwal" };
  }
}

// ── GET BY SLUG (PUBLIC — tanpa session) ─────────────────────
export async function getScheduleBySlug(slug) {
  try {
    if (!slug || typeof slug !== "string" || slug.length > 32) {
      return { success: false, error: "Slug tidak valid" };
    }

    const schedule = await prisma.schedule.findUnique({
      where: { publicSlug: slug },
      include: {
        team: { select: { nama: true } },
        rows: { orderBy: { namaKaryawan: "asc" } },
      },
    });

    if (!schedule || schedule.deletedAt || !schedule.publicSlug) {
      return { success: false, error: "Jadwal tidak ditemukan atau link sudah tidak aktif" };
    }

    return {
      success: true,
      data: {
        id:            schedule.id,
        teamName:      schedule.team?.nama ?? "Tim",
        monthStartDate: schedule.monthStartDate,
        // 👇 Tanggal Merah dieksekusi di sini dengan akurasi WIB
        redDates:      getPublicRedDates(schedule.monthStartDate),
        rows:          schedule.rows,
      },
    };
  } catch (err) {
    console.error("Error fetching schedule by slug:", err);
    return { success: false, error: "Gagal memuat jadwal" };
  }
}

// ── DELETE SCHEDULE ───────────────────────────────────────────
export async function deleteSchedule(id) {
  try {
    const current = await getCurrentUser();
    if (!current.success) return current;
    const { user } = current;

    const schedule = await prisma.schedule.findUnique({ where: { id: Number(id) } });
    if (!schedule || schedule.deletedAt) {
      return { success: false, error: "Jadwal tidak ditemukan" };
    }
    if (user.role !== "ADMIN" && schedule.teamId !== user.teamId) {
      return { success: false, error: "Akses ditolak" };
    }

    await prisma.schedule.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/jadwal");
    return { success: true };
  } catch (err) {
    console.error("Error deleting schedule:", err);
    return { success: false, error: "Gagal menghapus jadwal" };
  }
}