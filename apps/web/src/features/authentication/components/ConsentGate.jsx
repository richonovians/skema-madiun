'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, Eye, Trash2, Lock, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { ROLE_HOME } from '@/constants/roleHome';
import { authApi } from '../services/sso.api';
import { saveConsentFlag } from '../services/authStorage';
import { useLogout } from '@/hooks/useLogout';

/**
 * Gerbang persetujuan pemrosesan data pribadi (UU PDP No. 27/2022).
 *
 * KAPAN MUNCUL: hanya untuk peran `responden` yang `consentAt`-nya masih kosong.
 * Admin dilewati — mereka bertindak dalam kapasitas jabatan atas data warga,
 * bukan sebagai subjek data atas dirinya sendiri.
 *
 * Halaman ini pembatas NAVIGASI, dan penegakan sesungguhnya ada di backend:
 * `POST /complaints` dan `POST /surveys/:id/responses` menolak 403 tanpa
 * persetujuan (ConsentService.assertConsented). Jadi melewati halaman ini
 * dengan menyunting cookie hanya menghasilkan halaman yang gagal mengirim.
 *
 * "Tidak setuju" TIDAK dibuat sebagai penolakan diam-diam yang menjebak
 * pengguna di halaman ini: ia keluar dari sesi. Persetujuan yang tak punya
 * alternatif selain terjebak bukanlah persetujuan yang bebas.
 */
const RINCIAN = [
  {
    icon: FileText,
    judul: 'Data yang diproses',
    isi: 'Nama, email, dan data demografis yang Anda isi sendiri (jenis kelamin, kelompok umur, pendidikan, pekerjaan), beserta isi survei dan pengaduan yang Anda kirim.',
  },
  {
    icon: Eye,
    judul: 'Tujuan pemrosesan',
    isi: 'Menghitung Indeks Kepuasan Masyarakat dan menindaklanjuti pengaduan Anda ke OPD terkait. Jawaban survei ditampilkan kepada petugas dalam bentuk agregat tanpa identitas Anda.',
  },
  {
    icon: Lock,
    judul: 'Siapa yang dapat melihat',
    isi: 'Petugas OPD tujuan dan Admin Kabupaten, sebatas yang diperlukan untuk menindaklanjuti. Data tidak dibagikan ke pihak di luar Pemerintah Kabupaten Madiun.',
  },
  {
    icon: Trash2,
    judul: 'Hak Anda',
    isi: 'Anda berhak menarik persetujuan, meminta koreksi, atau meminta penghapusan data dengan menghubungi Admin Kabupaten melalui kanal resmi Diskominfo.',
  },
];

export default function ConsentGate({ role = 'responden' }) {
  const [setuju, setSetuju] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { logout, isLoggingOut } = useLogout();
  const errorRef = useRef(null);

  // Fokus dipindahkan ke pesan galat setelah kirim gagal, bukan pada setiap
  // perubahan — pengguna yang memakai pembaca layar harus mendengar apa yang
  // salah tanpa harus menelusuri ulang seluruh halaman.
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!setuju || isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      await authApi.recordConsent();
      saveConsentFlag(true);
      // Navigasi HARD: proxy.js membaca cookie `consent` lewat full request,
      // jadi nilai yang baru ditulis harus ikut terkirim pada permintaan
      // berikutnya — kalau tidak, proxy memantulkan kembali ke sini.
      window.location.assign(ROLE_HOME[role] ?? '/dashboard');
    } catch (err) {
      setError(err.message || 'Persetujuan gagal disimpan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-[680px] p-6 sm:p-8">
      <div className="flex items-start gap-3.5 border-b border-border pb-5">
        <div className="p-2.5 rounded-xl bg-primary-container/40 text-primary shrink-0">
          <ShieldCheck size={22} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-headline-md font-headline-md text-text-primary leading-tight">
            Persetujuan Pemrosesan Data Pribadi
          </h1>
          <p className="text-body-md font-body-md text-text-secondary mt-1.5">
            Sebelum mengirim survei atau pengaduan, kami perlu persetujuan Anda sesuai Undang-Undang
            Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.
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

      {/* Tautan ke keterangan lengkap, diletakkan SEBELUM kotak centang (25
          September 2026). Empat butir di atas adalah ringkasan, dan persetujuan
          yang bebas menuntut kesempatan membaca sumbernya sebelum mencentang,
          bukan sesudah. Membuka di tab baru supaya isian yang sedang dikerjakan
          tak hilang. */}
      <p className="text-sm text-text-secondary -mt-1 mb-4">
        Keterangan lengkapnya, termasuk masa simpan dan cara menggunakan hak Anda, ada di{' '}
        <Link
          href="/kebijakan-privasi"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium underline underline-offset-4"
        >
          Kebijakan Privasi
        </Link>
        .
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* role="alert" + aria-live: galat harus terdengar pembaca layar, bukan
            hanya terlihat. tabIndex -1 supaya fokus dapat dipindahkan ke sini. */}
        {error && (
          <div
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="flex items-start gap-2.5 p-3.5 mb-4 rounded-xl bg-error-container border border-error/30 text-on-error-container"
          >
            <AlertTriangle size={17} className="shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <label
          htmlFor="setuju-pdp"
          className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-container-low/60 cursor-pointer hover:bg-surface-container-low transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-container/20"
        >
          <input
            id="setuju-pdp"
            type="checkbox"
            checked={setuju}
            onChange={(e) => {
              setSetuju(e.target.checked);
              setError('');
            }}
            aria-describedby="setuju-pdp-bantuan"
            // 20px + area sentuh label penuh; kotak centang kecil di dalam label
            // besar memenuhi target 44px lewat labelnya, bukan lewat kotaknya.
            className="w-5 h-5 mt-0.5 shrink-0 accent-primary cursor-pointer"
          />
          <span className="text-sm text-text-primary leading-relaxed">
            Saya telah membaca dan <strong className="font-semibold">menyetujui</strong> pemrosesan
            data pribadi saya untuk tujuan yang dijelaskan di atas.{' '}
            <span className="text-error font-semibold" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(wajib)</span>
          </span>
        </label>
        <p id="setuju-pdp-bantuan" className="text-xs text-text-secondary mt-2 px-1">
          Persetujuan dicatat beserta waktunya dan dapat Anda tarik kembali kapan saja.
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-5 border-t border-border">
          <button
            type="button"
            onClick={logout}
            disabled={isLoggingOut || isSubmitting}
            className="text-sm font-semibold text-text-secondary hover:text-text-primary underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 px-1 text-left sm:text-center"
          >
            {isLoggingOut ? 'Keluar...' : 'Tidak setuju & keluar'}
          </button>

          <Button type="submit" disabled={!setuju || isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Menyimpan...' : 'Setuju & Lanjutkan'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
