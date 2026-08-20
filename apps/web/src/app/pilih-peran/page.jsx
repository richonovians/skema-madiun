'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RoleLoginPicker from '@/features/authentication/components/RoleLoginPicker';
import { getSuperuserArea } from '@/features/authentication/services/authStorage';
import { getMyProfile } from '@/features/profile/services/profile.api';
import { useAsync } from '@/hooks/useAsync';
import { USER_ROLES } from '@/features/users/constants/userConstants';
import { ROLE_HOME, SUPERUSER_AREA_HOME } from '@/constants/roleHome';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';

/**
 * Berpindah area kerja tanpa keluar-masuk lagi (2026-08-20).
 *
 * Dibutuhkan karena pilihan peran superuser sekarang MENGURUNG navigasinya ke
 * satu area (lihat RoleLoginPicker.jsx & proxy.js) -- tanpa halaman ini,
 * satu-satunya jalan keluar dari area yang dipilih adalah logout lalu login lagi.
 *
 * Perannya diperiksa dari `GET /auth/me`, bukan dari cookie: cookie bisa
 * disunting bebas di peramban. Proxy juga sudah memantulkan non-superuser dari
 * sini, jadi ini lapis kedua yang jujur, bukan satu-satunya penjaga.
 */
export default function PilihPeranPage() {
  const router = useRouter();
  const fetchProfile = useCallback(() => getMyProfile(), []);
  const { data: profile, isLoading, error, refetch } = useAsync(fetchProfile);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-lg">
        <LoadingState label="Memuat akun..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-lg">
        <ErrorState title="Gagal memuat akun" description={error.message} onRetry={refetch} />
      </main>
    );
  }

  if (profile?.role !== USER_ROLES.SUPERUSER) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-lg p-lg text-center">
        <div>
          <h1 className="text-headline-md font-headline-md text-text-primary mb-2">
            Pemilihan peran hanya untuk Superuser
          </h1>
          <p className="text-body-md font-body-md text-text-secondary max-w-[420px]">
            Akun Anda memakai satu peran tetap, jadi tak ada yang perlu dipilih di sini.
          </p>
        </div>
        {/* Ke '/' saja, bukan ke ROLE_HOME: kunci ROLE_HOME memakai nama peran
            BACKEND ('kabupaten'/'opd'/...) sementara profil di sini sudah
            diterjemahkan ke bentuk frontend ('ADMIN_KABUPATEN'). Proxy sudah
            mengalihkan '/' ke beranda peran masing-masing, jadi hasilnya sama
            tanpa perlu tabel pemetaan kedua yang bisa tak sinkron. */}
        <Button variant="secondary" onClick={() => router.push('/')}>
          Kembali ke beranda
        </Button>
      </main>
    );
  }

  const currentArea = getSuperuserArea();

  return (
    <main className="min-h-screen bg-slate-50">
      <RoleLoginPicker
        context="switch"
        superuserName={profile?.name ?? ''}
        currentArea={currentArea}
        // Menutup = tetap di area yang sedang dipakai (bukan membatalkan sesi,
        // beda dari pemilih saat login). Navigasi hard supaya proxy ikut menilai
        // ulang cookie area yang mungkin baru saja berubah di tab lain.
        onCancel={() =>
          window.location.assign(SUPERUSER_AREA_HOME[currentArea] ?? ROLE_HOME.superuser)
        }
      />
    </main>
  );
}
