"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// =============================================================
// 1. AMBIL SEMUA TEMPLATE
// =============================================================
export async function getTemplates() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const templates = await prisma.todoTemplate.findMany({
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
// 2. BUAT TEMPLATE BARU (ADMIN ONLY)
// =============================================================
export async function addTemplate(title, items) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Hanya Admin yang bisa membuat template" };
    }

    if (!title?.trim() || !items || items.length === 0) {
      return { success: false, error: "Judul dan minimal 1 item diperlukan" };
    }

    const template = await prisma.todoTemplate.create({
      data: {
        title: title.trim(),
        items: JSON.stringify(items),
      },
    });

    revalidatePath("/akun");
    return { success: true, data: { ...template, items } };
  } catch (error) {
    console.error("Error creating template:", error);
    return { success: false, error: "Gagal membuat template" };
  }
}

// =============================================================
// 3. HAPUS TEMPLATE (ADMIN ONLY)
// =============================================================
export async function deleteTemplate(id) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak" };
    }

    await prisma.todoTemplate.delete({ where: { id } });

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
export async function useTemplate(templateId, isTeamTask = false) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    // Ambil template
    const template = await prisma.todoTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) return { success: false, error: "Template tidak ditemukan" };

    const items = JSON.parse(template.items);

    // Cek tim user
    const user = await prisma.account.findUnique({
      where: { id: session.id },
      select: { teamId: true },
    });

    const tipe = isTeamTask && user.teamId ? "TEAM" : "PERSONAL";
    const teamId = tipe === "TEAM" ? user.teamId : null;

    // Buat semua todo sekaligus
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
