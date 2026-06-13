"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  History, 
  Store, 
  LogOut,
  Menu
} from "lucide-react";

interface NavigationItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const sidebarMenus: NavigationItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/pos", icon: ShoppingCart, label: "Kasir (POS)" },
  { href: "/produk", icon: Package, label: "Manajemen Produk" },
  { href: "/riwayat", icon: History, label: "Riwayat Transaksi" },
];

export default function PremiumAutumnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // STATE BARU: Untuk mengontrol kemunculan Modal Konfirmasi Keluar
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="w-full h-screen bg-[#fffdfa] flex overflow-hidden font-sans antialiased relative">
      
      {/* SIDEBAR TERRACOTTA */}
      <aside 
        className={`bg-[#e37b56] flex flex-col justify-between py-6 px-4 text-white flex-shrink-0 no-print border-r border-orange-600/10 transition-all duration-300 ${
          isExpanded ? "w-64" : "w-20"
        }`}
      >
        <div className="flex flex-col gap-8 w-full">
          
          {/* TOP SECTION: BRAND TOKO & TOMBOL HAMBURGER */}
          <div className={`flex items-center justify-between border-b border-white/10 pb-5 ${isExpanded ? "px-2" : "justify-center"}`}>
            {isExpanded && (
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner flex-shrink-0">
                  <Store className="h-5 w-5 text-orange-100" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm tracking-wide uppercase text-white truncate">Kasir Modern</h2>
                  <p className="text-[10px] text-orange-200 font-medium truncate">Sistem POS</p>
                </div>
              </div>
            )}
            
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0 ${!isExpanded ? "bg-white/10 text-white" : ""}`}
              title={isExpanded ? "Kecilkan Menu" : "Besarkan Menu"}
            >
              <Menu className="h-5 w-5 text-orange-100 hover:text-white" />
            </button>
          </div>
          
          {/* DAFTAR MENU NAVIGASI UTAMA */}
          <nav className="flex flex-col gap-1.5 w-full">
            {sidebarMenus.map((menu) => {
              const isActive = pathname === menu.href;
              const Icon = menu.icon;
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`flex items-center rounded-2xl transition-all duration-200 group ${
                    isExpanded ? "gap-3.5 px-4 py-3" : "justify-center p-3.5"
                  } ${
                    isActive 
                      ? "bg-[#fffdfa] text-[#e37b56] shadow-md font-bold scale-[1.01]" 
                      : "text-orange-100 hover:bg-white/10 hover:text-white font-medium"
                  }`}
                  title={!isExpanded ? menu.label : undefined}
                >
                  <Icon className={`h-4 w-4 stroke-[2.2] flex-shrink-0 ${isActive ? "text-[#e37b56]" : "text-orange-200 group-hover:text-white"}`} />
                  {isExpanded && (
                    <span className="text-xs tracking-wide truncate whitespace-nowrap">
                      {menu.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* FOOTER SIDEBAR: TOMBOL LOGOUT (Memicu Pemicu Modal State) */}
        <button 
          onClick={() => setShowLogoutConfirm(true)} // <-- Diubah agar tidak langsung logout
          className={`flex items-center rounded-2xl text-orange-200 hover:text-white hover:bg-red-600/20 transition-all font-medium text-left w-full mt-auto ${
            isExpanded ? "gap-3.5 px-4 py-3" : "justify-center p-3.5"
          }`}
          title="Keluar Aplikasi"
        >
          <LogOut className="h-4 w-4 stroke-[2.2] flex-shrink-0 text-orange-200" />
          {isExpanded && <span className="text-xs tracking-wide whitespace-nowrap">Keluar</span>}
        </button>
      </aside>

      {/* AREA UTAMA WORKSPACE */}
      <section className="flex-1 bg-[#fffdfa] p-6 md:p-8 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </main>
      </section>

      {/* POP-UP MODAL KONFIRMASI LOGOUT PREMIUM (KAPSUL THEME) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-orange-100/30 p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Lingkaran Ikon Terracotta Soft */}
            <div className="h-14 w-14 bg-orange-50 text-[#e37b56] rounded-full flex items-center justify-center shadow-inner">
              <LogOut className="h-6 w-6 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-zinc-800 text-base">Keluar Aplikasi?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed px-4">
                Apakah Anda yakin ingin mengakhiri sesi kasir ini? Anda harus memasukkan akun kembali untuk masuk ke sistem POS.
              </p>
            </div>

            {/* Tombol Kapsul Konfirmasi Kiri-Kanan */}
            <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-orange-100/10">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-10 rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-500 text-xs font-bold transition-all"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="h-10 rounded-full bg-[#e37b56] hover:bg-[#d26c48] text-white text-xs font-bold transition-all flex items-center justify-center shadow-md shadow-orange-200"
              >
                Ya, Keluar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}