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

        // Cari tahu user ini masuk tim mana
        const user = await prisma.account.findUnique({
            where: { id: session.id },
            select: { teamId: true }
        });

        const todos = await prisma.todo.findMany({
            where: {
                // LOGIKA UTAMA: Tampilkan jika...
                OR: [
                    { authorId: session.id, tipe: "PERSONAL" }, // ...Ini tugas personal SAYA
                    { tipe: "TEAM", teamId: user.teamId, teamId: { not: null } } // ...ATAU Ini tugas TIM SAYA
                ]
            },
            include: {
                author: { select: { nama: true } }, // Bawa nama pembuat agar ketahuan siapa yang bikin tugas tim
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
export async function addTodo(task, isTeamTask = false) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        const user = await prisma.account.findUnique({
            where: { id: session.id },
            select: { teamId: true }
        });

        // Tentukan tipe dan teamId berdasarkan input
        const tipe = isTeamTask && user.teamId ? "TEAM" : "PERSONAL";
        const teamId = tipe === "TEAM" ? user.teamId : null;

        const newTodo = await prisma.todo.create({
            data: {
                task,
                description: description || null,
                tipe,
                authorId: session.id,
                teamId,
            }
        });

        revalidatePath("/todo"); // Refresh halaman otomatis (atau "/" jika Anda taruh di dashboard)
        revalidatePath("/");
        return { success: true, data: newTodo };
    } catch (error) {
        console.error("Error adding todo:", error);
        return { success: false, error: "Gagal menambahkan tugas" };
    }
}

// =============================================================
// 3. MENGUBAH STATUS (Checklist Selesai / Belum)
// =============================================================
export async function toggleTodo(id, currentStatus) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        await prisma.todo.update({
            where: { id },
            data: { isDone: !currentStatus }
        });

        revalidatePath("/todo");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error toggling todo:", error);
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

        // Validasi: Hanya pembuat tugas yang boleh menghapus
        const existing = await prisma.todo.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Tugas tidak ditemukan" };

        if (existing.authorId !== session.id && session.role !== "ADMIN") {
            return { success: false, error: "Anda tidak berhak menghapus tugas ini" };
        }

        await prisma.todo.delete({ where: { id } });

        revalidatePath("/todo");
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

        // 1. Cari data user untuk mendapatkan teamId-nya
        const user = await prisma.account.findUnique({
            where: { id: session.id },
            select: { teamId: true }
        });

        if (!user.teamId) {
            return { success: false, error: "Anda belum masuk ke tim manapun" };
        }

        // 2. Update tugas tersebut menjadi tipe TEAM
        await prisma.todo.update({
            where: {
                id,
                authorId: session.id // Pastikan hanya pembuat yang bisa membagikan
            },
            data: {
                tipe: "TEAM",
                teamId: user.teamId
            }
        });

        revalidatePath("/todo");
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

        // Kembalikan tipe ke PERSONAL dan hapus teamId-nya
        await prisma.todo.update({
            where: {
                id,
                authorId: session.id // Wajib: Hanya si pembuat yang bisa menarik kembali
            },
            data: {
                tipe: "PERSONAL",
                teamId: null // Kosongkan agar hilang dari dashboard tim
            }
        });

        revalidatePath("/todo");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error unsharing todo:", error);
        return { success: false, error: "Gagal menarik tugas" };
    }
}