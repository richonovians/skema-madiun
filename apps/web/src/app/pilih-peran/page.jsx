'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RoleLoginPicker from '@/features/authentication/components/RoleLoginPicker';
import { getMyRoles } from '@/features/authentication/services/actingRole.api';
import { getStoredRole } from '@/features/authentication/services/authStorage';
import { useAsync } from '@/hooks/useAsync';
import { ROLE_HOME } from '@/constants/roleHome';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';

/**
 * Berpindah peran tanpa keluar-masuk lagi (2026-08-20, digeneralisasi
 * 5 September 2026).
 *
 * Dibutuhkan karena peran yang dipakai MENGURUNG navigasi ke satu area DAN
 * membatasi hak akses sesi (klaim `act`, lihat acting-role.util.ts di backend)
 * -- tanpa halaman ini, satu-satunya jalan berpindah adalah logout lalu login
 * lagi.
 *
 * Dulu khusus superuser; sekarang untuk siapa pun ber-role lebih dari satu.
 */
export default function PilihPeranPage() {
  const router = useRouter();
  const fetchProfile = useCallback(() => getMyRoles(), []);
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

  // Gerbangnya JUMLAH ROLE, bukan peran tertentu (5 September 2026): siapa pun
  // ber-role lebih dari satu punya sesuatu untuk dipilih di sini.
  //
  // Diperiksa dari `GET /auth/me`, bukan dari cookie: cookie bisa disunting
  // bebas di peramban. Proxy meloloskan halaman ini untuk siapa pun bersesi
  // (ia tak tahu berapa role sebuah akun), jadi INILAH penjaganya yang jujur.
  if ((profile?.roles?.length ?? 0) <= 1) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-lg p-lg text-center">
        <div>
          <h1 className="text-headline-md font-headline-md text-text-primary mb-2">
            Tak ada peran untuk dipilih
          </h1>
          <p className="text-body-md font-body-md text-text-secondary max-w-[420px]">
            Akun Anda memegang satu peran saja, jadi tak ada yang perlu dipilih di sini.
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

  // `GET /auth/roles` memakai nama peran BACKEND apa adanya, jadi tak ada
  // penerjemahan di sini. Peran yang SEDANG dipakai dibaca dari cookie/
  // localStorage: endpoint itu sengaja tak melaporkannya (pada jalur "belum
  // memilih" nilainya memang belum ada), dan di sini nilainya hanya untuk
  // label "sedang dipakai" -- kosmetik, bukan keputusan hak.
  const backendRole = getStoredRole();

  return (
    <main className="min-h-screen bg-slate-50">
      <RoleLoginPicker
        context="switch"
        userName={profile?.nama ?? ''}
        roles={profile?.roles ?? []}
        currentRole={backendRole}
        opdId={profile?.opdId ?? null}
        // Menutup = tetap memakai peran yang sekarang (bukan membatalkan sesi,
        // beda dari pemilih saat login). Navigasi hard supaya proxy ikut menilai
        // ulang cookie peran yang mungkin baru berubah di tab lain.
        onCancel={() => window.location.assign(ROLE_HOME[backendRole] ?? '/')}
      />
    </main>
  );
}
