import React from 'react';
import AdminKabLayout from '@/components/layouts/AdminKabLayout';

export const metadata = {
  title: 'Portal Eksekutif | Admin Kabupaten',
  description: 'Executive Dashboard untuk Administrator Kabupaten',
};

// `export const dynamic = 'force-dynamic'` DIHAPUS (2026-08-19): satu-satunya
// alasannya adalah `useSearchParams` di AdminKabNavbar, dan penyaring navbar kini
// memakai context (AdminKabLayoutProvider) alih-alih query param -- tak ada lagi
// pembaca useSearchParams di seluruh pohon admin-kab, jadi tak ada bailout
// prerender CSR yang perlu dihindari.

export default function Layout({ children }) {
  return (
    <AdminKabLayout>
      {children}
    </AdminKabLayout>
  );
}
