import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import ComplaintListHeader from '@/features/complaints/components/ComplaintListHeader';
import ComplaintTable from '@/features/complaints/components/ComplaintTable';

export const metadata = {
  title: 'Daftar Pengaduan - SKEMA Madiun',
};

const dummyComplaints = [
  {
    id: '#TKT-2026-001',
    date: '19 Juli 2026',
    department: 'Dinas Kesehatan',
    title: 'Antrean Loket Puskesmas Terlalu Lama',
    status: 'Selesai'
  },
  {
    id: '#TKT-2026-005',
    date: '22 Juli 2026',
    department: 'Dinas Pekerjaan Umum',
    title: 'Perbaikan Jalan Berlubang di Jl. Ahmad Yani',
    status: 'Diproses'
  },
  {
    id: '#TKT-2026-009',
    date: '25 Juli 2026',
    department: 'Dinas Lingkungan Hidup',
    title: 'Penumpukan Sampah di Area Pasar',
    status: 'Diterima'
  }
];

export default function RespondentComplaints() {
  return (
    <main className="max-w-[1280px] mx-auto py-8 sm:py-12 px-4 sm:px-6 w-full">
      <ComplaintListHeader userName="Ahmad Fauzi" activeCount={3} />
      
      <ComplaintTable complaints={dummyComplaints} />

      {/* Tombol Buat Pengaduan di bawah tabel */}
      <div className="mt-6 flex justify-end">
        <Link href="/complaints/new" className="w-auto">
          <Button className="w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 min-h-[40px] sm:min-h-[48px] text-sm sm:text-base rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5">
            <Plus size={18} strokeWidth={2.5} className="sm:w-5 sm:h-5" />
            <span>Buat Pengaduan Baru</span>
          </Button>
        </Link>
      </div>
    </main>
  );
}
