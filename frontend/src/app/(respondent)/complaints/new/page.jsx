import React from 'react';
import Breadcrumb from '@/components/ui/Breadcrumb';
import CreateComplaintForm from '@/features/complaints/components/CreateComplaintForm';

export const metadata = {
  title: 'Buat Pengaduan - SKEMA Madiun',
};

export default function NewComplaintPage() {
  const breadcrumbItems = [
    { label: 'Beranda', href: '/dashboard' },
    { label: 'Pengaduan', href: '/complaints' },
    { label: 'Baru' },
  ];

  return (
    <main className="flex-grow w-full max-w-[900px] mx-auto py-8 px-6">
      <div className="mb-8">
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <CreateComplaintForm />
    </main>
  );
}
