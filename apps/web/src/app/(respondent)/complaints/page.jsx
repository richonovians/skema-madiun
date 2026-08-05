'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import ComplaintListHeader from '@/features/complaints/components/ComplaintListHeader';
import ComplaintTable from '@/features/complaints/components/ComplaintTable';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getComplaints } from '@/features/complaints/services/complaints.api';

export default function RespondentComplaints() {
  const fetchComplaints = useCallback(() => getComplaints({ limit: 50 }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchComplaints);

  const complaints = response?.data ?? [];
  // ComplaintTable/ComplaintRow mengharapkan {id, date, department, title, status}
  // (lihat komentar di komponen tsb) -- bentuk adaptComplaint pakai nama field
  // beda (dateStr/target), diselaraskan di sini alih-alih ubah komponen tabel.
  const rows = complaints.map((c) => ({
    id: c.id,
    date: c.dateStr,
    department: c.target ?? '-',
    title: c.title,
    status: c.status,
  }));

  return (
    <main className="max-w-[1280px] mx-auto py-8 sm:py-12 px-4 sm:px-6 w-full">
      <ComplaintListHeader totalComplaints={complaints.length} />

      {isLoading ? (
        <LoadingState label="Memuat daftar pengaduan..." />
      ) : error ? (
        <ErrorState title="Gagal memuat pengaduan" description={error.message} onRetry={refetch} />
      ) : (
        <ComplaintTable complaints={rows} />
      )}

      <div className="mt-6 flex justify-end">
        <Link href="/complaints/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold px-6 py-3 min-h-[48px] rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5">
            <Plus size={20} strokeWidth={2.5} />
            <span>Buat Pengaduan Baru</span>
          </Button>
        </Link>
      </div>
    </main>
  );
}
