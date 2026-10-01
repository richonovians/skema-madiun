'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { NOMOR_HP_REGEX } from '@/features/surveys/constants/demografi';

/**
 * Gerbang sebelum kuesioner bagi pengguna yang SUDAH login (permintaan pengguna
 * 8 September 2026: "sebelum pengguna mengisi survei muncul tampilan opsi
 * anonim").
 *
 * MENGGANTIKAN PernyataanTanpaNama.jsx, yang dihapus bersama perubahan ini.
 * Komponen itu sengaja dibuat sebagai pernyataan pasif, bukan pilihan, dengan
 * alasan yang waktu itu benar: tak ada satu pun layar yang menampilkan siapa
 * pengisi survei, jadi tombol anonim tak akan mengubah apa pun. Alasan itu
 * BERUBAH pada hari yang sama, ketika pengguna meminta nama dan nomor HP
 * direkam. Sejak ada yang direkam, ada pula yang dapat dipilih untuk tidak
 * direkam, dan pilihannya menjadi kontrol yang hidup.
 *
 * TIDAK ADA MEDAN ISIAN di sini, dan itu permintaan tersurat pengguna: data
 * dirinya diambil dari akun, jadi gerbangnya cukup kotak anonim. Yang
 * benar-benar tersedia dari akun sudah diukur, dan hanya `nama` yang datang
 * dari Helpdesk; demografisnya diambil dari `respondent_profiles` bila akun itu
 * punya barisnya. Nomor HP tak direkam pada jalur ini karena tak ada sumbernya.
 * Karena itu naskah di bawah menyebut "nama", bukan "data diri Anda":
 * menjanjikan lebih banyak daripada yang benar-benar tersimpan akan membuat
 * layar persetujuan menyesatkan.
 *
 * PILIHANNYA TIDAK MELEPAS RESPONS DARI AKUN. `userId` tetap tersimpan atas
 * keputusan pengguna, supaya anti-duplikat (`dedupeUserId`) dan riwayat survei
 * pemiliknya tetap bekerja. Naskahnya berhenti pada apa yang dijamin kode, dan
 * menyebut batas itu tersurat: pengisi yang menyangka responsnya lepas dari
 * akun akan salah menilai risikonya, justru pada topik yang paling tidak boleh
 * dibesar-besarkan.
 */
export default function GerbangPengisianBersesi({ onMulai }) {
  const [anonim, setAnonim] = useState(false);
  const [nomorHp, setNomorHp] = useState('');
  const [galatNomorHp, setGalatNomorHp] = useState(null);

  /**
   * SATU-SATUNYA medan isian di gerbang ini (1 Oktober 2026, keputusan tersurat
   * pengguna), dan alasannya bukan selera.
   *
   * Nama dan demografis TIDAK diminta di sini sebab keduanya sudah ada di akun;
   * memintanya berarti menyuruh orang mengetik ulang yang sudah diketahui
   * sistem. Nomor HP berbeda, dan bedanya terukur: metadata penyedia Helpdesk
   * (1 Oktober 2026) memuat `claims_supported` tanpa `phone_number` dan
   * `scopes_supported` tanpa scope `phone`, dan `users` tak punya kolomnya.
   * Tak ada yang bisa disalin, jadi satu-satunya sumber yang jujur adalah
   * pengisinya sendiri.
   *
   * OPSIONAL dengan sengaja. Nomor HP bukan syarat menilai layanan publik, dan
   * mewajibkannya menukar data pelengkap dengan suara warga yang hilang.
   */
  const mulai = () => {
    // Dibuang, bukan sekadar disembunyikan: mengirim isi medan yang pengisinya
    // sudah memutuskan untuk tidak diberikan akan membatalkan arti pilihannya.
    // Pola yang sama berdiri di GerbangPengisianPublik.
    if (anonim) {
      setGalatNomorHp(null);
      onMulai?.({ anonim: true, nomorHp: null });
      return;
    }

    const bersih = nomorHp.trim();
    if (bersih && !NOMOR_HP_REGEX.test(bersih)) {
      // Ditahan DI SINI, bukan dibiarkan sampai pengiriman: pengisi yang sudah
      // menjawab seluruh kuesioner lalu ditolak backend akan kehilangan
      // jawabannya tanpa tahu sebabnya.
      setGalatNomorHp('Nomor HP tidak dikenali. Contoh bentuk yang diterima: 081234567890');
      return;
    }

    setGalatNomorHp(null);
    onMulai?.({ anonim: false, nomorHp: bersih || null });
  };

  return (
    <Card className="w-full max-w-[680px] mx-auto p-6 sm:p-8">
      <div className="flex items-start gap-3.5 border-b border-border pb-5">
        <div className="p-2.5 rounded-xl bg-primary-container/40 text-primary shrink-0">
          <EyeOff size={22} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-headline-md font-headline-md text-text-primary leading-tight">
            Sebelum Anda Mulai Mengisi
          </h1>
          <p className="text-body-md font-body-md text-text-secondary mt-1.5">
            Jawaban survei ditampilkan kepada petugas dalam bentuk rekapitulasi. Nama Anda tidak
            pernah ditampilkan bersama jawaban ini.
          </p>
        </div>
      </div>

      <div className="py-5">
        <label
          htmlFor="isi-anonim"
          className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-container-low/60 cursor-pointer hover:bg-surface-container-low transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-container/20"
        >
          <input
            id="isi-anonim"
            type="checkbox"
            checked={anonim}
            onChange={(e) => setAnonim(e.target.checked)}
            aria-describedby="isi-anonim-bantuan"
            // 20px + area sentuh label penuh: kotak centang kecil di dalam label
            // besar memenuhi target 44px lewat labelnya, bukan lewat kotaknya.
            className="w-5 h-5 mt-0.5 shrink-0 accent-primary cursor-pointer"
          />
          <span className="text-sm text-text-primary leading-relaxed">
            Isi survei ini <strong className="font-semibold">sebagai anonim</strong>
          </span>
        </label>

        {/* Keterangannya BERUBAH mengikuti pilihannya, bukan satu paragraf tetap
            yang menjelaskan keduanya sekaligus: pengisi perlu tahu apa yang
            berlaku pada dirinya sekarang, bukan daftar dua kemungkinan yang
            harus ia pilah sendiri. */}
        <p id="isi-anonim-bantuan" className="text-xs text-text-secondary mt-2.5 px-1 leading-relaxed">
          {anonim
            ? 'Nama Anda tidak direkam bersama jawaban ini. Survei tetap hanya dapat diisi satu kali per akun, dan pengisian ini tetap muncul di riwayat survei Anda.'
            : 'Nama pada akun Anda direkam bersama jawaban ini, tanpa ditampilkan kepada petugas.'}
        </p>

        {/* HILANG saat anonim dipilih, bukan sekadar dinonaktifkan: medan mati
            yang tetap terpampang mengundang pengisi mengetik lalu bertanya-tanya
            mengapa tak bisa. */}
        {!anonim && (
          <div className="mt-5">
            <label
              htmlFor="nomor-hp"
              className="block text-sm font-semibold text-text-primary mb-1.5"
            >
              Nomor HP <span className="font-normal text-text-secondary">(opsional)</span>
            </label>
            <input
              id="nomor-hp"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={nomorHp}
              onChange={(e) => setNomorHp(e.target.value)}
              placeholder="081234567890"
              aria-describedby={galatNomorHp ? 'nomor-hp-galat' : 'nomor-hp-bantuan'}
              aria-invalid={galatNomorHp ? 'true' : undefined}
              className="w-full min-h-[44px] rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {galatNomorHp ? (
              <p id="nomor-hp-galat" role="alert" className="text-xs text-error mt-1.5 px-1">
                {galatNomorHp}
              </p>
            ) : (
              <p id="nomor-hp-bantuan" className="text-xs text-text-secondary mt-1.5 px-1">
                Dipakai hanya bila petugas perlu menghubungi Anda soal jawaban ini. Boleh
                dikosongkan.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-5">
        <Link
          href="/surveys"
          className="text-sm font-semibold text-text-secondary hover:text-text-primary underline underline-offset-4 py-2.5 px-1 text-left sm:text-center"
        >
          Kembali ke Daftar Survei
        </Link>
        {/* Tombolnya SELALU hidup. Tidak mencentang apa pun adalah pilihan yang
            sah di sini (mengisi dengan nama), berbeda dari gerbang PDP publik
            yang memang menunggu satu persetujuan wajib. */}
        <Button type="button" onClick={mulai} className="w-full sm:w-auto">
          Mulai Isi Survei
        </Button>
      </div>
    </Card>
  );
}
