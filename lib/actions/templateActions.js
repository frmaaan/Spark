// lib/actions/templateActions.js
"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// =============================================================
// 1. AMBIL SEMUA TEMPLATE (Difilter Berdasarkan Tim & Role)
// =============================================================
export async function getTemplates() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    // Ambil data user beserta teamId dan role-nya
    const user = await prisma.account.findUnique({
      where: { id: session.id },
      select: { teamId: true, role: true },
    });

    let whereClause = {};

    // Jika BUKAN ADMIN, filter template hanya untuk tim user tersebut
    if (user.role !== "ADMIN") {
      // Jika user tidak punya tim, mungkin kita set agar tidak bisa melihat apa-apa (atau hanya template global jika ada)
      if (!user.teamId) {
        return { success: true, data: [] }; 
      }
      
      whereClause = {
        teamId: user.teamId,
      };
    }
    // Jika ADMIN, whereClause tetap kosong {} (artinya ambil semua data tanpa filter)

    const templates = await prisma.todoTemplate.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    // Parse items JSON
    const parsed = templates.map((t) => ({
      ...t,
      items: JSON.parse(t.items),
    }));

    return { success: true, data: parsed };
  } catch (error) {
    console.error("Error fetching templates:", error);
    return { success: false, error: "Gagal mengambil template" };
  }
}

// =============================================================
// 2. BUAT TEMPLATE BARU (Menyimpan teamId)
// =============================================================
export async function addTemplate(title, items) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const user = await prisma.account.findUnique({
      where: { id: session.id },
      select: { teamId: true },
    });

    if (!title?.trim() || !items || items.length === 0) {
      return { success: false, error: "Judul dan minimal 1 item diperlukan" };
    }

    const template = await prisma.todoTemplate.create({
      data: {
        title: title.trim(),
        items: JSON.stringify(items),
        teamId: user.teamId, // <-- SIMPAN ID TIM PEMBUAT DI SINI
      },
    });

    revalidatePath("/");
    revalidatePath("/akun");
    return { success: true, data: { ...template, items } };
  } catch (error) {
    console.error("Error creating template:", error);
    return { success: false, error: "Gagal membuat template" };
  }
}

// =============================================================
// 3. HAPUS TEMPLATE (Validasi Kepemilikan Tim / Admin)
// =============================================================
export async function deleteTemplate(id) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const user = await prisma.account.findUnique({
      where: { id: session.id },
      select: { teamId: true, role: true },
    });

    // Cek dulu templatenya
    const template = await prisma.todoTemplate.findUnique({ where: { id } });
    if (!template) return { success: false, error: "Template tidak ditemukan" };

    // Validasi: Jika bukan ADMIN dan bukan dari tim yang sama, tolak!
    if (user.role !== "ADMIN" && template.teamId !== user.teamId) {
      return { success: false, error: "Akses ditolak. Anda hanya bisa menghapus template tim Anda sendiri." };
    }

    await prisma.todoTemplate.delete({ where: { id } });

    revalidatePath("/");
    revalidatePath("/akun");
    return { success: true };
  } catch (error) {
    console.error("Error deleting template:", error);
    return { success: false, error: "Gagal menghapus template" };
  }
}

// =============================================================
// 4. GUNAKAN TEMPLATE → Buat todo-todo dari template
// =============================================================
// (Fungsi ini tidak perlu diubah, biarkan seperti aslinya)
export async function useTemplate(templateId, isTeamTask = false) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const template = await prisma.todoTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) return { success: false, error: "Template tidak ditemukan" };

    const items = JSON.parse(template.items);

    const user = await prisma.account.findUnique({
      where: { id: session.id },
      select: { teamId: true },
    });

    const tipe = isTeamTask && user.teamId ? "TEAM" : "PERSONAL";
    const teamId = tipe === "TEAM" ? user.teamId : null;

    await prisma.todo.createMany({
      data: items.map((item) => ({
        task: item,
        status: "TODO",
        tipe,
        authorId: session.id,
        teamId,
      })),
    });

    revalidatePath("/");
    return { success: true, count: items.length, title: template.title };
  } catch (error) {
    console.error("Error using template:", error);
    return { success: false, error: "Gagal menggunakan template" };
  }
}

// =============================================================
// 5. UPDATE TEMPLATE (Validasi Kepemilikan Tim / Admin)
// =============================================================
export async function updateTemplate(id, title, items) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const user = await prisma.account.findUnique({
      where: { id: session.id },
      select: { teamId: true, role: true },
    });

    const normalizedId = Number(id);
    const normalizedItems = (items || []).map((item) => item?.trim()).filter(Boolean);

    if (!normalizedId || Number.isNaN(normalizedId)) {
      return { success: false, error: "Template tidak valid" };
    }
    if (!title?.trim() || normalizedItems.length === 0) {
      return { success: false, error: "Judul dan minimal 1 item diperlukan" };
    }

    // Cek dulu kepemilikan template
    const existingTemplate = await prisma.todoTemplate.findUnique({ where: { id: normalizedId } });
    if (!existingTemplate) return { success: false, error: "Template tidak ditemukan" };

    // Validasi: Jika bukan ADMIN dan bukan dari tim yang sama, tolak!
    if (user.role !== "ADMIN" && existingTemplate.teamId !== user.teamId) {
      return { success: false, error: "Akses ditolak. Anda hanya bisa mengedit template tim Anda sendiri." };
    }

    const updatedTemplate = await prisma.todoTemplate.update({
      where: { id: normalizedId },
      data: {
        title: title.trim(),
        items: JSON.stringify(normalizedItems),
      },
    });

    revalidatePath("/");
    revalidatePath("/akun");
    revalidatePath("/spkl");

    return {
      success: true,
      data: {
        ...updatedTemplate,
        items: normalizedItems,
      },
    };
  } catch (error) {
    console.error("Error updating template:", error);
    return { success: false, error: "Gagal memperbarui template" };
  }
}