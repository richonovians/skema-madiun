import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '@/components/ui/Breadcrumb';

/**
 * Dipakai di halaman create DAN edit user (2026-08-05) -- props opsional
 * dgn default = teks create, supaya create/page.jsx tak perlu berubah.
 */
export default function CreateUserHeader({
  breadcrumbLabel = 'Buat Akun Admin',
  title = 'Buat Akun Admin Baru',
  subtitle = 'Lengkapi informasi di bawah untuk mendaftarkan administrator sistem baru.',
}) {
  const breadcrumbItems = [
    { label: 'Admin Kabupaten', href: '/admin-kab/dashboard' },
    { label: 'Manajemen User', href: '/admin-kab/users' },
    { label: breadcrumbLabel },
  ];

  return (
    <div className="flex flex-col gap-3 mb-lg">
      {/* Back link */}
      <Link
        href="/admin-kab/users"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors font-medium text-sm w-fit"
      >
        <ArrowLeft size={16} />
        Kembali ke Manajemen User
      </Link>

      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Title area */}
      <div className="mt-1">
        <h1 className="font-headline text-headline-md font-bold text-text-primary">{title}</h1>
        <p className="text-text-secondary text-body-md mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
