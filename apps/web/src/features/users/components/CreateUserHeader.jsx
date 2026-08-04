import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '@/components/ui/Breadcrumb';

const BREADCRUMB_ITEMS = [
  { label: 'Admin Kabupaten', href: '/admin-kab/dashboard' },
  { label: 'Manajemen User', href: '/admin-kab/users' },
  { label: 'Buat Akun Admin' },
];

export default function CreateUserHeader() {
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
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* Title area */}
      <div className="mt-1">
        <h1 className="font-headline text-headline-md font-bold text-text-primary">
          Buat Akun Admin Baru
        </h1>
        <p className="text-text-secondary text-body-md mt-1">
          Lengkapi informasi di bawah untuk mendaftarkan administrator sistem baru.
        </p>
      </div>
    </div>
  );
}
