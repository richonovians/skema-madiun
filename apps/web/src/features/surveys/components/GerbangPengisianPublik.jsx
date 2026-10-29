'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, FileText, Eye, Lock, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Input from '@/components/ui/Input';
import {
  JENIS_KELAMIN_OPSI,
  KELOMPOK_UMUR_OPSI,
  NOMOR_HP_REGEX,
} from '../constants/demografi';

/**
 * Gerbang sebelum kuesioner, untuk pengunjung TANPA sesi (8 September 2026,
 * sesudah tim pengguna mengonfirmasi bahwa aplikasi SKEMA memang memerlukan
 * persetujuan UU PDP).
 *
 * KAPAN MUNCUL: hanya bagi pengunjung tanpa sesi, dan pada praktiknya hanya
 * pada survei yang `izinkanAnonim`-nya menyala, sebab backend menolak
 * pengisian tanpa sesi pada survei lain dengan 404
 * (`findAnonimSurveyOrThrow`). Letaknya SEBELUM kuesioner supaya tak ada
 * pengisi yang menjawab seluruh pertanyaan lalu ditolak di langkah terakhir.
 */
const RINCIAN = [
  {
    icon: FileText,
    judul: 'Data yang diproses',
    isi: 'Jawaban survei yang Anda kirim, beserta data diri jika Anda isi. Anda dapat memilih mengisi survei tanpa data diri. Email tidak diminta.',
  },
  {
    icon: Eye,
    judul: 'Tujuan pemrosesan',
    isi: 'Menghitung Indeks Kepuasan Masyarakat atas layanan instansi yang dinilai dalam bentuk agregat.',
  },
  {
    icon: Lock,
    judul: 'Siapa yang dapat melihat',
    isi: 'Petugas OPD yang dinilai dan Admin Kabupaten dalam bentuk rekapitulasi, tanpa disebar ke pihak luar.',
  },
  {
    icon: Trash2,
    judul: 'Hak Anda',
    isi: 'Anda berhak menarik persetujuan atau meminta penghapusan data melalui kanal resmi Diskominfo.',
  },
];

export default function GerbangPengisianPublik({ onSetuju }) {
  const [setuju, setSetuju] = useState(false);
  const [tanpaDataDiri, setTanpaDataDiri] = useState(false);
  const [nama, setNama] = useState('');
  const [nomorHp, setNomorHp] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('');
  const [kelompokUmur, setKelompokUmur] = useState('');
  const [galat, setGalat] = useState({});

  const periksaDataDiri = () => {
    const hasil = {};
    const namaBersih = nama.trim();
    if (namaBersih.length < 2) hasil.nama = 'Nama wajib diisi, minimal 2 huruf.';
    if (!nomorHp.trim()) hasil.nomorHp = 'Nomor HP wajib diisi.';
    else if (!NOMOR_HP_REGEX.test(nomorHp.trim()))
      hasil.nomorHp = 'Nomor HP tidak dikenali. Contoh bentuk yang diterima: 081234567890';
    if (!jenisKelamin) hasil.jenisKelamin = 'Jenis kelamin wajib dipilih.';
    if (!kelompokUmur) hasil.kelompokUmur = 'Kelompok umur wajib dipilih.';
    return hasil;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!setuju) return;

    if (tanpaDataDiri) {
      setGalat({});
      onSetuju?.({
        setuju: true,
        nama: null,
        nomorHp: null,
        jenisKelamin: null,
        kelompokUmur: null,
      });
      return;
    }

    const hasil = periksaDataDiri();
    setGalat(hasil);
    if (Object.keys(hasil).length > 0) return;

    onSetuju?.({
      setuju: true,
      nama: nama.trim(),
      nomorHp: nomorHp.trim(),
      jenisKelamin,
      kelompokUmur,
    });
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-2xl border border-slate-100/90 overflow-hidden">
      {/* Header card: logo SKEMA */}
      <div className="border-b border-slate-100 px-5 sm:px-6 pt-4 pb-3 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group shrink-0">
          <div className="transition-transform duration-300 group-hover:scale-105 flex items-center">
            <Image
              src="/images/navbar/skema-logo-2.png"
              alt="Logo SKEMA"
              width={76}
              height={48}
              className="object-contain h-7 w-auto"
              priority
            />
          </div>
          <span className="text-sm font-bold text-primary tracking-tight">
            SKEMA Madiun
          </span>
        </Link>
      </div>

      <div className="p-5 sm:p-6 md:p-7">
        {/* Judul & Ikon PDP */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-text-primary leading-snug">
              Persetujuan Pemrosesan Data Pribadi
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
              Sebelum mengisi survei ini, kami perlu persetujuan Anda sesuai Undang-Undang Nomor 27
              Tahun 2022 tentang Pelindungan Data Pribadi.
            </p>
          </div>
        </div>

        {/* Kotak Ringkasan Rincian PDP */}
        <div className="bg-slate-50/80 rounded-xl p-3 sm:p-4 border border-slate-200/60 mb-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {RINCIAN.map(({ icon: Icon, judul, isi }) => (
              <div key={judul} className="flex items-start gap-2.5">
                <Icon size={15} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold text-text-primary">{judul}</dt>
                  <dd className="text-[11px] sm:text-xs text-text-secondary leading-relaxed mt-0.5">{isi}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 border-t border-slate-100 pt-4">
          {/* Opsi Tanpa Data Diri */}
          <div className="bg-slate-50/50 rounded-lg p-2.5 sm:p-3 border border-slate-200/60">
            <label htmlFor="tanpa-data-diri" className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                id="tanpa-data-diri"
                type="checkbox"
                checked={tanpaDataDiri}
                onChange={(e) => {
                  setTanpaDataDiri(e.target.checked);
                  setGalat({});
                }}
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0"
              />
              <span className="text-xs sm:text-sm font-medium text-text-primary">
                Isi survei sebagai Anonim
              </span>
            </label>
          </div>

          {/* Form Data Diri Pengisi (muncul jika tidak memilih opsi tanpa data diri) */}
          {!tanpaDataDiri && (
            <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/70 space-y-3">
              <p className="text-xs font-bold text-text-primary uppercase tracking-wider text-slate-500 mb-1">
                Data Diri Responden
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Input
                    label="NAMA"
                    id="nama"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    maxLength={50}
                    autoComplete="name"
                    aria-invalid={galat.nama ? 'true' : undefined}
                    aria-describedby={galat.nama ? 'nama-galat' : undefined}
                  />
                  {galat.nama && (
                    <p id="nama-galat" className="text-[11px] font-semibold text-error mt-1 px-1">
                      {galat.nama}
                    </p>
                  )}
                </div>
                <div>
                  <Input
                    label="NOMOR HP"
                    id="nomorHp"
                    type="tel"
                    inputMode="tel"
                    value={nomorHp}
                    onChange={(e) => setNomorHp(e.target.value)}
                    placeholder="081234567890"
                    maxLength={20}
                    autoComplete="tel"
                    aria-invalid={galat.nomorHp ? 'true' : undefined}
                    aria-describedby={galat.nomorHp ? 'nomorHp-galat' : undefined}
                  />
                  {galat.nomorHp && (
                    <p id="nomorHp-galat" className="text-[11px] font-semibold text-error mt-1 px-1">
                      {galat.nomorHp}
                    </p>
                  )}
                </div>
                <div>
                  <Dropdown
                    id="jenisKelamin"
                    label="JENIS KELAMIN"
                    value={jenisKelamin}
                    onChange={setJenisKelamin}
                    error={galat.jenisKelamin}
                    options={[{ label: 'Pilih jenis kelamin', value: '' }, ...JENIS_KELAMIN_OPSI]}
                  />
                </div>
                <div>
                  <Dropdown
                    id="kelompokUmur"
                    label="KELOMPOK UMUR"
                    value={kelompokUmur}
                    onChange={setKelompokUmur}
                    error={galat.kelompokUmur}
                    options={[{ label: 'Pilih kelompok umur', value: '' }, ...KELOMPOK_UMUR_OPSI]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Checkbox Persetujuan PDP */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="setuju-pdp-publik"
              className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-blue-50/50"
            >
              <input
                id="setuju-pdp-publik"
                type="checkbox"
                checked={setuju}
                onChange={(e) => setSetuju(e.target.checked)}
                aria-describedby="setuju-pdp-publik-bantuan"
                className="w-4 h-4 mt-0.5 shrink-0 accent-primary cursor-pointer rounded"
              />
              <span className="text-xs sm:text-sm text-text-primary leading-relaxed">
                Saya telah membaca dan <strong className="font-semibold text-primary">menyetujui</strong> pemrosesan
                data saya untuk tujuan yang dijelaskan di atas.{' '}
                <span className="text-error font-semibold" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(wajib)</span>
              </span>
            </label>
            <p id="setuju-pdp-publik-bantuan" className="text-[11px] text-text-secondary px-1">
              Persetujuan dicatat beserta waktunya bersama jawaban Anda.
            </p>
          </div>

          {/* Tombol Navigasi Bawah */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
            <Link
              href="/"
              className="text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary underline underline-offset-4 py-2 px-1 text-center sm:text-left"
            >
              Kembali ke Layanan
            </Link>
            <Button
              type="submit"
              disabled={!setuju}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold shadow-xs"
            >
              Setuju &amp; Mulai Isi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
