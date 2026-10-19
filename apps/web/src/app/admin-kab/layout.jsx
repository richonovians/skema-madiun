import React from 'react';
import AdminKabLayout from '@/components/layouts/AdminKabLayout';

// TIDAK BOLEH TERINDEKS (25 September 2026). Lapisan kedua di samping
// robots.txt, dan keduanya bekerja pada tahap yang BERBEDA: robots.txt
// menghentikan perayapan, `noindex` menghentikan penayangan. URL yang
// ditautkan dari tempat lain tetap dapat muncul di hasil pencarian walau tak
// pernah dirayapi, dan itulah yang ditutup di sini.
//
// Perlu diketahui batasnya, supaya tak dikira saling menguatkan: bila sebuah
// URL dilarang di robots.txt, perayap yang tertib tak pernah membacanya,
// sehingga `noindex` ini pun tak pernah terlihat olehnya. Keduanya dipasang
// karena menutup keadaan yang berbeda, bukan karena bertumpuk.
const TANPA_INDEKS = { index: false, follow: false, nocache: true };

export const metadata = {
  robots: TANPA_INDEKS,
  title: 'Admin Kabupaten',
  description: 'Executive Dashboard untuk Administrator Kabupaten',
};

// `export const dynamic = 'force-dynamic'` DIHAPUS (2026-08-19): satu-satunya
// alasannya adalah `useSearchParams` di AdminKabNavbar, dan penyaring navbar kini
// memakai context (AdminKabLayoutProvider) alih-alih query param -- tak ada lagi
// pembaca useSearchParams di seluruh pohon admin-kab, jadi tak ada bailout
// prerender CSR yang perlu dihindari.

export default function Layout({ children }) {
  return (
    <AdminKabLayout>
      {children}
    </AdminKabLayout>
  );
}
