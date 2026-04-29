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

// =============================================================
// 7. ARCHIVE OLD TODOS (Snapshot sebelum jam 00:00 - dipanggil saat load)
// =============================================================
export async function archiveOldTodos() {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        const user = await prisma.account.findUnique({ where: { id: session.id }, select: { teamId: true } });
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const orConditions = [
            { authorId: session.id, tipe: "PERSONAL", createdAt: { lt: startOfToday } }
        ];

        if (user.teamId) {
            orConditions.push({ tipe: "TEAM", teamId: user.teamId, createdAt: { lt: startOfToday } });
        }

        const oldTodos = await prisma.todo.findMany({ where: { OR: orConditions }, include: { author: { select: { nama: true } } } });
        if (!oldTodos || oldTodos.length === 0) return { success: true, archived: 0 };

        const items = oldTodos.map(t => ({ id: t.id, task: t.task, description: t.description, status: t.status, tipe: t.tipe, authorId: t.authorId, authorName: t.author?.nama || null }));

        const title = `Snapshot ${startOfToday.toISOString().slice(0,10)}`;

        await prisma.todoHistory.create({ data: { title, items: JSON.stringify(items), authorId: session.id, teamId: user.teamId || null } });

        const ids = oldTodos.map(t => t.id);
        await prisma.todo.deleteMany({ where: { id: { in: ids } } });

        revalidatePath("/");
        return { success: true, archived: ids.length };
    } catch (error) {
        console.error("Error archiving todos:", error);
        return { success: false, error: "Gagal mengarsipkan todos" };
    }
}

// =============================================================
// 8. GET / MANAGE HISTORIES
// =============================================================
export async function getHistories() {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };
        const user = await prisma.account.findUnique({ where: { id: session.id }, select: { teamId: true } });

        const where = user.teamId ? { OR: [{ authorId: session.id }, { teamId: user.teamId }] } : { authorId: session.id };

        const histories = await prisma.todoHistory.findMany({ where, orderBy: { createdAt: "desc" } });
        return { success: true, data: histories };
    } catch (error) {
        console.error("Error getting histories:", error);
        return { success: false, error: "Gagal mengambil histori" };
    }
}

export async function updateHistory(id, title, items) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        // Normalize items to JSON string
        const normalized = typeof items === "string" ? items : JSON.stringify(items);

        await prisma.todoHistory.update({ where: { id }, data: { title, items: normalized } });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error updating history:", error);
        return { success: false, error: "Gagal mengubah histori" };
    }
}

export async function deleteHistory(id) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        await prisma.todoHistory.delete({ where: { id } });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting history:", error);
        return { success: false, error: "Gagal menghapus histori" };
    }
}

// =============================================================
// 9. CREATE A HISTORY (manual save before share)
// =============================================================
export async function createHistory(title, items) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        const user = await prisma.account.findUnique({ where: { id: session.id }, select: { teamId: true } });

        const normalized = typeof items === "string" ? items : JSON.stringify(items || []);

        const created = await prisma.todoHistory.create({ data: { title: title || `Snapshot ${new Date().toISOString().slice(0,10)}`, items: normalized, authorId: session.id, teamId: user.teamId || null } });
        revalidatePath("/");
        return { success: true, data: created };
    } catch (error) {
        console.error("Error creating history:", error);
        return { success: false, error: "Gagal membuat histori" };
    }
}

// =============================================================
// 10. SAVE HISTORY + CLEAR CURRENT TODOS (end of day / explicit archive)
// =============================================================
export async function saveHistoryAndClearTodos(title, todos) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        const user = await prisma.account.findUnique({ where: { id: session.id }, select: { teamId: true } });
        const items = Array.isArray(todos) ? todos : [];
        const normalizedItems = items.map((todo) => ({
            id: todo.id,
            task: todo.task,
            description: todo.description || null,
            status: todo.status || "TODO",
            tipe: todo.tipe || "PERSONAL",
            authorId: todo.authorId || session.id,
        }));

        const snapshotTitle = title || `Snapshot ${new Date().toISOString().slice(0, 10)}`;

        const created = await prisma.todoHistory.create({
            data: {
                title: snapshotTitle,
                items: JSON.stringify(normalizedItems),
                authorId: session.id,
                teamId: user.teamId || null,
            },
        });

        const ids = normalizedItems
            .map((todo) => Number(todo.id))
            .filter((id) => Number.isInteger(id));

        if (ids.length > 0) {
            await prisma.todo.deleteMany({ where: { id: { in: ids } } });
        }

        revalidatePath("/");
        return { success: true, data: created };
    } catch (error) {
        console.error("Error saving history and clearing todos:", error);
        return { success: false, error: "Gagal menyimpan histori dan membersihkan todo" };
    }
}