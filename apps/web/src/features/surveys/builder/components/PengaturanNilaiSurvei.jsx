import React, { useId } from 'react';
import Dropdown from '@/components/ui/Dropdown';
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
 *  - ringkas : dua `Dropdown` berlabel (panel builder, modal Buat Survei Admin
 *              Kabupaten, modal ganti jenis -- ruangnya sempit, kartu radio akan
 *              meluap). Sampai 26 Oktober 2026 keduanya `<select>` bawaan
 *              peramban, satu-satunya di antara dropdown aplikasi ini; diganti
 *              atas permintaan pengguna supaya tampilannya sama.
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
  // `placeholder` tampil selagi kosong tetapi BUKAN pilihan di panel, jadi tak
  // dapat dipilih ulang: placeholder yang dapat dipilih dulu mengirim '' ke state,
  // dan pembuatan survei custom lalu ditolak backend (bukan enum).
  return (
    <Dropdown
      id={id}
      label={judul}
      placeholder={placeholder}
      options={pilihan.map((p) => ({ value: p.nilai, label: p.label }))}
      value={nilai}
      onChange={onPilih}
      disabled={disabled}
    />
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
