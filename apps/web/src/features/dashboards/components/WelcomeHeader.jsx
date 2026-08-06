'use client';

import React, { useCallback } from 'react';
import { ShieldCheck, CalendarDays, BadgeCheck } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { getMyProfile } from '@/features/profile/services/profile.api';

/**
 * SEBELUMNYA hardcode `DUMMY_CURRENT_USER` + tanggal statis "2026-07-24"
 * (temuan audit 2026-08-05: dashboard warga menyapa nama palsu, bukan akun
 * yang sedang login sama sekali). Kini ambil profil nyata (GET /auth/me,
 * sama seperti ProfileContent.jsx) + tanggal hari ini sungguhan.
 */
export default function WelcomeHeader() {
  const fetchProfile = useCallback(() => getMyProfile(), []);
  const { data: user, isLoading } = useAsync(fetchProfile);

  const currentDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  if (isLoading || !user) {
    return (
      <section className="bg-primary-container/20 border border-primary/10 rounded-3xl p-5 sm:p-8 md:p-10 mb-6 sm:mb-8 animate-pulse">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-surface-container shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-8 w-2/3 bg-surface-container rounded-lg mx-auto md:mx-0" />
            <div className="h-8 w-40 bg-surface-container rounded-full mx-auto md:mx-0" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-primary-container/20 border border-primary/10 rounded-3xl p-5 sm:p-8 md:p-10 mb-6 sm:mb-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
        {/* Avatar Section */}
        <div className="shrink-0 relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden shadow-md border-4 border-white">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} className="w-full h-full object-cover" alt={user.name} />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-3xl font-bold text-white">
                {user.initials}
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-sm border border-slate-100" title="Akun Terverifikasi SSO">
            <BadgeCheck size={24} className="text-primary" />
          </div>
        </div>

        {/* Greeting Section */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
            Selamat datang kembali, <span className="text-primary">{user.name.split(' ')[0]}</span>!
          </h1>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-5">
            <div className="flex items-center gap-2 text-text-secondary bg-surface px-4 py-2 rounded-full border border-border/60 shadow-sm">
              <CalendarDays size={18} className="text-primary" />
              <span className="text-sm font-medium">{currentDate}</span>
            </div>

            <div className="flex items-center gap-2 text-text-secondary bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 shadow-sm">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Identitas Terproteksi</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
