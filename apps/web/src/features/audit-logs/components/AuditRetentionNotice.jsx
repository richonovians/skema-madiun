import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Keterangan masa retensi log aktivitas (30 September 2026).
 *
 * MENGAPA ADA. Log audit kini dipangkas otomatis, sementara halaman ini punya
 * penyaring rentang tanggal. Tanpa keterangan ini, memilih tanggal di luar masa
 * retensi menghasilkan tabel kosong tanpa sebab — dan kosong tanpa sebab pada
 * halaman audit terbaca sebagai aplikasi rusak, atau lebih buruk, sebagai jejak
 * yang dihilangkan orang.
 *
 * Ia juga MENGGANTIKAN tugas yang tadinya hendak diberikan kepada sebuah akun
 * sistem pencatat pemangkasan. Akun itu dibatalkan (keputusan pengguna,
 * 30 September 2026) dengan dua sebab: ia akan muncul di Manajemen User, dan
 * catatannya sendiri tinggal di `audit_logs` sehingga ikut terhapus pemangkasan
 * berikutnya. Keterangan tetap di layar tidak punah.
 *
 * ANGKANYA DARI SERVER (`GET /audit-logs/retensi`), bukan ditulis mati di sini.
 * Keterangan yang berbeda dari kebijakan yang sebenarnya berlaku justru merusak
 * kepercayaan yang hendak dibangunnya.
 *
 * NADA NETRAL, bukan peringatan: pemangkasan berjadwal adalah keadaan normal,
 * dan kotak kuning di atas halaman audit akan membuatnya terbaca sebagai
 * masalah.
 *
 * @param {{ hari?: number | null }} props `null`/`undefined` = tak merender
 *   apa pun. `null` berarti retensi mati; `undefined` berarti nilainya belum
 *   dimuat.
 */
export default function AuditRetentionNotice({ hari }) {
  if (typeof hari !== 'number') {
    return null;
  }

  return (
    <p
      className="flex items-start gap-2 text-body-sm text-text-secondary"
      data-testid="audit-retention-notice"
    >
      <Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        Log aktivitas disimpan {hari} hari terakhir. Aktivitas yang lebih lama sudah dihapus
        otomatis, sehingga penyaring tanggal di luar rentang itu tidak akan menemukan apa pun.
      </span>
    </p>
  );
}
