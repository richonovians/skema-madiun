import React from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';

export const metadata = {
  title: 'Admin OPD Dashboard - SKEMA Madiun',
  description: 'Portal Analitik Admin OPD Kabupaten Madiun',
};

export default function AdminOPDLayout({ children }) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
