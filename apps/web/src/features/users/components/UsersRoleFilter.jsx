import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const ROLES = [
  { label: 'Semua Pengguna', value: 'ALL' },
  { label: 'Admin Kabupaten', value: 'ADMIN_KABUPATEN' },
  { label: 'Admin OPD', value: 'ADMIN_OPD' },
  { label: 'Responden Terdaftar', value: 'RESPONDENT' },
];

export default function UsersRoleFilter({ activeRoleFilter, setActiveRoleFilter }) {
  return (
    <div className="flex gap-2 p-1 bg-surface-container-low w-full md:w-fit overflow-x-auto hide-scrollbar rounded-xl border border-outline-variant">
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
