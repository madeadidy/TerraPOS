// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // 1. Buat respons awal Next.js
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Inisialisasi Supabase Client khusus Server/Middleware
  // Ini diperlukan untuk membaca & menyinkronkan token kuki (cookies) auth di background
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  // 3. Ambil data user yang sedang aktif secara aman dari database auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentPath = request.nextUrl.pathname;

  // 4. Definisikan daftar rute kasir internal yang wajib dikunci
  const isProtectedRoute =
    currentPath.startsWith("/pos") ||
    currentPath.startsWith("/dashboard") ||
    currentPath.startsWith("/produk") ||
    currentPath.startsWith("/riwayat");

  const isAuthRoute = currentPath === "/login" || currentPath === "/";

  // KONDISI A: Jika user BELUM login dan mencoba membobol halaman internal -> Tendang ke /login
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // KONDISI B: Jika user SUDAH login tapi iseng membuka halaman /login -> Alihkan langsung ke kasir /pos
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  return response;
}

// 5. Konfigurasi Matcher agar Middleware tidak membebani aset gambar/css statis
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};