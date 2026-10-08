import React, { useId } from 'react';
import {
  METODE_NILAI,
  TUJUAN_SURVEI,
  contohHasil,
} from '@/features/surveys/constants/nilaiSurvei';

/**
 * Dua isian WAJIB survei custom (8 Oktober 2026): TUJUAN (menentukan kamus kata
 * kategori) dan METODE NILAI (cara angka ditampilkan). Tanpa pilihan bawaan,
 * sama seperti jenis survei: pembuat survei harus memilihnya dengan sadar.
 *
 * Dua bentuk dengan isi yang sama:
 *  - penuh   : dua radiogroup berkartu (builder survei baru, ruang lega);
 *  - ringkas : dua <select> berlabel (modal Buat Survei Admin Kabupaten, yang
 *              tingginya tetap dan nyaris penuh -- kartu radio akan meluap).
 *
 * Nilai yang dikirim adalah enum backend apa adanya (`kepuasan`, `rata_rata`,
 * ...). "Contoh hasil" di bawahnya teks statis penjelas, bukan hasil hitung.
 */
function KelompokRadio({ judul, pilihan, nilai, onPilih, disabled }) {
  const id = useId();
  return (
    <div className="space-y-xs">
      <p id={`${id}-judul`} className="text-sm font-bold text-text-primary">
        {judul}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-judul`}
        className="grid grid-cols-1 md:grid-cols-3 gap-2"
      >
        {pilihan.map((p) => {
          const dipilih = nilai === p.nilai;
          const idDeskripsi = `${id}-${p.nilai}-ket`;
          return (
            <label
              key={p.nilai}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${
                dipilih
                  ? 'border-primary bg-primary-container/20'
                  : 'border-border bg-surface-container-low/60 hover:bg-surface-container-low'
              }`}
            >
              <input
                type="radio"
                name={`${id}-${judul}`}
                value={p.nilai}
                checked={dipilih}
                disabled={disabled}
                onChange={() => onPilih(p.nilai)}
                aria-describedby={idDeskripsi}
                className="w-5 h-5 mt-0.5 shrink-0 accent-primary cursor-pointer"
              />
              <span className="flex flex-col gap-xs min-w-0">
                <span className="text-sm font-bold text-text-primary">{p.label}</span>
                {/* aria-hidden: keterangan menjadi DESKRIPSI radio (aria-describedby),
                    bukan bagian namanya -- nama "Kepuasan", bukan satu paragraf. */}
                <span
                  id={idDeskripsi}
                  aria-hidden="true"
                  className="text-xs text-text-secondary leading-relaxed"
                >
                  {p.keterangan}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PilihanRingkas({ id, judul, placeholder, pilihan, nilai, onPilih, disabled }) {
  return (
    <div className="space-y-xs">
      <label htmlFor={id} className="block text-sm font-bold text-text-primary">
        {judul}
      </label>
      <select
        id={id}
        value={nilai ?? ''}
        disabled={disabled}
        onChange={(e) => onPilih(e.target.value)}
        className="w-full min-h-[44px] rounded-lg border border-outline-variant bg-white px-md text-body-md text-text-primary disabled:opacity-60"
      >
        {/* disabled: tetap tampil sebagai pilihan awal, tetapi tak dapat dipilih ulang.
            Placeholder yang bisa dipilih mengirim '' ke state, dan pembuatan survei
            custom lalu ditolak backend (bukan enum). */}
        <option value="" disabled>
          {placeholder}
        </option>
        {pilihan.map((p) => (
          <option key={p.nilai} value={p.nilai}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PengaturanNilaiSurvei({
  tujuan = null,
  metode = null,
  onTujuan,
  onMetode,
  disabled = false,
  ringkas = false,
}) {
  const id = useId();
  const contoh = contohHasil(tujuan, metode);
  const baris = (
    <p className="text-xs text-text-secondary min-h-[1rem]">
      {contoh ? (
        <>
          Contoh hasil: <strong className="font-semibold">{contoh}</strong>
        </>
      ) : null}
    </p>
  );

  if (ringkas) {
    return (
      <div className="space-y-1.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PilihanRingkas
            id={`${id}-tujuan`}
            judul="Tujuan survei"
            placeholder="Pilih tujuan"
            pilihan={TUJUAN_SURVEI}
            nilai={tujuan}
            onPilih={onTujuan}
            disabled={disabled}
          />
          <PilihanRingkas
            id={`${id}-metode`}
            judul="Metode nilai"
            placeholder="Pilih metode"
            pilihan={METODE_NILAI}
            nilai={metode}
            onPilih={onMetode}
            disabled={disabled}
          />
        </div>
        {baris}
      </div>
    );
  }

  return (
    <div className="space-y-md">
      <KelompokRadio
        judul="Tujuan survei"
        pilihan={TUJUAN_SURVEI}
        nilai={tujuan}
        onPilih={onTujuan}
        disabled={disabled}
      />
      <KelompokRadio
        judul="Metode nilai"
        pilihan={METODE_NILAI}
        nilai={metode}
        onPilih={onMetode}
        disabled={disabled}
      />
      {baris}
    </div>
  );
}
