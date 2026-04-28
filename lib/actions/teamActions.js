"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// 1. Ambil semua daftar tim
export async function getTeams() {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Unauthorized" };

        const teams = await prisma.team.findMany({
            orderBy: { nama: "asc" }
        });

        return { success: true, data: teams };
    } catch (error) {
        console.error("Error fetching teams:", error);
        return { success: false, error: "Gagal mengambil data tim" };
    }
}

// 2. Buat tim baru
export async function addTeam(nama) {
    try {
        const session = await getSession();
        if (!session || session.role !== "ADMIN") {
            return { success: false, error: "Hanya Admin yang bisa membuat tim" };
        }

        const newTeam = await prisma.team.create({
            data: { nama: nama.toUpperCase() } // Kita buat uppercase agar seragam
        });

        revalidatePath("/pengguna");
        return { success: true, data: newTeam };
    } catch (error) {
        console.error("Error adding team:", error);
        // Error kode P2002 dari Prisma berarti datanya duplikat (karena @unique)
        if (error.code === 'P2002') {
            return { success: false, error: "Nama tim sudah digunakan" };
        }
        return { success: false, error: "Gagal membuat tim" };
    }
}