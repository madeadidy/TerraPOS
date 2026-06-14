"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DollarSign, ShoppingBag, TrendingUp, Loader2, ArrowUpRight, User } from "lucide-react";

interface Transaction {
  id: string;
  invoice_number: string;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

interface TransactionItem {
  qty: number;
  subtotal: number;
  products: { name: string } | null;
}

export default function DashboardPage() {
  const [cashierName, setCashierName] = useState("Memuat...");

  // Ambil nama profil dari Supabase Auth
  useEffect(() => {
    const getActiveProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Kasir Utama";
        setCashierName(displayName);
      }
    };
    getActiveProfile();
  }, []);

  // 1. FETCH TRANSAKSI
  const { data: transactions = [], isLoading: isTxLoading } = useQuery<Transaction[]>({
    queryKey: ["dashboard-transactions"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("transactions")
        .select("id, invoice_number, total, payment_method, payment_status, created_at")
        // 🌟 GANTI BARIS INI: Menerima status 'paid' (data lama) DAN 'success' (data baru)
        .in("payment_status", ["paid", "success"])
        .gte("created_at", startOfMonth.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Transaction[];
    },
  });

  // 2. FETCH ITEM TRANSAKSI
  const { data: txItems = [], isLoading: isItemsLoading } = useQuery<TransactionItem[]>({
    queryKey: ["dashboard-tx-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transaction_items").select("qty, subtotal, products(name)");

      if (error) throw error;
      return data as unknown as TransactionItem[];
    },
  });

  // 3. KALKULASI DATA RIIL
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const txToday = transactions.filter((tx) => tx.created_at.startsWith(todayStr));
    const salesToday = txToday.reduce((sum, tx) => sum + Number(tx.total), 0);
    const salesThisMonth = transactions.reduce((sum, tx) => sum + Number(tx.total), 0);
    const countToday = txToday.length;

    const productMap: Record<string, number> = {};
    txItems.forEach((item) => {
      const name = item.products?.name || "Produk Dihapus";
      productMap[name] = (productMap[name] || 0) + item.qty;
    });

    const topProducts = Object.entries(productMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return { salesToday, salesThisMonth, countToday, topProducts };
  }, [transactions, txItems]);

  if (isTxLoading || isItemsLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#e37b56]" />
        <p className="text-xs font-medium">Memuat Analisis Bisnis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6 font-sans">
      {/* HEADER PANEL & KANAN ATAS NAMA USER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-800">Ringkasan Performa Toko</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Pantau laporan penjualan harian dan statistik tokomu secara riil.</p>
        </div>

        {/* WIDGET NAMA USER DI KANAN ATAS */}
        <div className="flex items-center gap-2.5 bg-[#fbf6f0] border border-orange-100/30 px-4 py-2 rounded-full self-end sm:self-auto shadow-sm">
          <div className="h-7 w-7 rounded-full bg-[#e37b56] text-white flex items-center justify-center">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-zinc-700 capitalize truncate max-w-[160px]">{cashierName}</span>
        </div>
      </div>

      {/* 3 KARTU UTAMA: Tata Letak Horizontal Kiri-Kanan */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* KARTU 1: OMZET HARI INI */}
        <div className="bg-white border border-orange-100/30 p-5 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-[#e2f0f4] text-[#4a7a96] flex items-center justify-center rounded-2xl flex-shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-zinc-800 truncate">Rp {stats.salesToday.toLocaleString("id-ID")}</div>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Omzet Hari Ini</p>
          </div>
        </div>

        {/* KARTU 2: TRANSAKSI HARI INI */}
        <div className="bg-white border border-orange-100/30 p-5 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-[#fce4db] text-[#e37b56] flex items-center justify-center rounded-2xl flex-shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-zinc-800 truncate">{stats.countToday} Transaksi</div>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Transaksi Hari Ini</p>
          </div>
        </div>

        {/* KARTU 3: OMZET BULAN INI */}
        <div className="bg-white border border-orange-100/30 p-5 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-[#fef0cd] text-[#c69a2b] flex items-center justify-center rounded-2xl flex-shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-[#e37b56] truncate">Rp {stats.salesThisMonth.toLocaleString("id-ID")}</div>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Omzet Bulan Ini</p>
          </div>
        </div>
      </div>

      {/* PANEL BAWAH: AKTIVITAS & PRODUK TERLARIS */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* KIRI: AKTIVITAS PENJUALAN */}
        <div className="bg-white border border-orange-100/20 rounded-[2rem] p-6 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 pl-1">Aktivitas Penjualan Terbaru</h3>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-10">Belum ada transaksi bulan ini.</p>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="p-3 bg-[#fffdfb] border border-orange-100/10 rounded-2xl flex items-center justify-between text-sm hover:border-[#e37b56]/20 transition-all">
                  <div className="space-y-0.5">
                    <p className="font-bold font-mono text-zinc-700 text-xs">{tx.invoice_number}</p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(tx.created_at).toLocaleTimeString("id-ID")} WIB • <span className="uppercase font-semibold text-[#e37b56]">{tx.payment_method}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold font-mono text-zinc-800 text-xs">
                    Rp {Number(tx.total).toLocaleString("id-ID")}
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KANAN: 5 PRODUK TERLARIS */}
        <div className="bg-white border border-orange-100/20 rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5 pl-1">Produk</h3>
          <div className="space-y-4">
            {stats.topProducts.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-10">Belum ada produk terjual.</p>
            ) : (
              stats.topProducts.map((product, idx) => {
                const maxQty = stats.topProducts[0]?.qty || 1;
                const percentage = Math.round((product.qty / maxQty) * 100);

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-zinc-700">
                      <span className="truncate max-w-[75%]">{product.name}</span>
                      <span className="text-[#e37b56] font-bold font-mono">{product.qty} Pcs</span>
                    </div>
                    <div className="w-full h-2 bg-orange-50 rounded-full overflow-hidden">
                      <div className="h-full bg-[#e37b56] rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
