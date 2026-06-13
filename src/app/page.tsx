// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Otomatis arahkan pengunjung ke halaman login saat membuka web
  redirect('/login');
}