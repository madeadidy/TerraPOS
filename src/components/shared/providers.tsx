"use client";

import React, { useState } from "react"; // <-- Pastikan mengimpor useState
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  // WAJIB menggunakan rumus ini di Next.js App Router agar cache tidak hancur saat pindah page
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0, // Data langsung dianggap usang setelah diambil
            refetchOnWindowFocus: true, // Ambil data baru saat user kembali ke tab ini
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}