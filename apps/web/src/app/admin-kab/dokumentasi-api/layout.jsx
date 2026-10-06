/**
 * Layout ini ADA HANYA UNTUK JUDULNYA, mengikuti pola seluruh halaman
 * `admin-kab` lain.
 *
 * Halamannya komponen klien, dan komponen klien tak boleh mengekspor
 * `metadata`. Layout boleh menjadi komponen server walau anaknya tidak, jadi di
 * sinilah judulnya tinggal.
 *
 * Judul halaman adalah penanda lokasi utama bagi pembaca layar: ia diumumkan
 * setiap kali pengguna pindah halaman. Ketiadaannya ditangkap
 * `src/app/__tests__/judul-dan-pengindeksan.test.js`, dan memang itulah yang
 * memerah saat halaman ini pertama kali dibuat tanpa layout.
 */
export const metadata = {
  title: 'Dokumentasi API',
};

export default function Layout({ children }) {
  return children;
}
