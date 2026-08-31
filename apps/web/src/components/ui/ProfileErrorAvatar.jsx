import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { WifiOff, ShieldAlert } from 'lucide-react';

/**
 * Pengganti Avatar.jsx ketika identitas pengguna GAGAL dimuat.
 *
 * Dibuat karena keempat tempat yang menampilkan avatar (navbar warga, navbar
 * Admin OPD, dan dua avatar di navbar Admin Kabupaten) memakai pola yang sama:
 * `initials={user?.initials ?? '?'}`. Pola itu memperlakukan KEGAGALAN sebagai
 * identitas. "?" tak memberi tahu apa pun -- pengguna tak bisa membedakan "sesi
 * Anda habis", "server tak terjangkau", dan "nama saya memang kosong" -- dan
 * tebakan wajarnya adalah akunnya yang rusak, padahal servernya cuma sedang tak
 * terjangkau (keluhan 28 Agustus 2026).
 *
 * Bentuk & ukurannya SENGAJA sama dengan Avatar supaya tata letak navbar tak
 * bergeser saat berganti keadaan, tetapi warna dan ikonnya berbeda sehingga
 * kegagalan tak lagi menyamar sebagai wajah pengguna.
 *
 * Ikonnya tak berdiri sendiri tanpa nama: elemen ini membawa `role="img"` +
 * `aria-label` sendiri, jadi pembaca layar tetap mendapat keterangannya walau
 * pemanggil hanya menempatkannya sebagai ikon polos.
 *
 * @param {'offline'|'expired'} reason `offline` = server tak terjangkau (sesi
 *   mungkin masih baik); `expired` = sesi ditolak backend (401).
 */
export default function ProfileErrorAvatar({ reason = 'offline', size = 'md', className }) {
  const sizes = {
    sm: { box: 'w-6 h-6', icon: 12 },
    md: { box: 'w-8 h-8', icon: 14 },
    lg: { box: 'w-12 h-12', icon: 20 },
  };

  const reasons = {
    offline: {
      Icon: WifiOff,
      label: 'Profil gagal dimuat: server tidak dapat dihubungi',
    },
    expired: {
      Icon: ShieldAlert,
      label: 'Sesi berakhir: silakan masuk lagi',
    },
  };

  const { box, icon } = sizes[size] ?? sizes.md;
  const { Icon, label } = reasons[reason] ?? reasons.offline;

  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={twMerge(
        clsx(
          'rounded-full flex items-center justify-center shrink-0 border-2',
          'bg-error-container text-on-error-container border-error/40',
          box,
          className,
        ),
      )}
    >
      <Icon size={icon} aria-hidden="true" />
    </div>
  );
}
