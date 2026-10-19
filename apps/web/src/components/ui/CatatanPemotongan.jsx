import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Catatan bahwa daftar yang sedang dilihat TERPOTONG (15 Oktober 2026).
 *
 * Lima halaman admin mengambil 100 baris sekali lalu menyaring dan memaginasi
 * di klien; daftar pengaduan warga mengambil 50. Di atas batas itu sisanya tak
 * pernah terlihat, dan kendali paginasinya justru menghitung jumlah halaman
 * dari baris yang TERAMBIL, bukan dari `meta.pagination.total` -- sehingga ia
 * tampak lengkap padahal bukan.
 *
 * Akibat yang paling mudah terlewat bukan jumlah barisnya, melainkan
 * PENYARINGNYA: pencarian dan filter di halaman-halaman itu bekerja atas
 * seratus baris yang terambil, jadi baris yang cocok tetapi tak terambil tak
 * akan pernah muncul. Kalimat di bawah menyebutnya tersurat.
 *
 * Polanya meniru `ComplaintStatusBreakdown`, satu-satunya tempat yang sudah
 * berterus terang sebelum hari ini. Catatan di sana TIDAK diganti dengan
 * komponen ini: yang diterangkannya angka hasil hitungan atas irisan, bukan
 * daftar yang terpotong, dan kalimatnya memang berbeda.
 *
 * @param {number} ditampilkan Jumlah baris yang benar-benar dimuat.
 * @param {number} total `meta.pagination.total` dari backend. `0` berarti belum
 *   diketahui, dan ketiadaan data tidak boleh menjadi peringatan palsu.
 * @param {string} [namaItem] Mis. "pengaduan", "pengguna". Baku "data".
 * @param {boolean} [adaPenyaring] Sebut bahwa pencarian/penyaring di layar itu
 *   pun hanya bekerja atas baris yang terambil. Baku `false`, sebab dua dari
 *   empat pemakainya -- daftar pengaduan warga dan Riwayat Aktivitas -- tak
 *   punya penyaring sama sekali, dan kalimat itu akan mengklaim lebih dari
 *   kenyataan di sana.
 */
export default function CatatanPemotongan({
  ditampilkan = 0,
  total = 0,
  namaItem = 'data',
  adaPenyaring = false,
}) {
  if (total <= ditampilkan) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-start gap-1.5 text-[11px] text-amber-700 leading-relaxed"
    >
      <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        Baru {ditampilkan} dari {total} {namaItem} yang dimuat. Sisanya belum terlihat di halaman
        ini
        {adaPenyaring ? ', termasuk oleh pencarian dan penyaring di atas.' : '.'}
      </span>
    </p>
  );
}
