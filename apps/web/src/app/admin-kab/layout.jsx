import React from 'react';
import AdminKabLayout from '@/components/layouts/AdminKabLayout';

export const metadata = {
  title: 'Portal Eksekutif | Admin Kabupaten',
  description: 'Executive Dashboard untuk Administrator Kabupaten',
};

// Segmen admin-kab dirender dinamis (navbar & dashboard memakai useSearchParams).
// Menghindari bailout prerender CSR saat `next build`.
export const dynamic = 'force-dynamic';

export default function Layout({ children }) {
  return (
    <AdminKabLayout>
      {children}
    </AdminKabLayout>
  );
}
