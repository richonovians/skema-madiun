import React from 'react';

/**
 * Penampil NILAI SURVEI survei custom (8 Oktober 2026) -- SATU-SATUNYA tempat
 * nilai custom digambar, supaya format di kartu survei, tabel pemantauan,
 * ringkasan respons, dan analisis tidak pernah berbeda.
 *
 * Hanya menampilkan objek `nilaiSurvei` jadi dari backend
 * (`{ judul, nilai, tampilan, kategori }`). Tidak menghitung, tidak
 * membulatkan, tidak menebak kategori. `null`/`undefined` berarti belum dapat
 * dinilai (belum ada jawaban skala) dan tampil "-": angka nol akan terbaca
 * sebagai hasil terburuk.
 *
 * ukuran="besar": judul kecil, angka besar, kategori sebagai lencana (kartu).
 * ukuran="sel"   : satu baris "angka · kategori" dengan judul sebagai `title`
 *                  (sel tabel).
 */
export default function NilaiSurvei({
  nilaiSurvei = null,
  ukuran = 'besar',
  judulBawaan = 'Nilai Survei',
}) {
  if (ukuran === 'sel') {
    if (!nilaiSurvei) return <span>-</span>;
    return (
      <span title={nilaiSurvei.judul} className="whitespace-nowrap">
        {nilaiSurvei.tampilan} · {nilaiSurvei.kategori}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-xs min-w-0">
      <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">
        {nilaiSurvei ? nilaiSurvei.judul : judulBawaan}
      </span>
      <div className="flex items-baseline gap-sm flex-wrap">
        <span className="font-headline-lg text-headline-lg text-on-surface">
          {nilaiSurvei ? nilaiSurvei.tampilan : '-'}
        </span>
        {nilaiSurvei && (
          <span className="inline-flex items-center px-md py-xs rounded-full bg-green-100 text-green-800 font-bold text-label-md">
            {nilaiSurvei.kategori}
          </span>
        )}
      </div>
    </div>
  );
}
