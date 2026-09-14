'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

/**
 * Kode penolakan yang dikirim backend saat persetujuan PDP belum diberikan.
 * Diketik ulang di sini karena frontend tak mengimpor apa pun dari apps/api;
 * pasangannya `CONSENT_REQUIRED` di consent.service.ts, dan keduanya dijaga
 * uji e2e yang menembak endpoint sungguhan.
 */
export const KODE_PERSETUJUAN_DIBUTUHKAN = 'CONSENT_REQUIRED';

/**
 * Tombol menuju halaman persetujuan, dipasang di bawah pesan galat 403
 * (permintaan pengguna 14 September 2026).
 *
 * SEBELUMNYA pesannya sendiri yang menyuruh: "Buka halaman Persetujuan terlebih
 * dahulu." Kalimat itu memberi tahu ke mana harus pergi tanpa memberi jalan ke
 * sana -- warga harus menebak alamatnya sendiri, tepat pada saat ia baru saja
 * gagal mengirim.
 *
 * HANYA tombolnya yang dibagikan, bukan kotak galatnya: kedua layar pemakainya
 * punya gaya galat yang berbeda (kotak berlatar pada form pengaduan, teks
 * terpusat pada pengisian survei), dan menyeragamkannya berarti mengubah
 * tampilan galat lain yang tak diminta siapa pun.
 */
export default function ConsentRequiredAction({ className = '' }) {
  return (
    <Link
      href="/persetujuan"
      className={`inline-flex items-center gap-sm px-lg py-sm rounded-lg border border-current text-sm font-bold hover:bg-current/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-current ${className}`.trim()}
    >
      <ShieldCheck size={16} aria-hidden="true" />
      Buka Halaman Persetujuan
    </Link>
  );
}
