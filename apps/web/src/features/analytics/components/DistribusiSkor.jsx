'use client';

import React from 'react';

/**
 * Warna segmen per nilai skala, buruk ke baik. Dua nilai teratas berbeda RONA
 * (merah, kuning) dan dua terbawah berbeda TERANG (hijau muda, hijau tua)
 * supaya empat segmen bertetangga tak saling menyatu.
 *
 * Warna hanya penanda tambahan: setiap angka juga ditulis sebagai teks, dan
 * teks tak pernah diletakkan DI ATAS segmen berwarna -- kontras teksnya dengan
 * latar putih kartu, bukan dengan salah satu dari empat warna ini.
 */
const WARNA = { 1: '#dc2626', 2: '#f59e0b', 3: '#34d399', 4: '#047857' };

/**
 * Distribusi skor per pertanyaan skala pada satu survei (8 Oktober 2026,
 * permintaan pengguna: kartu "Distribusi Skor Belum Tersedia" di Statistik &
 * Laporan Admin OPD dan Admin Kabupaten diganti fitur sungguhan).
 *
 * Satu baris per pertanyaan -- unsur baku (berkode U1-U9) maupun pertanyaan
 * skala tambahan milik OPD -- berisi bilah bertumpuk 100% empat nilai. Semua
 * pertanyaan skala, bukan hanya unsur baku: survei yang unsur bakunya dihapus
 * tak dapat dinilai IKM-nya, dan membatasi kartu ke unsur baku membuatnya
 * kosong lagi tepat untuk survei itu.
 *
 * `sebaran` berbentuk keluaran `adaptSebaranSkor`. Tiga keadaan yang sengaja
 * dibedakan:
 *  - `undefined`: backend belum mengirimnya. Tak menggambar apa pun -- bukan
 *    menyatakan "tak punya pertanyaan skala", yang akan menjadi klaim keliru;
 *  - `[]`: survei memang tak punya pertanyaan skala;
 *  - baris ber-`total` 0: pertanyaannya ada tetapi belum dijawab siapa pun.
 *
 * Hanya nilai yang berjumlah > 0 yang digambar dan ditulis. Empat butir "0 (0%)"
 * per baris menenggelamkan bacaan pada survei bersembilan unsur; segmen kosong
 * memang tak punya lebar, dan nilainya tetap tercantum di nama aksesibel bilah.
 */
export default function DistribusiSkor({ sebaran }) {
  if (sebaran === undefined || sebaran === null) return null;

  const labelNilai = sebaran[0]?.nilai ?? [];

  return (
    <section
      aria-labelledby="distribusi-skor-judul"
      className="bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm"
    >
      <h3 id="distribusi-skor-judul" className="font-h3 text-h3 text-primary mb-xs">
        Distribusi Skor per Pertanyaan
      </h3>
      <p className="text-body-md text-secondary mb-md">
        Berapa responden memilih tiap nilai (1-4) pada setiap pertanyaan skala survei ini.
      </p>

      {sebaran.length === 0 ? (
        <p className="py-lg text-center text-secondary">
          Survei ini belum memuat pertanyaan skala, sehingga belum ada sebaran yang dapat
          ditampilkan.
        </p>
      ) : (
        <>
          <ul
            aria-label="Keterangan nilai"
            className="flex flex-wrap gap-x-lg gap-y-xs mb-lg text-label-md text-on-surface-variant"
          >
            {labelNilai.map((n) => (
              <li key={n.nilai} className="flex items-center gap-xs">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: WARNA[n.nilai] }}
                />
                {n.nilai} {n.label}
              </li>
            ))}
          </ul>

          <ul className="space-y-lg">
            {sebaran.map((p) => (
              <BarisPertanyaan key={p.id} pertanyaan={p} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function BarisPertanyaan({ pertanyaan: p }) {
  const dipilih = p.nilai.filter((n) => n.jumlah > 0);
  const nama = `${p.kode ? `${p.kode} ` : ''}${p.teks}`;
  // Nama aksesibel memuat keempat nilai, termasuk yang 0: pembaca layar tak
  // melihat lebar segmen, dan "tak ada yang memilih Buruk" adalah informasi.
  const rincian = p.nilai.map((n) => `${n.label} ${n.jumlah}`).join(', ');

  return (
    <li>
      <div className="flex items-baseline gap-sm">
        {p.kode && <span className="font-mono font-bold text-primary shrink-0">{p.kode}</span>}
        <span className="min-w-0 font-medium text-on-surface">{p.teks}</span>
        <span className="ml-auto shrink-0 text-label-md text-secondary">{p.total} jawaban</span>
      </div>

      {p.total === 0 ? (
        <p className="mt-xs text-label-md text-secondary">Belum ada jawaban.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`${nama}: ${rincian} dari ${p.total} jawaban`}
            className="mt-xs flex h-4 w-full gap-px overflow-hidden rounded-full bg-surface-container"
          >
            {dipilih.map((n) => (
              <div
                key={n.nilai}
                className="h-full"
                style={{ width: `${n.persen}%`, backgroundColor: WARNA[n.nilai] }}
              />
            ))}
          </div>
          <ul className="mt-xs flex flex-wrap gap-x-md gap-y-xs text-label-md text-on-surface-variant">
            {dipilih.map((n) => (
              <li key={n.nilai} className="flex items-center gap-xs">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: WARNA[n.nilai] }}
                />
                <span>
                  {n.label}
                  {' '}
                  <strong className="text-on-surface">{n.jumlah}</strong>
                  {' '}
                  ({Math.round(n.persen)}%)
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  );
}
