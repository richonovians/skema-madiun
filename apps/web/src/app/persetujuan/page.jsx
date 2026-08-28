'use client';

import React, { useCallback, useEffect } from 'react';
import ConsentGate from '@/features/authentication/components/ConsentGate';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { authApi } from '@/features/authentication/services/sso.api';
import { saveConsentFlag } from '@/features/authentication/services/authStorage';
import { useAsync } from '@/hooks/useAsync';
import { ROLE_HOME } from '@/constants/roleHome';

/**
 * Gerbang persetujuan UU PDP (celah 2, 2026-08-27).
 *
 * DI LUAR grup `(respondent)` dengan sengaja: halaman itu punya kerangka warga
 * lengkap (navbar, menu, tautan ke fitur), dan menampilkannya di sini akan
 * menawarkan jalan keluar dari gerbang yang justru tak boleh dilewati.
 *
 * Keperluannya diperiksa dari `GET /auth/me`, BUKAN dari cookie: cookie
 * `consent` bisa disunting bebas di peramban. Proxy sudah memantulkan yang tak
 * berkepentingan dari sini, jadi ini lapis kedua yang jujur — persis pola yang
 * sudah dipakai /pilih-peran.
 *
 * Yang sudah menyetujui (atau bukan warga) TIDAK dibiarkan menatap halaman ini:
 * mereka langsung diantar ke berandanya, dan cookie-nya sekalian diselaraskan
 * supaya proxy tak memantulkannya kembali ke sini.
 */
export default function PersetujuanPage() {
  const fetchMe = useCallback(() => authApi.me(), []);
  const { data: res, isLoading, error, refetch } = useAsync(fetchMe);
  const me = res?.data;
  const perluPersetujuan = Boolean(me?.consentRequired);

  // Pengalihan dijalankan di EFEK, bukan di badan render. Menulis cookie dan
  // memanggil location.assign() saat render adalah efek samping di tengah
  // perhitungan tampilan -- di Strict Mode ia berjalan dua kali, dan React tak
  // menjanjikan render mana yang benar-benar dipakai.
  useEffect(() => {
    if (isLoading || error || !me || perluPersetujuan) return;
    // Cookie diselaraskan dengan keadaan SEBENARNYA di basis data sebelum
    // berpindah -- tanpa ini, cookie basi membuat proxy memantulkan pengguna
    // ke sini lagi dan lagi.
    saveConsentFlag(true);
    window.location.assign(ROLE_HOME[me.role] ?? '/');
  }, [isLoading, error, me, perluPersetujuan]);

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

  if (!perluPersetujuan) {
    // Efek di atas yang mengalihkan; di sini cuma menahan layar agar tak
    // sekejap menampilkan gerbang kepada orang yang tak membutuhkannya.
    return (
      <main className="min-h-screen flex items-center justify-center p-lg">
        <LoadingState label="Mengalihkan..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-lg bg-background">
      <ConsentGate role={me.role} />
    </main>
  );
}
