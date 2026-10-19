import { ALAMAT_SITUS, HALAMAN_PUBLIK } from '@/constants/situs';

/**
 * sitemap.xml (25 September 2026). Sebelumnya tak ada sama sekali.
 *
 * Isinya ditarik dari daftar yang SAMA dengan robots.txt. Bila keduanya punya
 * daftar sendiri-sendiri, cepat atau lambat keduanya berselisih -- dan yang
 * bocor adalah sitemap, yaitu justru bentuk yang paling mudah dibaca mesin.
 *
 * Halaman survei (`/survei/:id`, `/isi/:id`) SENGAJA tidak dimasukkan walau
 * dapat dibuka tanpa masuk. Tautannya disebarkan lewat poster QR dan kanal
 * resmi, bukan lewat pencarian, dan survei yang sudah ditutup tak berguna
 * ditemukan orang berbulan-bulan kemudian.
 */
export default function sitemap() {
  const sekarang = new Date();

  return HALAMAN_PUBLIK.map((jalur) => ({
    url: new URL(jalur, ALAMAT_SITUS).toString(),
    lastModified: sekarang,
    changeFrequency: jalur === '/statistics' ? 'daily' : 'monthly',
    priority: jalur === '/' ? 1 : 0.7,
  }));
}
