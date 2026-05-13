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
// MOCK DATA AWAL
// ============================================================================
const INITIAL_CATEGORIES = [];
const INITIAL_ITEMS = [];
const INITIAL_TRANSACTIONS = [];

export default function App() {
    const [activeTab, setActiveTab] = useState("input");

    // State Data
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
    const [newCategoryTeams, setNewCategoryTeams] = useState([]); 
    const [newItemData, setNewItemData] = useState({ kode: "", nama: "", stokAwal: "", locationId: "" });

    // Edit state for items
    const [editingItemId, setEditingItemId] = useState(null);
    const [editItemData, setEditItemData] = useState({ kode: "", nama: "", stokAwal: "" });

    // Edit state for category
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [editCategoryName, setEditCategoryName] = useState("");
    const [editCategoryTeams, setEditCategoryTeams] = useState([]);

    // User role 
    const [userRole, setUserRole] = useState("USER");
    const [userTeamId, setUserTeamId] = useState(null);

    // Tips visibility
    const [showTips, setShowTips] = useState(true);

    //filter export menu
const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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
    const [reportMode, setReportMode] = useState("summary"); 
    const [reportPage, setReportPage] = useState(1);
    const [reportPageSize, setReportPageSize] = useState(10);

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

    const [confirmState, setConfirmState] = useState({
        isOpen: false, title: '', message: '', onConfirm: null, onCancel: null, confirmText: 'Hapus', cancelText: 'Batal', type: 'danger'
    });

    const showConfirm = (opts) => setConfirmState(s => ({ ...s, ...opts, isOpen: true }));
    const hideConfirm = () => {
        const cb = confirmState.onCancel;
        setConfirmState(s => ({ ...s, isOpen: false }));
        if (typeof cb === 'function') cb();
    };

    // ============================================================================
    // LOGIKA STOK (Tidak Diubah)
    // ============================================================================
    const getStockData = (itemId, startDate, endDate, locId) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return { awal: 0, masuk: 0, keluar: 0, terkini: 0 };
        let itemTxs = transactions.filter(t => t.itemId === itemId);

        if (locId && locId !== "ALL") {
            itemTxs = itemTxs.filter(t => t.locationId === parseInt(locId));
        }

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

    const exportReportExcel = () => { /* Logika sama */
        let rows = [];
        let sheetName = "Ringkasan";

        if (reportMode === "summary") {
            rows = filteredItems.map(item => {
                const stock = getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, reportLocationId);
                return {
                    Barang: item.nama, Kode: item.kode, Awal: stock.awal, Masuk: stock.masuk, Keluar: stock.keluar, Akhir: stock.terkini,
                };
            });
            sheetName = "Ringkasan";
        } else if (reportMode === "detail") {
            rows = reportDetailRows.map(r => ({
                Tanggal: r.date, Barang: r.itemNama, Kode: r.itemKode, Gudang: r.locationNama, Masuk: r.masuk, Keluar: r.keluar, Keterangan: r.note || "",
            }));
            sheetName = "Detail";
        } else {
            rows = filteredItems.map(item => {
                const data = getAllLocationRow(item);
                const row = { Barang: item.nama, Kode: item.kode };
                locations.forEach((loc, idx) => { row[loc.nama] = data.perLoc[idx]; });
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

    const exportReportPdf = () => { /* Logika sama */
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const titleMap = { summary: "Laporan Ringkasan Stok", detail: "Laporan Detail Transaksi", all: "Laporan All Lokasi" };

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
            startY: 70, head, body, styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [0, 0, 0] },
        });

        doc.save(`Monitoring_${reportMode}_${new Date().toISOString().split("T")[0]}.pdf`);
    };

    // ============================================================================
    // HANDLERS (Tidak Diubah)
    // ============================================================================
    const handleInputChange = (itemId, field, value) => {
        setInputs(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
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
                    showMessage(res?.error || 'Gagal membuat lokasi', 'error'); return;
                }
            } catch (err) {
                console.error(err); showMessage('Gagal membuat lokasi', 'error'); return;
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

            if (qtyMasuk > 0) newTransactions.push({ id: Date.now() + Math.random(), itemId, type: "IN", qty: qtyMasuk, date: tanggalInput, note, locationId: finalLocId });
            if (qtyKeluar > 0) newTransactions.push({ id: Date.now() + Math.random(), itemId, type: "OUT", qty: qtyKeluar, date: tanggalInput, note, locationId: finalLocId });
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
                setCategories(res.data || []); setNewCategoryName(""); setNewCategoryTeams([]);
                if (!selectedCategory && res.data && res.data.length > 0) setSelectedCategory(res.data[0].id);
                showMessage('KATEGORI BARU DITAMBAHKAN', 'success');
            } else showMessage(res?.error || 'Gagal menambah kategori', 'error');
        } catch (err) { console.error(err); showMessage('Gagal menambah kategori', 'error'); }
    };

    const handleDeleteCategory = async (id) => {
        showConfirm({
            title: 'Hapus Kategori', message: 'PERHATIAN: Menghapus kategori ini akan menghapus SEMUA barang dan transaksi di dalamnya. Lanjutkan?', confirmText: 'Hapus', type: 'danger',
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
            }, onCancel: () => hideConfirm()
        });
    };

    const handleStartEditCategory = (c) => {
        setEditingCategoryId(c.id); setEditCategoryName(c.name); setEditCategoryTeams(Array.isArray(c.teams) && c.teams.length > 0 ? c.teams.map(t => String(t.id)) : ["ALL"]);
    };

    const handleSaveEditCategory = async (id) => {
        if (!editCategoryName.trim()) return;
        showConfirm({
            title: 'Simpan Perubahan Kategori', message: 'Simpan perubahan pada kategori ini?', confirmText: 'Simpan', type: 'primary',
            onConfirm: async () => {
                try {
                    const mod = await import('@/lib/actions/monitoringActions');
                    const teamIds = editCategoryTeams.includes('ALL') ? [] : editCategoryTeams.map(Number);
                    const res = await mod.updateCategory(id, editCategoryName.trim(), teamIds);
                    if (res && res.success) {
                        setCategories(res.data || []); setEditingCategoryId(null); setEditCategoryName(""); setEditCategoryTeams([]);
                        showMessage('KATEGORI BERHASIL DIUBAH', 'success');
                    } else showMessage(res?.error || 'Gagal merubah kategori', 'error');
                } catch (err) { console.error(err); showMessage('Gagal merubah kategori', 'error'); }
                hideConfirm();
            }, onCancel: () => hideConfirm()
        });
    };

    const handleCancelEditCategory = () => { setEditingCategoryId(null); setEditCategoryName(""); setEditCategoryTeams([]); };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!selectedCategory) { showMessage('PILIH KATEGORI TERLEBIH DAHULU!', 'error'); return; }
        const { kode, nama, stokAwal, locationId } = newItemData;
        if (!kode.trim() || !nama.trim()) return;
        try {
            const mod = await import('@/lib/actions/monitoringActions');
            const res = await mod.addItem({ categoryId: selectedCategory, kode: kode.trim(), nama: nama.trim(), stokAwal: Number(stokAwal || 0), locationId: locationId });
            if (res && res.success) {
                setItems(prev => [res.data, ...prev]); setNewItemData({ kode: '', nama: '', stokAwal: '', locationId: '' });
                const tr = await mod.getTransactions();
                if (tr && tr.success) setTransactions(tr.data.map(tx => ({ id: tx.id, itemId: tx.itemId, type: tx.tipe, qty: tx.qty, date: (new Date(tx.tanggal)).toISOString().split('T')[0], note: tx.catatan, locationId: tx.locationId })));
                showMessage('ITEM BARU BERHASIL DISIMPAN', 'success');
            } else showMessage(res?.error || 'Gagal menambah item', 'error');
        } catch (err) { console.error(err); showMessage('Gagal menambah item', 'error'); }
    };

    const handleDeleteItem = (id) => {
        showConfirm({
            title: 'Hapus Item', message: 'Anda yakin ingin menghapus item ini? Semua transaksi terkait juga akan dihapus.', confirmText: 'Hapus', type: 'danger',
            onConfirm: async () => {
                try {
                    const mod = await import('@/lib/actions/monitoringActions');
                    const res = await mod.deleteItem(id);
                    if (res && res.success) {
                        setItems(prev => prev.filter(i => i.id !== id)); setTransactions(prev => prev.filter(t => t.itemId !== id));
                        showMessage('ITEM DIHAPUS', 'info');
                    } else showMessage(res?.error || 'Gagal menghapus item', 'error');
                } catch (err) { console.error(err); showMessage('Gagal menghapus item', 'error'); }
                hideConfirm();
            }, onCancel: () => hideConfirm()
        });
    };

    const handleDeleteLocation = (id, nama) => {
        showConfirm({
            title: 'Hapus Lokasi', message: `Hapus lokasi gudang "${nama}"?`, confirmText: 'Hapus', type: 'danger',
            onConfirm: async () => {
                try {
                    const mod = await import('@/lib/actions/monitoringActions');
                    const res = await mod.deleteLocation(id);
                    if (res && res.success) {
                        setLocations(prev => prev.filter(l => l.id !== id));
                        if (String(reportLocationId) === String(id)) setReportLocationId("ALL");
                        if (String(newItemData.locationId) === String(id)) setNewItemData(prev => ({ ...prev, locationId: "" }));
                        if (locationInput && locationInput.toLowerCase() === String(nama).toLowerCase()) setLocationInput("");
                        showMessage('LOKASI BERHASIL DIHAPUS', 'success');
                    } else showMessage(res?.error || 'Gagal menghapus lokasi', 'error');
                } catch (err) { console.error(err); showMessage('Gagal menghapus lokasi', 'error'); }
                hideConfirm();
            }, onCancel: () => hideConfirm()
        });
    };

    const handleStartEdit = (item) => { setEditingItemId(item.id); setEditItemData({ kode: item.kode, nama: item.nama, stokAwal: String(item.stokAwal) }); };
    const handleEditChange = (field, value) => { setEditItemData(prev => ({ ...prev, [field]: value })); };
    const handleSaveEdit = (id) => {
        showConfirm({
            title: 'Simpan Perubahan Item', message: 'Simpan perubahan pada item ini?', confirmText: 'Simpan', type: 'primary',
            onConfirm: async () => {
                try {
                    const mod = await import('@/lib/actions/monitoringActions');
                    const res = await mod.updateItem(id, { kode: editItemData.kode.trim(), nama: editItemData.nama.trim(), stokAwal: Number(editItemData.stokAwal || 0) });
                    if (res && res.success) {
                        setItems(prev => prev.map(it => it.id === id ? res.data : it)); setEditingItemId(null); setEditItemData({ kode: '', nama: '', stokAwal: '' });
                        showMessage('PERUBAHAN ITEM TERSIMPAN', 'success');
                    } else showMessage(res?.error || 'Gagal menyimpan perubahan', 'error');
                } catch (err) { console.error(err); showMessage('Gagal menyimpan perubahan', 'error'); }
                hideConfirm();
            }, onCancel: () => hideConfirm()
        });
    };
    const handleCancelEdit = () => { setEditingItemId(null); setEditItemData({ kode: "", nama: "", stokAwal: "" }); };

    // ============================================================================
    // RENDER UI NEO-BRUTALISM (ENHANCED)
    // ============================================================================
    return (
        // Wrapper dengan Pattern Grid
        <div className="w-full min-h-screen font-sans text-black selection:bg-pink-300 bg-[#f8fafc] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] p-4 md:p-8">

            {/* Toast Notification bergaya Alert Box jadul */}
            {message.text && (
                <div className={`fixed top-6 right-6 px-6 py-4 border-[4px] border-black shadow-[8px_8px_0px_0px_#000] flex items-center gap-4 z-50 animate-in slide-in-from-top-4 font-black uppercase tracking-widest text-sm ${
                    message.type === 'error' ? 'bg-[#fca5a5] text-black' :
                    message.type === 'success' ? 'bg-[#bef264] text-black' : 'bg-[#fde047] text-black'
                }`}>
                    <div className="bg-white p-2 border-[3px] border-black shadow-[2px_2px_0_0_#000]">
                        {message.type === 'error' ? <AlertTriangle size={24} /> : <CheckSquare size={24} />}
                    </div>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage({ text: "", type: "info" })} className="ml-2 hover:bg-black hover:text-white p-1 border-[3px] border-transparent hover:border-black transition-colors">
                        <X size={24} />
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <header className="border-[4px] border-black bg-white shadow-[12px_12px_0px_0px_#000] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                    {/* Aksen Dekoratif Neo-Brutalism */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-300 rounded-full border-[4px] border-black shadow-[8px_8px_0_0_#000] hidden md:block"></div>
                    <div className="absolute top-4 right-32 w-10 h-10 bg-cyan-300 border-[4px] border-black rotate-12 hidden md:block"></div>
                    
                    <div className="relative z-10">
                         {/*<div className="inline-block bg-cyan-300 border-[3px] border-black px-3 py-1 mb-4 shadow-[4px_4px_0_0_#000] rotate-[-2deg]">
                           <span className="font-black uppercase tracking-widest text-xs">SPARK</span>
                        </div>*/}
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none drop-shadow-[4px_4px_0_#fde047]">
                            Stock<br />Control
                        </h1>
                    </div>
                </header>

                {/* NAVIGATION TABS */}
                <nav className="flex flex-wrap gap-4">
                    {[
                        { id: "input", label: "Pencatatan Harian", icon: <ArrowDownUp size={24} />, color: "hover:bg-pink-300" },
                        { id: "report", label: "Laporan & Rekap", icon: <FileBarChart size={24} />, color: "hover:bg-cyan-300" },
                        { id: "master", label: "Kelola Master Data", icon: <Settings size={24} />, color: "hover:bg-yellow-400", restricted: true }
                    ].map(tab => {
                        const disabled = tab.restricted && userRole !== "ADMIN";
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { if (!disabled) setActiveTab(tab.id); }}
                                disabled={disabled}
                                className={`flex items-center gap-3 px-6 py-4 font-black text-sm uppercase tracking-widest border-[4px] border-black transition-all ${
                                    activeTab === tab.id
                                    ? "bg-black text-white translate-x-[4px] translate-y-[4px] shadow-none"
                                    : disabled 
                                        ? "bg-zinc-200 text-zinc-400 shadow-none opacity-60 cursor-not-allowed" 
                                        : `bg-white text-black shadow-[6px_6px_0px_0px_#000] ${tab.color} hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#000] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none`
                                }`}
                                title={disabled ? "Akses terbatas: Admin saja" : tab.label}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* MAIN CONTENT AREA */}
                <main className="border-[4px] border-black bg-white shadow-[12px_12px_0px_0px_#000]">

                    {/* ========================================================================= */}
                    {/* TAB 1: PENCATATAN HARIAN */}
                    {/* ========================================================================= */}
                    {activeTab === "input" && (
                        <div className="animate-in fade-in">
                            {/* FILTER BAR */}
                            <div className="bg-[#fde047] p-6 border-b-[4px] border-black flex flex-col md:flex-row gap-6 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-black uppercase tracking-widest mb-2 bg-black text-white w-max px-2 py-1">Pilih Kategori</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => { setSelectedCategory(parseInt(e.target.value)); setInputs({}); }}
                                        className="w-full bg-white border-[4px] border-black px-4 py-3 font-black text-base outline-none shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-transform focus:ring-4 focus:ring-black cursor-pointer"
                                    >
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        {categories.length === 0 && <option value="">-- KOSONG --</option>}
                                    </select>
                                </div>
                                <div className="w-full md:w-72">
                                    <label className="block text-xs font-black uppercase tracking-widest mb-2 bg-black text-white w-max px-2 py-1">Lokasi Gudang</label>
                                    <input
                                        type="text"
                                        list="gudang-list"
                                        placeholder="Ketik lokasi..."
                                        value={locationInput}
                                        onChange={(e) => setLocationInput(e.target.value)}
                                        className="w-full bg-white border-[4px] border-black px-4 py-3 font-black text-base outline-none shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 focus:ring-4 focus:ring-black transition-transform"
                                    />
                                    <datalist id="gudang-list">
                                        {locations.map(l => <option key={l.id} value={l.nama} />)}
                                    </datalist>
                                </div>
                                <div className="w-full md:w-56">
                                    <label className="block text-xs font-black uppercase tracking-widest mb-2 bg-black text-white w-max px-2 py-1">Tanggal</label>
                                    <input
                                        type="date"
                                        value={tanggalInput}
                                        onChange={(e) => setTanggalInput(e.target.value)}
                                        className="w-full bg-white border-[4px] border-black px-4 py-3 font-black text-base outline-none shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 focus:ring-4 focus:ring-black transition-transform cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* WARNING BANNER */}
                            {showTips && (
                                <div className="bg-pink-300 border-b-[4px] border-black p-4 flex items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white p-2 border-[3px] border-black shadow-[2px_2px_0_0_#000]">
                                            <AlertTriangle size={24} className="flex-shrink-0" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-wider leading-tight">
                                            TIPS: Kosongkan sel Qty jika tidak ada pergerakan. Tekan [TAB] untuk pindah sel cepat!
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowTips(false)}
                                        className="border-[3px] border-black bg-white hover:bg-black hover:text-white transition-colors p-2 shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none flex-shrink-0"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}

                            {/* DATA GRID */}
                            <div className="overflow-x-auto bg-[#f8fafc]">
                                <table className="w-full text-left border-collapse min-w-[850px]">
                                    <thead>
                                        <tr className="bg-black text-white border-b-[4px] border-black">
                                            <th className="p-5 border-r-[4px] border-black font-black text-sm uppercase tracking-widest w-1/3">Detail Barang</th>
                                            <th className="p-5 border-r-[4px] border-black font-black text-sm uppercase tracking-widest text-center w-32">Stok Saat Ini</th>
                                            <th className="p-5 border-r-[4px] border-black font-black text-sm uppercase tracking-widest text-center bg-[#bef264] text-black w-40">Masuk (+)</th>
                                            <th className="p-5 border-r-[4px] border-black font-black text-sm uppercase tracking-widest text-center bg-[#fca5a5] text-black w-40">Keluar (-)</th>
                                            <th className="p-5 font-black text-sm uppercase tracking-widest">Catatan Mutasi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-[4px] divide-black">
                                        {currentCategoryItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center font-black uppercase tracking-widest text-zinc-500 text-lg bg-white">
                                                    TIDAK ADA ITEM DI KATEGORI INI
                                                </td>
                                            </tr>
                                        ) : (
                                            currentCategoryItems.map(item => {
                                                const stock = getStockData(item.id);
                                                const inputData = inputs[item.id] || { masuk: '', keluar: '', note: '' };
                                                const isOverdraft = (parseInt(inputData.keluar) || 0) > (stock.terkini + (parseInt(inputData.masuk) || 0));

                                                return (
                                                    <tr key={item.id} className="bg-white hover:bg-yellow-50 transition-colors">
                                                        <td className="p-5 border-r-[4px] border-black">
                                                            <p className="font-black text-base uppercase">{item.nama}</p>
                                                            <p className="inline-block px-2 py-1 bg-zinc-200 border-[2px] border-black text-xs font-black mt-2">{item.kode}</p>
                                                        </td>
                                                        <td className="p-5 border-r-[4px] border-black text-center bg-zinc-100">
                                                            <span className={`text-3xl font-black ${stock.terkini === 0 ? 'text-[#ef4444]' : 'text-black'}`}>
                                                                {stock.terkini}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 border-r-[4px] border-black bg-lime-50">
                                                            <input
                                                                type="number" min="0" placeholder="0"
                                                                value={inputData.masuk ?? ''}
                                                                onChange={(e) => handleInputChange(item.id, 'masuk', e.target.value)}
                                                                className="w-full bg-white border-[4px] border-black px-4 py-3 text-center text-lg font-black outline-none focus:ring-4 focus:ring-lime-400 focus:bg-lime-100 shadow-[4px_4px_0_0_#000] transition-all"
                                                            />
                                                        </td>
                                                        <td className={`p-4 border-r-[4px] border-black ${isOverdraft ? 'bg-red-400' : 'bg-red-50'}`}>
                                                            <input
                                                                type="number" min="0" placeholder="0"
                                                                value={inputData.keluar ?? ''}
                                                                onChange={(e) => handleInputChange(item.id, 'keluar', e.target.value)}
                                                                className="w-full bg-white border-[4px] border-black px-4 py-3 text-center text-lg font-black outline-none focus:ring-4 focus:ring-red-400 focus:bg-red-100 shadow-[4px_4px_0_0_#000] transition-all"
                                                            />
                                                        </td>
                                                        <td className="p-4">
                                                            <input
                                                                type="text" placeholder="Ketik catatan..."
                                                                value={inputData.note ?? ''}
                                                                onChange={(e) => handleInputChange(item.id, 'note', e.target.value)}
                                                                className="w-full bg-white border-[4px] border-black px-4 py-3 font-bold outline-none focus:ring-4 focus:ring-yellow-400 shadow-[4px_4px_0_0_#000] transition-all"
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
                            <div className="p-6 md:p-8 border-t-[4px] border-black bg-zinc-100 flex justify-end">
                                <button
                                    onClick={handleSaveMutasi}
                                    className="bg-[#bef264] text-black border-[4px] border-black px-10 py-5 text-lg font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#000] hover:bg-[#a3e635] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none transition-all flex items-center gap-4"
                                >
                                    <Save size={28} /> SIMPAN TRANSAKSI
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: LAPORAN STOK */}
                    {/* ========================================================================= */}
                    {activeTab === "report" && (
                        <div className="p-6 md:p-8 animate-in fade-in bg-zinc-50">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-6">
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tight bg-pink-300 inline-block px-4 py-2 border-[4px] border-black shadow-[4px_4px_0_0_#000]">
                                        Log & Analitik
                                    </h2>
                                    <p className="text-sm font-bold text-zinc-600 mt-4 border-l-[4px] border-black pl-3">Saring, pantau, dan ekspor data stok pergudangan.</p>
                                </div>
                                
                                <div className="flex flex-col gap-4 w-full lg:w-auto">
                                    {/* Mode Toggles */}
                                    <div className="flex flex-wrap gap-3">
                                        <button onClick={() => setReportMode("summary")} className={`px-4 py-3 border-[4px] border-black text-sm font-black uppercase transition-all ${reportMode === "summary" ? "bg-black text-white shadow-[4px_4px_0_0_#bef264]" : "bg-white shadow-[4px_4px_0_0_#000] hover:-translate-y-1"}`}>Ringkasan</button>
                                        <button onClick={() => setReportMode("detail")} className={`px-4 py-3 border-[4px] border-black text-sm font-black uppercase transition-all ${reportMode === "detail" ? "bg-black text-white shadow-[4px_4px_0_0_#fde047]" : "bg-white shadow-[4px_4px_0_0_#000] hover:-translate-y-1"}`}>Detail</button>
                                        <button onClick={() => setReportMode("all")} className={`px-4 py-3 border-[4px] border-black text-sm font-black uppercase transition-all ${reportMode === "all" ? "bg-black text-white shadow-[4px_4px_0_0_#67e8f9]" : "bg-white shadow-[4px_4px_0_0_#000] hover:-translate-y-1"}`}>All Lokasi</button>
                                    </div>

                                    {/* Filter Controls */}
                                    <div className="flex flex-wrap items-center gap-3 w-full">
                                        <div className="flex items-center gap-3 bg-white border-[4px] border-black px-4 py-3 shadow-[4px_4px_0_0_#000] flex-1 min-w-[200px] focus-within:ring-4 focus-within:ring-yellow-400">
                                            <Search size={20} className="text-black" />
                                            <input
                                                type="text" placeholder="CARI KODE / NAMA..."
                                                value={reportQuery} onChange={(e) => setReportQuery(e.target.value)}
                                                className="bg-transparent outline-none font-black text-sm uppercase placeholder-zinc-400 w-full"
                                            />
                                        </div>
                                        <div className="bg-white border-[4px] border-black px-4 py-3 shadow-[4px_4px_0_0_#000] flex-1 min-w-[200px] focus-within:ring-4 focus-within:ring-yellow-400">
                                            <select
                                                value={reportLocationId} onChange={(e) => setReportLocationId(e.target.value)}
                                                className="bg-transparent outline-none font-black text-sm uppercase w-full cursor-pointer"
                                            >
                                                <option value="ALL">SEMUA GUDANG</option>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.nama}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between gap-4 bg-white border-[4px] border-black p-3 shadow-[4px_4px_0_0_#000] overflow-x-auto">
    
    {/* KELOMPOK KIRI: Filter Tanggal & Reset */}
    <div className="flex items-center gap-3 min-w-max">
        <div className="flex items-center gap-2">
            <span className="bg-black text-white text-[10px] font-black px-2 py-1">DARI</span>
            <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="border-[2px] border-black outline-none px-2 py-1 text-sm font-bold cursor-pointer" />
        </div>
        <div className="flex items-center gap-2">
            <span className="bg-black text-white text-[10px] font-black px-2 py-1">S/D</span>
            <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="border-[2px] border-black outline-none px-2 py-1 text-sm font-bold cursor-pointer" />
        </div>
        <button onClick={() => { setReportStartDate(""); setReportEndDate(""); setReportQuery(""); }} className="bg-[#fca5a5] border-[3px] border-black px-3 py-1 text-xs font-black uppercase hover:bg-red-400 shadow-[2px_2px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
            Reset
        </button>
    </div>
                                        
<div className="flex items-center border-l-[4px] border-black pl-3 ml-auto relative">
    <button 
        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
        className="bg-[#c084fc] border-[3px] border-black px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000] hover:bg-[#a855f7] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-2 transition-all"
    >
        Export<span className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`}>▼</span>
    </button>

    {/* Panel Dropdown */}
    {isExportMenuOpen && (
        <div className="absolute top-full right-0 mt-3 w-48 bg-white border-[4px] border-black shadow-[6px_6px_0_0_#000] flex flex-col z-50 animate-in fade-in slide-in-from-top-2">
            <button 
                onClick={() => { exportReportExcel(); setIsExportMenuOpen(false); }} 
                className="px-4 py-3 text-xs font-black uppercase text-left border-b-[4px] border-black hover:bg-[#bef264] transition-colors flex items-center justify-between group"
            >
                Excel
            </button>
            <button 
                onClick={() => { exportReportPdf(); setIsExportMenuOpen(false); }} 
                className="px-4 py-3 text-xs font-black uppercase text-left hover:bg-[#fca5a5] transition-colors flex items-center justify-between group"
            >
                PDF
            </button>
        </div>
    )}
</div>
                                    </div>
                                </div>
                            </div>

                            {/* TABLE RENDERING (Borders dipertebal) */}
                            <div className="overflow-x-auto bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000]">
                                {reportMode === "summary" && (
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr className="bg-black text-white border-b-[4px] border-black">
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase tracking-widest">Detail Barang</th>
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase tracking-widest text-center">Awal</th>
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase tracking-widest text-center text-[#bef264]">In (+)</th>
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase tracking-widest text-center text-[#fca5a5]">Out (-)</th>
                                                <th className="p-4 font-black text-sm uppercase tracking-widest text-center text-[#fde047]">Akhir</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-[4px] divide-black">
                                            {paginatedSummaryItems.map(item => {
                                                const stock = getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, reportLocationId);
                                                return (
                                                    <tr key={item.id} className="hover:bg-yellow-50">
                                                        <td className="p-4 border-r-[4px] border-black">
                                                            <span className="font-black uppercase text-base block">{item.nama}</span>
                                                            <span className="inline-block px-2 py-1 bg-zinc-200 border-[2px] border-black text-[10px] font-black mt-1">{item.kode}</span>
                                                        </td>
                                                        <td className="p-4 border-r-[4px] border-black text-center font-black text-xl text-zinc-500 bg-zinc-50">{stock.awal}</td>
                                                        <td className="p-4 border-r-[4px] border-black text-center font-black text-xl text-green-700 bg-green-100">{stock.masuk}</td>
                                                        <td className="p-4 border-r-[4px] border-black text-center font-black text-xl text-red-700 bg-red-100">{stock.keluar}</td>
                                                        <td className="p-4 text-center font-black text-3xl bg-[#fde047]">{stock.terkini}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )}

                                {reportMode === "detail" && (
                                    <table className="w-full text-left border-collapse min-w-[980px]">
                                        <thead>
                                            <tr className="bg-black text-white border-b-[4px] border-black">
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase">Tanggal</th>
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase">Barang</th>
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase">Gudang</th>
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase text-center text-[#bef264]">Masuk</th>
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase text-center text-[#fca5a5]">Keluar</th>
                                                <th className="p-4 font-black text-xs uppercase">Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-[4px] divide-black">
                                            {reportDetailRows.length === 0 ? (
                                                <tr><td colSpan={6} className="p-8 text-center font-black uppercase text-zinc-500">TIDAK ADA DATA</td></tr>
                                            ) : paginatedDetailRows.map(r => (
                                                <tr key={r.id} className="hover:bg-cyan-50">
                                                    <td className="p-4 border-r-[4px] border-black font-black text-sm">{r.date}</td>
                                                    <td className="p-4 border-r-[4px] border-black">
                                                        <div className="font-black text-base uppercase">{r.itemNama}</div>
                                                        <div className="inline-block px-2 py-0.5 bg-zinc-200 border-[2px] border-black text-[10px] font-black mt-1">{r.itemKode}</div>
                                                    </td>
                                                    <td className="p-4 border-r-[4px] border-black font-black text-sm uppercase">{r.locationNama}</td>
                                                    <td className="p-4 border-r-[4px] border-black text-center font-black text-xl text-green-700 bg-green-100">{r.masuk > 0 ? r.masuk : '-'}</td>
                                                    <td className="p-4 border-r-[4px] border-black text-center font-black text-xl text-red-700 bg-red-100">{r.keluar > 0 ? r.keluar : '-'}</td>
                                                    <td className="p-4 font-bold text-sm bg-white">{r.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {reportMode === "all" && (
                                    <table className="w-full text-left border-collapse min-w-[980px]">
                                        <thead>
                                            <tr className="bg-black text-white border-b-[4px] border-black">
                                                <th className="p-4 border-r-[4px] border-white font-black text-xs uppercase">Barang</th>
                                                {locations.map(loc => (
                                                    <th key={loc.id} className="p-4 border-r-[4px] border-white font-black text-xs uppercase text-center">{loc.nama}</th>
                                                ))}
                                                <th className="p-4 font-black text-sm uppercase text-center text-[#fde047]">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-[4px] divide-black">
                                            {filteredItems.length === 0 ? (
                                                <tr><td colSpan={locations.length + 2} className="p-8 text-center font-black uppercase text-zinc-500">TIDAK ADA DATA</td></tr>
                                            ) : paginatedAllItems.map(item => {
                                                const perLoc = locations.map(loc => getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, String(loc.id)).terkini);
                                                const total = perLoc.reduce((sum, n) => sum + n, 0);
                                                return (
                                                    <tr key={item.id} className="hover:bg-yellow-50">
                                                        <td className="p-4 border-r-[4px] border-black">
                                                            <div className="font-black text-base uppercase">{item.nama}</div>
                                                            <div className="inline-block px-2 py-0.5 bg-zinc-200 border-[2px] border-black text-[10px] font-black mt-1">{item.kode}</div>
                                                        </td>
                                                        {perLoc.map((val, idx) => (
                                                            <td key={`${item.id}-${locations[idx]?.id}`} className="p-4 border-r-[4px] border-black text-center font-black text-lg">{val}</td>
                                                        ))}
                                                        <td className="p-4 text-center font-black text-2xl bg-[#fde047]">{total}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {filteredItems.length > 0 && (
                                            <tfoot>
                                                <tr className="bg-black text-white border-t-[4px] border-black">
                                                    <td className="p-4 border-r-[4px] border-white font-black uppercase text-sm">TOTAL KESELURUHAN</td>
                                                    {locations.map(loc => {
                                                        const colTotal = filteredItems.reduce((sum, item) => sum + getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, String(loc.id)).terkini, 0);
                                                        return <td key={`tot-${loc.id}`} className="p-4 border-r-[4px] border-white text-center font-black text-xl text-[#67e8f9]">{colTotal}</td>;
                                                    })}
                                                    <td className="p-4 text-center font-black text-3xl text-[#fde047]">
                                                        {filteredItems.reduce((sum, item) => {
                                                            return sum + locations.reduce((acc, loc) => acc + getStockData(item.id, reportStartDate || undefined, reportEndDate || undefined, String(loc.id)).terkini, 0);
                                                        }, 0)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                )}
                            </div>

                            {/* PAGINATION (Brutalist Keys) */}
                            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[4px] border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
                                <div className="text-sm font-black uppercase bg-black text-white px-3 py-2">
                                    DATA {reportTotalRows === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, reportTotalRows)} DARI {reportTotalRows}
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-black uppercase">PER HALAMAN</label>
                                        <select value={reportPageSize} onChange={(e) => setReportPageSize(Number(e.target.value))} className="border-[4px] border-black px-3 py-2 font-black text-sm outline-none focus:ring-4 focus:ring-yellow-400 cursor-pointer shadow-[2px_2px_0_0_#000]">
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 border-l-[4px] border-black pl-3">
                                        <button onClick={() => setReportPage(p => Math.max(1, p - 1))} disabled={normalizedReportPage <= 1} className="border-[4px] border-black bg-white px-4 py-2 text-sm font-black disabled:opacity-50 shadow-[4px_4px_0_0_#000] hover:bg-zinc-200 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">PREV</button>
                                        <span className="text-lg font-black min-w-[60px] text-center bg-[#fde047] border-[4px] border-black py-1 shadow-[2px_2px_0_0_#000]">{normalizedReportPage}/{reportTotalPages}</span>
                                        <button onClick={() => setReportPage(p => Math.min(reportTotalPages, p + 1))} disabled={normalizedReportPage >= reportTotalPages} className="border-[4px] border-black bg-white px-4 py-2 text-sm font-black disabled:opacity-50 shadow-[4px_4px_0_0_#000] hover:bg-zinc-200 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">NEXT</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 3: KELOLA MASTER DATA */}
                    {/* ========================================================================= */}
                    {activeTab === "master" && (
                        <div className="p-6 md:p-8 animate-in fade-in grid grid-cols-1 lg:grid-cols-3 gap-8 bg-zinc-50">

                            {/* SIDEBAR */}
                            <div className="lg:col-span-1 space-y-8">
                                {/* CARD: BUAT KATEGORI */}
                                <div className="bg-[#67e8f9] border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#000]">
                                    <h3 className="font-black text-xl uppercase tracking-widest mb-6 bg-black text-white inline-block px-3 py-1 -ml-2 -mt-2 border-[4px] border-black shadow-[4px_4px_0_0_#000]">Buat Kategori</h3>
                                    <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
                                        <div>
                                            <input
                                                type="text" required placeholder="NAMA KATEGORI..."
                                                value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                                                className="w-full border-[4px] border-black px-4 py-3 font-black text-base outline-none focus:ring-4 focus:ring-white shadow-[4px_4px_0_0_#000]"
                                            />
                                        </div>
                                        {userRole === "ADMIN" && (
                                            <div className="bg-white border-[4px] border-black p-3 shadow-[4px_4px_0_0_#000]">
                                                <label className="block text-xs font-black uppercase mb-2">Hak Akses Tim (Multi)</label>
                                                <select multiple value={newCategoryTeams.map(String)} onChange={(e) => {
                                                    const opts = Array.from(e.target.selectedOptions).map(o => o.value === "ALL" ? "ALL" : parseInt(o.value));
                                                    setNewCategoryTeams(opts);
                                                }} className="w-full border-[3px] border-black px-3 py-2 font-bold outline-none h-32 focus:bg-yellow-50">
                                                    <option value="ALL">ALL (PUBLIK)</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                                                </select>
                                                <p className="text-[10px] font-bold text-zinc-600 mt-2">Tahan CTRL/CMD untuk multiselect.</p>
                                            </div>
                                        )}
                                        <button type="submit" className="bg-black text-white border-[4px] border-black py-3 font-black uppercase tracking-widest text-lg shadow-[4px_4px_0_0_#fff] hover:bg-zinc-800 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all mt-2 flex items-center justify-center gap-2">
                                            <Plus size={24} /> TAMBAH KATEGORI
                                        </button>
                                    </form>
                                </div>

                                {/* CARD: LOKASI GUDANG */}
                                {userRole === "ADMIN" && (
                                    <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#000]">
                                        <div className="bg-[#fca5a5] p-4 border-b-[4px] border-black">
                                            <h3 className="font-black text-lg uppercase tracking-widest">Master Lokasi</h3>
                                        </div>
                                        <ul className="divide-y-[4px] divide-black">
                                            {locations.length === 0 ? (
                                                <li className="p-6 text-center text-sm font-black uppercase text-zinc-500">Belum ada lokasi</li>
                                            ) : locations.map(loc => (
                                                <li key={loc.id} className="p-4 flex items-center justify-between gap-3 hover:bg-pink-50 transition-colors">
                                                    <span className="font-black uppercase text-base">{loc.nama}</span>
                                                    <button
                                                        onClick={() => handleDeleteLocation(loc.id, loc.nama)}
                                                        title="Hapus lokasi"
                                                        className="bg-red-400 p-2 border-[4px] border-black hover:bg-red-500 shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
                                                    >
                                                        <Trash2 size={18} className="text-black" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="p-4 bg-black text-white border-t-[4px] border-black">
                                            <p className="text-[10px] font-black uppercase tracking-widest">
                                                * Lokasi yang dipakai transaksi tidak bisa dihapus.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* CARD: DAFTAR KATEGORI */}
                                <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#000]">
                                    <div className="bg-[#bef264] p-4 border-b-[4px] border-black flex justify-between items-center">
                                        <h3 className="font-black text-lg uppercase tracking-widest">List Kategori</h3>
                                    </div>
                                    <ul className="divide-y-[4px] divide-black">
                                        {categories.map(c => (
                                            <li key={c.id}>
                                                {editingCategoryId === c.id ? (
                                                    <div className="p-4 bg-yellow-100 flex flex-col gap-3">
                                                        <input
                                                            type="text" value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)}
                                                            className="w-full border-[4px] border-black px-3 py-2 font-black outline-none text-base focus:bg-white shadow-[2px_2px_0_0_#000]"
                                                        />
                                                        {userRole === "ADMIN" && (
                                                            <select multiple value={editCategoryTeams} onChange={(e) => {
                                                                const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                                                                setEditCategoryTeams(opts);
                                                            }} className="w-full border-[4px] border-black px-3 py-2 font-bold outline-none h-24 text-sm uppercase shadow-[2px_2px_0_0_#000]">
                                                                <option value="ALL">SEMUA (PUBLIK)</option>
                                                                {teams.map(t => <option key={t.id} value={String(t.id)}>{t.nama}</option>)}
                                                            </select>
                                                        )}
                                                        <div className="flex gap-2 mt-2">
                                                            <button onClick={() => handleSaveEditCategory(c.id)} className="flex-1 bg-[#bef264] text-black py-2 border-[4px] border-black font-black text-sm uppercase shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none">Simpan</button>
                                                            <button onClick={handleCancelEditCategory} className="flex-1 bg-white text-black py-2 border-[4px] border-black font-black text-sm uppercase shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none">Batal</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`w-full flex items-center justify-between transition-colors ${selectedCategory === c.id ? 'bg-[#fde047]' : 'hover:bg-zinc-100'}`}>
                                                        <button
                                                            onClick={() => setSelectedCategory(c.id)}
                                                            className="flex-1 text-left p-5 font-black uppercase outline-none"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-lg">{c.name}</span>
                                                                <span className="inline-block px-2 py-0.5 bg-white border-[2px] border-black text-[10px] font-black w-max mt-2">
                                                                    {Array.isArray(c.teams) ? (c.teams.length === 0 ? 'AKSES: PUBLIK' : `AKSES: ${c.teams.map(t => t.nama).join(', ')}`) : 'AKSES: PUBLIK'}
                                                                </span>
                                                            </div>
                                                        </button>
                                                        {userRole === "ADMIN" && (
                                                            <div className="flex flex-col gap-2 p-3 border-l-[4px] border-black bg-white">
                                                                <button onClick={() => handleStartEditCategory(c)} title="Edit Kategori" className="p-2 border-[3px] border-black bg-[#fde047] shadow-[2px_2px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none">
                                                                    <Pencil size={18} className="text-black" />
                                                                </button>
                                                                <button onClick={() => handleDeleteCategory(c.id)} title="Hapus Kategori" className="p-2 border-[3px] border-black bg-[#fca5a5] shadow-[2px_2px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none">
                                                                    <Trash2 size={18} className="text-black" />
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

                            {/* MAIN AREA: KELOLA ITEM */}
                            <div className="lg:col-span-2 space-y-8">
                                
                                {/* FORM TAMBAH ITEM */}
                                <div className="bg-[#fde047] border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_#000]">
                                    <h3 className="font-black uppercase text-xl tracking-widest mb-6 border-b-[4px] border-black pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <span className="bg-white px-3 py-1 border-[4px] border-black shadow-[4px_4px_0_0_#000] -ml-2 -mt-2">Registrasi Item</span>
                                        <span className="text-sm bg-black text-white px-3 py-2 shadow-[4px_4px_0_0_#fff]">
                                            KATEGORI: {categories.find(c => c.id === selectedCategory)?.name || "BELUM DIPILIH"}
                                        </span>
                                    </h3>
                                    <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black uppercase mb-2 bg-black text-white w-max px-2 py-1">Kode Unik</label>
                                            <input type="text" required value={newItemData.kode} onChange={(e) => setNewItemData({ ...newItemData, kode: e.target.value })} className="w-full border-[4px] border-black px-4 py-3 font-black text-lg outline-none focus:ring-4 focus:ring-white shadow-[4px_4px_0_0_#000]" placeholder="BRG-01" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase mb-2 bg-black text-white w-max px-2 py-1">Nama Entitas</label>
                                            <input type="text" required value={newItemData.nama} onChange={(e) => setNewItemData({ ...newItemData, nama: e.target.value })} className="w-full border-[4px] border-black px-4 py-3 font-black text-lg outline-none focus:ring-4 focus:ring-white shadow-[4px_4px_0_0_#000]" placeholder="MONITOR 24 INCH" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase mb-2 bg-black text-white w-max px-2 py-1">Stok Awal</label>
                                            <input type="number" required value={newItemData.stokAwal} onChange={(e) => setNewItemData({ ...newItemData, stokAwal: e.target.value })} className="w-full border-[4px] border-black px-4 py-3 font-black text-lg outline-none focus:ring-4 focus:ring-white shadow-[4px_4px_0_0_#000]" placeholder="0" min="0" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase mb-2 bg-black text-white w-max px-2 py-1">Lokasi Default</label>
                                            <select
                                                value={newItemData.locationId} onChange={(e) => setNewItemData({ ...newItemData, locationId: e.target.value })}
                                                className="w-full border-[4px] border-black px-4 py-3 font-black text-lg outline-none focus:ring-4 focus:ring-white cursor-pointer shadow-[4px_4px_0_0_#000]"
                                                required={Number(newItemData.stokAwal) > 0}
                                            >
                                                <option value="">-- PILIH LOKASI --</option>
                                                {locations.map(l => <option key={l.id} value={l.id}>{l.nama}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 pt-2">
                                            <button type="submit" className="w-full bg-[#bef264] text-black border-[4px] border-black px-6 py-4 font-black text-xl uppercase tracking-widest hover:bg-[#a3e635] shadow-[6px_6px_0_0_#000] active:translate-x-2 active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-3">
                                                <Save size={24} /> SIMPAN KE DATABASE
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* TABEL DAFTAR ITEM */}
                                <div className="overflow-x-auto border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_#000]">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black text-white border-b-[4px] border-black">
                                                <th className="p-4 border-r-[4px] border-white font-black text-sm uppercase tracking-widest">Kode</th>
                                                <th className="p-4 border-r-[4px] border-white font-black text-sm uppercase tracking-widest">Nama Entitas</th>
                                                <th className="p-4 border-r-[4px] border-white font-black text-sm uppercase tracking-widest text-center w-32">Stok Awal</th>
                                                <th className="p-4 font-black text-sm uppercase tracking-widest text-center w-32">Operasi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-[4px] divide-black">
                                            {currentCategoryItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-10 text-center font-black uppercase tracking-widest text-zinc-400 text-xl">PILIH KATEGORI ATAU TAMBAH DATA</td>
                                                </tr>
                                            ) : (
                                                currentCategoryItems.map(item => (
                                                    <tr key={item.id} className="hover:bg-zinc-100 transition-colors">
                                                        <td className="p-4 border-r-[4px] border-black font-black text-base bg-yellow-50">{item.kode}</td>
                                                        <td className="p-4 border-r-[4px] border-black font-black text-base uppercase">{item.nama}</td>
                                                        <td className="p-4 border-r-[4px] border-black font-black text-2xl text-center bg-zinc-200">{item.stokAwal}</td>
                                                        <td className="p-4 text-center">
                                                            <div className="flex items-center justify-center gap-3">
                                                                <button onClick={() => handleStartEdit(item)} title="Edit" className="bg-[#67e8f9] p-3 border-[4px] border-black shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
                                                                    <Pencil size={20} className="text-black" />
                                                                </button>
                                                                <button onClick={() => handleDeleteItem(item.id)} title="Hapus" className="bg-[#fca5a5] p-3 border-[4px] border-black shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
                                                                    <Trash2 size={20} className="text-black" />
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
            
            {/* Modal Confirm Neo-Brutalist Version (Membutuhkan update di ConfirmModal.js agar seragam, namun trigger dari sini aman) */}
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