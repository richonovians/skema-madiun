import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Keterangan umur Sampah survei (30 September 2026).
 *
 * MENGAPA ADA. Sejak pemusnahan otomatis berjalan, halaman Sampah yang diam
 * justru berbohong: ia menyiratkan isinya bertahan selamanya, padahal survei
 * tanpa respons dibuang sendiri setelah sekian lama. Halaman Admin OPD bahkan
 * menyatakannya tersurat ("tidak terhapus dengan sendirinya"), dan kalimat itu
 * digantikan komponen ini.
 *
 * PENGECUALIANNYA IKUT DISEBUT, dan itu bagian terpentingnya. Tanpa kalimat
 * kedua, seorang admin yang membaca "dimusnahkan setelah 365 hari" wajar
 * mengira hasil pengukuran IKM-nya ikut terancam, lalu memulihkan survei yang
 * sebenarnya aman hanya untuk berjaga-jaga.
 *
 * ANGKANYA DARI SERVER (`GET /surveys/trash/retensi`), bukan ditulis mati di
 * sini. Keterangan yang berbeda dari kebijakan yang sebenarnya berlaku merusak
 * kepercayaan yang hendak dibangunnya.
 *
 * NADA NETRAL, bukan peringatan: pemusnahan berjadwal adalah keadaan normal,
 * dan kotak kuning di halaman Sampah akan membuatnya terbaca sebagai masalah.
 *
 * @param {{ hari?: number | null }} props `null` berarti pemusnahan otomatis
 *   dimatikan; `undefined` berarti nilainya belum dimuat. Keduanya tak
 *   merender apa pun.
 */
export default function SurveyTrashRetentionNotice({ hari }) {
  if (typeof hari !== 'number') {
    return null;
  }

  return (
    <p
      className="flex items-start gap-sm text-sm text-text-secondary"
      data-testid="sampah-retensi-notice"
    >
      <Clock size={16} className="text-primary mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        Survei di Sampah yang belum pernah dijawab warga dimusnahkan otomatis setelah {hari} hari.
        Survei yang sudah memiliki jawaban tidak ikut dimusnahkan dan tetap menunggu keputusan Anda.
      </span>
    </p>
  );
}
