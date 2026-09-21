'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

/**
 * `periode` (opsional) hanya untuk keterangan: isi kartu ini MEMANG mengikuti
 * penyaring triwulan di navbar (data berasal dari `GET /dashboard/ikm?periode=`),
 * jadi saat kosong pengguna perlu tahu bahwa yang kosong adalah periode itu --
 * bukan seluruh sistem.
 */
export default function IkmLeaderboard({ data = [], periode }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getOpacityClass = (index) => {
    const opacityMap = [
      'bg-primary',
      'bg-primary/80',
      'bg-primary/60',
      'bg-primary/40',
      'bg-primary/30'
    ];
    return opacityMap[index] || 'bg-primary/20';
  };

  return (
    <div className="lg:col-span-2 bg-surface p-lg rounded-xl shadow-sm border border-border">
      <div className="flex justify-between items-center gap-md mb-xl">
        <div className="min-w-0">
          <h4 className="font-headline-md text-headline-md font-bold text-text-primary">
            Leaderboard Perbandingan Nilai IKM antar-OPD
          </h4>
          {periode && (
            <p className="text-xs text-text-secondary mt-0.5">{formatPeriodeLabel(periode)}</p>
          )}
        </div>
        {/* Dulu <button> tanpa handler sama sekali -- diklik tak terjadi apa pun.
            Diarahkan ke monitoring survei lintas-OPD, satu-satunya halaman yang
            memang memuat daftar lengkapnya. */}
        <Link
          href="/admin-kab/surveys"
          /* Terukur 77x16 di ponsel: tautan setinggi enam belas piksel.
             `inline-flex` + `min-h-[44px]` menaikkan sasaran sentuhnya tanpa
             mengubah ukuran hurufnya. */
          className="inline-flex items-center min-h-[44px] text-primary text-xs font-bold hover:underline shrink-0"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="space-y-md">
        {/* Di-key dgn `surveyId`, BUKAN `opdId` (31 Agustus 2026): tiap baris di
            sini adalah satu SURVEI, dan satu OPD boleh punya beberapa survei --
            jadi `opdId` memang bukan identitas baris ini dan pernah memicu
            peringatan React "two children with the same key". Akar masalahnya
            sendiri (survei dibuka kembali terhitung dua kali) sudah diperbaiki
            di IkmService.getDashboard; key ini lapis kedua, dan tetap benar
            kalau kelak daftarnya sengaja memuat beberapa survei per OPD. */}
        {data.map((item, index) => (
          <div key={item.surveyId} className="space-y-xs">
            <div className="flex justify-between gap-2 text-xs font-semibold">
              {/* Nama OPD bisa sangat panjang ("Dinas Pemberdayaan Perempuan dan
                  Perlindungan Anak"). `min-w-0 truncate` menjaganya menyusut
                  dengan elipsis alih-alih mendorong nilai IKM keluar layar --
                  perlu sejak pembungkusnya tak lagi dipaksa 500px di ponsel. */}
              <span className="min-w-0 truncate" title={item.opdName}>{item.opdName}</span>
              <span className="shrink-0 text-primary">{item.ikmScore.toFixed(1)}</span>
            </div>
            <div className="h-3 w-full bg-surface-container-low rounded-full overflow-hidden">
              <div 
                className={clsx(
                  "h-full rounded-full transition-all duration-1000 ease-out", 
                  getOpacityClass(index),
                  "hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]" // Equivalent to .chart-bar-glow
                )} 
                style={{ width: animate ? `${item.ikmScore}%` : '0%' }}
              ></div>
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <div className="text-center text-text-secondary text-sm py-md">
            {periode
              ? `Belum ada hasil IKM untuk ${formatPeriodeLabel(periode)}. Coba pilih triwulan lain pada navbar.`
              : 'Belum ada data tersedia.'}
          </div>
        )}
      </div>
    </div>
  );
}
