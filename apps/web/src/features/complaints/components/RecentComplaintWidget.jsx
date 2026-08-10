'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Lightbulb, Info, ArrowRight, Cog, MessageSquare, PlusCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getComplaints } from '../services/complaints.api';

const STATUS_VARIANT = {
  Diterima: 'info',
  Diproses: 'secondary',
  Selesai: 'success',
  Ditolak: 'error',
};

/**
 * Widget pengaduan terakhir di dashboard warga -- sebelumnya 100% hardcoded
 * (tiket #CMP-2026-894 palsu), kini fetch GET /complaints?page=1&limit=1.
 * Menampilkan pengaduan terbaru milik user yg sedang login, atau CTA ajukan
 * pengaduan baru jika belum ada.
 */
export default function RecentComplaintWidget() {
  const fetchComplaints = useCallback(() => getComplaints({ page: 1, limit: 1 }), []);
  const { data: response, isLoading, error } = useAsync(fetchComplaints);

  const complaint = response?.data?.[0] ?? null;

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">Pengaduan Terakhir</h2>
        <LoadingState label="Memuat pengaduan..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">Pengaduan Terakhir</h2>
        <ErrorState title="Gagal memuat pengaduan" description={error.message} />
      </section>
    );
  }

  if (!complaint) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">Pengaduan Terakhir</h2>
        <EmptyState
          icon={<MessageSquare size={48} />}
          title="Belum ada pengaduan"
          description="Sampaikan keluhan atau aspirasi Anda kepada instansi pemerintah terkait."
          action={
            <Link
              href="/complaints/new"
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-bold px-6 py-3 rounded-xl hover:bg-primary-hover transition-all shadow-sm"
            >
              <PlusCircle size={20} />
              Ajukan Pengaduan
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-text-primary">Pengaduan Terakhir</h2>
      <Card className="p-5 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Cog size={120} />
        </div>
        <div className="flex-shrink-0 bg-primary-fixed-dim/20 p-4 sm:p-6 rounded-full">
          <Lightbulb className="text-primary" size={36} />
        </div>
        <div className="flex-grow space-y-2 relative z-10 w-full">
          <div className="flex items-center gap-4">
            <span className="text-primary font-bold text-sm tracking-wider">#{complaint.id}</span>
            <Badge variant={STATUS_VARIANT[complaint.status] ?? 'secondary'}>{complaint.status}</Badge>
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-text-primary">{complaint.title}</h3>
          <p className="text-text-secondary font-body flex items-center gap-2 text-sm sm:text-base">
            <Info size={18} className="text-primary shrink-0" />
            <span>{complaint.target ? `Ditujukan ke ${complaint.target}` : 'Memproses pengaduan Anda'}</span>
          </p>
        </div>
        <div className="flex-shrink-0 relative z-10 w-full md:w-auto mt-2 md:mt-0">
          <Link href={`/complaints/${complaint.id}`} className="text-primary font-bold inline-flex items-center min-h-[44px] gap-2 hover:gap-3 transition-all group">
            Lihat Detail
            <ArrowRight size={20} />
          </Link>
        </div>
      </Card>
    </section>
  );
}

