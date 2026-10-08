import React from 'react';

/**
 * Pilihan jenis survei (8 Oktober 2026). Jenis menentukan apakah survei
 * berkerangka 9 unsur PermenPANRB (kerangka terkunci, kalimat pertanyaan boleh
 * diubah OPD) atau bebas, dan TIDAK dapat diganti sesudah survei dibuat --
 * karena itu dipilih eksplisit di awal, tanpa pilihan bawaan.
 *
 * Dipakai di dua tempat: builder survei baru (kartu besar) dan modal buat
 * survei Admin Kabupaten (`ringkas`, lebih padat karena tinggi modalnya
 * tetap).
 */
const PILIHAN = [
  {
    nilai: 'skm_permenpanrb',
    judul: 'SKM PermenPANRB (9 unsur terkunci)',
    keterangan:
      'Memuat sembilan unsur baku PermenPANRB 14/2017 dan menghasilkan Nilai IKM. Unsurnya tidak dapat dihapus; Anda mengubah kalimat pertanyaan tiap unsur.',
    ringkas: 'Sembilan unsur baku, menghasilkan Nilai IKM. Kalimat pertanyaan dapat diubah.',
  },
  {
    nilai: 'custom',
    judul: 'Survei Custom',
    keterangan:
      'Susunan pertanyaan bebas. Tidak memuat unsur baku, sehingga tidak menghasilkan Nilai IKM; hasilnya berupa Nilai Survei menurut tujuan dan metode yang Anda pilih.',
    ringkas: 'Pertanyaan bebas, tanpa Nilai IKM; hasilnya berupa Nilai Survei.',
  },
];

export default function PemilihJenisSurvei({
  nilai = null,
  onPilih,
  disabled = false,
  ringkas = false,
}) {
  const terpilih = PILIHAN.find((p) => p.nilai === nilai);

  const kartu = (
    <div
      role="radiogroup"
      aria-label="Jenis survei"
      className={ringkas ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'grid grid-cols-1 md:grid-cols-2 gap-md'}
    >
      {PILIHAN.map((p) => {
        const dipilih = nilai === p.nilai;
        return (
          <label
            key={p.nilai}
            className={`flex items-start gap-3 rounded-xl border cursor-pointer transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${
              ringkas ? 'p-3' : 'p-lg'
            } ${
              dipilih
                ? 'border-primary bg-primary-container/20'
                : 'border-border bg-surface-container-low/60 hover:bg-surface-container-low'
            }`}
          >
            <input
              type="radio"
              name="jenis-survei"
              value={p.nilai}
              checked={dipilih}
              disabled={disabled}
              onChange={() => onPilih(p.nilai)}
              className="w-5 h-5 mt-0.5 shrink-0 accent-primary cursor-pointer"
            />
            <span className="flex flex-col gap-xs">
              <span className="text-sm font-bold text-text-primary">{p.judul}</span>
              {/* Ringkas: keterangan TIDAK diulang pada tiap kartu. Tinggi modal
                  buat-survei tetap dan nyaris penuh; satu baris di bawah kartu
                  (untuk pilihan aktif) cukup. */}
              {!ringkas && (
                <span className="text-xs text-text-secondary leading-relaxed">{p.keterangan}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );

  if (!ringkas) return kartu;

  return (
    <div className="space-y-1.5">
      {kartu}
      <p className="text-xs text-text-secondary min-h-[1rem]">{terpilih ? terpilih.ringkas : ''}</p>
    </div>
  );
}
