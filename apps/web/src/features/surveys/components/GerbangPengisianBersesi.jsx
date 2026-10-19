'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

/**
 * Gerbang sebelum kuesioner bagi pengguna yang SUDAH login.
 *
 * SATU KONTROL SAJA, yaitu pilihan anonim (1 Oktober 2026, petang). Tak ada
 * medan isian sama sekali.
 *
 * MEDAN NOMOR HP DIBUANG karena sumbernya akhirnya ada. Ia dipasang pagi ini
 * atas dasar pengukuran yang ternyata belum lengkap: `claims_supported`
 * penyedia tak memuat `phone_number`, dan dari situ disimpulkan Helpdesk tak
 * mengirim nomor telepon. Payload `userinfo` SUNGGUHAN memuat
 * `identity.phone_number`. Spesifikasi OIDC memang menyebut `claims_supported`
 * sebagai petunjuk, bukan jaminan tertutup, dan di sinilah bedanya terasa.
 * Sejak nomornya ada di akun, memintanya berarti menyuruh orang mengetik ulang
 * yang sudah diketahui sistem.
 *
 * PILIHAN ANONIM TETAP ADA, dan justru menjadi lebih berarti daripada
 * sebelumnya: yang direkam kini bertambah dari nama saja menjadi nama, nomor
 * HP, dan jenis kelamin. Semakin banyak yang direkam, semakin bernilai pula
 * kemampuan memilih untuk tidak direkam.
 *
 * NASKAHNYA BERUBAH, dan bukan sekadar menyesuaikan. Kalimat lama berbunyi
 * "Nama Anda tidak pernah ditampilkan bersama jawaban ini". Itu benar ketika
 * ditulis, lalu menjadi TIDAK BENAR pada hari yang sama begitu kartu "Data
 * Pengisi" dipasang di rincian respons: petugas memang melihatnya di sana.
 * Layar yang meminta orang mengisi survei tak boleh menjanjikan kerahasiaan
 * yang sudah tidak berlaku.
 *
 * BATASNYA JUGA DISEBUT: pilihan anonim TIDAK melepas respons dari akun.
 * `userId` tetap tersimpan supaya anti-duplikat (`dedupeUserId`) dan riwayat
 * survei pemiliknya bekerja. Pengisi yang menyangka responsnya lepas dari akun
 * akan salah menilai risikonya, justru pada topik yang paling tidak boleh
 * dibesar-besarkan.
 */
export default function GerbangPengisianBersesi({ onMulai }) {
  const [anonim, setAnonim] = useState(false);

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
            Jawaban survei ditampilkan kepada petugas dalam bentuk rekapitulasi.
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
            harus ia pilah sendiri.

            Cabang "tidak anonim" MENYEBUT KETIGA MEDANNYA satu per satu, bukan
            "data diri Anda". Sejak nomor HP dan jenis kelamin ikut direkam,
            kalimat yang menggeneralisasi akan menyembunyikan dua di antaranya
            dari orang yang sedang memutuskan. */}
        <p
          id="isi-anonim-bantuan"
          className="text-xs text-text-secondary mt-2.5 px-1 leading-relaxed"
        >
          {anonim
            ? 'Nama, nomor HP, dan jenis kelamin Anda tidak direkam bersama jawaban ini. Survei tetap hanya dapat diisi satu kali per akun, dan pengisian ini tetap muncul di riwayat survei Anda.'
            : 'Nama, nomor HP, dan jenis kelamin pada akun Anda direkam bersama jawaban ini, dan dapat dilihat petugas pada rincian respons.'}
        </p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-5">
        <Link
          href="/surveys"
          className="text-sm font-semibold text-text-secondary hover:text-text-primary underline underline-offset-4 py-2.5 px-1 text-left sm:text-center"
        >
          Kembali ke Daftar Survei
        </Link>
        {/* Tombolnya SELALU hidup. Tidak mencentang apa pun adalah pilihan yang
            sah di sini (mengisi dengan data diri), berbeda dari gerbang PDP
            publik yang memang menunggu satu persetujuan wajib. */}
        <Button type="button" onClick={() => onMulai?.({ anonim })} className="w-full sm:w-auto">
          Mulai Isi Survei
        </Button>
      </div>
    </Card>
  );
}
