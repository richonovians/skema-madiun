/**
 * Menyalin teks ke papan klip, dengan jalur cadangan untuk origin tak aman.
 *
 * KENAPA CADANGANNYA WAJIB, dan ini terukur di peramban 6 Oktober 2026:
 * aplikasi ini dibuka di `http://skema.local`, yang `isSecureContext`-nya
 * `false`, sehingga `navigator.clipboard` bernilai `undefined`. Clipboard API
 * hanya hidup di HTTPS dan `localhost`; host kustom lewat HTTP polos tidak
 * termasuk. Tanpa cadangan, tombol salin mati di SELURUH lingkungan
 * pengembangan -- dan versi pertamanya memang mati tanpa suara, karena
 * galatnya ditelan `catch` kosong.
 *
 * `document.execCommand('copy')` sudah usang, tetapi ia satu-satunya jalur yang
 * bekerja di origin tak aman. Ia dipakai hanya sebagai cadangan, bukan jalur
 * utama.
 *
 * Mengembalikan `true`/`false`, tidak melempar: pemanggilnya WAJIB memberi
 * tahu pengguna saat gagal. Gagal diam-diam adalah cacat yang ini perbaiki.
 */
export async function salinTeks(teks) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(teks);
      return true;
    } catch {
      // Izin ditolak atau dokumen tak fokus: lanjut ke jalur cadangan.
    }
  }

  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false;
  }

  const kotak = document.createElement('textarea');
  kotak.value = teks;
  // Di luar layar, bukan `display:none` -- elemen tersembunyi tak dapat
  // diseleksi, dan `execCommand('copy')` menyalin dari seleksi.
  kotak.setAttribute('readonly', '');
  kotak.style.position = 'fixed';
  kotak.style.top = '-1000px';
  kotak.style.opacity = '0';

  document.body.appendChild(kotak);
  try {
    kotak.select();
    return document.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    kotak.remove();
  }
}
