'use client';

import React, { useCallback } from 'react';
import { CalendarDays, CalendarRange, Info } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { getMyProfile } from '@/features/profile/services/profile.api';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

const HOUR_GREETING = [
  { until: 11, text: 'Selamat pagi' },
  { until: 15, text: 'Selamat siang' },
  { until: 18, text: 'Selamat sore' },
  { until: 24, text: 'Selamat malam' },
];

/**
 * Kepala halaman dashboard Admin OPD: sapaan dengan nama pengguna SUNGGUHAN
 * (GET /auth/me, pola sama WelcomeHeader.jsx milik dashboard warga) plus
 * penegasan periode mana yang sedang dilihat.
 *
 * Keterangan "kumulatif vs periode" penting dan bukan hiasan: `GET /dashboard/opd`
 * TIDAK menerima parameter periode sama sekali, jadi kartu ringkasan di bawah
 * selalu angka sepanjang waktu. Hanya bagian yang dihitung dari daftar survei &
 * pengaduan yang mengikuti penyaring triwulan di navbar. Tanpa kalimat ini
 * penyaring itu tampak menyaring segalanya -- persis kesan menyesatkan yang
 * ingin dihindari.
 */
export default function OpdDashboardHeader({ periode }) {
  const fetchProfile = useCallback(() => getMyProfile(), []);
  const { data: user } = useAsync(fetchProfile);

  const greeting = HOUR_GREETING.find((g) => new Date().getHours() < g.until)?.text ?? 'Selamat datang';
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <section className="bg-surface border border-outline-variant rounded-2xl p-lg shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-md">
        <div className="min-w-0">
          <h1 className="font-headline-md text-xl md:text-headline-md font-extrabold text-text-primary tracking-tight">
            {greeting}
            {user?.name ? (
              <>
                , <span className="text-primary">{user.name.split(' ')[0]}</span>
              </>
            ) : (
              ''
            )}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-text-secondary mt-1">
            <CalendarDays size={15} className="shrink-0" />
            {today}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl bg-primary-container/30 border border-primary/10">
          <CalendarRange size={18} className="text-primary shrink-0" />
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Periode terpilih
            </p>
            <p className="text-sm font-bold text-primary">{formatPeriodeLabel(periode)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 mt-md pt-md border-t border-outline-variant">
        <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-text-secondary leading-relaxed">
          Lima kartu di bawah menampilkan angka <strong>kumulatif</strong> seluruh periode. Bagian
          &quot;Kinerja Periode&quot; dan &quot;Status Pengaduan&quot; mengikuti pilihan triwulan
          pada navbar.
        </p>
      </div>
    </section>
  );
}
