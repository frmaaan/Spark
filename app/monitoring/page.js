"use client";

import React, { useState, useEffect } from "react";
import {
    ArrowDownUp, FileBarChart, Settings,
    Save, AlertTriangle, Plus, Search,
    X, CheckSquare, Trash2, Pencil
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================================================
// MOCK DATA AWAL (Akan digantikan oleh data dari Server Actions di produksi)
// ============================================================================
const INITIAL_CATEGORIES = [];
const INITIAL_ITEMS = [];
const INITIAL_TRANSACTIONS = [];

export default function App() {
    const [activeTab, setActiveTab] = useState("input");

    // State Data (Bisa diganti dengan data fetch dari backend)
    const [categories, setCategories] = useState(INITIAL_CATEGORIES);
    const [items, setItems] = useState(INITIAL_ITEMS);
    const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
    const [locations, setLocations] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState("");

    // State Input Form Mutasi
    const [inputs, setInputs] = useState({});
    const [tanggalInput, setTanggalInput] = useState("");
    const [locationInput, setLocationInput] = useState("");

    // State Kelola Master
    const [newCategoryName, setNewCategoryName] = useState("");
    const [teams, setTeams] = useState([]);
    const [newCategoryTeams, setNewCategoryTeams] = useState([]); // array of team ids or empty => public
    const [newItemData, setNewItemData] = useState({ kode: "", nama: "", stokAwal: "", locationId: "" });

    // Edit state for items
    const [editingItemId, setEditingItemId] = useState(null);
    const [editItemData, setEditItemData] = useState({ kode: "", nama: "", stokAwal: "" });

    // Edit state for category
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [editCategoryName, setEditCategoryName] = useState("");
    const [editCategoryTeams, setEditCategoryTeams] = useState([]);

    // User role (to control access to master tab)
    const [userRole, setUserRole] = useState("USER");
    const [userTeamId, setUserTeamId] = useState(null);

    // Tips visibility
    const [showTips, setShowTips] = useState(true);

    useEffect(() => {
        let mounted = true;
        import("@/lib/actions/authActions").then(mod => mod.getMyRole()).then(res => {
            if (!mounted) return;
            if (res && res.success) {
                if (res.role) setUserRole(res.role);
                if (res.teamId) setUserTeamId(res.teamId);
            }
        }).catch(() => { });
        return () => { mounted = false; };
    }, []);

    // If admin, load teams for assignment
    useEffect(() => {
        let mounted = true;
        if (userRole === "ADMIN") {
            import("@/lib/actions/teamActions").then(mod => mod.getTeams()).then(res => {
                if (!mounted) return;
                if (res && res.success && Array.isArray(res.data)) setTeams(res.data);
            }).catch(() => { });
        }
        return () => { mounted = false; };
    }, [userRole]);

    // Load categories & items from server
    useEffect(() => {
        let mounted = true;
        import("@/lib/actions/monitoringActions").then(mod => Promise.all([mod.getCategories(), mod.getItems(), mod.getTransactions(), mod.getLocations()])).then(([cRes, iRes, tRes, lRes]) => {
            if (!mounted) return;
            if (cRes && cRes.success && Array.isArray(cRes.data)) {
                setCategories(cRes.data);
                if (!selectedCategory && cRes.data.length > 0) setSelectedCategory(cRes.data[0].id);
            }
            if (iRes && iRes.success && Array.isArray(iRes.data)) setItems(iRes.data);
            if (tRes && tRes.success && Array.isArray(tRes.data)) setTransactions(tRes.data.map(tx => ({ id: tx.id, itemId: tx.itemId, type: tx.tipe, qty: tx.qty, date: tx.tanggal instanceof Date ? tx.tanggal.toISOString().split('T')[0] : (new Date(tx.tanggal)).toISOString().split('T')[0], note: tx.catatan, locationId: tx.locationId })));
            if (lRes && lRes.success && Array.isArray(lRes.data)) {
                setLocations(lRes.data);
                if (lRes.data.length > 0) setLocationInput(lRes.data[0].nama);
            }
        }).catch(() => { });
        return () => { mounted = false; };
    }, [userRole]);

    // Report filters
    const [reportQuery, setReportQuery] = useState("");
    const [reportStartDate, setReportStartDate] = useState("");
    const [reportEndDate, setReportEndDate] = useState("");
    const [reportLocationId, setReportLocationId] = useState("ALL");
    const [reportMode, setReportMode] = useState("summary"); // summary | detail | all
    const [reportPage, setReportPage] = useState(1);
    const [reportPageSize, setReportPageSize] = useState(10);

    // Pesan Notifikasi (Pengganti Alert)
    const [message, setMessage] = useState({ text: "", type: "info" });

    useEffect(() => {
        setTanggalInput(new Date().toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ text: "", type: "info" }), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const showMessage = (text, type = "info") => {
        setMessage({ text, type });
    };

    // Confirmation modal state
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        confirmText: 'Hapus',
        cancelText: 'Batal',
        type: 'danger'
    });

    const showConfirm = (opts) => setConfirmState(s => ({ ...s, ...opts, isOpen: true }));
    const hideConfirm = () => {
        const cb = confirmState.onCancel;
        setConfirmState(s => ({ ...s, isOpen: false }));
        if (typeof cb === 'function') cb();
    };

    // ============================================================================
    // LOGIKA STOK
    // ============================================================================
    const getStockData = (itemId, startDate, endDate, locId) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return { awal: 0, masuk: 0, keluar: 0, terkini: 0 };
        let itemTxs = transactions.filter(t => t.itemId === itemId);

        if (locId && locId !== "ALL") {
            itemTxs = itemTxs.filter(t => t.locationId === parseInt(locId));
        }

        // Jika rentang tanggal diberikan, filter transaksi berdasarkan date (format YYYY-MM-DD)
        if (startDate || endDate) {
            itemTxs = itemTxs.filter(t => {
                const d = t.date;
                if (startDate && d < startDate) return false;
                if (endDate && d > endDate) return false;
                return true;
            });
        }
        const totalIn = itemTxs.filter(t => t.type === "IN").reduce((sum, t) => sum + t.qty, 0);
        const totalOut = itemTxs.filter(t => t.type === "OUT").reduce((sum, t) => sum + t.qty, 0);

        const awal = (locId && locId !== "ALL") ? 0 : item.stokAwal;
        const currentStock = awal + totalIn - totalOut;
        return { awal, masuk: totalIn, keluar: totalOut, terkini: currentStock };
    };

    const currentCategoryItems = items.filter(i => i.categoryId === selectedCategory);

    const filteredItems = items.filter(it => !reportQuery || it.nama.toLowerCase().includes(reportQuery.toLowerCase()) || it.kode.toLowerCase().includes(reportQuery.toLowerCase()));

    const reportDetailRows = transactions
        .filter(tx => {
            if (reportStartDate && tx.date < reportStartDate) return false;
            if (reportEndDate && tx.date > reportEndDate) return false;
            if (reportLocationId !== "ALL" && tx.locationId !== parseInt(reportLocationId)) return false;
            const item = items.find(i => i.id === tx.itemId);
            if (!item) return false;
            if (!reportQuery) return true;
            return item.nama.toLowerCase().includes(reportQuery.toLowerCase()) || item.kode.toLowerCase().includes(reportQuery.toLowerCase());
        })
        .map(tx => {
            const item = items.find(i => i.id === tx.itemId);
            const location = locations.find(l => l.id === tx.locationId);
            return {
                ...tx,
                itemNama: item?.nama || "-",
                itemKode: item?.kode || "-",
                locationNama: location?.nama || "-",
                masuk: tx.type === "IN" ? tx.qty : 0,
                keluar: tx.type === "OUT" ? tx.qty : 0,
            };
        });

    const getAllLocationRow = (item) => {
        const perLoc = locations.map(loc => getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, String(loc.id)).terkini);
        const total = perLoc.reduce((sum, n) => sum + n, 0);
        return { perLoc, total };
    };

    const reportTotalRows = reportMode === "detail" ? reportDetailRows.length : filteredItems.length;
    const reportTotalPages = Math.max(1, Math.ceil(reportTotalRows / reportPageSize));
    const normalizedReportPage = Math.min(reportPage, reportTotalPages);
    const startIdx = (normalizedReportPage - 1) * reportPageSize;
    const endIdx = startIdx + reportPageSize;
    const paginatedSummaryItems = filteredItems.slice(startIdx, endIdx);
    const paginatedDetailRows = reportDetailRows.slice(startIdx, endIdx);
    const paginatedAllItems = filteredItems.slice(startIdx, endIdx);

    useEffect(() => {
        setReportPage(1);
    }, [reportMode, reportQuery, reportStartDate, reportEndDate, reportLocationId, reportPageSize]);

    const exportReportExcel = () => {
        let rows = [];
        let sheetName = "Ringkasan";

        if (reportMode === "summary") {
            rows = filteredItems.map(item => {
                const stock = getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, reportLocationId);
                return {
                    Barang: item.nama,
                    Kode: item.kode,
                    Awal: stock.awal,
                    Masuk: stock.masuk,
                    Keluar: stock.keluar,
                    Akhir: stock.terkini,
                };
            });
            sheetName = "Ringkasan";
        } else if (reportMode === "detail") {
            rows = reportDetailRows.map(r => ({
                Tanggal: r.date,
                Barang: r.itemNama,
                Kode: r.itemKode,
                Gudang: r.locationNama,
                Masuk: r.masuk,
                Keluar: r.keluar,
                Keterangan: r.note || "",
            }));
            sheetName = "Detail";
        } else {
            rows = filteredItems.map(item => {
                const data = getAllLocationRow(item);
                const row = { Barang: item.nama, Kode: item.kode };
                locations.forEach((loc, idx) => {
                    row[loc.nama] = data.perLoc[idx];
                });
                row.Total = data.total;
                return row;
            });
            sheetName = "All Lokasi";
        }

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `Monitoring_${sheetName}_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    const exportReportPdf = () => {
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const titleMap = {
            summary: "Laporan Ringkasan Stok",
            detail: "Laporan Detail Transaksi",
            all: "Laporan All Lokasi",
        };

        doc.setFontSize(14);
        doc.text(titleMap[reportMode], 40, 40);
        doc.setFontSize(9);
        doc.text(`Tanggal export: ${new Date().toLocaleString()}`, 40, 56);

        let head = [];
        let body = [];

        if (reportMode === "summary") {
            head = [["Barang", "Kode", "Awal", "Masuk", "Keluar", "Akhir"]];
            body = filteredItems.map(item => {
                const stock = getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, reportLocationId);
                return [item.nama, item.kode, stock.awal, stock.masuk, stock.keluar, stock.terkini];
            });
        } else if (reportMode === "detail") {
            head = [["Tanggal", "Kode", "Barang", "Lokasi Penyimpanan", "Masuk", "Keluar", "Keterangan"]];
            body = reportDetailRows.map(r => [r.date, r.itemKode, r.itemNama, r.locationNama, r.masuk, r.keluar, r.note || "-"]);
        } else {
            head = [["Barang", "Kode", ...locations.map(l => l.nama), "Total"]];
            body = filteredItems.map(item => {
                const data = getAllLocationRow(item);
                return [item.nama, item.kode, ...data.perLoc, data.total];
            });
        }

        autoTable(doc, {
            startY: 70,
            head,
            body,
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [0, 0, 0] },
        });

        doc.save(`Monitoring_${reportMode}_${new Date().toISOString().split("T")[0]}.pdf`);
    };

    // ============================================================================
    // HANDLERS
    // ============================================================================
    const handleInputChange = (itemId, field, value) => {
        setInputs(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: value }
        }));
    };

    const handleSaveMutasi = async () => {
        let finalLocId = null;
        if (!locationInput.trim()) {
            showMessage('PILIH LOKASI GUDANG TERLEBIH DAHULU!', 'error');
            return;
        }

        const existingLoc = locations.find(l => l.nama.toLowerCase() === locationInput.trim().toLowerCase());
        if (existingLoc) {
            finalLocId = existingLoc.id;
        } else {
            try {
                const mod = await import('@/lib/actions/monitoringActions');
                const res = await mod.createLocation(locationInput.trim());
                if (res && res.success) {
                    finalLocId = res.data.id;
                    setLocations(prev => [...prev, res.data].sort((a, b) => a.nama.localeCompare(b.nama)));
                } else {
                    showMessage(res?.error || 'Gagal membuat lokasi', 'error');
                    return;
                }
            } catch (err) {
                console.error(err);
                showMessage('Gagal membuat lokasi', 'error');
                return;
            }
        }

        const newTransactions = [];
        let hasError = false;

        Object.keys(inputs).forEach(itemIdStr => {
            if (hasError) return;
            const itemId = parseInt(itemIdStr);
            const data = inputs[itemId];
            const stockInfo = getStockData(itemId, null, null, finalLocId);

            const qtyMasuk = parseInt(data.masuk) || 0;
            const qtyKeluar = parseInt(data.keluar) || 0;
            const note = data.note || "";

            if (qtyKeluar > stockInfo.terkini + qtyMasuk) {
                showMessage(`GAGAL: PENGELUARAN UNTUK ITEM MELEBIHI STOK DI LOKASI INI!`, "error");
                hasError = true;
                return;
            }

            if (qtyMasuk > 0) {
                newTransactions.push({ id: Date.now() + Math.random(), itemId, type: "IN", qty: qtyMasuk, date: tanggalInput, note, locationId: finalLocId });
            }
            if (qtyKeluar > 0) {
                newTransactions.push({ id: Date.now() + Math.random(), itemId, type: "OUT", qty: qtyKeluar, date: tanggalInput, note, locationId: finalLocId });
            }
        });

        if (hasError) return;

        if (newTransactions.length > 0) {
            import('@/lib/actions/monitoringActions').then(mod => mod.saveMutasi(newTransactions)).then(res => {
                if (res && res.success) {
                    import('@/lib/actions/monitoringActions').then(m => m.getTransactions()).then(tr => {
                        if (tr && tr.success) setTransactions(tr.data.map(tx => ({ id: tx.id, itemId: tx.itemId, type: tx.tipe, qty: tx.qty, date: (new Date(tx.tanggal)).toISOString().split('T')[0], note: tx.catatan, locationId: tx.locationId })));
                    }).catch(() => { });
                    setInputs({});
                    showMessage('BERHASIL MENYIMPAN DATA MUTASI!', 'success');
                } else {
                    showMessage(res?.error || 'Gagal menyimpan mutasi', 'error');
                }
            }).catch(err => { console.error(err); showMessage('Gagal menyimpan mutasi', 'error'); });
        } else {
            showMessage('KOSONG: ISI MINIMAL SATU KOLOM (+/-)', 'error');
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            const mod = await import("@/lib/actions/monitoringActions");
            const teamIds = Array.isArray(newCategoryTeams) && newCategoryTeams.length > 0 && !newCategoryTeams.includes('ALL') ? newCategoryTeams.map(id => Number(id)) : [];
            const res = await mod.addCategory(newCategoryName.trim(), teamIds);
            if (res && res.success) {
                setCategories(res.data || []);
                setNewCategoryName("");
                setNewCategoryTeams([]);
                if (!selectedCategory && res.data && res.data.length > 0) setSelectedCategory(res.data[0].id);
                showMessage('KATEGORI BARU DITAMBAHKAN', 'success');
            } else {
                showMessage(res?.error || 'Gagal menambah kategori', 'error');
            }
        } catch (err) {
            console.error(err);
            showMessage('Gagal menambah kategori', 'error');
        }
    };

    const handleDeleteCategory = async (id) => {
        showConfirm({
            title: 'Hapus Kategori',
            message: 'PERHATIAN: Menghapus kategori ini akan menghapus SEMUA barang dan transaksi di dalamnya. Lanjutkan?',
            confirmText: 'Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const mod = await import('@/lib/actions/monitoringActions');
                    const res = await mod.deleteCategory(id);
                    if (res && res.success) {
                        setCategories(prev => prev.filter(c => c.id !== id));
                        if (selectedCategory === id) setSelectedCategory("");
                        setItems(prev => prev.filter(i => i.categoryId !== id));
                        showMessage('KATEGORI DIHAPUS', 'info');
                    } else showMessage(res?.error || 'Gagal menghapus kategori', 'error');
                } catch (err) { console.error(err); showMessage('Gagal menghapus kategori', 'error'); }
                hideConfirm();
            },
            onCancel: () => hideConfirm()
        });
    };

    const handleStartEditCategory = (c) => {
        setEditingCategoryId(c.id);
        setEditCategoryName(c.name);
        setEditCategoryTeams(Array.isArray(c.teams) && c.teams.length > 0 ? c.teams.map(t => String(t.id)) : ["ALL"]);
    };

    const handleSaveEditCategory = async (id) => {
        if (!editCategoryName.trim()) return;
        showConfirm({
            title: 'Simpan Perubahan Kategori',
            message: 'Simpan perubahan pada kategori ini?',
            confirmText: 'Simpan',
            type: 'primary',
            onConfirm: async () => {
                try {
                    const mod = await import('@/lib/actions/monitoringActions');
                    const teamIds = editCategoryTeams.includes('ALL') ? [] : editCategoryTeams.map(Number);
                    const res = await mod.updateCategory(id, editCategoryName.trim(), teamIds);
                    if (res && res.success) {
                        setCategories(res.data || []);
                        setEditingCategoryId(null);
                        setEditCategoryName("");
                        setEditCategoryTeams([]);
                        showMessage('KATEGORI BERHASIL DIUBAH', 'success');
                    } else showMessage(res?.error || 'Gagal merubah kategori', 'error');
                } catch (err) { console.error(err); showMessage('Gagal merubah kategori', 'error'); }
                hideConfirm();
            },
            onCancel: () => hideConfirm()
        });
    };

    const handleCancelEditCategory = () => {
        setEditingCategoryId(null);
        setEditCategoryName("");
        setEditCategoryTeams([]);
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!selectedCategory) { showMessage('PILIH KATEGORI TERLEBIH DAHULU!', 'error'); return; }
        const { kode, nama, stokAwal, locationId } = newItemData;
        if (!kode.trim() || !nama.trim()) return;
        try {
            const mod = await import('@/lib/actions/monitoringActions');
            const res = await mod.addItem({ categoryId: selectedCategory, kode: kode.trim(), nama: nama.trim(), stokAwal: Number(stokAwal || 0), locationId: locationId });
            if (res && res.success) {
                setItems(prev => [res.data, ...prev]);
                setNewItemData({ kode: '', nama: '', stokAwal: '', locationId: '' });
                // reload txs just in case stokAwal created a transaction
                const tr = await mod.getTransactions();
                if (tr && tr.success) setTransactions(tr.data.map(tx => ({ id: tx.id, itemId: tx.itemId, type: tx.tipe, qty: tx.qty, date: (new Date(tx.tanggal)).toISOString().split('T')[0], note: tx.catatan, locationId: tx.locationId })));
                showMessage('ITEM BARU BERHASIL DISIMPAN', 'success');
            } else showMessage(res?.error || 'Gagal menambah item', 'error');
        } catch (err) { console.error(err); showMessage('Gagal menambah item', 'error'); }
    };

    const handleDeleteItem = (id) => {
        showConfirm({
            title: 'Hapus Item',
            message: 'Anda yakin ingin menghapus item ini? Semua transaksi terkait juga akan dihapus.',
            confirmText: 'Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const mod = await import('@/lib/actions/monitoringActions');
                    const res = await mod.deleteItem(id);
                    if (res && res.success) {
                        setItems(prev => prev.filter(i => i.id !== id));
                        setTransactions(prev => prev.filter(t => t.itemId !== id));
                        showMessage('ITEM DIHAPUS', 'info');
                    } else showMessage(res?.error || 'Gagal menghapus item', 'error');
                } catch (err) { console.error(err); showMessage('Gagal menghapus item', 'error'); }
                hideConfirm();
            },
            onCancel: () => hideConfirm()
        });
    };

    const handleDeleteLocation = (id, nama) => {
        showConfirm({
            title: 'Hapus Lokasi',
            message: `Hapus lokasi gudang "${nama}"?`,
            confirmText: 'Hapus',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const mod = await import('@/lib/actions/monitoringActions');
                    const res = await mod.deleteLocation(id);
                    if (res && res.success) {
                        setLocations(prev => prev.filter(l => l.id !== id));
                        if (String(reportLocationId) === String(id)) setReportLocationId("ALL");
                        if (String(newItemData.locationId) === String(id)) {
                            setNewItemData(prev => ({ ...prev, locationId: "" }));
                        }
                        if (locationInput && locationInput.toLowerCase() === String(nama).toLowerCase()) {
                            setLocationInput("");
                        }
                        showMessage('LOKASI BERHASIL DIHAPUS', 'success');
                    } else {
                        showMessage(res?.error || 'Gagal menghapus lokasi', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showMessage('Gagal menghapus lokasi', 'error');
                }
                hideConfirm();
            },
            onCancel: () => hideConfirm()
        });
    };

    const handleStartEdit = (item) => {
        setEditingItemId(item.id);
        setEditItemData({ kode: item.kode, nama: item.nama, stokAwal: String(item.stokAwal) });
    };

    const handleEditChange = (field, value) => {
        setEditItemData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveEdit = (id) => {
        showConfirm({
            title: 'Simpan Perubahan Item',
            message: 'Simpan perubahan pada item ini?',
            confirmText: 'Simpan',
            type: 'primary',
            onConfirm: async () => {
                try {
                    const mod = await import('@/lib/actions/monitoringActions');
                    const res = await mod.updateItem(id, { kode: editItemData.kode.trim(), nama: editItemData.nama.trim(), stokAwal: Number(editItemData.stokAwal || 0) });
                    if (res && res.success) {
                        setItems(prev => prev.map(it => it.id === id ? res.data : it));
                        setEditingItemId(null);
                        setEditItemData({ kode: '', nama: '', stokAwal: '' });
                        showMessage('PERUBAHAN ITEM TERSIMPAN', 'success');
                    } else showMessage(res?.error || 'Gagal menyimpan perubahan', 'error');
                } catch (err) { console.error(err); showMessage('Gagal menyimpan perubahan', 'error'); }
                hideConfirm();
            },
            onCancel: () => hideConfirm()
        });
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditItemData({ kode: "", nama: "", stokAwal: "" });
    };

    // ============================================================================
    // RENDER UI NEU-BRUTALISM
    // ============================================================================
    return (
        <div className="w-full font-sans text-black selection:bg-yellow-300">

            {/* Toast Notification */}
            {message.text && (
                <div className={`fixed top-6 right-6 px-6 py-4 border-[4px] border-black shadow-[6px_6px_0px_0px_#000] flex items-center gap-4 z-50 animate-in slide-in-from-top-4 font-black uppercase tracking-widest text-sm ${message.type === 'error' ? 'bg-red-400 text-black' :
                    message.type === 'success' ? 'bg-green-400 text-black' :
                        'bg-yellow-400 text-black'
                    }`}>
                    {message.type === 'error' ? <AlertTriangle size={20} /> : <CheckSquare size={20} />}
                    <span>{message.text}</span>
                    <button onClick={() => setMessage({ text: "", type: "info" })} className="hover:scale-110 transition-transform">
                        <X size={20} />
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <header className="border-[4px] border-black bg-zinc-100 shadow-[8px_8px_0px_0px_#000] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        {/* <div className="inline-block bg-yellow-400 border-[3px] border-black px-3 py-1 mb-3">
                            <span className="font-black uppercase tracking-widest text-[10px]">Sistem Pencatatan</span>
                        </div> */}
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                            Monitoring<br /> Stock
                        </h1>
                    </div>
                </header>

                {/* NAVIGATION TABS */}
                <nav className="flex flex-wrap gap-4">
                    {[
                        { id: "input", label: "Pencatatan Harian", icon: <ArrowDownUp size={20} /> },
                        { id: "report", label: "Laporan & Rekap", icon: <FileBarChart size={20} /> },
                        { id: "master", label: "Kelola Master Data", icon: <Settings size={20} />, restricted: true }
                    ].map(tab => {
                        const disabled = tab.restricted && userRole !== "ADMIN";
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { if (!disabled) setActiveTab(tab.id); }}
                                disabled={disabled}
                                className={`flex items-center gap-2 px-6 py-4 font-black text-sm uppercase tracking-widest border-[4px] border-black transition-all ${activeTab === tab.id
                                    ? "bg-black text-white translate-x-[4px] translate-y-[4px] shadow-none"
                                    : disabled ? "bg-white text-zinc-400 shadow-none opacity-50 cursor-not-allowed" : "bg-white text-black shadow-[6px_6px_0px_0px_#000] hover:bg-yellow-400"
                                    }`}
                                title={disabled ? "Akses terbatas: Admin saja" : tab.label}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* MAIN CONTENT AREA */}
                <main className="border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_#000]">

                    {/* ========================================================================= */}
                    {/* TAB 1: PENCATATAN HARIAN */}
                    {/* ========================================================================= */}
                    {activeTab === "input" && (
                        <div className="animate-in fade-in">
                            {/* FILTER BAR */}
                            <div className="bg-zinc-100 p-6 border-b-[4px] border-black flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <label className="block text-[12px] font-black uppercase tracking-widest mb-2">Pilih Kategori Form</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => { setSelectedCategory(parseInt(e.target.value)); setInputs({}); }}
                                        className="w-full bg-white border-[4px] border-black px-4 py-3 font-black text-sm outline-none shadow-[4px_4px_0px_0px_#000] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer"
                                    >
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        {categories.length === 0 && <option value="">-- KOSONG --</option>}
                                    </select>
                                </div>
                                <div className="w-full md:w-64">
                                    <label className="block text-[12px] font-black uppercase tracking-widest mb-2">Lokasi Penyimpanan</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            list="gudang-list"
                                            placeholder="Ketik atau pilih gudang..."
                                            value={locationInput}
                                            onChange={(e) => setLocationInput(e.target.value)}
                                            className="w-full bg-white border-[4px] border-black px-4 py-3 font-black text-sm outline-none shadow-[4px_4px_0px_0px_#000] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_#000] transition-all"
                                        />
                                        <datalist id="gudang-list">
                                            {locations.map(l => <option key={l.id} value={l.nama} />)}
                                        </datalist>
                                    </div>
                                </div>
                                <div className="w-full md:w-64">
                                    <label className="block text-[12px] font-black uppercase tracking-widest mb-2">Tanggal Mutasi</label>
                                    <input
                                        type="date"
                                        value={tanggalInput}
                                        onChange={(e) => setTanggalInput(e.target.value)}
                                        className="w-full bg-white border-[4px] border-black px-4 py-3 font-black text-sm outline-none shadow-[4px_4px_0px_0px_#000] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* WARNING BANNER */}
                            {showTips && (
                                <div className="bg-yellow-400 border-b-[4px] border-black p-4 flex items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <AlertTriangle size={24} className="flex-shrink-0" />
                                        <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider leading-tight">
                                            TIPS: Kosongkan sel Qty jika tidak ada pergerakan. Tekan [TAB] di keyboard untuk berpindah sel dengan cepat!
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowTips(false)}
                                        className="border-[3px] border-black bg-white hover:bg-zinc-200 transition-colors p-1 shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex-shrink-0"
                                        title="Tutup Tips"
                                    >
                                        <X size={16} className="text-black" />
                                    </button>
                                </div>
                            )}

                            {/* DATA GRID */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-zinc-200 border-b-[4px] border-black">
                                            <th className="p-4 border-r-[4px] border-black font-black text-xs uppercase tracking-widest w-1/3">Detail Barang</th>
                                            <th className="p-4 border-r-[4px] border-black font-black text-xs uppercase tracking-widest text-center w-28">Stok Saat Ini</th>
                                            <th className="p-4 border-r-[4px] border-black font-black text-xs uppercase tracking-widest text-center bg-green-300 w-32">Masuk (+)</th>
                                            <th className="p-4 border-r-[4px] border-black font-black text-xs uppercase tracking-widest text-center bg-red-300 w-32">Keluar (-)</th>
                                            <th className="p-4 font-black text-xs uppercase tracking-widest">Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentCategoryItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center font-black uppercase tracking-widest text-zinc-500">
                                                    TIDAK ADA ITEM DI KATEGORI INI
                                                </td>
                                            </tr>
                                        ) : (
                                            currentCategoryItems.map(item => {
                                                const stock = getStockData(item.id);
                                                const inputData = inputs[item.id] || { masuk: '', keluar: '', note: '' };
                                                const isOverdraft = (parseInt(inputData.keluar) || 0) > (stock.terkini + (parseInt(inputData.masuk) || 0));

                                                return (
                                                    <tr key={item.id} className="border-b-[4px] border-black hover:bg-zinc-100">
                                                        <td className="p-4 border-r-[4px] border-black">
                                                            <p className="font-black text-sm uppercase">{item.nama}</p>
                                                            <p className="text-[11px] font-black text-zinc-500 mt-1">{item.kode}</p>
                                                        </td>
                                                        <td className="p-4 border-r-[4px] border-black text-center bg-zinc-100">
                                                            <span className={`text-xl font-black ${stock.terkini === 0 ? 'text-red-500' : 'text-black'}`}>
                                                                {stock.terkini}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 border-r-[4px] border-black bg-green-100/50">
                                                            <input
                                                                type="number" min="0" placeholder="0"
                                                                value={inputData.masuk ?? ''}
                                                                onChange={(e) => handleInputChange(item.id, 'masuk', e.target.value)}
                                                                className="w-full bg-white border-[3px] border-black px-3 py-2 text-center font-black text-green-700 outline-none focus:bg-green-200 transition-colors"
                                                            />
                                                        </td>
                                                        <td className={`p-3 border-r-[4px] border-black ${isOverdraft ? 'bg-red-400' : 'bg-red-100/50'}`}>
                                                            <input
                                                                type="number" min="0" placeholder="0"
                                                                value={inputData.keluar ?? ''}
                                                                onChange={(e) => handleInputChange(item.id, 'keluar', e.target.value)}
                                                                className="w-full bg-white border-[3px] border-black px-3 py-2 text-center font-black text-red-700 outline-none focus:bg-red-200 transition-colors"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="text" placeholder="Catatan Mutasi..."
                                                                value={inputData.note ?? ''}
                                                                onChange={(e) => handleInputChange(item.id, 'note', e.target.value)}
                                                                className="w-full bg-white border-[3px] border-black px-4 py-2 font-bold outline-none focus:bg-yellow-200 transition-colors"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ACTION FOOTER */}
                            <div className="p-6 bg-zinc-100 flex justify-end">
                                <button
                                    onClick={handleSaveMutasi}
                                    className="bg-green-400 text-black border-[4px] border-black px-8 py-4 font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all flex items-center gap-3"
                                >
                                    <Save size={20} /> Simpan Data Transaksi
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: LAPORAN STOK */}
                    {/* ========================================================================= */}
                    {activeTab === "report" && (
                        <div className="p-6 md:p-8 animate-in fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight bg-yellow-400 inline-block px-3 py-1 border-[3px] border-black">
                                        Kartu Stok Keseluruhan
                                    </h2>
                                    <p className="text-xs text-zinc-600 mt-1">Tampilkan ringkasan stok. Gunakan pencarian dan rentang tanggal untuk menyaring data.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setReportMode("summary")} className={`px-3 py-2 border-[3px] border-black text-xs font-black uppercase ${reportMode === "summary" ? "bg-black text-white" : "bg-white"}`}>Ringkasan</button>
                                    <button onClick={() => setReportMode("detail")} className={`px-3 py-2 border-[3px] border-black text-xs font-black uppercase ${reportMode === "detail" ? "bg-black text-white" : "bg-white"}`}>Detail Transaksi</button>
                                    <button onClick={() => setReportMode("all")} className={`px-3 py-2 border-[3px] border-black text-xs font-black uppercase ${reportMode === "all" ? "bg-black text-white" : "bg-white"}`}>Laporan All Lokasi</button>
                                </div>
                                <div className="flex flex-col xl:flex-row flex-wrap items-start xl:items-center gap-3 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 bg-white border-[4px] border-black px-3 py-2 shadow-[4px_4px_0px_0px_#000] w-full sm:w-auto">
                                        <Search size={20} className="flex-shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="CARI BARANG..."
                                            value={reportQuery}
                                            onChange={(e) => setReportQuery(e.target.value)}
                                            className="bg-transparent outline-none font-black text-sm uppercase placeholder-zinc-400 w-full"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 bg-white border-[4px] border-black px-3 py-2 shadow-[4px_4px_0px_0px_#000] w-full sm:w-auto">
                                        <select
                                            value={reportLocationId}
                                            onChange={(e) => setReportLocationId(e.target.value)}
                                            className="bg-transparent outline-none font-black text-sm uppercase cursor-pointer w-full"
                                        >
                                            <option value="ALL">SEMUA PENYIMPANAN</option>
                                            {locations.map(l => <option key={l.id} value={l.id}>{l.nama}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white border-[4px] border-black px-3 py-2 shadow-[4px_4px_0px_0px_#000] w-full xl:w-auto">
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <label className="text-[10px] font-black uppercase">Dari</label>
                                            <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="border-none outline-none text-sm font-bold w-full sm:w-auto" />
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <label className="text-[10px] font-black uppercase">Sampai</label>
                                            <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="border-none outline-none text-sm font-bold w-full sm:w-auto" />
                                        </div>
                                        <button onClick={() => { setReportStartDate(""); setReportEndDate(""); setReportQuery(""); }} className="sm:ml-2 text-xs font-black bg-zinc-200 px-2 py-1 w-full sm:w-auto mt-2 sm:mt-0">Reset</button>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white border-[4px] border-black px-3 py-2 shadow-[4px_4px_0px_0px_#000]">
                                        <button onClick={exportReportExcel} className="text-xs font-black uppercase bg-green-300 border-[2px] border-black px-2 py-1 hover:bg-green-400">Excel</button>
                                        <button onClick={exportReportPdf} className="text-xs font-black uppercase bg-red-300 border-[2px] border-black px-2 py-1 hover:bg-red-400">PDF</button>
                                    </div>
                                </div>
                            </div>

                            {reportMode === "summary" && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px] border-[4px] border-black">
                                        <thead>
                                            <tr className="bg-black text-white">
                                                <th className="p-4 border-r-[4px] border-black font-black text-xs uppercase tracking-widest">Detail Barang</th>
                                                <th className="p-4 border-r-[4px] border-black font-black text-xs uppercase tracking-widest text-center">Awal</th>
                                                <th className="p-4 border-r-[4px] border-black font-black text-xs uppercase tracking-widest text-center text-green-400">In (+)</th>
                                                <th className="p-4 border-r-[4px] border-black font-black text-xs uppercase tracking-widest text-center text-red-400">Out (-)</th>
                                                <th className="p-4 font-black text-sm uppercase tracking-widest text-center text-yellow-400">Akhir</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedSummaryItems.map(item => {
                                                const stock = getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, reportLocationId);
                                                return (
                                                    <tr key={item.id} className="border-b-[4px] border-black hover:bg-zinc-100">
                                                        <td className="p-4 border-r-[4px] border-black">
                                                            <span className="font-black uppercase text-sm block">{item.nama}</span>
                                                            <span className="text-[10px] font-black text-zinc-500">{item.kode}</span>
                                                        </td>
                                                        <td className="p-4 border-r-[4px] border-black text-center font-black text-zinc-500">{stock.awal}</td>
                                                        <td className="p-4 border-r-[4px] border-black text-center font-black text-green-600 bg-green-50">{stock.masuk}</td>
                                                        <td className="p-4 border-r-[4px] border-black text-center font-black text-red-600 bg-red-50">{stock.keluar}</td>
                                                        <td className="p-4 text-center font-black text-xl bg-yellow-100">{stock.terkini}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {reportMode === "detail" && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[980px] border-[4px] border-black">
                                        <thead>
                                            <tr className="bg-black text-white">
                                                <th className="p-3 border-r-[4px] border-black font-black text-xs uppercase">Tanggal</th>
                                                <th className="p-3 border-r-[4px] border-black font-black text-xs uppercase">Barang</th>
                                                <th className="p-3 border-r-[4px] border-black font-black text-xs uppercase">Gudang</th>
                                                <th className="p-3 border-r-[4px] border-black font-black text-xs uppercase text-center">Masuk</th>
                                                <th className="p-3 border-r-[4px] border-black font-black text-xs uppercase text-center">Keluar</th>
                                                <th className="p-3 font-black text-xs uppercase">Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportDetailRows.length === 0 ? (
                                                <tr><td colSpan={6} className="p-6 text-center font-black uppercase text-zinc-500">Tidak ada data transaksi pada filter ini</td></tr>
                                            ) : paginatedDetailRows.map(r => (
                                                <tr key={r.id} className="border-b-[4px] border-black hover:bg-zinc-100">
                                                    <td className="p-3 border-r-[4px] border-black font-black text-xs">{r.date}</td>
                                                    <td className="p-3 border-r-[4px] border-black">
                                                        <div className="font-black text-sm uppercase">{r.itemNama}</div>
                                                        <div className="text-[10px] font-black text-zinc-500">{r.itemKode}</div>
                                                    </td>
                                                    <td className="p-3 border-r-[4px] border-black font-black text-sm uppercase">{r.locationNama}</td>
                                                    <td className="p-3 border-r-[4px] border-black text-center font-black text-green-700 bg-green-50">{r.masuk > 0 ? r.masuk : '-'}</td>
                                                    <td className="p-3 border-r-[4px] border-black text-center font-black text-red-700 bg-red-50">{r.keluar > 0 ? r.keluar : '-'}</td>
                                                    <td className="p-3 font-bold text-sm">{r.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {reportMode === "all" && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[980px] border-[4px] border-black">
                                        <thead>
                                            <tr className="bg-black text-white">
                                                <th className="p-3 border-r-[4px] border-black font-black text-xs uppercase">Barang</th>
                                                {locations.map(loc => (
                                                    <th key={loc.id} className="p-3 border-r-[4px] border-black font-black text-xs uppercase text-center">{loc.nama}</th>
                                                ))}
                                                <th className="p-3 font-black text-xs uppercase text-center text-yellow-400">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredItems.length === 0 ? (
                                                <tr><td colSpan={locations.length + 2} className="p-6 text-center font-black uppercase text-zinc-500">Tidak ada data barang</td></tr>
                                            ) : paginatedAllItems.map(item => {
                                                const perLoc = locations.map(loc => getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, String(loc.id)).terkini);
                                                const total = perLoc.reduce((sum, n) => sum + n, 0);
                                                return (
                                                    <tr key={item.id} className="border-b-[4px] border-black hover:bg-zinc-100">
                                                        <td className="p-3 border-r-[4px] border-black">
                                                            <div className="font-black text-sm uppercase">{item.nama}</div>
                                                            <div className="text-[10px] font-black text-zinc-500">{item.kode}</div>
                                                        </td>
                                                        {perLoc.map((val, idx) => (
                                                            <td key={`${item.id}-${locations[idx]?.id}`} className="p-3 border-r-[4px] border-black text-center font-black">{val}</td>
                                                        ))}
                                                        <td className="p-3 text-center font-black text-lg bg-yellow-100">{total}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {filteredItems.length > 0 && (
                                            <tfoot>
                                                <tr className="bg-zinc-200 border-t-[4px] border-black">
                                                    <td className="p-3 border-r-[4px] border-black font-black uppercase text-xs">Total Semua Barang</td>
                                                    {locations.map(loc => {
                                                        const colTotal = filteredItems.reduce((sum, item) => sum + getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, String(loc.id)).terkini, 0);
                                                        return <td key={`tot-${loc.id}`} className="p-3 border-r-[4px] border-black text-center font-black">{colTotal}</td>;
                                                    })}
                                                    <td className="p-3 text-center font-black text-lg bg-yellow-300">
                                                        {filteredItems.reduce((sum, item) => {
                                                            const perLocTotal = locations.reduce((acc, loc) => acc + getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, String(loc.id)).terkini, 0);
                                                            return sum + perLocTotal;
                                                        }, 0)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            )}

                            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="text-xs font-black uppercase text-zinc-600">
                                    Menampilkan {reportTotalRows === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, reportTotalRows)} dari {reportTotalRows} data
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-black uppercase">Per Halaman</label>
                                    <select value={reportPageSize} onChange={(e) => setReportPageSize(Number(e.target.value))} className="border-[3px] border-black px-2 py-1 font-black text-xs">
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                    <button onClick={() => setReportPage(p => Math.max(1, p - 1))} disabled={normalizedReportPage <= 1} className="border-[3px] border-black px-2 py-1 text-xs font-black disabled:opacity-40">Prev</button>
                                    <span className="text-xs font-black min-w-[68px] text-center">{normalizedReportPage} / {reportTotalPages}</span>
                                    <button onClick={() => setReportPage(p => Math.min(reportTotalPages, p + 1))} disabled={normalizedReportPage >= reportTotalPages} className="border-[3px] border-black px-2 py-1 text-xs font-black disabled:opacity-40">Next</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 3: KELOLA MASTER DATA (KATEGORI & ITEM) */}
                    {/* ========================================================================= */}
                    {activeTab === "master" && (
                        <div className="p-6 md:p-8 animate-in fade-in grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* SIDEBAR: DAFTAR KATEGORI */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-zinc-100 border-[4px] border-black p-5 shadow-[4px_4px_0px_0px_#000]">
                                    <h3 className="font-black uppercase tracking-widest mb-4 border-b-[4px] border-black pb-2">Buat Kategori</h3>
                                    <form onSubmit={handleAddCategory} className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text" required placeholder="Nama Kategori..."
                                                value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                                                className="w-full border-[3px] border-black px-3 py-2 font-bold outline-none focus:bg-yellow-200"
                                            />
                                            <button type="submit" className="bg-black text-white px-4 border-[3px] border-black hover:bg-zinc-800 transition-colors">
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                        {userRole === "ADMIN" && (
                                            <div className="mt-2">
                                                <label className="block text-[10px] font-black uppercase mb-1">Berikan untuk tim (multi)</label>
                                                <select multiple value={newCategoryTeams.map(String)} onChange={(e) => {
                                                    const opts = Array.from(e.target.selectedOptions).map(o => o.value === "ALL" ? "ALL" : parseInt(o.value));
                                                    setNewCategoryTeams(opts);
                                                }} className="w-full border-[3px] border-black px-3 py-2 font-bold outline-none h-32">
                                                    <option value="ALL">Semua (Publik)</option>
                                                    {teams.map(t => (
                                                        <option key={t.id} value={t.id}>{t.nama}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-zinc-600 mt-1">Tahan Ctrl/Cmd untuk memilih lebih dari satu tim.</p>
                                            </div>
                                        )}
                                    </form>
                                </div>

                                {userRole === "ADMIN" && (
                                    <div className="border-[4px] border-black shadow-[4px_4px_0px_0px_#000] bg-white">
                                        <div className="bg-black text-white p-3 border-b-[4px] border-black">
                                            <h3 className="font-black uppercase tracking-widest text-xs">Kelola Lokasi Gudang</h3>
                                        </div>
                                        <ul className="divide-y-[3px] divide-black">
                                            {locations.length === 0 ? (
                                                <li className="p-4 text-xs font-black uppercase text-zinc-500">Belum ada lokasi</li>
                                            ) : locations.map(loc => (
                                                <li key={loc.id} className="p-3 flex items-center justify-between gap-3">
                                                    <span className="font-black uppercase text-sm">{loc.nama}</span>
                                                    <button
                                                        onClick={() => handleDeleteLocation(loc.id, loc.nama)}
                                                        title="Hapus lokasi"
                                                        className="bg-red-400 p-2 border-[3px] border-black hover:bg-red-500 shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                                                    >
                                                        <Trash2 size={14} className="text-black" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="p-3 text-[10px] font-bold text-zinc-600 border-t-[3px] border-black">
                                            Catatan: Lokasi yang sudah dipakai transaksi tidak bisa dihapus.
                                        </p>
                                    </div>
                                )}

                                <div className="border-[4px] border-black shadow-[4px_4px_0px_0px_#000]">
                                    <div className="bg-black text-white p-3 border-b-[4px] border-black">
                                        <h3 className="font-black uppercase tracking-widest text-xs">Daftar Kategori</h3>
                                    </div>
                                    <ul className="divide-y-[4px] divide-black bg-white">
                                        {categories.map(c => (
                                            <li key={c.id}>
                                                {editingCategoryId === c.id ? (
                                                    <div className="p-4 border-b-[4px] border-black bg-yellow-100 flex flex-col gap-2">
                                                        <input
                                                            type="text"
                                                            value={editCategoryName}
                                                            onChange={(e) => setEditCategoryName(e.target.value)}
                                                            className="w-full border-[3px] border-black px-2 py-1 font-bold outline-none text-sm"
                                                        />
                                                        {userRole === "ADMIN" && (
                                                            <select multiple value={editCategoryTeams} onChange={(e) => {
                                                                const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                                                                setEditCategoryTeams(opts);
                                                            }} className="w-full border-[3px] border-black px-2 py-1 font-bold outline-none h-24 text-xs normal-case">
                                                                <option value="ALL">Semua (Publik)</option>
                                                                {teams.map(t => <option key={t.id} value={String(t.id)}>{t.nama}</option>)}
                                                            </select>
                                                        )}
                                                        <div className="flex gap-2 mt-2">
                                                            <button onClick={() => handleSaveEditCategory(c.id)} className="bg-green-400 text-black px-3 py-1 border-[3px] border-black font-black text-xs uppercase hover:bg-green-500">Simpan</button>
                                                            <button onClick={handleCancelEditCategory} className="bg-white text-black px-3 py-1 border-[3px] border-black font-black text-xs uppercase hover:bg-zinc-200">Batal</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`w-full flex items-center justify-between transition-colors ${selectedCategory === c.id ? 'bg-yellow-400' : 'hover:bg-zinc-100'}`}>
                                                        <button
                                                            onClick={() => setSelectedCategory(c.id)}
                                                            className="flex-1 text-left p-4 font-black uppercase"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span>{c.name}</span>
                                                                <small className="text-[10px] font-bold normal-case text-zinc-700 mt-1">
                                                                    {Array.isArray(c.teams) ? (c.teams.length === 0 ? 'Publik' : `Untuk: ${c.teams.map(t => t.nama).join(', ')}`) : 'Publik'}
                                                                </small>
                                                            </div>
                                                        </button>
                                                        {userRole === "ADMIN" && (
                                                            <div className="flex items-center gap-2 pr-4">
                                                                <button onClick={() => handleStartEditCategory(c)} title="Edit Kategori" className="p-2 border-[3px] border-black bg-yellow-300 hover:bg-yellow-400 shadow-[2px_2px_0px_0px_#000]">
                                                                    <Pencil size={14} className="text-black" />
                                                                </button>
                                                                <button onClick={() => handleDeleteCategory(c.id)} title="Hapus Kategori" className="p-2 border-[3px] border-black bg-red-400 hover:bg-red-500 shadow-[2px_2px_0px_0px_#000]">
                                                                    <Trash2 size={14} className="text-black" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* MAIN: KELOLA ITEM */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-yellow-400 border-[4px] border-black p-5 shadow-[6px_6px_0px_0px_#000]">
                                    <h3 className="font-black uppercase tracking-widest mb-4 border-b-[4px] border-black pb-2 flex items-center justify-between">
                                        <span>Tambah Produk Baru</span>
                                        <span className="text-xs bg-black text-white px-2 py-1">
                                            {categories.find(c => c.id === selectedCategory)?.name || "Pilih Kategori"}
                                        </span>
                                    </h3>
                                    <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase mb-1">Kode Unik</label>
                                            <input type="text" required value={newItemData.kode} onChange={(e) => setNewItemData({ ...newItemData, kode: e.target.value })} className="w-full border-[3px] border-black px-3 py-2 font-bold outline-none focus:bg-white" placeholder="Cth: BRG-01" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase mb-1">Nama Barang / Entitas</label>
                                            <input type="text" required value={newItemData.nama} onChange={(e) => setNewItemData({ ...newItemData, nama: e.target.value })} className="w-full border-[3px] border-black px-3 py-2 font-bold outline-none focus:bg-white" placeholder="Cth: Monitor" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase mb-1">Stok Awal</label>
                                            <input type="number" required value={newItemData.stokAwal} onChange={(e) => setNewItemData({ ...newItemData, stokAwal: e.target.value })} className="w-full border-[3px] border-black px-3 py-2 font-bold outline-none focus:bg-white" placeholder="0" min="0" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase mb-1">Lokasi Gudang Awal</label>
                                            <select
                                                value={newItemData.locationId}
                                                onChange={(e) => setNewItemData({ ...newItemData, locationId: e.target.value })}
                                                className="w-full border-[3px] border-black px-3 py-2 font-bold outline-none focus:bg-white cursor-pointer"
                                                required={Number(newItemData.stokAwal) > 0}
                                            >
                                                <option value="">-- Pilih Lokasi --</option>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.nama}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 lg:col-span-4">
                                            <button type="submit" className="w-full bg-black text-white border-[3px] border-black px-4 py-3 font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                                                <Save size={18} /> Simpan Produk
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* TABEL ITEM */}
                                <div className="overflow-x-auto border-[4px] border-black shadow-[6px_6px_0px_0px_#000]">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black text-white">
                                                <th className="p-3 border-r-[4px] border-black font-black text-xs uppercase tracking-widest">Kode</th>
                                                <th className="p-3 border-r-[4px] border-black font-black text-xs uppercase tracking-widest">Nama Item</th>
                                                <th className="p-3 border-r-[4px] border-black font-black text-xs uppercase tracking-widest text-center w-24">Stok Awal</th>
                                                <th className="p-3 font-black text-xs uppercase tracking-widest text-center w-20">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {currentCategoryItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-6 text-center font-black uppercase tracking-widest text-zinc-500">BELUM ADA DATA</td>
                                                </tr>
                                            ) : (
                                                currentCategoryItems.map(item => (
                                                    <tr key={item.id} className="border-b-[4px] border-black last:border-b-0 hover:bg-zinc-100">
                                                        <td className="p-3 border-r-[4px] border-black font-black text-sm">{item.kode}</td>
                                                        <td className="p-3 border-r-[4px] border-black font-black text-sm uppercase">{item.nama}</td>
                                                        <td className="p-3 border-r-[4px] border-black font-black text-lg text-center bg-zinc-100">{item.stokAwal}</td>
                                                        <td className="p-3 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button onClick={() => handleStartEdit(item)} title="Edit" aria-label="Edit item" className="bg-yellow-300 p-2 border-[3px] border-black hover:bg-yellow-400 shadow-[2px_2px_0px_0px_#000]">
                                                                    <Pencil size={16} className="text-black" />
                                                                </button>
                                                                <button onClick={() => handleDeleteItem(item.id)} className="bg-red-400 p-2 border-[3px] border-black hover:bg-red-500 shadow-[2px_2px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                                                                    <Trash2 size={16} className="text-black" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        </div>
                    )}

                </main>
            </div>
            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                type={confirmState.type}
                onConfirm={() => {
                    if (typeof confirmState.onConfirm === 'function') confirmState.onConfirm();
                }}
                onCancel={() => {
                    if (typeof confirmState.onCancel === 'function') confirmState.onCancel();
                    hideConfirm();
                }}
            />
        </div>
    );
}