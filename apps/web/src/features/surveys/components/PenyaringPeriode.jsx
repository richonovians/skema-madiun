'use client';

import React, { useEffect } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { buildPeriodeFilter, parsePeriodeFilter } from '@/features/surveys/adapters/survey.adapter';

/**
 * Penyaring periode: DUA dropdown, SATU nilai (6 Oktober 2026, permintaan
 * pengguna "ubah dropdown periode menjadi pisah antara triwulan dan tahun
 * berbeda dropdown").
 *
 * Menggantikan dropdown gabungan "Triwulan I - 2026" di tiga tempat: navbar
 * Admin Kabupaten, navbar Admin OPD, dan penyaring daftar survei. Satu komponen
 * bersama, bukan tiga salinan -- aturan "Semua Triwulan menghasilkan tahun
 * saja" hanya bermakna bila ia sama persis di ketiganya.
 *
 * TAHUN WAJIB, TRIWULAN BOLEH "SEMUA". Pilihan itu diambil pemilik produk saat
 * desainnya disajikan. Alternatifnya -- dua-duanya boleh "Semua" -- melahirkan
 * kombinasi "semua tahun, Triwulan II" yang tak dapat dinyatakan format periode
 * mana pun, sehingga harus ditolak atau diabaikan diam-diam.
 *
 * Nilai keluarnya tetap satu string (`2026-Q2` atau `2026`), sebab seluruh
 * state halaman dan parameter API sudah berbentuk begitu. Lihat
 * `survey.adapter.js` untuk kedua bentuknya.
 *
 * LABEL TERSEMBUNYI DAN LEBAR TAK SAMA, keduanya hasil pengukuran di navbar
 * Admin Kabupaten (6 Oktober 2026, permintaan pengguna: "perbaiki posisi teks
 * tahun dan triwulan").
 *
 * `Dropdown` menggambar labelnya sebagai blok di ATAS kontrol. Tetangga
 * penyaring ini di navbar tak berlabel, jadi kedua dropdown terdorong turun
 * dan menonjol keluar dari tinggi bilah -- judul halaman ikut terhimpit.
 * `labelTersembunyi` membuatnya `sr-only`: hilang dari layar, utuh bagi
 * pembaca layar. Namanya TIDAK boleh dibuang; ia satu-satunya nama aksesibel
 * kedua kontrol ini.
 *
 * Lebarnya pun tak boleh sama. "Semua Triwulan" pada `text-body-md` butuh
 * ~164px dan sebelumnya terpotong menjadi "Semua Tri..." -- `truncate`
 * memotong tanpa memerahkan apa pun. Triwulan karena itu mendapat lantai
 * lebar dan dua kali bagian ruang sisa; Tahun tidak, sebab "2026" selalu
 * pendek dan lantai di sana hanya mencuri ruang di bilah yang sempit.
 *
 * Rasio flex-nya DITENTUKAN DI SINI, bukan oleh pemanggil. Pemanggil yang ikut
 * mengirim `flex-1` membuat dua deklarasi `flex` pada satu elemen, dan yang
 * menang ditentukan urutan di lembar gaya -- bukan urutan di string kelas.
 * Jadi `dropdownClassName` tak boleh lagi memuat `flex-*` maupun `min-w-*`.
 */
const TRIWULAN_OPTIONS = [
  { value: '', label: 'Semua Triwulan' },
  { value: '1', label: 'Triwulan I' },
  { value: '2', label: 'Triwulan II' },
  { value: '3', label: 'Triwulan III' },
  { value: '4', label: 'Triwulan IV' },
];

export default function PenyaringPeriode({
  value,
  onChange,
  tahunOptions = [],
  className = 'flex items-center gap-sm',
  dropdownClassName = '',
}) {
  const terurai = parsePeriodeFilter(value);
  // Tahun wajib terisi: tanpa jatuh ke suatu tahun, dropdown Tahun kosong dan
  // penyaringnya tak bermakna apa pun.
  //
  // TAHUN BERJALAN, BUKAN PILIHAN TERATAS. `buildTahunOptions()` memuat satu
  // triwulan ke depan, jadi di Q4 2026 pilihan teratasnya 2027 -- tahun yang
  // belum punya satu pun baris data. Terukur di layar sebelum diperbaiki:
  // penyaringnya menampilkan "2027". Pilihan teratas tetap dipakai bila tahun
  // berjalan memang tak ditawarkan, mis. penyaring daftar survei yang
  // tahunnya diturunkan dari periode survei yang benar-benar ada.
  const tahunBerjalan = new Date().getFullYear();
  const adaTahunBerjalan = tahunOptions.some((o) => Number(o.value) === tahunBerjalan);
  const tahunJatuhTempo = adaTahunBerjalan ? tahunBerjalan : Number(tahunOptions[0]?.value);

  const tahun = terurai?.tahun ?? tahunJatuhTempo;
  const triwulan = terurai?.triwulan ?? null;

  /**
   * JATUH-TEMPO DILAPORKAN KE INDUK, bukan hanya digambar.
   *
   * Versi pertama komponen ini jatuh ke suatu tahun untuk TAMPILAN saja dan
   * membiarkan induknya memegang string kosong. Akibatnya terukur di
   * /admin-kab/dashboard: penyaringnya menampilkan "2027" sementara kotak
   * keterangan di bawahnya berbunyi "Penyaring navbar aktif: semua periode".
   * Angka yang terbaca bukan angka yang menyaring.
   *
   * Konsekuensinya disengaja dan perlu diketahui: dashboard Kabupaten kini
   * terbuka pada tahun berjalan, bukan pada "semua periode" seperti yang
   * dinyatakan AdminKabLayoutProvider sebelumnya. Itu harga dari keputusan
   * "tahun wajib terisi" -- sebuah penyaring tahun yang wajib tak dapat
   * sekaligus berarti "tanpa penyaring".
   *
   * Dipagari `terurai === null`: nilai yang sudah terisi tak pernah ditimpa.
   */
  useEffect(() => {
    if (terurai !== null || !Number.isFinite(tahunJatuhTempo)) return;
    onChange(buildPeriodeFilter(tahunJatuhTempo, null));
  }, [terurai, tahunJatuhTempo, onChange]);

  const gantiTahun = (nilai) => onChange(buildPeriodeFilter(Number(nilai), triwulan));
  // Triwulan DIPERTAHANKAN saat tahun berganti, dan sebaliknya: kembali
  // diam-diam ke Triwulan I akan memindahkan pengguna ke periode yang tak
  // pernah ia minta.
  const gantiTriwulan = (nilai) =>
    onChange(buildPeriodeFilter(tahun, nilai === '' ? null : Number(nilai)));

  return (
    <div className={className}>
      <Dropdown
        id="filter-periode-tahun"
        label="Tahun"
        options={tahunOptions}
        value={String(tahun ?? '')}
        onChange={gantiTahun}
        className={`flex-[1_1_auto] min-w-0 ${dropdownClassName}`}
        labelTersembunyi
      />
      <Dropdown
        id="filter-periode-triwulan"
        label="Triwulan"
        options={TRIWULAN_OPTIONS}
        value={triwulan === null ? '' : String(triwulan)}
        onChange={gantiTriwulan}
        className={`flex-[2_1_auto] min-w-[168px] ${dropdownClassName}`}
        labelTersembunyi
      />
    </div>
  );
}
