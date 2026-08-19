'use client';

import React, { useCallback } from 'react';
import { Building2, Users, FileText, CheckCircle2 } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { getStatistics } from '@/features/statistics/services/statistics.api';

/**
 * Angka ringkas untuk halaman Tentang Kami.
 *
 * SEBELUMNYA keempatnya di-hardcode di constants/aboutContent.js: 45 OPD,
 * 12.500 responden, 8.430 pengaduan, penyelesaian 98% -- seluruhnya karangan,
 * dan dipajang di halaman PUBLIK sebagai capaian sistem. Data sungguhannya saat
 * catatan ini ditulis: 54 OPD aktif, 4 responden, 4 pengaduan, penyelesaian 25%.
 *
 * Sumbernya kini `GET /statistics`, endpoint publik tanpa autentikasi (D2) --
 * sama dengan halaman /statistics, jadi angka di kedua halaman tak mungkin
 * saling bertentangan.
 */

/**
 * Ringkas angka besar tanpa membesar-besarkan yang kecil. Format lama SELALU
 * membagi 1000 lalu menambah "rb+", yang untuk data nyata bernilai 4 akan
 * berbunyi "0rb+". Di bawah 1.000 ditampilkan apa adanya.
 */
function formatCompact(value) {
  if (value == null) return { value: '-', suffix: '' };
  if (value < 1000) return { value: value.toLocaleString('id-ID'), suffix: '' };
  const ribuan = value / 1000;
  return {
    value: (ribuan < 10 ? ribuan.toFixed(1) : Math.round(ribuan).toString()).replace('.', ','),
    suffix: 'rb',
  };
}

const CARD_STYLE = [
  { color: 'text-blue-600', bg: 'bg-blue-100' },
  { color: 'text-green-600', bg: 'bg-green-100' },
  { color: 'text-orange-600', bg: 'bg-orange-100' },
  { color: 'text-white', bg: 'bg-white/20' },
];

export default function AboutStatistics() {
  const fetchStatistics = useCallback(() => getStatistics(), []);
  const { data, isLoading, error } = useAsync(fetchStatistics);

  const summary = data?.summary;
  const responden = formatCompact(summary?.totalRespondents);
  const pengaduan = formatCompact(summary?.totalComplaints);

  const statItems = [
    {
      label: 'Total OPD Terintegrasi',
      // Tanpa akhiran "+": jumlahnya persis, bukan perkiraan minimum.
      value: summary?.activeOpd != null ? summary.activeOpd.toLocaleString('id-ID') : '-',
      suffix: '',
      icon: Building2,
    },
    { label: 'Total Responden', ...responden, icon: Users },
    { label: 'Total Pengaduan', ...pengaduan, icon: FileText },
    {
      label: 'Tingkat Penyelesaian',
      value: summary?.completionRate != null ? String(summary.completionRate) : '-',
      suffix: summary?.completionRate != null ? '%' : '',
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-surface">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-br from-primary to-primary-hover rounded-[2rem] p-6 sm:p-8 md:p-12 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
            {statItems.map((item, index) => {
              const Icon = item.icon;
              const style = CARD_STYLE[index];
              return (
                <div
                  key={item.label}
                  className="flex flex-col items-center text-center animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div
                    className={`w-14 h-14 ${style.bg} ${style.color} rounded-2xl flex items-center justify-center mb-4 shadow-sm`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  {isLoading ? (
                    <div className="h-9 w-24 rounded-lg bg-white/25 animate-pulse mb-2" />
                  ) : (
                    <h4 className="font-h2 text-h2 text-white mb-2 flex items-baseline justify-center">
                      {item.value}
                      {item.suffix && (
                        <span className="text-xl ml-1 font-medium text-white/80">{item.suffix}</span>
                      )}
                    </h4>
                  )}
                  <p className="font-body text-body-sm md:text-body text-white/80 font-medium">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Kegagalan muat tidak menyembunyikan seksinya (tata letak halaman
              publik jadi melompat), tapi juga tak boleh menyisakan angka yang
              seolah-olah nyata -- semuanya '-' plus keterangan singkat. */}
          {error && (
            <p className="relative z-10 mt-8 text-center text-xs text-white/80">
              Angka statistik belum dapat dimuat saat ini.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
