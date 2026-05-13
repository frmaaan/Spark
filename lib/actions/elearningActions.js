"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { getTeams } from "@/lib/actions/teamActions";
import { customAlphabet } from "nanoid";

// Alfabet aman: tanpa karakter ambigu (0, O, I, l) dan simbol
const generateSlug = customAlphabet(
  "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789",
  16
);

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => ({
      question: String(item?.question || "").trim(),
      answer: String(item?.answer || "").trim(),
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index + 1,
    }))
    .filter((item) => item.question && item.answer)
    .map((item, index) => ({
      question: item.question,
      answer: item.answer,
      order: index + 1,
    }));
}

function mapMaterial(material) {
  return {
    ...material,
    items: Array.isArray(material.items) ? material.items : [],
    itemCount: Array.isArray(material.items) ? material.items.length : 0,
    teamName: material.team?.nama || null,
    createdByName: material.creator?.nama || "Sistem",
  };
}

async function getCurrentUser() {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const user = await prisma.account.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      nama: true,
      role: true,
      teamId: true,
      team: { select: { nama: true } },
    },
  });

  if (!user) return { success: false, error: "Unauthorized" };

  return { success: true, session, user };
}

function canAccessMaterial(material, user) {
  if (user.role === "ADMIN") return true;

  if (material.accessStatus === "PRIVATE") {
    return material.createdBy === user.id;
  }

  if (material.teamId && user.teamId && material.teamId === user.teamId) {
    return true;
  }

  return material.createdBy === user.id;
}

export async function getElearningMaterials() {
  try {
    const current = await getCurrentUser();
    if (!current.success) return current;

    const { session, user } = current;

    const whereClause = { deletedAt: null };

    if (user.role !== "ADMIN") {
      const orClause = [{ createdBy: session.id }];
      if (user.teamId) {
        orClause.push({ teamId: user.teamId, accessStatus: "TEAM" });
      }
      whereClause.OR = orClause;
    }

    const materials = await prisma.elearningMaterial.findMany({
      where: whereClause,
      include: {
        team: true,
        creator: { select: { nama: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: materials.map(mapMaterial),
      role: user.role,
      teamId: user.teamId,
      teamName: user.team?.nama || null,
      userName: user.nama,
    };
  } catch (error) {
    console.error("Error fetching e-learning materials:", error);
    return { success: false, error: "Gagal mengambil materi e-learning" };
  }
}

export async function saveElearningMaterial(payload) {
  try {
    const current = await getCurrentUser();
    if (!current.success) return current;

    const { session, user } = current;
    const id = payload?.id ? Number(payload.id) : null;
    const title = String(payload?.title || "").trim();
    const description = String(payload?.description || "").trim();
    const accessStatus = payload?.accessStatus === "PRIVATE" ? "PRIVATE" : "TEAM";
    const items = normalizeItems(payload?.items);
    const requestedTeamId = payload?.teamId !== undefined && payload?.teamId !== null && payload?.teamId !== ""
      ? Number(payload.teamId)
      : null;
    const teamId = user.role === "ADMIN" ? requestedTeamId || user.teamId || null : user.teamId || null;

    if (!title) {
      return { success: false, error: "Judul materi wajib diisi" };
    }

    if (items.length === 0) {
      return { success: false, error: "Minimal 1 pertanyaan dan jawaban harus diisi" };
    }

    if (accessStatus === "TEAM" && !teamId) {
      return { success: false, error: "Tim harus dipilih untuk akses TIM" };
    }

    if (id) {
      const existing = await prisma.elearningMaterial.findUnique({
        where: { id },
      });

      if (!existing || existing.deletedAt) {
        return { success: false, error: "Materi tidak ditemukan" };
      }

      if (!canAccessMaterial(existing, user)) {
        return { success: false, error: "Akses ditolak" };
      }

      const updated = await prisma.elearningMaterial.update({
        where: { id },
        data: {
          title,
          description: description || null,
          items,
          accessStatus,
          teamId,
        },
        include: {
          team: true,
          creator: { select: { nama: true } },
        },
      });

      revalidatePath("/bank-soal");
      return { success: true, data: mapMaterial(updated) };
    }

    const created = await prisma.elearningMaterial.create({
      data: {
        title,
        description: description || null,
        items,
        accessStatus,
        teamId,
        createdBy: session.id,
      },
      include: {
        team: true,
        creator: { select: { nama: true } },
      },
    });

    revalidatePath("/bank-soal");
    return { success: true, data: mapMaterial(created) };
  } catch (error) {
    console.error("Error saving e-learning material:", error);
    return { success: false, error: "Gagal menyimpan materi" };
  }
}

export async function deleteElearningMaterial(id) {
  try {
    const current = await getCurrentUser();
    if (!current.success) return current;

    const { user } = current;
    const numericId = Number(id);

    const existing = await prisma.elearningMaterial.findUnique({
      where: { id: numericId },
    });

    if (!existing || existing.deletedAt) {
      return { success: false, error: "Materi tidak ditemukan" };
    }

    if (!canAccessMaterial(existing, user)) {
      return { success: false, error: "Akses ditolak" };
    }

    await prisma.elearningMaterial.update({
      where: { id: numericId },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/bank-soal");
    return { success: true };
  } catch (error) {
    console.error("Error deleting e-learning material:", error);
    return { success: false, error: "Gagal menghapus materi" };
  }
}

export async function getElearningQuestions() {
  return getElearningMaterials();
}

export async function saveElearningQuestion(payload) {
  return saveElearningMaterial(payload);
}

export async function deleteElearningQuestion(id) {
  return deleteElearningMaterial(id);
}

export async function getTeamsForElearning() {
  return getTeams();
}

export async function getElearningMaterialById(id) {
  try {
    const current = await getCurrentUser();
    if (!current.success) return current;

    const { user } = current;
    const numericId = Number(id);

    const material = await prisma.elearningMaterial.findUnique({
      where: { id: numericId },
      include: {
        team: true,
        creator: { select: { nama: true } },
      },
    });

    if (!material || material.deletedAt) {
      return { success: false, error: "Materi tidak ditemukan" };
    }

    if (!canAccessMaterial(material, user)) {
      return { success: false, error: "Akses ditolak" };
    }

    return { success: true, data: mapMaterial(material) };
  } catch (error) {
    console.error("Error fetching e-learning material detail:", error);
    return { success: false, error: "Gagal memuat detail materi" };
  }
}

// =============================================================
// GENERATE / REVOKE PUBLIC SLUG (Hanya user login & pemilik)
// =============================================================
export async function generatePublicSlug(id) {
  try {
    const current = await getCurrentUser();
    if (!current.success) return current;

    const { user } = current;
    const numericId = Number(id);

    const material = await prisma.elearningMaterial.findUnique({
      where: { id: numericId },
    });

    if (!material || material.deletedAt) {
      return { success: false, error: "Materi tidak ditemukan" };
    }

    // Hanya pemilik atau admin yang bisa generate slug
    if (!canAccessMaterial(material, user)) {
      return { success: false, error: "Akses ditolak" };
    }

    // Materi PRIVATE tidak bisa di-share ke publik
    if (material.accessStatus === "PRIVATE") {
      return { success: false, error: "Materi PRIBADI tidak dapat dibagikan ke publik. Ubah hak akses ke TIM terlebih dahulu." };
    }

    // Toggle: jika sudah ada slug → revoke (hapus), jika belum → generate baru
    if (material.publicSlug) {
      await prisma.elearningMaterial.update({
        where: { id: numericId },
        data: { publicSlug: null },
      });
      revalidatePath("/bank-soal");
      return { success: true, slug: null, revoked: true };
    }

    // Generate slug baru yang unik (loop jika collision — sangat jarang terjadi)
    let slug;
    let attempts = 0;
    do {
      slug = generateSlug();
      const existing = await prisma.elearningMaterial.findUnique({ where: { publicSlug: slug } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const updated = await prisma.elearningMaterial.update({
      where: { id: numericId },
      data: { publicSlug: slug },
    });

    revalidatePath("/bank-soal");
    return { success: true, slug: updated.publicSlug, revoked: false };
  } catch (error) {
    console.error("Error generating public slug:", error);
    return { success: false, error: "Gagal membuat link publik" };
  }
}

// =============================================================
// GET MATERIAL BY SLUG (Publik — TANPA SESSION)
// =============================================================
export async function getElearningMaterialBySlug(slug) {
  try {
    if (!slug || typeof slug !== "string" || slug.length > 32) {
      return { success: false, error: "Slug tidak valid" };
    }

    const material = await prisma.elearningMaterial.findUnique({
      where: { publicSlug: slug },
      include: {
        team: true,
        creator: { select: { nama: true } },
      },
    });

    // 404 jika tidak ditemukan, sudah dihapus, atau slug sudah dicabut
    if (!material || material.deletedAt || !material.publicSlug) {
      return { success: false, error: "Materi tidak ditemukan" };
    }

    // Materi PRIVATE tidak boleh bisa diakses via slug publik
    if (material.accessStatus === "PRIVATE") {
      return { success: false, error: "Akses ditolak" };
    }

    return { success: true, data: mapMaterial(material) };
  } catch (error) {
    console.error("Error fetching material by slug:", error);
    return { success: false, error: "Gagal memuat materi" };
  }
}