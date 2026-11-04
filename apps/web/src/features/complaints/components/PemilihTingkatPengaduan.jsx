'use client';

import React from 'react';
import { Building2, MapPin } from 'lucide-react';

/**
 * Pemilih tingkat pengaduan — kabupaten atau kecamatan (4 November 2026,
 * permintaan pengguna: "pisahkan pengaduan menjadi tingkat kabupaten dan
 * tingkat kecamatan dengan tombol pindah tab/tingkatan pada bagian atas form").
 *
 * RADIO, BUKAN `role="tablist"`, meski tampilannya tab. Tab memindahkan pembaca
 * antar panel yang berbeda isinya; yang terjadi di sini adalah MEMILIH SATU
 * NILAI yang ikut terkirim bersama pengaduan, dan formulir di bawahnya tetap
 * formulir yang sama. Radio menyatakan hal itu apa adanya kepada pembaca layar
 * ("Tingkat Pengaduan, Kabupaten, 1 dari 2") dan membawa navigasi panah serta
 * pengelompokan fokus tanpa satu baris JavaScript pun.
 *
 * Kotak radionya DISEMBUNYIKAN LEWAT `sr-only`, bukan `display:none` maupun
 * `appearance-none`: yang pertama mencabutnya dari urutan fokus sehingga tak
 * dapat dijangkau papan ketik, dan yang kedua membuang cincin fokus bawaan
 * peramban. Keadaan terpilih & terfokusnya digambar labelnya lewat
 * `has-[:checked]` dan `has-[:focus-visible]`.
 */
const TINGKAT = [
  {
    nilai: 'kabupaten',
    judul: 'Tingkat Kabupaten',
    keterangan: 'Dinas, badan, dan perangkat daerah Kabupaten Madiun',
    Ikon: Building2,
  },
  {
    nilai: 'kecamatan',
    judul: 'Tingkat Kecamatan',
    keterangan: 'Kantor kecamatan dan kelurahan di wilayah Anda',
    Ikon: MapPin,
  },
];

export default function PemilihTingkatPengaduan({ value, onChange, disabled = false }) {
  return (
    <fieldset className="space-y-3">
      <legend className="block text-sm font-bold text-text-primary mb-2">
        Tingkat Pengaduan
      </legend>
      {/* grid-cols-1 di ponsel: dua kartu bersebelahan pada lebar 360px
          menyisakan ~160px per kartu, dan keterangannya pecah menjadi empat
          baris. Bertumpuk, keduanya tetap terbaca utuh. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TINGKAT.map(({ nilai, judul, keterangan, Ikon }) => (
          <label
            key={nilai}
            className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-container-low/60 cursor-pointer transition-colors hover:bg-surface-container-low has-[:checked]:border-primary has-[:checked]:bg-primary-container/20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
          >
            <input
              type="radio"
              name="tingkatPengaduan"
              value={nilai}
              checked={value === nilai}
              disabled={disabled}
              onChange={() => onChange(nilai)}
              className="sr-only"
            />
            <Ikon
              size={20}
              className="shrink-0 mt-0.5 text-text-secondary"
              aria-hidden="true"
            />
            <span>
              <span className="block text-sm font-bold text-text-primary">{judul}</span>
              <span className="block text-xs text-text-secondary leading-relaxed mt-0.5">
                {keterangan}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
