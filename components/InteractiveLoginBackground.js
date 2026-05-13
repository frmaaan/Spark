'use client';

import { useEffect, useRef } from 'react';

export default function InteractiveLoginBackground() {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });
  const isClickingRef = useRef(false);
  const entitiesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    // ==========================================
    // NEO-BRUTALISM: FLAT & LOUD CONFIG
    // ==========================================
    const COLORS = [
      '#fde047', // Cyber Yellow
      '#f472b6', // Hot Pink
      '#4ade80', // Acid Green
      '#c084fc', // Brutal Purple
      '#ffffff'  // Pure White
    ];
    
    const LABELS = ['AUTH', 'ACCESS', '404', 'SYS', 'OK', 'DENIED', 'USER', '***'];
    const SHAPES = ['rect', 'circle', 'pill'];

    // Membuat Elemen Melayang
    const initEntities = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const count = Math.floor((canvas.width * canvas.height) / 40000); // Kepadatan dinamis
      entitiesRef.current = [];

      for (let i = 0; i < count; i++) {
        const size = 60 + Math.random() * 80; // Ukuran random besar-besar
        entitiesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2, // Kecepatan X
          vy: (Math.random() - 0.5) * 2, // Kecepatan Y
          size: size,
          width: size * (1 + Math.random()), 
          height: size * 0.6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          text: LABELS[Math.floor(Math.random() * LABELS.length)],
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.02 // Rotasi
        });
      }
    };

    // ==========================================
    // INTERAKSI PENGGUNA
    // ==========================================
    const handleMove = (e) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const handleLeave = () => { pointerRef.current.active = false; };
    const handleDown = () => { isClickingRef.current = true; };
    const handleUp = () => { isClickingRef.current = false; };

    // ==========================================
    // RENDER & PHYSICS LOOP
    // ==========================================
    const draw = () => {
      // 1. Gambar Background Dot Grid
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#cbd5e1';
      for (let i = 20; i < canvas.width; i += 40) {
        for (let j = 20; j < canvas.height; j += 40) {
          ctx.beginPath();
          ctx.arc(i, j, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const pointer = pointerRef.current;

      // 2. Update & Render Entities (Fisika Stiker)
      entitiesRef.current.forEach(entity => {
        // --- FISIKA ---
        if (pointer.active) {
          const dx = pointer.x - entity.x;
          const dy = pointer.y - entity.y;
          const dist = Math.hypot(dx, dy);

          if (isClickingRef.current) {
            // Implosion: Sedot semua elemen jika diklik (Black Hole Mode)
            if (dist < 400) {
              const pull = (400 - dist) / 400;
              entity.vx += (dx / dist) * pull * 1.5;
              entity.vy += (dy / dist) * pull * 1.5;
              entity.vAngle += 0.05; // Muter kencang saat tersedot
            }
          } else {
            // Repulsion: Dorong elemen menjauh saat kursor mendekat
            if (dist < 150) {
              const push = (150 - dist) / 150;
              entity.vx -= (dx / dist) * push * 2;
              entity.vy -= (dy / dist) * push * 2;
            }
          }
        }

        // Gesekan udara (Friction) & batas kecepatan
        entity.vx *= 0.98;
        entity.vy *= 0.98;
        
        // Agar tidak berhenti total (Constant roaming speed)
        if (Math.abs(entity.vx) < 0.2) entity.vx += (Math.random() - 0.5) * 0.1;
        if (Math.abs(entity.vy) < 0.2) entity.vy += (Math.random() - 0.5) * 0.1;

        // Terapkan kecepatan ke posisi
        entity.x += entity.vx;
        entity.y += entity.vy;
        entity.angle += entity.vAngle;
        entity.vAngle *= 0.95; // Perlambat putaran

        // Pantulan Dinding Layar
        if (entity.x < 0) { entity.x = 0; entity.vx *= -1; }
        if (entity.x > canvas.width) { entity.x = canvas.width; entity.vx *= -1; }
        if (entity.y < 0) { entity.y = 0; entity.vy *= -1; }
        if (entity.y > canvas.height) { entity.y = canvas.height; entity.vy *= -1; }

        // --- RENDER NEO-BRUTALISM SHAPES ---
        ctx.save();
        ctx.translate(entity.x, entity.y);
        ctx.rotate(entity.angle);

        const border = 4; // Border super tebal
        const shadowOffset = 8; // Hard Drop Shadow

        ctx.lineWidth = border;
        ctx.strokeStyle = '#0f172a'; // Slate 900
        ctx.lineJoin = 'miter';

        // Fungsi menggambar bentuk
        const drawShape = (isShadow) => {
          ctx.beginPath();
          if (entity.shape === 'rect') {
            ctx.rect(-entity.width/2, -entity.height/2, entity.width, entity.height);
          } else if (entity.shape === 'circle') {
            ctx.arc(0, 0, entity.size / 2, 0, Math.PI * 2);
          } else if (entity.shape === 'pill') {
            const r = entity.height / 2;
            const w = entity.width;
            ctx.roundRect(-w/2, -r, w, entity.height, r);
          }

          if (isShadow) {
            ctx.fillStyle = '#0f172a'; // Shadow solid hitam
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillStyle = entity.color;
            ctx.fill();
            ctx.stroke();
          }
        };

        // 1. Gambar Bayangan Dulu (Offset ke bawah kanan)
        ctx.save();
        ctx.translate(shadowOffset, shadowOffset);
        drawShape(true);
        ctx.restore();

        // 2. Gambar Bentuk Utama
        drawShape(false);

        // 3. Teks Brutalis di Dalamnya
        if (entity.shape !== 'circle') { // Lingkaran terlalu kecil untuk teks
          ctx.fillStyle = '#0f172a';
          ctx.font = '900 20px "Space Grotesk", Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(entity.text, 0, 0);
        }

        ctx.restore();
      });

      // --- 3. CUSTOM CURSOR BRUTALIST ---
      if (pointer.active) {
        // Hard Shadow untuk kursor
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(pointer.x + 6, pointer.y + 6, isClickingRef.current ? 15 : 20, 0, Math.PI * 2);
        ctx.fill();

        // Kursor Utama
        ctx.fillStyle = isClickingRef.current ? '#ef4444' : '#fde047';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, isClickingRef.current ? 15 : 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cross di dalam kursor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(pointer.x - 2, pointer.y - 10, 4, 20);
        ctx.fillRect(pointer.x - 10, pointer.y - 2, 20, 4);

        // Label Info Kursor
        const labelText = isClickingRef.current ? 'PULLING...' : 'IDLE';
        ctx.fillStyle = '#0f172a'; // Label Shadow
        ctx.fillRect(pointer.x + 25 + 4, pointer.y + 15 + 4, 80, 26);
        
        ctx.fillStyle = '#ffffff'; // Label Main
        ctx.fillRect(pointer.x + 25, pointer.y + 15, 80, 26);
        ctx.strokeRect(pointer.x + 25, pointer.y + 15, 80, 26);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, pointer.x + 65, pointer.y + 28);
      }

      animationId = requestAnimationFrame(draw);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('resize', initEntities);

    initEntities();
    draw();

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('resize', initEntities);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-slate-50 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-none"
      />
    </div>
  );
}