"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Search, History, Eye, Calendar, CreditCard, QrCode, Banknote, CheckCircle2, Clock, Loader2 } from "lucide-react";

interface Transaction {
  id: string;
  invoice_number: string;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

export default function RiwayatTransaksiPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // 1. FETCH LIVE DATA TRANSAKSI DARI SUPABASE
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["history-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("id, invoice_number, total, payment_method, payment_status, created_at").order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });

  // 2. FILTER PENCARIAN REAL-TIME BERDASARKAN NOMOR INVOICE
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [transactions, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#e37b56]" />
        <p className="text-xs font-medium">Memuat Arsip Nota Penjualan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 font-sans">
      {/* HEADER PANEL HALAMAN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-orange-50 text-[#e37b56] flex items-center justify-center rounded-lg">
              <History className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800">Riwayat Transaksi</h1>
          </div>
          <p className="text-xs text-zinc-400">Cari, audit, dan cetak ulang struk nota penjualan lawas.</p>
        </div>

        {/* BILAH PENCARIAN PIL PUTIH (MEREPLIKASI TOPBAR DESAIN BARU) */}
        <div className="relative w-full md:w-80 flex-shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor invoice..."
            className="w-full h-10 pl-11 pr-4 rounded-full bg-white border border-orange-100/40 shadow-sm text-xs focus:outline-none focus:ring-2 focus:ring-[#e37b56]/20 transition-all text-zinc-700 placeholder-zinc-400"
          />
        </div>
      </div>

      {/* KONTAINER UTAMA TABEL: Rounded Kapsul Lebar & Blended Background */}
      <div className="bg-white border border-orange-100/30 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* KAP KEPALA TABEL (HEADERS) */}
            <thead>
              <tr className="border-b border-white/20 text-[11px] font-bold text-white uppercase tracking-wider bg-[#e37b56]">
                {/* Menggunakan rounded-tl agar warna terracotta tidak menusuk keluar dari sudut melengkung tabel */}
                <th className="py-4 px-6 font-semibold rounded-tl-[2rem]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-orange-100" /> Tanggal & Waktu
                  </span>
                </th>
                <th className="py-4 px-6 font-semibold">Nomor Invoice</th>
                <th className="py-4 px-6 font-semibold">Metode Bayar</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold text-right">Total Tagihan</th>
                {/* Menggunakan rounded-tr untuk mengunci sudut kanan atas */}
                <th className="py-4 px-6 font-semibold text-center rounded-tr-[2rem]">Aksi</th>
              </tr>
            </thead>

            {/* BADAN TABEL (ROWS DATA) */}
            <tbody className="divide-y divide-orange-100/10 text-xs text-zinc-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-zinc-400 py-12 font-medium">
                    Tidak ditemukan data transaksi yang cocok.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const txDate = new Date(tx.created_at);
                  const formattedDate = txDate.toLocaleDateString("id-ID", { day: "numeric", month: "numeric", year: "numeric" });
                  const formattedTime = txDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

                  return (
                    <tr key={tx.id} className="hover:bg-[#fffdfc]/60 transition-colors group">
                      {/* KOLOM 1: TANGGAL & WAKTU */}
                      <td className="py-4 px-6">
                        <p className="font-semibold text-zinc-800">{formattedDate}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{formattedTime}</p>
                      </td>

                      {/* KOLOM 2: NOMOR INVOICE */}
                      <td className="py-4 px-6 font-bold font-mono text-zinc-700 tracking-tight">{tx.invoice_number}</td>

                      {/* KOLOM 3: METODE PEMBAYARAN */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 font-medium text-zinc-600">
                          {tx.payment_method.toLowerCase() === "qris" ? (
                            <QrCode className="h-3.5 w-3.5 text-blue-400" />
                          ) : tx.payment_method.toLowerCase() === "cash" ? (
                            <Banknote className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <CreditCard className="h-3.5 w-3.5 text-purple-400" />
                          )}
                          <span className="uppercase text-[11px] font-semibold">{tx.payment_method}</span>
                        </span>
                      </td>

                      {/* KOLOM 4: BADGE STATUS MODERN */}
                      <td className="py-4 px-6">
                        {tx.payment_status.toLowerCase() === "paid" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                            <CheckCircle2 className="h-3 w-3 stroke-[2.5]" /> PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100/50 animate-pulse">
                            <Clock className="h-3 w-3 stroke-[2.5]" /> PENDING
                          </span>
                        )}
                      </td>

                      {/* KOLOM 5: TOTAL TAGIHAN NOMINAL */}
                      <td className="py-4 px-6 text-right font-bold font-mono text-zinc-800 text-sm">Rp {Number(tx.total).toLocaleString("id-ID")}</td>

                      {/* KOLOM 6: TOMBOL AKSI KAPSUL MINIMALIS */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => toast.info(`Membuka berkas nota ${tx.invoice_number}`)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-zinc-50 hover:bg-[#e37b56] text-zinc-500 hover:text-white border border-zinc-200/60 hover:border-[#e37b56] text-[11px] font-bold transition-all shadow-sm group-hover:scale-105"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Lihat Struk
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
