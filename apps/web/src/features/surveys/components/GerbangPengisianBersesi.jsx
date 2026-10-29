'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function GerbangPengisianBersesi({ onMulai }) {
  const [anonim, setAnonim] = useState(false);

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
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
            <EyeOff size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-text-primary leading-snug">
              Sebelum Anda Mulai Mengisi
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
              Jawaban survei ditampilkan kepada petugas dalam bentuk rekapitulasi.
            </p>
          </div>
        </div>

        <div className="py-3">
          <label
            htmlFor="isi-anonim"
            className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-blue-50/50"
          >
            <input
              id="isi-anonim"
              type="checkbox"
              checked={anonim}
              onChange={(e) => setAnonim(e.target.checked)}
              aria-describedby="isi-anonim-bantuan"
              className="w-4 h-4 mt-0.5 shrink-0 accent-primary cursor-pointer rounded"
            />
            <span className="text-xs sm:text-sm text-text-primary leading-relaxed">
              Isi survei ini <strong className="font-semibold text-primary">sebagai anonim</strong>
            </span>
          </label>

          <p
            id="isi-anonim-bantuan"
            className="text-[11px] sm:text-xs text-text-secondary mt-2 px-1 leading-relaxed"
          >
            {anonim
              ? 'Nama, nomor HP, dan jenis kelamin Anda tidak direkam bersama jawaban ini. Survei tetap hanya dapat diisi satu kali per akun, dan pengisian ini tetap muncul di riwayat survei Anda.'
              : 'Nama, nomor HP, dan jenis kelamin pada akun Anda direkam bersama jawaban ini, dan dapat dilihat petugas pada rincian respons.'}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4 mt-4">
          <Link
            href="/surveys"
            className="text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary underline underline-offset-4 py-2 px-1 text-center sm:text-left"
          >
            Kembali ke Daftar Survei
          </Link>
          <Button
            type="button"
            onClick={() => onMulai?.({ anonim })}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold shadow-xs"
          >
            Mulai Isi Survei
          </Button>
        </div>
      </div>
    </div>
  );
}
