/**
 * Layout ini ADA HANYA UNTUK JUDULNYA, mengikuti pola seluruh halaman
 * `admin-kab` lain: halamannya komponen klien, dan komponen klien tak boleh
 * mengekspor `metadata`.
 *
 * Judul halaman adalah penanda lokasi utama bagi pembaca layar -- ia diumumkan
 * setiap kali pengguna pindah halaman. Ketiadaannya ditangkap
 * `src/app/__tests__/judul-dan-pengindeksan.test.js`.
 */
export const metadata = {
  title: 'Statistik & Laporan',
};

export default function Layout({ children }) {
  return children;
}
