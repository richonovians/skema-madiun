import React from 'react';
import { UserCheck } from 'lucide-react';

/**
 * Jumlah akun aktif (permintaan pengguna 6 September 2026), dipakai di tiga
 * halaman: Manajemen User & dashboard Admin Kabupaten (seluruh sistem) serta
 * dashboard Admin OPD (hanya akun yang tertaut OPD itu).
 *
 * Berupa strip, BUKAN kartu ke-N pada grid ringkasan: ketiga halaman itu punya
 * grid kartu yang jumlah kolomnya sudah pas (3 dan 4), dan menambah satu kartu
 * menyisakan satu kartu yatim di baris terakhir.
 *
 * Lingkupnya WAJIB tersurat. Dua angka ini berbeda arti — "seluruh sistem" vs
 * "tertaut OPD ini" — dan yang kedua menghitung AKUN (para Admin OPD, biasanya
 * 1–2 orang), bukan warga yang dilayani. Tanpa keterangan itu, angka 2 di
 * dashboard OPD terbaca sebagai "cuma 2 warga".
 *
 * @param {object} props
 * @param {number|null} [props.activeCount] jumlah akun aktif; null = belum diketahui
 * @param {number|null} [props.totalCount] jumlah seluruh akun, bila ingin disebut
 * @param {'all'|'opd'} [props.scope] lingkup angkanya
 */
export default function ActiveAccountsInfo({ activeCount, totalCount = null, scope = 'all' }) {
  const label =
    scope === 'opd' ? 'akun aktif tertaut OPD ini' : 'akun aktif di seluruh sistem';

  return (
    // `shrink-0`: di halaman Manajemen User strip ini duduk sebaris dengan tab
    // penyaring dan tombol "Buat Akun Admin Baru". Sebagai flex item ia menyusut
    // secara baku, dan kalimatnya terbelah dua baris padahal barisnya masih
    // punya ruang. Pemanggil yang menyediakan `flex-wrap`, sehingga pada lebar
    // sempit strip ini turun ke barisnya sendiri alih-alih membuat halaman
    // bergeser horizontal.
    <div className="flex shrink-0 items-center gap-3 px-lg py-md bg-surface-container-low border border-outline-variant rounded-xl">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container">
        {/* `text-on-primary-container` (#eeefff), BUKAN `text-primary`: yang
            terakhir itu #004ac6 di atas lingkaran #2563eb -- biru tua di atas
            biru, rasio kontrasnya di bawah 2:1 dan ikonnya nyaris tak terlihat.
            Pasangan ini pula yang dipakai seluruh repo untuk latar tersebut
            (Badge, StatCard, ProfileHero, AdminAccountMenu), dan kontrasnya
            5,1:1 -- lulus ambang 3:1 untuk elemen grafis. */}
        <UserCheck size={18} className="text-on-primary-container" />
      </span>
      <div>
        {/* `min-w-0` DIBUANG bersama penyusutan di atas: ia ada untuk
            mengizinkan pemotongan teks, dan justru itulah yang membelah
            kalimatnya. */}
        <p className="flex items-baseline gap-1.5 whitespace-nowrap">
          {/* `tabular-nums`: angkanya berdampingan dengan teks dan berubah saat
              disegarkan; lebar digit yang tetap mencegah barisnya bergoyang. */}
          <span className="text-xl font-extrabold text-text-primary tabular-nums">
            {activeCount == null ? '-' : activeCount.toLocaleString('id-ID')}
          </span>
          <span className="text-sm font-medium text-text-secondary">{label}</span>
        </p>
        {totalCount != null && (
          <p className="text-xs text-text-secondary mt-0.5 whitespace-nowrap">
            dari {totalCount.toLocaleString('id-ID')} akun terdaftar
          </p>
        )}
      </div>
    </div>
  );
}
