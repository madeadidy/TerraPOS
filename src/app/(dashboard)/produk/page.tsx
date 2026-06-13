"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NextImage from "next/image"; // <-- Import resmi Next Image untuk optimasi LCP
import { Plus, Pencil, Trash2, Loader2, Package, Search, Barcode, Layers, AlertTriangle, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  cost_price: number;
  selling_price: number;
  stock: number;
  category_id: string | null;
  image_url: string | null;
  categories: { name: string } | null;
}

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  category_id: string;
  cost_price: number;
  selling_price: number;
  stock: number;
}

export default function ProdukPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // State Modal Form (Tambah / Edit)
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // State Konfirmasi Hapus Premium
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Management File Unggah Foto & Pratinjau
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // State Input Form Terpusat
  const [form, setForm] = useState<ProductForm>({
    name: "",
    sku: "",
    barcode: "",
    category_id: "",
    cost_price: 0,
    selling_price: 0,
    stock: 0,
  });

  // 1. FETCH DATA PRODUK ASLI
  const { data: products = [], isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ["manage-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, barcode, cost_price, selling_price, stock, category_id, image_url, categories(name)")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Product[];
    },
    refetchOnMount: "always",
  });

  // 2. FETCH DATA KATEGORI
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["manage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  // FUNGSI PROSES UNGGAH GAMBAR KE SUPABASE STORAGE
  const uploadImageProcess = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error("Gagal unggah foto:", err);
      toast.error("Gagal mengunggah berkas gambar ke server storage.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // 3. MUTATION: TAMBAH / EDIT PRODUK + INTEGRASI FOTO
  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalImageUrl = selectedProduct ? selectedProduct.image_url : null;

      if (imageFile) {
        const uploadedUrl = await uploadImageProcess(imageFile);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const payload = {
        name: form.name,
        sku: form.sku || null,
        barcode: form.barcode || null,
        cost_price: form.cost_price,
        selling_price: form.selling_price,
        stock: form.stock,
        category_id: form.category_id || null,
        image_url: finalImageUrl,
      };

      if (selectedProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", selectedProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-products"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] }); 
      toast.success(selectedProduct ? "Produk berhasil diperbarui!" : "Produk berhasil ditambahkan!");
      setIsOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : "Gagal menyimpan produk.";
      toast.error(errorMsg);
    },
  });

  // 4. MUTATION: SOFT DELETE PRODUK
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-products"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      toast.success("Produk berhasil dihapus!");
      setProductToDelete(null);
    },
    onError: (error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : "Terjadi kesalahan keamanan RLS.";
      toast.error(`Gagal menghapus produk: ${errorMsg}`);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file terlalu besar! Maksimal ukuran gambar adalah 2MB.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file)); 
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setImageFile(null);
    setImagePreview("");
    setForm({
      name: "",
      sku: "",
      barcode: "",
      category_id: "",
      cost_price: 0,
      selling_price: 0,
      stock: 0,
    });
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setSelectedProduct(product);
    setImageFile(null);
    setImagePreview(product.image_url || ""); 
    setForm({
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      category_id: product.category_id || "",
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      stock: product.stock,
    });
    setIsOpen(true);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-6 font-sans relative">
      
      {/* HEADER PANEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-orange-50 text-[#e37b56] flex items-center justify-center rounded-lg">
              <Package className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800">Manajemen Produk</h1>
          </div>
          <p className="text-xs text-zinc-400">Kelola daftar produk, stok, dan skema harga tokomu secara aman.</p>
        </div>

        <button 
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#e37b56] hover:bg-[#d26c48] text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Tambah Produk
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan nama produk atau SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-11 pr-4 rounded-full bg-white border border-orange-100/40 shadow-sm text-xs focus:outline-none focus:ring-2 focus:ring-[#e37b56]/20 text-zinc-700"
        />
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-orange-100/30 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/20 text-[11px] font-bold text-white uppercase tracking-wider bg-[#e37b56]">
                <th className="py-4 px-6 font-semibold rounded-tl-[2rem]">Nama Produk</th>
                <th className="py-4 px-6 font-semibold"><span className="flex items-center gap-1"><Barcode className="h-3 w-3 text-orange-200" /> SKU / Barcode</span></th>
                <th className="py-4 px-6 font-semibold"><span className="flex items-center gap-1"><Layers className="h-3 w-3 text-orange-200" /> Kategori</span></th>
                <th className="py-4 px-6 font-semibold text-right">Harga Modal</th>
                <th className="py-4 px-6 font-semibold text-right">Harga Jual</th>
                <th className="py-4 px-6 font-semibold text-center">Stok</th>
                <th className="py-4 px-6 font-semibold text-center rounded-tr-[2rem]">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-orange-100/10 text-xs text-zinc-700">
              {isProductsLoading ? (
                <tr>
                  <td colSpan={7} className="text-center text-zinc-400 py-12 font-medium">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#e37b56] mb-2" />
                    Memuat data produk...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-zinc-400 py-12 font-medium">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-[#fffdfc]/60 transition-colors group">
                    
                    {/* FIXED LINT: Mengganti <img> dengan <NextImage /> bawaan Next.js */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-orange-50 border border-orange-100/20 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                          {product.image_url ? (
                            <NextImage src={product.image_url} alt={product.name} width={36} height={36} className="h-full w-full object-cover" unoptimized />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-orange-300" />
                          )}
                        </div>
                        <span className="font-bold text-zinc-800 tracking-tight">{product.name}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono text-[10px] text-zinc-400 space-y-0.5">
                      <div><span className="font-semibold text-zinc-500">SKU:</span> {product.sku || "-"}</div>
                      <div><span className="font-semibold text-zinc-500">Bar:</span> {product.barcode || "-"}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-[#e37b56] border border-orange-100/30">
                        {product.categories?.name || "Tanpa Kategori"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-medium text-zinc-400">
                      Rp {product.cost_price.toLocaleString("id-ID")}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-emerald-600 text-sm">
                      Rp {product.selling_price.toLocaleString("id-ID")}
                    </td>
                    <td className="py-4 px-6 text-center font-bold font-mono">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-xs ${product.stock < 5 ? "bg-red-50 text-red-500 animate-pulse" : "text-zinc-800"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleOpenEditModal(product)}
                          className="h-8 w-8 rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-[#e37b56] hover:border-[#e37b56]/40 flex items-center justify-center transition-all shadow-sm hover:scale-105"
                          title="Ubah Produk"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => setProductToDelete(product)} 
                          className="h-8 w-8 rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-red-500 flex items-center justify-center transition-all shadow-sm hover:scale-105"
                          title="Hapus Produk"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* FORM MODAL DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-orange-100/30 rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <DialogHeader className="pb-2 border-b border-orange-100/10">
            <DialogTitle className="font-bold text-zinc-800 text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-[#e37b56]" />
              {selectedProduct ? "Edit Detail Produk" : "Tambah Produk Baru"}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-zinc-400 mt-0.5">Masukkan spesifikasi produk retail toko beserta foto menu di bawah ini.</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 text-xs"
          >
            {/* KOTAK UNGGAH FOTO PRODUK */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Foto Menu Produk</label>
              <div className="flex items-center gap-4 bg-[#fffdfb] border border-dashed border-orange-100/60 p-3.5 rounded-2xl">
                
                {/* FIXED LINT: Mengganti <img> dengan <NextImage /> bawaan Next.js */}
                <div className="h-16 w-16 rounded-xl bg-orange-50/50 border border-orange-100/30 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                  {imagePreview ? (
                    <NextImage src={imagePreview} alt="Preview" width={64} height={64} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-orange-200" />
                  )}
                </div>

                <div className="space-y-1 flex-1">
                  <label htmlFor="product-photo-upload" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100/80 text-[#e37b56] border border-orange-100/20 font-bold text-[11px] cursor-pointer transition-all">
                    <Upload className="h-3.5 w-3.5" />
                    {imagePreview ? "Ganti Foto" : "Pilih Foto Menu"}
                  </label>
                  <input id="product-photo-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <p className="text-[9px] text-zinc-400">Format: JPG, PNG. Maksimal ukuran berkas 2MB.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Nama Produk *</label>
              <Input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Kopi Cappuccino XL" className="h-10 rounded-full border-orange-100/40 bg-[#fffdfb] px-4" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">SKU</label>
                <Input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="KPC-001" className="h-10 rounded-full border-orange-100/40 bg-[#fffdfb] px-4" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Barcode Bar</label>
                <Input type="text" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="89912345..." className="h-10 rounded-full border-orange-100/40 bg-[#fffdfb] px-4" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Kategori Produk</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="flex h-10 w-full rounded-full border border-orange-100/40 bg-[#fffdfb] px-4 py-2 text-xs text-zinc-700 focus:outline-none"
              >
                <option value="">-- Pilih Kategori --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Harga Modal *</label>
                <Input type="number" required value={form.cost_price || ""} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} placeholder="0" className="h-10 rounded-full border-orange-100/40 bg-[#fffdfb] font-mono px-4" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Harga Jual *</label>
                <Input type="number" required value={form.selling_price || ""} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} placeholder="0" className="h-10 rounded-full border-orange-100/40 bg-[#fffdfb] font-mono px-4" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Stok *</label>
                <Input type="number" required value={form.stock || ""} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} placeholder="0" className="h-10 rounded-full border-orange-100/40 bg-[#fffdfb] font-mono px-4" />
              </div>
            </div>

            <div className="pt-3 flex gap-2 justify-end border-t border-orange-100/10">
              <button type="button" onClick={() => setIsOpen(false)} disabled={saveMutation.isPending || isUploading} className="h-10 px-5 rounded-full bg-zinc-100 text-zinc-500 font-bold text-xs">Batal</button>
              <button type="submit" disabled={saveMutation.isPending || isUploading} className="h-10 px-6 rounded-full bg-[#e37b56] text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5">
                {saveMutation.isPending || isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simpan Produk"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION BOX HAPUS KUSTOM */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-orange-100/30 p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-inner">
              <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-zinc-800 text-base">Hapus Produk Ini?</h3>
              {/* FIXED LINT: Mengganti tanda petik mentah (") dengan entitas &ldquo; dan &rdquo; */}
              <p className="text-xs text-zinc-400 leading-relaxed px-2">
                Tindakan ini akan menghapus <span className="font-bold text-zinc-700">&ldquo;{productToDelete.name}&rdquo;</span> dari daftar katalog aktif toko kasir.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-orange-100/10">
              <button type="button" onClick={() => setProductToDelete(null)} disabled={deleteMutation.isPending} className="h-10 rounded-full bg-zinc-50 text-zinc-500 text-xs font-bold">Batalkan</button>
              <button type="button" onClick={() => deleteMutation.mutate(productToDelete.id)} disabled={deleteMutation.isPending} className="h-10 rounded-full bg-red-500 text-white text-xs font-bold shadow-md">
                {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}