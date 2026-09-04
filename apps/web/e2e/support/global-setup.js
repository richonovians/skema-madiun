import { BASE_URL, ENV_ID, pastikanSurveiUji } from './api';
import { RUTE_UNTUK_PEMANASAN } from './rute';

/**
 * Disiapkan sekali sebelum worker mana pun menyala.
 *
 * Perubahan `process.env` di sini terwarisi oleh proses worker, jadi id survei
 * uji cukup dititipkan lewat variabel lingkungan — tanpa berkas perantara dan
 * tanpa dua worker berlomba membuat survei yang sama.
 */
export default async function globalSetup() {
  process.env[ENV_ID] = String(await pastikanSurveiUji());
  await panaskanRute();
}

/**
 * Minta setiap halaman sekali supaya `next dev` selesai mengompilasinya.
 *
 * Bukan penghias kecepatan, melainkan perbaikan atas kegagalan sungguhan.
 * Server pengembangan Next.js mengompilasi rute saat pertama diminta, dan
 * kunjungan pertama ke halaman berat pernah melewati batas 60 detik sehingga
 * spec merah. Gejalanya menyesatkan: yang merah BERPINDAH-PINDAH tiap kali
 * dijalankan — begitu satu rute selesai dikompilasi ia tak pernah lambat lagi,
 * lalu giliran rute berikutnya yang belum pernah dibuka. Mudah salah dibaca
 * sebagai proteksi route yang goyah, padahal kompilasilah yang lambat.
 *
 * Cookie di bawah sengaja PALSU. `proxy.js` hanya memeriksa ADA atau TIDAK
 * cookie sesinya — keabsahannya ditegakkan backend pada tiap panggilan API —
 * jadi cookie ini cukup untuk melewati penjaga navigasi agar halamannya
 * benar-benar dirender dan terkompilasi. Tak satu pun pernyataan uji
 * bergantung padanya: yang dihasilkan pemanasan ini semata-mata cache
 * kompilasi milik server pengembangan.
 */
async function panaskanRute() {
  const cookie = 'token=pemanasan; role=kabupaten; consent=1';
  await Promise.all(
    RUTE_UNTUK_PEMANASAN.map((rute) =>
      fetch(`${BASE_URL}${rute}`, { headers: { cookie } }).catch(() => {
        // Kegagalan di sini tak boleh menjatuhkan suite: pemanasan hanyalah
        // pengoptimalan. Bila servernya memang mati, spec-lah yang akan
        // mengatakannya dengan pesan yang jauh lebih jelas.
      }),
    ),
  );
}
