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
          className="text-primary text-xs font-bold hover:underline shrink-0"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="space-y-md">
        {data.map((item, index) => (
          <div key={item.opdId} className="space-y-xs">
            <div className="flex justify-between text-xs font-semibold">
              <span>{item.opdName}</span>
              <span className="text-primary">{item.ikmScore.toFixed(1)}</span>
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
