import React from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';

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
  title: 'Admin OPD',
  description: 'Portal Analitik Admin OPD Kabupaten Madiun',
};

export default function AdminOPDLayout({ children }) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
