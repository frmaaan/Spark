"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function getAccountContext(session) {
  return await prisma.account.findUnique({
    where: { id: session.id },
    select: { role: true, teamId: true },
  });
}

function buildSpklScopeWhere(session, account) {
  if (session.role === "ADMIN") {
    return {};
  }

  if (account?.teamId) {
    return {
      OR: [
        { teamId: account.teamId },
        { teamId: null, account: { teamId: account.teamId } },
      ],
    };
  }

  return { accountId: session.id };
}

// =============================================================
// GET SPKL LIST (Histori)
// =============================================================
export async function getSpklList() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const account = await getAccountContext(session);
    if (!account) return { success: false, error: "Unauthorized" };

    const whereClause = buildSpklScopeWhere(session, account);

    const spklList = await prisma.spkl.findMany({
      where: whereClause,
      include: {
        rows: {
          include: {
            user: true, // Ambil juga data karyawan untuk tiap baris
          },
        },
        account: true,
      },
      orderBy: {
        createdAt: "desc", // Terbaru di atas
      },
    });
    return {
      success: true,
      data: spklList,
      role: account.role || session.role,
      currentAccountId: session.id,
      currentTeamId: account.teamId || null,
    };
  } catch (error) {
    console.error("Error fetching SPKL list:", error);
    return { success: false, error: "Gagal mengambil histori SPKL" };
  }
}

// =============================================================
// SAVE SPKL (Create or Update Draft)
// =============================================================
export async function saveSpkl(rows, status = "DRAFT", existingSpklId = null) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const account = await getAccountContext(session);
    if (!account) return { success: false, error: "Unauthorized" };

    if (!rows || rows.length === 0) {
      return { success: false, error: "SPKL tidak boleh kosong" };
    }

    // Jika sedang mengedit DRAFT yang sudah ada
    if (existingSpklId) {
      const existing = await prisma.spkl.findUnique({ where: { id: existingSpklId } });
      if (!existing) {
        return { success: false, error: "SPKL tidak ditemukan" };
      }

      // Validasi: Jika status sudah FINAL, hanya ADMIN yang boleh edit
      if (existing.status === "FINAL" && session.role !== "ADMIN") {
        return { success: false, error: "Akses ditolak: Dokumen FINAL sudah dikunci" };
      }

      // Pastikan berhak edit (Pemilik data atau Admin)
      if (session.role !== "ADMIN" && existing.accountId !== session.id) {
        return { success: false, error: "Akses ditolak: Bukan pemilik dokumen" };
      }

      // Hapus baris lama, ganti dengan yang baru (cara termudah untuk update relasi array)
      const updatedSpkl = await prisma.$transaction(async (tx) => {
        await tx.spklRow.deleteMany({
          where: { spklId: existingSpklId }
        });

        return tx.spkl.update({
          where: { id: existingSpklId },
          data: {
            status,
            teamId: existing.teamId ?? account.teamId,
            rows: {
              create: rows.map((r) => ({
                userId: parseInt(r.userId),
                tanggal: r.tanggal, // Sesuai schema: String
                keterangan: r.keterangan,
              })),
            },
          },
          include: {
            rows: { include: { user: true } },
            account: true,
          },
        });
      });

      return { success: true, data: updatedSpkl };
    }
    // Jika membuat SPKL baru
    else {
      const newSpkl = await prisma.spkl.create({
        data: {
          status,
          accountId: session.id, // Simpan pembuat SPKL ini
          teamId: account.teamId,
          rows: {
            create: rows.map((r) => ({
              userId: parseInt(r.userId),
              tanggal: r.tanggal, // Sesuai schema: String
              keterangan: r.keterangan,
            })),
          },
        },
        include: {
          rows: { include: { user: true } },
          account: true,
        },
      });

      return { success: true, data: newSpkl };
    }
  } catch (error) {
    console.error("Error saving SPKL:", error);
    return { success: false, error: "Gagal menyimpan SPKL" };
  }
}

// =============================================================
// DELETE SPKL (Khusus DRAFT atau bisa juga FINAL)
// =============================================================
export async function deleteSpkl(id) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const account = await getAccountContext(session);
    if (!account) return { success: false, error: "Unauthorized" };

    const existing = await prisma.spkl.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "SPKL tidak ditemukan" };

    // Validasi: Jika status sudah FINAL, hanya ADMIN yang boleh hapus
    if (existing.status === "FINAL" && session.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak: Dokumen FINAL sudah dikunci" };
    }

    if (session.role !== "ADMIN" && existing.accountId !== session.id) {
      return { success: false, error: "Akses ditolak: Bukan pemilik dokumen" };
    }

    await prisma.spkl.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting SPKL:", error);
    return { success: false, error: "Gagal menghapus SPKL" };
  }
}

// =============================================================
// MENDAPATKAN STATISTIK DASHBOARD
// =============================================================
export async function getDashboardStats() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const account = await getAccountContext(session);
    if (!account) return { success: false, error: "Unauthorized" };

    const whereClause = buildSpklScopeWhere(session, account);

    const [totalSpkl, draftSpkl, finalSpkl] = await Promise.all([
      prisma.spkl.count({ where: whereClause }),
      prisma.spkl.count({ where: { ...whereClause, status: "DRAFT" } }),
      prisma.spkl.count({ where: { ...whereClause, status: "FINAL" } }),
    ]);

    return {
      success: true,
      data: {
        totalSpkl,
        draftSpkl,
        finalSpkl,
      },
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { success: false, error: "Gagal memuat statistik" };
  }
}

// =============================================================
// 📖 getSpklDetail(id) — Ambil detail lengkap satu SPKL
// =============================================================
export async function getSpklDetail(id) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const account = await getAccountContext(session);
    if (!account) return { success: false, error: "Unauthorized" };

    const spkl = await prisma.spkl.findUnique({
      where: { id },
      include: {
        rows: {
          include: { user: true },
          orderBy: { tanggal: "asc" },
        },
        account: true,
      },
    });

    if (!spkl) {
      return { success: false, error: "SPKL tidak ditemukan" };
    }

    if (session.role !== "ADMIN") {
      const isTeamScoped = !!account.teamId;
      const canSee = isTeamScoped
        ? (spkl.teamId === account.teamId || (spkl.teamId == null && spkl.account?.teamId === account.teamId))
        : spkl.accountId === session.id;

      if (!canSee) {
        return { success: false, error: "Akses ditolak" };
      }
    }

    if (session.role !== "ADMIN" && spkl.accountId !== session.id && !account.teamId) {
      return { success: false, error: "Akses ditolak" };
    }

    return { success: true, data: spkl };
  } catch (error) {
    console.error("Error fetching SPKL detail:", error);
    return { success: false, error: "Gagal mengambil detail SPKL" };
  }
}
