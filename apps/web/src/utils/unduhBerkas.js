/**
 * Unduh berkas dari API dan simpan dengan nama aslinya.
 *
 * KENAPA TIDAK CUKUP `<a download href="...">`: atribut `download` DIABAIKAN
 * peramban untuk URL lintas-origin. Frontend (skema.local / :3000) mengambil
 * lampiran dari API (:3001 / api.*), jadi tautan biasa hanya MEMBUKA berkasnya
 * di tab baru dengan nama acak alih-alih menyimpannya. Karena itu berkasnya
 * diambil lewat `fetch` lalu disimpan sebagai blob.
 *
 * Ini hanya mungkin karena `/uploads` mengirim header CORS -- terukur
 * `Access-Control-Allow-Origin: http://skema.local` (app.setup.ts `enableCors`
 * berlaku juga bagi rute statis). Kalau kelak CORS di sana diperketat, unduhan
 * ini yang pertama patah, dan gejalanya adalah galat jaringan, bukan 403.
 */

/** Pesan untuk tautan yang sudah kedaluwarsa — dapat dikerjakan pengguna. */
export const PESAN_KEDALUWARSA =
  'Tautan lampiran sudah kedaluwarsa. Muat ulang halaman ini, lalu coba unduh lagi.';

/**
 * Simpan blob sebagai berkas bernama `namaBerkas`.
 *
 * Dipisah dari pengambilannya supaya dapat diuji tanpa jaringan, dan supaya
 * pemanggil yang SUDAH memegang blob (mis. ekspor CSV) dapat memakainya juga.
 */
export function simpanBlob(blob, namaBerkas) {
  const objectUrl = URL.createObjectURL(blob);
  const tautan = document.createElement('a');
  tautan.href = objectUrl;
  tautan.setAttribute('download', namaBerkas);
  // Ditempel ke dokumen dulu: beberapa peramban mengabaikan klik pada elemen
  // yang belum terpasang. Dibuang lagi di `finally` supaya satu unduhan yang
  // gagal tak meninggalkan tautan tersembunyi menumpuk di halaman.
  document.body.appendChild(tautan);
  try {
    tautan.click();
  } finally {
    document.body.removeChild(tautan);
    // Tanpa ini setiap unduhan menahan seluruh berkas di memori tab sampai
    // halamannya ditutup -- pada lampiran 5MB itu terasa.
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Ambil berkas dari `url` (boleh bertanda tangan & berbatas waktu) lalu simpan.
 *
 * Melempar `Error` berpesan siap-tampil. 403 DIBEDAKAN karena artinya spesifik
 * dan dapat dikerjakan pengguna: tanda tangannya kedaluwarsa, dan memuat ulang
 * halaman menerbitkan tautan baru.
 */
export async function unduhDariUrl(url, namaBerkas) {
  let res;
  try {
    // `credentials: 'omit'` -- tanda tangan pada URL SUDAH kredensialnya, jadi
    // tak ada alasan mengirim cookie sesi ke rute statis.
    res = await fetch(url, { credentials: 'omit' });
  } catch {
    // `fetch` melempar hanya pada kegagalan jaringan/CORS, bukan pada status 4xx.
    throw new Error('Gagal mengunduh lampiran: tidak dapat menghubungi server.');
  }

  if (res.status === 403) {
    throw new Error(PESAN_KEDALUWARSA);
  }
  if (!res.ok) {
    throw new Error(`Gagal mengunduh lampiran (kode ${res.status}).`);
  }

  simpanBlob(await res.blob(), namaBerkas);
}
