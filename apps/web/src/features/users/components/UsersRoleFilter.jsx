import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const ROLES = [
  { label: 'Semua Pengguna', value: 'ALL' },
  { label: 'Superuser', value: 'SUPERUSER' },
  { label: 'Admin Kabupaten', value: 'ADMIN_KABUPATEN' },
  { label: 'Admin OPD', value: 'ADMIN_OPD' },
  { label: 'Responden Aktif', value: 'RESPONDENT' },
];

export default function UsersRoleFilter({ activeRoleFilter, setActiveRoleFilter }) {
  return (
    /**
     * `flex-wrap` menggantikan `overflow-x-auto hide-scrollbar`
     * (6 September 2026). Kombinasi lama menyembunyikan pilihan TANPA sisa
     * petunjuk: `hide-scrollbar` membuang bilah geser di seluruh peramban,
     * jadi pada lebar 768px hanya 2 dari 5 penyaring terlihat dan tiga lainnya
     * hanya dapat dijangkau lewat gerakan geser yang tak terlihat siapa pun.
     *
     * Membungkus membuat kelimanya SELALU tampak. Ongkosnya barisnya meninggi
     * pada layar sempit -- pertukaran yang jelas lebih baik daripada penyaring
     * yang ada tapi tak diketahui.
     *
     * `xl:w-fit` (dulu `md:`): selama baris induknya masih menumpuk, penyaring
     * ini memakai lebar PENUH dan kelima pilihannya cukup dalam satu baris.
     * Diukur: pada 1024px, `w-fit` menyusut jadi ~407px dan membungkus jadi
     * TIGA baris -- padahal ruang menumpuk di sana 774px, cukup untuk satu.
     */
    <div className="flex flex-wrap gap-2 p-1 bg-surface-container-low w-full xl:w-fit rounded-xl border border-outline-variant">
      {ROLES.map((role) => {
        const isActive = activeRoleFilter === role.value;
        return (
          <button
            key={role.value}
            onClick={() => setActiveRoleFilter(role.value)}
            className={twMerge(
              clsx(
                "px-lg py-2 rounded-lg font-label-md text-sm transition-all whitespace-nowrap",
                isActive
                  ? "bg-text-primary text-white shadow-sm"
                  : "bg-transparent text-text-secondary hover:bg-surface-container-highest hover:text-text-primary border border-transparent"
              )
            )}
          >
            {role.label}
          </button>
        );
      })}
    </div>
  );
}
