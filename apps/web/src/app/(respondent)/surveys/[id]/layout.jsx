/**
 * Layout ini ADA HANYA UNTUK JUDULNYA (25 September 2026).
 *
 * Halamannya komponen klien, dan komponen klien tak boleh mengekspor
 * `metadata`. Merender `<title>` langsung dari sana sudah dicoba di peramban
 * sungguhan dan gagal: `document.title` tetap memakai judul root layout, dan
 * halamannya berakhir dengan tiga tag `<title>`. Layout boleh menjadi komponen
 * server walau anaknya tidak, jadi di sinilah judulnya tinggal.
 *
 * Judul halaman adalah penanda lokasi utama bagi pembaca layar: ia diumumkan
 * setiap kali pengguna pindah halaman.
 */
export const metadata = {
  // Nama situs DITULIS DI SINI, tidak diserahkan ke `template` root layout:
  // `surveys/layout.jsx` di atasnya mengisi `title` dengan string biasa, dan
  // itu memutus pewarisan template. Terukur di Chrome 12 November 2026 --
  // `'Isi Survei'` saja tampil sebagai "Isi Survei" tanpa nama situs.
  title: 'Isi Survei - SKEMA Madiun',
};

export default function Layout({ children }) {
  return children;
}
