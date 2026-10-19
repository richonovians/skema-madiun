import React from 'react';
import { render } from '@testing-library/react';
import BuilderLayout from '../BuilderLayout';

/**
 * BUILDER MENGIKUTI LEBAR SIDEBAR (30 September 2026, laporan pengguna:
 * "tampilan builder survei ketika sidebar dikecilkan masih terlihat rusak").
 *
 * SEBABNYA TERUKUR, bukan diraba. BuilderLayout menutup layar dengan
 * `md:fixed md:inset-0 md:left-64`, dan 64 itu ditulis mati — berkas ini bahkan
 * tak mengimpor context layout sama sekali. Sementara itu sidebar beralih
 * `md:w-64` ↔ `md:w-20` dan kolom kontennya `md:ml-64` ↔ `md:ml-20`.
 *
 * Dengan `--spacing: .25rem` (diperiksa pada CSS yang benar-benar dihasilkan
 * dev server, sebab repo ini punya riwayat skala Tailwind yang dibajak token),
 * 64 = 256px dan 20 = 80px. Begitu sidebar diciutkan, builder tetap mulai di
 * 256px sementara sidebarnya hanya 80px: 176px ruang kosong di kiri, dan kanvas
 * menyempit sebanyak itu.
 *
 * NILAI CADANGANNYA WAJIB ADA. Berkas uji tetangga (BuilderSatuLayar) merender
 * BuilderLayout berdiri sendiri, tanpa sidebar mana pun yang menyetel
 * variabelnya. Tanpa `,16rem` di dalam `var()`, `left` menjadi kosong di sana
 * dan lapisan `fixed`-nya melar sampai tepi kiri layar.
 *
 * jsdom tak menerapkan CSS, jadi yang dijaga di sini kontrak kelasnya. Bahwa
 * ruang kosong itu benar-benar hilang dibuktikan di peramban, terpisah.
 */
describe('BuilderLayout — tepi kirinya mengikuti lebar sidebar', () => {
  const luar = () => render(<BuilderLayout>{<p>isi kanvas</p>}</BuilderLayout>).container.firstChild;

  it('TIDAK memakai angka lebar yang ditulis mati', () => {
    expect(luar().className).not.toMatch(/\bmd:left-(64|20)\b/);
  });

  it('membaca --lebar-sidebar', () => {
    expect(luar().className).toMatch(/\bmd:left-\[var\(--lebar-sidebar/);
  });

  it('punya nilai cadangan 16rem bila variabelnya belum disetel', () => {
    expect(luar().className).toMatch(/--lebar-sidebar,\s*16rem\)\]/);
  });

  it('lapisan layar-penuhnya tetap mulai md, tidak berubah', () => {
    // Penjaga: perbaikan tepi kiri tak boleh diam-diam mengubah kapan builder
    // menjadi lapisan `fixed` — itu perbaikan lain (16 September 2026) yang
    // ujinya ada di BuilderSatuLayar.test.jsx.
    const k = luar().className;

    expect(k).toMatch(/\bmd:fixed\b/);
    expect(k).toMatch(/\bmd:inset-0\b/);
    expect(k).not.toMatch(/(^|\s)fixed\b/);
  });
});
