'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, Eye, Lock, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
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
 *
 * PENEGAKANNYA BUKAN DI SINI. Halaman ini pembatas navigasi; yang menolak
 * sungguhan adalah `setuju: true` yang wajib pada `SubmitPublicResponseDto` di
 * backend, ditolak 400 oleh ValidationPipe sebelum satu baris pun tertulis.
 * Gerbang frontend dapat dilewati dengan satu permintaan langsung, jadi tanpa
 * penjaga di backend gerbang ini hanya hiasan. Pernyataan yang sama sudah ada
 * di ConsentGate.jsx untuk jalur yang berpenjaga.
 *
 * NASKAHNYA DISESUAIKAN dari ConsentGate.jsx, bukan dikarang: aplikasi ini
 * sudah punya naskah persetujuan yang lengkap, dan mengarang klausul kedua
 * hanya menciptakan dua janji yang bisa saling bertentangan. Yang berbeda
 * adalah keadaan pengisi tanpa akun: tak ada email, dan seluruh data dirinya
 * boleh dilewati.
 *
 * RINCIAN "Data yang diproses" DIUBAH 8 September 2026, sesudah pengguna
 * meminta medan nama dan nomor HP ditambahkan. Sebelumnya naskah ini berbunyi
 * "Anda tidak diminta nama, email, maupun nomor telepon" -- kalimat yang
 * menjadi tidak benar begitu medannya ada, justru pada layar yang tugasnya
 * meminta persetujuan. Naskah persetujuan yang menyebut lebih sedikit daripada
 * yang sungguh dikumpulkan bukan sekadar keliru, ia membatalkan sahnya
 * persetujuan itu sendiri.
 */
const RINCIAN = [
  {
    icon: FileText,
    judul: 'Data yang diproses',
    isi: 'Jawaban survei yang Anda kirim, beserta nama, nomor HP, jenis kelamin, dan kelompok umur yang Anda isi di bawah. Anda dapat melewati seluruh data diri itu dan tetap mengisi surveinya. Email tidak diminta.',
  },
  {
    icon: Eye,
    judul: 'Tujuan pemrosesan',
    isi: 'Menghitung Indeks Kepuasan Masyarakat atas layanan instansi yang Anda nilai. Jawaban ditampilkan kepada petugas dalam bentuk agregat.',
  },
  {
    icon: Lock,
    judul: 'Siapa yang dapat melihat',
    isi: 'Petugas OPD yang dinilai dan Admin Kabupaten, dalam bentuk rekapitulasi. Data tidak dibagikan ke pihak di luar Pemerintah Kabupaten Madiun.',
  },
  {
    icon: Trash2,
    judul: 'Hak Anda',
    isi: 'Anda berhak menarik persetujuan atau meminta penghapusan data dengan menghubungi Admin Kabupaten melalui kanal resmi Diskominfo.',
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

  /**
   * Dinamai `tanpaDataDiri`, BUKAN "anonim", dan itu disengaja. Di sistem ini
   * ada tiga hal berbeda yang bernama mirip:
   *
   *   - `Survey.izinkanAnonim`       : survei boleh diisi TANPA LOGIN
   *   - `useSurveyStore.isAnonimMode`: pengisian sedang berjalan TANPA SESI
   *   - kotak centang ini            : pengisi TIDAK MEMBERI data dirinya
   *
   * Memberi nama keempat "anonim" hanya memperbesar kekacauannya. Yang dibaca
   * PENGGUNA tetap kata biasa; yang dijaga di sini penamaan di dalam kode.
   *
   * Cakupannya melebar 8 September 2026 dari sekadar demografis menjadi seluruh
   * data diri, sesudah nama dan nomor HP ditambahkan atas permintaan pengguna.
   */
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

    // Data diri DIBUANG saat "tanpa data diri" dipilih, bukan cuma
    // disembunyikan: menyembunyikan medan tanpa membuang isinya akan mengirim
    // data yang pengisinya sudah memutuskan untuk tidak diberikan.
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

    /**
     * WAJIB kecuali memilih tanpa data diri (keputusan pengguna 8 September
     * 2026), dan kewajibannya ditegakkan DI SINI, bukan lewat tombol yang mati.
     *
     * Tombol yang mati saat medannya belum lengkap tidak memberi tahu medan
     * mana yang kurang, dan pengisi hanya melihat tombol yang tak bereaksi.
     * Menolak saat ditekan lalu menunjukkan sebabnya di sebelah medannya
     * memberi pengisi jalan keluar yang jelas.
     */
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
    <Card className="w-full max-w-[680px] mx-auto p-6 sm:p-8">
      <div className="flex items-start gap-3.5 border-b border-border pb-5">
        <div className="p-2.5 rounded-xl bg-primary-container/40 text-primary shrink-0">
          <ShieldCheck size={22} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-headline-md font-headline-md text-text-primary leading-tight">
            Persetujuan Pemrosesan Data Pribadi
          </h1>
          <p className="text-body-md font-body-md text-text-secondary mt-1.5">
            Sebelum mengisi survei ini, kami perlu persetujuan Anda sesuai Undang-Undang Nomor 27
            Tahun 2022 tentang Pelindungan Data Pribadi.
          </p>
        </div>
      </div>

      <dl className="py-5 space-y-4">
        {RINCIAN.map(({ icon: Icon, judul, isi }) => (
          <div key={judul} className="flex items-start gap-3">
            <Icon size={17} className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-sm font-semibold text-text-primary">{judul}</dt>
              <dd className="text-sm text-text-secondary leading-relaxed mt-0.5">{isi}</dd>
            </div>
          </div>
        ))}
      </dl>

      <form onSubmit={handleSubmit} noValidate className="space-y-5 border-t border-border pt-5">
        {!tanpaDataDiri && (
          <div className="grid gap-4 sm:grid-cols-2">
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
                <p id="nama-galat" className="text-xs font-semibold text-error mt-1.5 px-1">
                  {galat.nama}
                </p>
              )}
            </div>
            <div>
              <Input
                label="NOMOR HP"
                id="nomorHp"
                // `type="tel"` + `inputMode="tel"`: papan tuts ponsel langsung
                // membuka angka. BUKAN `type="number"`, yang membuang tanda plus
                // pada bentuk +62 dan menambahkan tombol naik-turun yang tak ada
                // artinya pada nomor telepon.
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
                <p id="nomorHp-galat" className="text-xs font-semibold text-error mt-1.5 px-1">
                  {galat.nomorHp}
                </p>
              )}
            </div>
            <Dropdown
              id="jenisKelamin"
              label="JENIS KELAMIN"
              value={jenisKelamin}
              onChange={setJenisKelamin}
              error={galat.jenisKelamin}
              options={[{ label: 'Pilih jenis kelamin', value: '' }, ...JENIS_KELAMIN_OPSI]}
            />
            <Dropdown
              id="kelompokUmur"
              label="KELOMPOK UMUR"
              value={kelompokUmur}
              onChange={setKelompokUmur}
              error={galat.kelompokUmur}
              options={[{ label: 'Pilih kelompok umur', value: '' }, ...KELOMPOK_UMUR_OPSI]}
            />
          </div>
        )}

        <label htmlFor="tanpa-data-diri" className="flex items-start gap-3 cursor-pointer">
          <input
            id="tanpa-data-diri"
            type="checkbox"
            checked={tanpaDataDiri}
            onChange={(e) => {
              setTanpaDataDiri(e.target.checked);
              // Pesan galat DIBERSIHKAN saat pengisi memilih tanpa data diri:
              // medannya hilang dari layar, dan pesan yang menunjuk medan yang
              // sudah tak terlihat cuma menuduh tanpa dapat ditindaklanjuti.
              setGalat({});
            }}
            // 20px + area sentuh label penuh: kotak centang kecil di dalam label
            // besar memenuhi target 44px lewat labelnya, bukan lewat kotaknya.
            className="w-5 h-5 mt-0.5 shrink-0 accent-primary cursor-pointer"
          />
          <span className="text-sm text-text-primary leading-relaxed">
            Isi survei tanpa data diri
          </span>
        </label>

        <label
          htmlFor="setuju-pdp-publik"
          className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-container-low/60 cursor-pointer hover:bg-surface-container-low transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-container/20"
        >
          <input
            id="setuju-pdp-publik"
            type="checkbox"
            checked={setuju}
            onChange={(e) => setSetuju(e.target.checked)}
            aria-describedby="setuju-pdp-publik-bantuan"
            className="w-5 h-5 mt-0.5 shrink-0 accent-primary cursor-pointer"
          />
          <span className="text-sm text-text-primary leading-relaxed">
            Saya telah membaca dan <strong className="font-semibold">menyetujui</strong> pemrosesan
            data saya untuk tujuan yang dijelaskan di atas.{' '}
            <span className="text-error font-semibold" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(wajib)</span>
          </span>
        </label>
        <p id="setuju-pdp-publik-bantuan" className="text-xs text-text-secondary px-1">
          Persetujuan dicatat beserta waktunya bersama jawaban Anda.
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <Link
            href="/"
            className="text-sm font-semibold text-text-secondary hover:text-text-primary underline underline-offset-4 py-2.5 px-1 text-left sm:text-center"
          >
            Kembali ke Beranda
          </Link>
          <Button type="submit" disabled={!setuju} className="w-full sm:w-auto">
            Setuju &amp; Mulai Isi
          </Button>
        </div>
      </form>
    </Card>
  );
}
