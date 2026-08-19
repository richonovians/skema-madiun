'use client';

import React, { useCallback } from 'react';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getMyProfile } from '../services/profile.api';
import ProfileHero from './ProfileHero';
import ProfileBiodataCard from './ProfileBiodataCard';
import ProfileAccountCard from './ProfileAccountCard';
import ProfileSSOCard from './ProfileSSOCard';
import ProfileActions from './ProfileActions';

/**
 * Ambil profil sungguhan (GET /auth/me) dan teruskan ke sub-komponen lewat prop
 * `user` (INT-16).
 *
 * Nilai default `DUMMY_CURRENT_USER` pada sub-komponen sudah DIBUANG beserta
 * berkas konstantanya (2026-08-19): selama masih ada, prop `user` yang lupa
 * dikirim akan diam-diam menampilkan identitas palsu alih-alih gagal terlihat --
 * dan itu benar-benar terjadi di ProfileAvatarDropdown.jsx.
 */
export default function ProfileContent() {
  const fetchProfile = useCallback(() => getMyProfile(), []);
  const { data: user, isLoading, error, refetch } = useAsync(fetchProfile);

  if (isLoading) {
    return <LoadingState label="Memuat profil..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat profil" description={error.message} onRetry={refetch} />;
  }

  return (
    <>
      <ProfileHero user={user} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        <div className="lg:col-span-7 space-y-6 sm:space-y-8 w-full">
          <ProfileBiodataCard user={user} />
          <ProfileAccountCard user={user} />
        </div>

        <div className="lg:col-span-5 space-y-6 sm:space-y-8 w-full lg:sticky lg:top-24">
          <ProfileSSOCard user={user} />
          <ProfileActions />
        </div>
      </div>
    </>
  );
}
