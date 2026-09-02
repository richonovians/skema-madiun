/**
 * Menyalin teks ke papan klip, LENGKAP dengan jalan cadangan untuk konteks
 * yang tidak aman (non-secure context).
 *
 * KENAPA INI PERLU ADA.
 * `navigator.clipboard` hanya tersedia di secure context: HTTPS, atau
 * `localhost`. Seluruh pengujian proyek ini berjalan lewat
 * `http://skema.local` -- HTTP biasa dengan nama host yang BUKAN localhost --
 * dan di sana `navigator.clipboard` bernilai `undefined`. Memanggil
 * `navigator.clipboard.writeText(...)` di lingkungan itu melempar
 * "Cannot read properties of undefined (reading 'writeText')", yaitu galat
 * yang dilaporkan pada tombol Salin daftar survei (2 September 2026).
 *
 * Perlu ditegaskan karena mudah salah kira: itu BUKAN penolakan izin yang
 * bisa ditangkap dengan `try/catch` di sekitar `await`. Objeknya memang tak
 * pernah ada, jadi galat terjadi saat properti dibaca -- sebelum satu pun
 * janji terbentuk. Satu-satunya penjagaan yang benar adalah memeriksa
 * keberadaannya lebih dulu, seperti di bawah.
 *
 * Cadangannya `document.execCommand('copy')`. API itu memang sudah usang,
 * tetapi justru ialah satu-satunya yang bekerja di HTTP biasa -- dan HTTP
 * biasa itulah lingkungan demo di kantor, jadi membiarkan tombol salin mati
 * di sana sama dengan membiarkannya mati saat dipakai.
 *
 * @param {string} text teks yang hendak disalin
 * @returns {Promise<boolean>} true HANYA bila benar-benar tersalin, supaya
 *   pemanggil tak menampilkan "Tersalin" untuk sesuatu yang tak tersalin.
 */
export async function copyToClipboard(text) {
  const isi = String(text ?? '');
  if (!isi) return false;

  // Optional chaining pada `clipboard` DAN `writeText`: di HTTP biasa yang
  // pertama tak ada, dan di beberapa peramban lama objeknya ada tanpa metode
  // itu (hanya `readText`).
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(isi);
      return true;
    } catch {
      // Izin ditolak, atau dokumen tak sedang fokus. Bukan akhir -- jatuh ke
      // cadangan di bawah, yang tak bergantung pada izin apa pun.
    }
  }

  if (typeof document === 'undefined') return false;

  const kotak = document.createElement('textarea');
  kotak.value = isi;
  kotak.setAttribute('readonly', '');
  // DI LUAR LAYAR, TAPI TETAP DAPAT DIPILIH. `display:none`, `hidden`, atau
  // `visibility:hidden` membuat seleksi gagal tanpa suara, sehingga
  // execCommand menyalin string kosong. Karena itu dipakai posisi jauh di
  // luar tepi kiri, bukan disembunyikan.
  kotak.style.cssText = 'position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0';
  document.body.appendChild(kotak);

  try {
    kotak.focus();
    kotak.select();
    // Safari iOS mengabaikan `select()` pada elemen readonly; rentang eksplisit
    // inilah yang membuatnya ikut menyalin.
    kotak.setSelectionRange(0, isi.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    kotak.remove();
  }
}
