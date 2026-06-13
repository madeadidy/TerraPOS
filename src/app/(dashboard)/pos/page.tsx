"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NextImage from "next/image";
import { 
  Search, 
  ShoppingCart, 
  Minus, 
  Plus, 
  Tag, 
  Banknote, 
  QrCode, 
  Loader2 
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  cost_price: number;
  selling_price: number;
  stock: number;
  category_id: string;
  categories: { name: string } | null;
  image_url?: string;
}

interface CartItem {
  id: string;
  name: string;
  selling_price: number;
  qty: number;
}

interface TransactionReceipt {
  invoiceNumber: string;
  discount: number;
  tax: number;
  total: number;
  cashAmount: number;
  change: number;
  items: Array<{ name: string; qty: number; price: number }>;
}

export default function POSPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [cashAmount, setCashAmount] = useState(0);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionReceipt | null>(null);

  // 1. FETCH DATA PRODUK ASLI DARI SUPABASE
  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ["pos-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, barcode, cost_price, selling_price, stock, category_id, categories(name), image_url")
        .eq("is_deleted", false)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  // MUTATION BARU: Kirim data transaksi riil & kurangi stok di database
  const checkoutMutation = useMutation({
    mutationFn: async (variables: { invoice: string; method: string; cash: number }) => {
      const itemsPayload = cart.map((item) => ({
        product_id: item.id,
        qty: item.qty,
        subtotal: item.selling_price * item.qty,
      }));

      const { data, error: rpcError } = await supabase.rpc("checkout_pos_transaction", {
        p_invoice_number: variables.invoice,
        p_total: total,
        p_payment_method: variables.method.toUpperCase(),
        p_discount: globalDiscount,
        p_tax: tax,
        p_items: itemsPayload,
      });

      if (rpcError) throw rpcError;
      return variables;
    },
    onSuccess: (variables) => {
      // Segarkan data produk (agar stok terbaru langsung ter-render di etalase kasir)
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      queryClient.invalidateQueries({ queryKey: ["manage-products"] });

      setLastTransaction({
        invoiceNumber: variables.invoice,
        discount: globalDiscount,
        tax,
        total,
        cashAmount: variables.cash,
        change: variables.method === "cash" ? variables.cash - total : 0,
        items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.selling_price })),
      });

      setIsPayModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      setGlobalDiscount(0);
      toast.success("Transaksi sukses tercatat ke database!");
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : "Gagal memproses transaksi.";
      toast.error(`Eror Database: ${errMsg}`);
    },
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery]);

  const addItem = (product: Product) => {
    const existingInCart = cart.find((i) => i.id === product.id);
    const currentQty = existingInCart ? existingInCart.qty : 0;

    // Proteksi Kasir: Mencegah penjualan melebihi batas stok gudang Supabase
    if (currentQty >= product.stock) {
      toast.error(`Stok tidak mencukupi! Batas maksimum produk ini adalah ${product.stock} pcs.`);
      return;
    }

    setCart((prev) => {
      if (existingInCart) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: product.id, name: product.name, selling_price: product.selling_price, qty: 1 }];
    });
    toast.success(`${product.name} masuk keranjang`, { duration: 800 });
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQty = (id: string, newQty: number) => {
    const targetProduct = products.find((p) => p.id === id);
    if (targetProduct && newQty > targetProduct.stock) {
      toast.error(`Gagal mengubah jumlah. Stok tersedia hanya ${targetProduct.stock} pcs.`);
      return;
    }
    if (newQty <= 0) {
      removeItem(id);
      return;
    }
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, qty: newQty } : item)));
  };

  const clearCart = () => setCart([]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.selling_price * item.qty, 0), [cart]);
  const tax = useMemo(() => Math.round((subtotal - globalDiscount) * 0.11), [subtotal, globalDiscount]);
  const total = useMemo(() => Math.max(0, subtotal - globalDiscount + tax), [subtotal, globalDiscount, tax]);

  const handleOpenPayment = () => {
    if (cart.length === 0) {
      toast.error("Keranjang belanja masih kosong.");
      return;
    }
    setCashAmount(0);
    setIsPayModalOpen(true);
  };

  const handleProcessCashPayment = () => {
    if (cashAmount < total) {
      toast.error("Uang yang diterima kurang dari total tagihan.");
      return;
    }
    checkoutMutation.mutate({
      invoice: `INV-${Date.now()}`,
      method: "cash",
      cash: cashAmount,
    });
  };

  const handleProcessQrisPayment = () => {
    checkoutMutation.mutate({
      invoice: `INV-${Date.now()}`,
      method: "qris",
      cash: total,
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-[#fffdfa] md:flex-row font-sans antialiased overflow-hidden">
      
      {/* KIRI: GRID KATALOG PRODUK */}
      <div className="flex flex-1 flex-col p-4 md:p-6 min-h-0 bg-[#fffdfa]">
        <div className="relative mb-5 flex-shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input 
            type="text" 
            placeholder="Cari produk berdasarkan nama, SKU, atau barcode..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-11 h-11 rounded-full border-orange-100/40 bg-white text-xs shadow-sm focus-visible:ring-[#e37b56]/20 text-zinc-700" 
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center text-zinc-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#e37b56]" />
              <p className="text-xs font-medium">Sinkronisasi Database Menu...</p>
            </div>
          ) : error ? (
            <div className="flex h-40 flex-col items-center justify-center text-red-500 text-xs font-mono">
              <p>Gagal memuat produk. Periksa hak RLS Supabase kamu.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-zinc-300 text-xs font-medium">
              <p>Produk tidak ditemukan di etalase.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 pb-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white border rounded-[1.8rem] overflow-hidden shadow-sm flex flex-col justify-between transition-all group ${
                    product.stock <= 0 
                      ? "opacity-50 border-zinc-200 pointer-events-none" 
                      : "cursor-pointer border-orange-100/30 hover:border-[#e37b56]/50 hover:scale-[1.01]"
                  }`}
                  onClick={() => addItem(product)}
                >
                  <div className="relative w-full h-32 bg-gradient-to-br from-orange-50/60 to-orange-100/20 flex items-center justify-center overflow-hidden border-b border-orange-100/10">
                    {product.image_url ? (
                      <NextImage 
                        src={product.image_url} 
                        alt={product.name}
                        width={280}
                        height={128}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                        priority
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-orange-200">
                        <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shadow-sm text-[#e37b56] font-bold text-sm">
                          {product.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">No Photo</span>
                      </div>
                    )}
                    
                    <span className="absolute top-2 left-2 text-[9px] font-bold text-[#e37b56] bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">
                      {product.categories?.name || "Umum"}
                    </span>
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                    <h3 className="text-xs font-bold text-zinc-800 line-clamp-2 min-h-[32px] group-hover:text-[#e37b56] transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="flex justify-between items-end pt-1.5 border-t border-dashed border-orange-100/20">
                      <div className="min-w-0">
                        <p className="text-[9px] text-zinc-400">Harga Jual</p>
                        <p className="text-xs font-bold font-mono text-emerald-600">
                          Rp {Number(product.selling_price).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <span className={`text-[9px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded ${product.stock < 5 ? "bg-red-50 text-red-500 font-bold" : "text-zinc-400"}`}>
                        {product.stock <= 0 ? "Habis" : `Stok: ${product.stock}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KANAN: PANEL KERANJANG */}
      <div className="w-full md:w-[400px] bg-white border border-orange-100/30 rounded-[2.5rem] p-5 shadow-lg flex flex-col h-[calc(100vh-6rem)] m-4 flex-shrink-0 overflow-hidden relative">
        <div className="flex items-center justify-between pb-3 border-b border-orange-100/20 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-orange-50 text-[#e37b56] flex items-center justify-center rounded-xl">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-800 text-sm">Keranjang Belanja</h2>
              <p className="text-[10px] text-zinc-400 font-medium">{cart.length} macam produk</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-[10px] font-bold text-red-400 hover:text-red-500">
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-1 [&::-webkit-scrollbar]:hidden">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-zinc-300 space-y-2">
              <ShoppingCart className="h-10 w-10 stroke-[1.2]" />
              <p className="text-xs font-medium">Belum ada pesanan masuk.<br/>Klik menu produk di sisi kiri.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="p-3 bg-[#fffdfc] border border-orange-100/10 rounded-2xl flex items-center justify-between text-xs gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-zinc-800 truncate">{item.name}</h4>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Rp {item.selling_price.toLocaleString("id-ID")}</p>
                </div>

                <div className="flex items-center bg-white border border-orange-100/30 rounded-xl px-1 py-0.5 shadow-sm flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-lg text-zinc-400" onClick={() => (item.qty === 1 ? removeItem(item.id) : updateQty(item.id, item.qty - 1))}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-bold font-mono text-zinc-800 text-xs">{item.qty}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-lg text-zinc-400" onClick={() => updateQty(item.id, item.qty + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-auto border-t border-dashed border-orange-100/30 pt-3 space-y-3.5 flex-shrink-0 bg-white">
          <div className="flex justify-between text-xs text-zinc-500 px-0.5">
            <span>Subtotal Item</span>
            <span className="font-mono font-medium">Rp {subtotal.toLocaleString("id-ID")}</span>
          </div>
          
          <div className="flex items-center justify-between gap-4 px-0.5">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Tag className="h-3 w-3 text-orange-400" /> Diskon (Rp)
            </span>
            <Input 
              type="number" 
              className="h-8 w-28 text-right text-xs rounded-full border-orange-100/40 bg-[#fffdfb] font-mono" 
              value={globalDiscount || ""} 
              onChange={(e) => setGlobalDiscount(Number(e.target.value))} 
              placeholder="0" 
            />
          </div>

          <div className="flex justify-between text-xs text-zinc-500 px-0.5">
            <span>Pajak (11%)</span>
            <span className="font-mono font-medium">Rp {tax.toLocaleString("id-ID")}</span>
          </div>

          <div className="bg-[#fffdfb] border border-orange-100/10 p-3 rounded-2xl flex justify-between items-center text-sm font-bold">
            <span className="text-zinc-700">Total Akhir</span>
            <span className="font-mono text-base text-[#e37b56]">Rp {total.toLocaleString("id-ID")}</span>
          </div>

          <button 
            onClick={handleOpenPayment}
            disabled={cart.length === 0 || checkoutMutation.isPending}
            className="w-full bg-[#e37b56] hover:bg-[#d26c48] disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-bold py-3.5 rounded-2xl shadow-md text-xs uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
            Bayar Sekarang
          </button>
        </div>
      </div>

      {/* MODAL DIALOG PEMBAYARAN */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-orange-100/30 rounded-[2.5rem] p-6 shadow-2xl">
          <DialogHeader className="pb-2 border-b border-orange-100/10">
            <DialogTitle className="font-bold text-zinc-800 text-sm">Pilih Metode Pembayaran</DialogTitle>
            <DialogDescription className="text-[11px] text-zinc-400 mt-0.5">
              Total tagihan transaksi: <span className="font-bold font-mono text-[#e37b56]">Rp {total.toLocaleString("id-ID")}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <button 
              type="button"
              disabled={checkoutMutation.isPending}
              className={`h-20 rounded-2xl border flex flex-col gap-1.5 items-center justify-center transition-all ${
                paymentMethod === "cash" ? "bg-[#e37b56] border-[#e37b56] text-white shadow-sm" : "bg-white border-orange-100/30 text-zinc-600"
              }`}
              onClick={() => setPaymentMethod("cash")}
            >
              <Banknote className="h-5 w-5" />
              <span className="text-xs font-bold">Tunai / Cash</span>
            </button>
            <button
              type="button"
              disabled={checkoutMutation.isPending}
              className="h-20 rounded-2xl border bg-white border-orange-100/30 text-zinc-600 flex flex-col gap-1.5 items-center justify-center hover:border-orange-200"
              onClick={handleProcessQrisPayment}
            >
              {checkoutMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin text-[#e37b56]" /> : <QrCode className="h-5 w-5" />}
              <span className="text-xs font-bold">QRIS Digital</span>
            </button>
          </div>

          {paymentMethod === "cash" && (
            <div className="mt-2 space-y-4 border-t pt-4 border-orange-100/10 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Uang Diterima (Rp)</label>
                <Input 
                  type="number" 
                  placeholder="Masukkan nominal uang tunai..." 
                  value={cashAmount || ""} 
                  onChange={(e) => setCashAmount(Number(e.target.value))} 
                  className="h-10 rounded-full border-orange-100/40 bg-[#fffdfb] font-mono px-4 text-zinc-700" 
                />
              </div>

              <div className="rounded-2xl bg-[#fffdfb] border border-orange-100/10 p-3 flex justify-between items-center">
                <span className="text-zinc-500 font-medium">Kembalian:</span>
                <span className={`font-bold font-mono text-sm ${cashAmount - total >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  Rp {Math.max(0, cashAmount - total).toLocaleString("id-ID")}
                </span>
              </div>

              <button 
                onClick={handleProcessCashPayment}
                disabled={checkoutMutation.isPending}
                className="w-full bg-[#e37b56] hover:bg-[#d26c48] text-white font-bold py-3 rounded-2xl shadow-md text-xs flex items-center justify-center gap-2"
              >
                {checkoutMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Selesaikan Transaksi Tunai
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL STRUK DIGITAL */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-sm bg-white border border-orange-100/30 rounded-[2.5rem] p-6 shadow-2xl text-zinc-800">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-center font-bold text-base tracking-widest text-zinc-400 uppercase">Struk Belanja</DialogTitle>
          </DialogHeader>

          {lastTransaction && (
            <div className="space-y-4 text-[11px] font-mono">
              <div className="text-center border-b border-dashed border-orange-100/30 pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wide">Toko Kasir Modern</h3>
                <p className="text-zinc-400 text-[10px] mt-0.5">Jl. Pahlawan No. 123</p>
                <p className="text-zinc-400 text-[9px] mt-2">No: {lastTransaction.invoiceNumber}</p>
                <p className="text-zinc-400 text-[9px]">Tgl: {new Date().toLocaleDateString("id-ID")} • {new Date().toLocaleTimeString("id-ID")} WITA</p>
              </div>

              <div className="space-y-2 border-b border-dashed border-orange-100/30 pb-3">
                {lastTransaction.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="max-w-[70%]">
                      <p className="font-bold text-zinc-700">{item.name}</p>
                      <p className="text-zinc-400 text-[10px] mt-0.5">
                        {item.qty} x Rp {item.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="font-bold text-zinc-700">Rp {(item.qty * item.price).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-right border-b border-dashed border-orange-100/30 pb-3 text-zinc-500">
                <div className="flex justify-between">
                  <span>Diskon Potongan:</span>
                  <span className="text-emerald-600 font-bold">-Rp {lastTransaction.discount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pajak (11%):</span>
                  <span>Rp {lastTransaction.tax.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-bold text-zinc-800 pt-1 text-xs">
                  <span>Total Akhir:</span>
                  <span className="text-[#e37b56]">Rp {lastTransaction.total.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-right text-zinc-500">
                <div className="flex justify-between">
                  <span>Jumlah Tunai:</span>
                  <span>Rp {lastTransaction.cashAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-bold text-zinc-800">
                  <span>Uang Kembalian:</span>
                  <span className="text-emerald-600">Rp {lastTransaction.change.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="pt-3 flex gap-2 no-print">
                <Button variant="outline" className="flex-1 rounded-full border-orange-100/40 text-xs h-9 font-bold text-zinc-500" onClick={() => window.print()}>
                  Cetak Struk
                </Button>
                <Button className="flex-1 rounded-full bg-[#e37b56] hover:bg-[#d26c48] text-xs h-9 font-bold" onClick={() => setIsReceiptModalOpen(false)}>
                  Selesai
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}