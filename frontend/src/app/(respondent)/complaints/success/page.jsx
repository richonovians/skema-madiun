import React, { Suspense } from 'react';
import ComplaintSuccessCard from '@/features/complaints/components/ComplaintSuccessCard';

export const metadata = {
  title: 'Pengaduan Berhasil Dikirim - SKEMA Madiun',
  description: 'Halaman konfirmasi pengaduan berhasil dikirim.',
};

export default function ComplaintSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '80px 24px' }}>
      <Suspense fallback={
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Memuat status pengaduan...
        </div>
      }>
        <ComplaintSuccessCard />
      </Suspense>
    </div>
  );
}
