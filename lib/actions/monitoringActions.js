"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// === LOCATIONS ===
export async function getLocations() {
    try {
        const locations = await prisma.monitoringLocation.findMany({ orderBy: { nama: 'asc' } });
        return { success: true, data: locations };
    } catch (error) {
        console.error('getLocations err', error);
        return { success: false, error: 'Gagal mengambil lokasi penyimpanan' };
    }
}

export async function createLocation(nama) {
    try {
        const location = await prisma.monitoringLocation.create({ data: { nama: nama.trim() } });
        revalidatePath('/monitoring');
        return { success: true, data: location };
    } catch (error) {
        console.error('createLocation err', error);
        return { success: false, error: 'Gagal membuat lokasi baru' };
    }
}

export async function deleteLocation(id) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };

    try {
        const locationId = Number(id);
        if (!locationId) return { success: false, error: 'Lokasi tidak valid' };

        const usedCount = await prisma.monitoringTransaction.count({
            where: {
                OR: [
                    { locationId },
                    { toLocationId: locationId },
                ],
            },
        });

        if (usedCount > 0) {
            return {
                success: false,
                error: 'Lokasi sudah dipakai pada transaksi dan tidak bisa dihapus. Gunakan lokasi lain untuk data baru.',
            };
        }

        await prisma.monitoringLocation.delete({ where: { id: locationId } });
        revalidatePath('/monitoring');
        return { success: true };
    } catch (error) {
        console.error('deleteLocation err', error);
        return { success: false, error: 'Gagal menghapus lokasi' };
    }
}

// === CATEGORIES ===
export async function getCategories() {
    try {
        const session = await getSession();
        let account = null;
        if (session) {
            account = await prisma.account.findUnique({ where: { id: session.id }, select: { role: true, teamId: true } });
        }
        const userRole = account?.role || session?.role || 'USER';
        const userTeamId = account?.teamId || null;

        const cats = await prisma.monitoringCategory.findMany({
            orderBy: { createdAt: 'desc' },
            include: { categoryTeams: { include: { team: true } } }
        });

        let parsed = cats.map(c => ({
            id: c.id,
            name: c.nama,
            createdAt: c.createdAt,
            teams: c.categoryTeams ? c.categoryTeams.map(ct => ({ id: ct.team.id, nama: ct.team.nama })) : []
        }));

        if (userRole !== 'ADMIN') {
            parsed = parsed.filter(c => {
                if (!c.teams || c.teams.length === 0) return true; // public
                if (!userTeamId) return false;
                return c.teams.some(t => t.id === userTeamId);
            });
        }

        return { success: true, data: parsed };
    } catch (error) {
        console.error('getCategories err', error);
        return { success: false, error: 'Gagal mengambil kategori' };
    }
}

export async function addCategory(name, teamIds = []) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };
    try {
        const created = await prisma.monitoringCategory.create({ data: { nama: name } });
        if (Array.isArray(teamIds) && teamIds.length > 0) {
            const uniq = Array.from(new Set(teamIds.map(t => Number(t)).filter(Boolean)));
            if (uniq.length > 0) {
                await prisma.monitoringCategoryTeam.createMany({ data: uniq.map(tid => ({ categoryId: created.id, teamId: tid })) });
            }
        }
        revalidatePath('/monitoring');
        const res = await getCategories();
        return { success: true, data: res.data };
    } catch (error) {
        console.error('addCategory err', error);
        return { success: false, error: 'Gagal membuat kategori' };
    }
}

export async function updateCategory(id, name, teamIds = []) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };
    try {
        const updated = await prisma.monitoringCategory.update({
            where: { id: Number(id) },
            data: { nama: name.trim() }
        });

        // Reset category teams
        await prisma.monitoringCategoryTeam.deleteMany({ where: { categoryId: Number(id) } });

        if (Array.isArray(teamIds) && teamIds.length > 0) {
            const uniq = Array.from(new Set(teamIds.map(t => Number(t)).filter(Boolean)));
            if (uniq.length > 0) {
                await prisma.monitoringCategoryTeam.createMany({
                    data: uniq.map(tid => ({ categoryId: Number(id), teamId: tid }))
                });
            }
        }
        revalidatePath('/monitoring');
        const res = await getCategories();
        return { success: true, data: res.data };
    } catch (error) {
        console.error('updateCategory err', error);
        return { success: false, error: 'Gagal mengubah kategori' };
    }
}

export async function deleteCategory(id) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };
    try {
        await prisma.monitoringCategory.delete({ where: { id: Number(id) } });
        revalidatePath('/monitoring');
        return { success: true };
    } catch (error) {
        console.error('deleteCategory err', error);
        return { success: false, error: 'Gagal menghapus kategori' };
    }
}

// === ITEMS ===
export async function getItems() {
    try {
        const catsRes = await getCategories();
        const allowedCatIds = catsRes.success ? catsRes.data.map(c => c.id) : [];

        const items = await prisma.monitoringItem.findMany({
            where: { categoryId: { in: allowedCatIds } },
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: items };
    } catch (error) {
        console.error('getItems err', error);
        return { success: false, error: 'Gagal mengambil item' };
    }
}

export async function addItem({ categoryId, kode, nama, stokAwal, locationId }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };
    try {
        const item = await prisma.monitoringItem.create({ data: { categoryId: Number(categoryId), kode, nama, stokAwal: 0 } });
        if (Number(stokAwal) > 0 && locationId) {
            await prisma.monitoringTransaction.create({
                data: {
                    itemId: item.id,
                    tipe: "IN",
                    qty: Number(stokAwal),
                    tanggal: new Date(),
                    catatan: "Stok Awal",
                    locationId: Number(locationId)
                }
            });
        }
        revalidatePath('/monitoring');
        return { success: true, data: item };
    } catch (error) {
        console.error('addItem err', error);
        return { success: false, error: 'Gagal menambahkan item' };
    }
}

export async function updateItem(id, { kode, nama, stokAwal }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };
    try {
        const updated = await prisma.monitoringItem.update({ where: { id: Number(id) }, data: { kode, nama, stokAwal: Number(stokAwal || 0) } });
        revalidatePath('/monitoring');
        return { success: true, data: updated };
    } catch (error) {
        console.error('updateItem err', error);
        return { success: false, error: 'Gagal mengupdate item' };
    }
}

export async function deleteItem(id) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: 'Unauthorized' };
    try {
        await prisma.monitoringItem.delete({ where: { id: Number(id) } });
        revalidatePath('/monitoring');
        return { success: true };
    } catch (error) {
        console.error('deleteItem err', error);
        return { success: false, error: 'Gagal menghapus item' };
    }
}

// === TRANSACTIONS ===
export async function getTransactions() {
    try {
        const itemsRes = await getItems();
        const allowedItemIds = itemsRes.success ? itemsRes.data.map(i => i.id) : [];

        const transactions = await prisma.monitoringTransaction.findMany({
            where: { itemId: { in: allowedItemIds } },
            orderBy: { tanggal: 'desc' },
            include: { location: true, toLocation: true }
        });
        return { success: true, data: transactions };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Gagal mengambil transaksi' };
    }
}

export async function saveMutasi(transactionsData) {
    try {
        if (!transactionsData || transactionsData.length === 0) {
            return { success: false, error: 'Tidak ada data untuk disimpan' };
        }

        // --- MITIGASI IDOR: Verifikasi kepemilikan / hak akses item ---
        const allowedItemsRes = await getItems(); 
        const allowedItemIds = allowedItemsRes.success ? allowedItemsRes.data.map(i => i.id) : [];

        const hasUnauthorizedAccess = transactionsData.some(t => !allowedItemIds.includes(t.itemId));
        if (hasUnauthorizedAccess) {
            return { success: false, error: 'Akses Ditolak: Ada item di luar hak akses tim Anda.' };
        }
        // --------------------------------------------------------------


        await prisma.monitoringTransaction.createMany({
            data: transactionsData.map(t => ({
                itemId: t.itemId,
                tipe: t.type,
                qty: t.qty,
                tanggal: new Date(t.date),
                catatan: t.note,
                locationId: t.locationId ? Number(t.locationId) : null,
                toLocationId: t.toLocationId ? Number(t.toLocationId) : null
            }))
        });
        revalidatePath('/monitoring');
        return { success: true, message: 'Data mutasi berhasil disimpan!' };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Gagal menyimpan mutasi harian' };
    }
}
