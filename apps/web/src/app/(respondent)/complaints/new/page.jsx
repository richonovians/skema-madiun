import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
      <div className="mb-8 space-y-4">
        <div>
          <Link
            href="/complaints"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all shadow-sm group"
            aria-label="Kembali ke Daftar Pengaduan"
            title="Kembali ke Daftar Pengaduan"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <CreateComplaintForm />
    </main>
  );
}
