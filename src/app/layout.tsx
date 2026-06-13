// src/app/layout.tsx
import type { Metadata } from "next"; // <-- Diubah dari "navigator" menjadi "next"
import "./globals.css";
import Providers from "@/components/shared/providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: "TerraPOS",
  description: "Sistem Point of Sale Retail & UMKM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <Providers>
          {children}
        </Providers>
        
        {/* 2. Muat Snap JS Midtrans secara global */}
        <Script
          src={process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL}
          data-client-key={process.env.MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}