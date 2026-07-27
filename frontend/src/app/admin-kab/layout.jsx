import React from 'react';
import AdminKabLayout from '@/components/layouts/AdminKabLayout';

export const metadata = {
  title: 'Portal Eksekutif | Admin Kabupaten',
  description: 'Executive Dashboard untuk Administrator Kabupaten',
};

export default function Layout({ children }) {
  return (
    <AdminKabLayout>
      {children}
    </AdminKabLayout>
  );
}
