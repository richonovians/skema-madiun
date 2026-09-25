import React from 'react';
import AuthCallbackLoader from '@/features/authentication/components/AuthCallbackLoader';

export const metadata = {
  title: 'Menyelesaikan proses masuk',
  description: 'Halaman transisi setelah masuk lewat SSO Helpdesk Kabupaten Madiun.',
  // Halaman transisi murni: tak punya isi untuk dicari, dan alamatnya hanya
  // bermakna sebagai tujuan pengalihan dari Helpdesk.
  robots: { index: false, follow: false },
};

/**
 * Tujuan pengalihan backend setelah callback SSO (`WEB_APP_URL/sso/callback`).
 *
 * SENGAJA TANPA Navbar & Footer: halaman ini hanya dilihat beberapa ratus
 * milidetik sebelum pengguna diantar ke berandanya, dan Navbar di sini akan
 * menampilkan keadaan masuk yang belum selesai ditetapkan. Yang bertahan lebih
 * lama justru keadaan gagal — di situ pun kerangka halaman penuh tak menambah
 * apa pun selain pilihan yang sudah disediakan komponennya sendiri.
 *
 * TIDAK ikut dalam matcher proxy.js, dan itu wajib: pada saat halaman ini dibuka,
 * cookie `role` belum ditulis. Bila proxy menjaganya, pengguna yang baru saja
 * berhasil masuk justru akan dipantulkan ke beranda tepat sebelum sesinya selesai
 * disiapkan — lingkaran yang tak akan pernah dilewatinya.
 */
export default function SsoCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-lg">
      <AuthCallbackLoader />
    </main>
  );
}
