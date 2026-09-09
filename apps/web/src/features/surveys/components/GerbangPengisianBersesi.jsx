'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

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
        <Button type="button" onClick={() => onMulai?.({ anonim })} className="w-full sm:w-auto">
          Mulai Isi Survei
        </Button>
      </div>
    </Card>
  );
}
