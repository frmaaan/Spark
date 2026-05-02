'use client';

import { useEffect, useRef } from 'react';

export default function InteractiveLoginBackground() {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });
  const isClickingRef = useRef(false);
  const shockwavesRef = useRef([]);
  const gridRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    // ==========================================
    // ENGINE 3D ISOMETRIK & NEO-BRUTALISM
    // ==========================================
    const W_HALF = 32; // Setengah lebar pilar (Ukuran X)
    const H_HALF = 18; // Setengah tinggi isometrik (Ukuran Y)
    
    // Palet Warna Brutalis Ekstrim
    const COLORS = {
      bg: '#f8fafc',         // Latar belakang sengaja terang
      outline: '#111827',    // Hitam pekat brutal
      top: '#ffffff',        // Atap putih
      left: '#e5e7eb',       // Bayangan kiri (terang)
      right: '#9ca3af',      // Bayangan kanan (gelap)
      accentTop: '#fde047',  // Atap kuning (Aksen)
      accentCore: '#ef4444', // Inti merah saat ditarik tinggi
      cyberCyan: '#06b6d4'   // Aksen UI Tracker
    };

    const BRUTAL_WORDS = ['STACX', 'PPIC', 'SYS', 'INV', '01'];

    // Membuat Topologi Grid
    const initGrid = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Hitung jumlah baris/kolom agar menutupi seluruh layar (bahkan saat di-pan)
      const size = Math.max(canvas.width, canvas.height);
      const cols = Math.ceil(size / W_HALF) + 10;
      const rows = Math.ceil(size / H_HALF) + 10;

      gridRef.current = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Hanya render pola catur (checkerboard) atau acak untuk memberi ruang
          if ((r + c) % 2 === 0) continue; 

          const isAccent = Math.random() > 0.95;
          const hasWord = Math.random() > 0.9;
          const word = hasWord ? BRUTAL_WORDS[Math.floor(Math.random() * BRUTAL_WORDS.length)] : '';

          gridRef.current.push({
            r, c, 
            z: 0,           // Ketinggian 3D
            vz: 0,          // Kecepatan vertikal (Spring physics)
            targetZ: 5,     // Target diam (sedikit timbul)
            isAccent, word
          });
        }
      }
    };

    // ==========================================
    // INTERAKSI PENGGUNA
    // ==========================================
    const handleMove = (e) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const handleLeave = () => { pointerRef.current.active = false; };
    const handleDown = (e) => {
      isClickingRef.current = true;
      // Ledakan Shockwave Brutalis
      shockwavesRef.current.push({ x: e.clientX, y: e.clientY, radius: 0, power: 120 });
    };
    const handleUp = () => { isClickingRef.current = false; };

    // ==========================================
    // RENDER LOOP
    // ==========================================
    const draw = () => {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gambar Grid Background Polos (Blueprint style)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 64) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      ctx.lineJoin = 'round';
      const pointer = pointerRef.current;

      // Update Shockwaves
      shockwavesRef.current = shockwavesRef.current.filter(sw => {
        sw.radius += 35; // Kecepatan ledakan
        
        // Gambar lingkaran ledakan kawat (Wireframe shockwave)
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.outline;
        ctx.lineWidth = 4;
        ctx.setLineDash([15, 15]);
        ctx.stroke();
        ctx.setLineDash([]);

        return sw.radius < Math.max(canvas.width, canvas.height);
      });

      // Pusat koordinat isometrik (ditengah layar)
      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.2; // Sedikit dinaikkan ke atas

      // Sortir array agar digambar dari belakang ke depan (Z-Indexing isometrik)
      // Rumus isometrik: kedalaman diukur dari (r + c)
      gridRef.current.sort((a, b) => (a.r + a.c) - (b.r + b.c));

      gridRef.current.forEach(tile => {
        // --- 1. MATEMATIKA ISOMETRIK ---
        // Konversi grid (r, c) ke layar X, Y
        const screenX = (tile.c - tile.r) * W_HALF + centerX;
        const screenY = (tile.c + tile.r) * H_HALF + centerY;

        // Jangan render jika di luar layar jauh (Optimasi Performa)
        if (screenX < -100 || screenX > canvas.width + 100 || screenY < -100 || screenY > canvas.height + 200) {
          return;
        }

        // --- 2. FISIKA GRAVITASI & MAGNET ---
        tile.targetZ = 5; // Default tinggi

        const dist = Math.hypot(pointer.x - screenX, pointer.y - screenY);

        // Magnetisasi Kursor: Jika kursor mendekat, pilar DITARIK ke atas!
        if (pointer.active && dist < 250) {
          const pull = Math.pow(1 - dist / 250, 2);
          tile.targetZ = 15 + pull * 160; // Tinggi maksimal pilar 175px!
        }

        // Tahan klik untuk menambah tarikan ekstrim
        if (isClickingRef.current && dist < 150) {
          tile.targetZ += 80; 
        }

        // Hantaman Shockwave (Banting pilar ke bawah)
        shockwavesRef.current.forEach(sw => {
          const swDist = Math.abs(Math.hypot(sw.x - screenX, sw.y - screenY) - sw.radius);
          if (swDist < 40) tile.vz -= 40; // Gaya banting
        });

        // Mekanika Pegas (Spring Physics)
        tile.vz += (tile.targetZ - tile.z) * 0.15; // Ketegangan (Tension)
        tile.vz *= 0.75; // Gesekan / Berat (Friction)
        tile.z += tile.vz;

        if (tile.z < 0) { tile.z = 0; tile.vz *= -0.5; } // Pantulan tanah

        // --- 3. MENGGAMBAR PILAR 3D ---
        const z = tile.z;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = COLORS.outline;

        // Warna dinamis jika ditarik sangat tinggi (Exposed Core)
        const leftColor = z > 100 ? COLORS.accentCore : COLORS.left;
        const rightColor = z > 100 ? '#b91c1c' : COLORS.right; // Merah gelap
        const topColor = tile.isAccent ? COLORS.accentTop : COLORS.top;

        // Muka Kiri (Left Face)
        ctx.fillStyle = leftColor;
        ctx.beginPath();
        ctx.moveTo(screenX - W_HALF, screenY - z); // Kiri atas
        ctx.lineTo(screenX, screenY + H_HALF - z); // Tengah bawah
        ctx.lineTo(screenX, screenY + H_HALF);     // Tengah tanah
        ctx.lineTo(screenX - W_HALF, screenY);     // Kiri tanah
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Muka Kanan (Right Face)
        ctx.fillStyle = rightColor;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + H_HALF - z); // Tengah bawah
        ctx.lineTo(screenX + W_HALF, screenY - z); // Kanan atas
        ctx.lineTo(screenX + W_HALF, screenY);     // Kanan tanah
        ctx.lineTo(screenX, screenY + H_HALF);     // Tengah tanah
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Muka Atas (Top Face)
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - H_HALF - z); // Puncak
        ctx.lineTo(screenX + W_HALF, screenY - z); // Kanan
        ctx.lineTo(screenX, screenY + H_HALF - z); // Bawah
        ctx.lineTo(screenX - W_HALF, screenY - z); // Kiri
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Detail Teks Brutalis di Atap
        if (tile.word) {
          ctx.fillStyle = COLORS.outline;
          ctx.font = '900 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Render teks gepeng agar terkesan menempel di atap isometrik
          ctx.save();
          ctx.translate(screenX, screenY - z);
          ctx.scale(1, 0.5); // Efek perspektif gepeng
          ctx.fillText(tile.word, 0, 0);
          ctx.restore();
        }
      });

      // --- 4. UI TRACKER (CROSSHAIR & HUD) ---
      if (pointer.active) {
        ctx.strokeStyle = COLORS.outline;
        ctx.lineWidth = 3;
        
        // Lingkaran Radar Kursor
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 40, 0, Math.PI * 2);
        ctx.stroke();

        // Garis Pembidik
        ctx.beginPath();
        ctx.moveTo(pointer.x - 60, pointer.y); ctx.lineTo(pointer.x - 20, pointer.y);
        ctx.moveTo(pointer.x + 60, pointer.y); ctx.lineTo(pointer.x + 20, pointer.y);
        ctx.moveTo(pointer.x, pointer.y - 60); ctx.lineTo(pointer.x, pointer.y - 20);
        ctx.moveTo(pointer.x, pointer.y + 60); ctx.lineTo(pointer.x, pointer.y + 20);
        ctx.stroke();

        // Titik Inti
        ctx.fillStyle = COLORS.cyberCyan;
        ctx.fillRect(pointer.x - 4, pointer.y - 4, 8, 8);
        ctx.strokeRect(pointer.x - 4, pointer.y - 4, 8, 8);

        // Teks HUD Animasi (Kesan Sistem Aktif)
        ctx.fillStyle = COLORS.outline;
        ctx.font = '900 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`X:${pointer.x} Y:${pointer.y}`, pointer.x + 50, pointer.y - 45);
        ctx.fillText(`PWR: ${(Math.random() * 100).toFixed(1)}%`, pointer.x + 50, pointer.y - 30);
      }

      animationId = requestAnimationFrame(draw);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('resize', initGrid);

    initGrid();
    draw();

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('resize', initGrid);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 cursor-none"
    />
  );
}