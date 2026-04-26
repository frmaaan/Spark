"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Sunrise, Sunset } from "lucide-react";

export default function Greeting({ userName = "" }) {
  const [greeting, setGreeting] = useState("Halo");
  const [Icon, setIcon] = useState(Sun);

  useEffect(() => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      setGreeting("Selamat Pagi");
      setIcon(Sunrise);
    } else if (hour >= 12 && hour < 15) {
      setGreeting("Selamat Siang");
      setIcon(Sun);
    } else if (hour >= 15 && hour < 18) {
      setGreeting("Selamat Sore");
      setIcon(Sunset);
    } else {
      setGreeting("Selamat Malam");
      setIcon(Moon);
    }
  }, []);

  // Ambil kata pertama dari nama lengkap
  const firstName = userName ? userName.split(" ")[0] : "";

  return (
    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-wider mb-2">
      <Icon size={18} />
      <span>{greeting}{firstName ? `, ${firstName}!` : "!"}</span>
    </div>
  );
}
