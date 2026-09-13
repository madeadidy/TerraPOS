"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // FUNGSI LOGIN VIA GOOGLE OAUTH
  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/pos`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal terhubung ke Google.");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!name) throw new Error("Nama lengkap wajib diisi.");
        if (password !== confirmPassword) throw new Error("Konfirmasi password tidak cocok.");
        if (!agreeTerms) throw new Error("Anda harus menyetujui syarat dan ketentuan.");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Pendaftaran berhasil! Silakan cek email atau langsung masuk.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Selamat datang kembali!");

        // Memaksa browser reload bersih agar kuki auth langsung terbaca oleh middleware
        window.location.href = "/pos";
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fdf9f6] font-sans">
      {/* PANEL KIRI: BRANDING UTAMA (DESKTOP) */}
      <div
        className="relative hidden lg:block lg:w-1/2 h-full bg-cover bg-center select-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop')`,
        }}
      >
        <div className="absolute inset-0 bg-[#e37b56]/85 mix-blend-multiply z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#e37b56]/40 via-transparent to-black/50 z-0" />

        <div className="absolute inset-0 flex flex-col justify-between p-12 text-white z-10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-wider uppercase">Kasir Modern</span>
          </div>
          <div className="space-y-3 max-w-md">
            <h2 className="text-3xl font-bold leading-tight">Kelola Penjualan Tokomu Lebih Cepat & Mudah.</h2>
            <p className="text-orange-100 text-sm leading-relaxed">Sistem POS interaktif yang dirancang khusus untuk efisiensi transaksi, manajemen stok real-time, dan laporan laba otomatis.</p>
          </div>
          <p className="text-xs text-orange-200/80">© 2026 Kasir Modern Ecosystem.</p>
        </div>

        <div className="absolute top-0 right-[-2px] h-full w-[80px] z-20 text-[#fdf9f6] fill-current">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100,0 C40,20 60,40 30,60 C10,75 40,90 100,100 Z" />
          </svg>
        </div>
      </div>

      {/* PANEL KANAN: FORM UTAMA */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-center px-6 sm:px-12 md:px-20 overflow-y-auto py-12">
        <div className="max-w-xl w-full mx-auto space-y-6">
          <div className="text-center lg:text-left space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold text-zinc-800 tracking-tight">{isSignUp ? "Hello ! Welcome Aboard" : "Hello ! Welcome Back"}</h1>
            <p className="text-zinc-500 text-sm font-medium">{isSignUp ? "We are Glad to see you 😊" : "Good to see you again 😊"}</p>
          </div>

          {/* TOMBOL GOOGLE LOGIN TUNGGAL (FULL WIDTH) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-full bg-white hover:bg-zinc-50 shadow-sm border border-zinc-200/70 transition-all text-xs font-semibold text-zinc-700 px-4 hover:border-zinc-300 active:scale-[0.99]"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#e37b56]" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            <span>{isSignUp ? "Daftar dengan akun Google" : "Masuk dengan akun Google"}</span>
          </button>

          <div className="flex items-center justify-center gap-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            <div className="h-[1px] flex-1 bg-zinc-200" />
            <span>atau email</span>
            <div className="h-[1px] flex-1 bg-zinc-200" />
          </div>

          {/* MAIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`grid gap-4 ${isSignUp ? "sm:grid-cols-2" : "grid-cols-1"}`}>
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 ml-4">Nama Lengkap</label>
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Lengkap Anda"
                    className="h-12 rounded-full border-zinc-200 bg-[#fffdfb] px-5 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-[#e37b56] focus-visible:border-[#e37b56]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 ml-4">Alamat Email</label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-12 rounded-full border-zinc-200 bg-[#fffdfb] px-5 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-[#e37b56] focus-visible:border-[#e37b56]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 ml-4">Password</label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-full border-zinc-200 bg-[#fffdfb] px-5 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-[#e37b56] focus-visible:border-[#e37b56]"
                />
              </div>

              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 ml-4">Konfirmasi Password</label>
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 rounded-full border-zinc-200 bg-[#fffdfb] px-5 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-[#e37b56] focus-visible:border-[#e37b56]"
                  />
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="flex items-center gap-3 pt-1 ml-2">
                <input type="checkbox" id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-[#e37b56] focus:ring-[#e37b56]" />
                <label htmlFor="terms" className="text-xs text-zinc-600 font-medium select-none cursor-pointer">
                  Saya menyetujui syarat layanan dan kebijakan privasi
                </label>
              </div>
            )}

            <Button type="submit" disabled={isLoading || isGoogleLoading} className="w-full h-12 rounded-full text-white font-semibold shadow-md transition-all duration-300 transform active:scale-95 text-sm mt-2 bg-[#e37b56] hover:bg-[#d06945]">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : isSignUp ? "Daftar Akun" : "Masuk"}
            </Button>
          </form>

          <div className="text-center pt-2">
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors">
              {isSignUp ? (
                <>
                  Sudah memiliki akun? <span className="text-[#e37b56] font-bold underline">Masuk di sini</span>
                </>
              ) : (
                <>
                  Belum punya akun? <span className="text-[#e37b56] font-bold underline">Daftar sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}