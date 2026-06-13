# 🏪 POS Kasir Modern (Premium Autumn POS System)

Sebuah sistem Point of Sale (POS) Kasir Modern berbasis web yang dirancang dengan antarmuka premium bertema Autumn Terracotta. Aplikasi ini dibangun menggunakan Next.js (App Router) dan Supabase sebagai backend-as-a-service untuk mendukung operasional retail secara riil, cepat, dan aman.

---

## 🚀 Live Demo & Akses Uji Coba

Aplikasi ini telah dideploy secara publik dan siap diuji coba. 

🔗 Link Live Demo: [https://pos-kasir-modern.vercel.app](https://pos-kasir-modern.vercel.app)

### 🔑 Akun Demo Kasir
Untuk masuk dan menguji seluruh fitur operasional aplikasi, silakan gunakan kredensial berikut:
- Email: kasir@toko.com
- Password: kasir123

---

## ✨ Fitur Utama Aplikasi

* Dashboard Analisis Performa: Ringkasan omzet, total transaksi harian, serta Grafik Vektor SVG Interaktif yang memetakan tren naik-turun kuantitas produk terjual selama 7 hari terakhir.
* Kasir (POS) Pintar: Antarmuka belanja responsif yang dilengkapi foto menu produk, pencarian real-time (Nama/SKU/Barcode), manajemen keranjang belanja instan, kalkulasi otomatis (Diskon & Pajak 11%), serta modul pembayaran tunai/QRIS.
* Manajemen Katalog Produk: Sistem CRUD produk lengkap dengan Integrasi Supabase Storage untuk mengunggah dan memperbarui foto produk riil langsung ke cloud (Maks. 2MB).
* Riwayat Transaksi & Struk Digital: Catatan manifes transaksi yang aman dari Soft Delete database, disertai pop-up cetak struk belanja thermal kasir.
* Keamanan RLS Ketat: Seluruh komunikasi database dikunci rapat menggunakan Row Level Security (RLS) Supabase khusus untuk pengguna yang terautentikasi (authenticated role).

---

## 🛠️ Tech Stack (Teknologi yang Digunakan)

* Framework: Next.js (App Router, TypeScript)
* Database & Auth: Supabase (PostgreSQL, Storage Buckets, Row Level Security)
* State & Data Fetching: TanStack Query v5 (React Query)
* Styling: Tailwind CSS (Custom Premium Colors & Components)
* Icons & Toast: Lucide React & Sonner Toast

---

## 💻 Cara Menjalankan secara Lokal (Local Setup)

Jika Anda ingin menduplikasi proyek ini dan menjalankannya di komputer lokal, ikuti langkah-langkah berikut:

1. Clone Repositori
   Jalankan perintah berikut di terminal:
   git clone [https://github.com/username/pos-kasir-modern.git](https://github.com/username/pos-kasir-modern.git)
   cd pos-kasir-modern

2. Install Dependensi
   Instal semua pustaka yang dibutuhkan:
   npm install

3. Konfigurasi Environment Variables (.env.local)
   Buat sebuah file bernama .env.local di akar direktori proyek, lalu isi dengan kunci API Supabase Anda:
   NEXT_PUBLIC_SUPABASE_URL=[https://id-projek-anda.supabase.co](https://id-projek-anda.supabase.co)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

4. Jalankan Server Dev
   Nyalakan server lokal Next.js:
   npm run dev

   Buka http://localhost:3000 pada browser Anda untuk melihat hasilnya.

---

## 🗄️ Struktur Database Supabase (Referensi)

Aplikasi ini bekerja secara optimal dengan struktur tabel PostgreSQL berikut pada Supabase:
* categories: Menyimpan data nama kategori (id, name).
* products: Menyimpan katalog utama (id, name, sku, barcode, cost_price, selling_price, stock, category_id, image_url, is_deleted).
* transactions: Nota transaksi final (id, invoice_number, total, payment_method, payment_status).
* transaction_items: Relasi item terjual (id, transaction_id, product_id, qty, subtotal).
* Storage Bucket: product-images (Status: Public).

---
Contributed by I Made Adi Dharma Yasa