"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// =============================================================
// 1. MENGAMBIL DATA TO-DO (Sesuai Akses)
// =============================================================
export async function getTodos() {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        const user = await prisma.account.findUnique({
            where: { id: session.id },
            select: { teamId: true }
        });

        // Bangun filter: selalu tampilkan todo PERSONAL milik sendiri
        const orConditions = [
            { authorId: session.id, tipe: "PERSONAL" },
        ];

        // Hanya tampilkan todo TEAM jika user benar-benar punya tim
        if (user.teamId) {
            orConditions.push({
                tipe: "TEAM",
                teamId: user.teamId
            });
        }

        const todos = await prisma.todo.findMany({
            where: { OR: orConditions },
            include: {
                author: { select: { nama: true } },
            },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: todos, userTeamId: user.teamId };
    } catch (error) {
        console.error("Error fetching todos:", error);
        return { success: false, error: "Gagal mengambil data To-Do" };
    }
}

// =============================================================
// 2. MENAMBAH TUGAS BARU
// =============================================================
export async function addTodo(task, description, isTeamTask = false) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        const user = await prisma.account.findUnique({
            where: { id: session.id },
            select: { teamId: true }
        });

        const tipe = isTeamTask && user.teamId ? "TEAM" : "PERSONAL";
        const teamId = tipe === "TEAM" ? user.teamId : null;

        const newTodo = await prisma.todo.create({
            data: {
                task,
                description: description || null,
                status: "TODO",
                tipe,
                authorId: session.id,
                teamId,
            }
        });

        revalidatePath("/");
        return { success: true, data: newTodo };
    } catch (error) {
        console.error("Error adding todo:", error);
        return { success: false, error: "Gagal menambahkan tugas" };
    }
}

// =============================================================
// 3. MENGUBAH STATUS TUGAS (TODO → IN_PROGRESS → DONE)
// =============================================================
export async function updateTodoStatus(id, newStatus) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        // Validasi status
        const validStatuses = ["TODO", "IN_PROGRESS", "DONE"];
        if (!validStatuses.includes(newStatus)) {
            return { success: false, error: "Status tidak valid" };
        }

        await prisma.todo.update({
            where: { id },
            data: { status: newStatus }
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error updating todo status:", error);
        return { success: false, error: "Gagal mengubah status tugas" };
    }
}

// =============================================================
// 4. MENGHAPUS TUGAS
// =============================================================
export async function deleteTodo(id) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        const existing = await prisma.todo.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Tugas tidak ditemukan" };

        if (existing.authorId !== session.id && session.role !== "ADMIN") {
            return { success: false, error: "Anda tidak berhak menghapus tugas ini" };
        }

        await prisma.todo.delete({ where: { id } });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting todo:", error);
        return { success: false, error: "Gagal menghapus tugas" };
    }
}

// =============================================================
// 5. MEMBAGIKAN TUGAS (SHARE KE TIM)
// =============================================================
export async function shareTodo(id) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        const user = await prisma.account.findUnique({
            where: { id: session.id },
            select: { teamId: true }
        });

        if (!user.teamId) {
            return { success: false, error: "Anda belum masuk ke tim manapun" };
        }

        await prisma.todo.update({
            where: { id, authorId: session.id },
            data: { tipe: "TEAM", teamId: user.teamId }
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error sharing todo:", error);
        return { success: false, error: "Gagal membagikan tugas" };
    }
}

// =============================================================
// 6. MENARIK KEMBALI TUGAS (UNSHARE / JADI PERSONAL LAGI)
// =============================================================
export async function unshareTodo(id) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        await prisma.todo.update({
            where: { id, authorId: session.id },
            data: { tipe: "PERSONAL", teamId: null }
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error unsharing todo:", error);
        return { success: false, error: "Gagal menarik tugas" };
    }
}