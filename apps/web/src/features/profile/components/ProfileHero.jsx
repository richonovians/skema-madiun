'use client';

import React from 'react';
import { BadgeCheck, Shield, UserCheck } from 'lucide-react';
import Badge from '@/components/ui/Badge';

/**
 * Status akun & lencana DITURUNKAN dari data, tak lagi dipatok. Sebelumnya
 * lencana "Akun Terverifikasi SSO" dan tulisan "Status Akun: Aktif" dirender
 * tanpa syarat apa pun -- akun yang dinonaktifkan pun tetap tampak aktif dan
 * terverifikasi, padahal SSO Helpdesk belum dibangun sama sekali (lihat catatan
 * gap me.adapter.js). `occupation` juga hanya ditampilkan bila ada: untuk
 * responden tanpa profil demografis, nilainya null dan dulu menyisakan
 * "Responden • " menggantung tanpa isi.
 */
export default function ProfileHero({ user }) {
  const isActive = user?.status !== 'INACTIVE';

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Background Decorative Gradient Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-bl-full pointer-events-none -mr-16 -mt-16" />

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10 text-center sm:text-left">
        {/* Large Avatar */}
        <div className="relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-3xl sm:text-4xl shadow-inner border-4 border-background overflow-hidden shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{user?.initials ?? '-'}</span>
            )}
          </div>
          {isActive && (
            <div
              className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full shadow-md border-2 border-surface"
              title="Akun aktif"
            >
              <BadgeCheck size={16} />
            </div>
          )}
        </div>

        {/* User Identity Details */}
        <div className="flex-1 space-y-2 mt-1 sm:mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-center sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              {user?.name ?? '-'}
            </h1>
            <Badge
              variant={isActive ? 'success' : 'danger'}
              className="gap-1 flex items-center justify-center w-fit mx-auto sm:mx-0 py-1 px-3 shadow-2xs"
            >
              <Shield size={13} className="mt-[-1px]" />
              <span>{isActive ? 'Akun Aktif' : 'Akun Nonaktif'}</span>
            </Badge>
          </div>

          <p className="text-text-secondary font-medium text-sm sm:text-base">
            {user?.roleLabel ?? '-'}
            {user?.occupation && (
              <> • <span className="text-text-primary font-semibold">{user.occupation}</span></>
            )}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-text-secondary">
            <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-lg border border-border/60">
              <UserCheck size={15} className="text-primary" />
              <span>
                Login terakhir:{' '}
                <strong className="text-text-primary font-semibold">
                  {user?.lastLogin ?? 'belum tercatat'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
