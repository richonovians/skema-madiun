'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Ticket, Building2, Calendar, Clock } from 'lucide-react';

export default function ComplaintSuccessCard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const complaintId = searchParams.get('complaintId') || 'COM-2026-00000';
  const opdId = searchParams.get('opdId') || '';
  const opdName = decodeURIComponent(searchParams.get('opdName') || 'Instansi Terkait');

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const infos = [
    { icon: <Ticket size={18} className="text-primary" />, label: 'Nomor Tiket', value: complaintId },
    { icon: <Building2 size={18} className="text-blue-500" />, label: 'Instansi Tujuan', value: opdName },
    { icon: <Calendar size={18} className="text-orange-500" />, label: 'Tanggal Pengiriman', value: today },
    { icon: <Clock size={18} className="text-amber-500" />, label: 'Status Awal', value: 'Menunggu Verifikasi' },
  ];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '640px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        border: '1px solid rgba(255,255,255,0.6)',
        padding: '48px 40px',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* Icon */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#d1fae5',
          border: '4px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
        }}>
          <CheckCircle2 size={40} color="#059669" />
        </div>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
        Pengaduan Berhasil Dikirim
      </h1>
      <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: 1.7, marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px auto' }}>
        Terima kasih. Pengaduan Anda telah berhasil dikirim kepada{' '}
        <strong style={{ color: '#111827' }}>{opdName}</strong>{' '}
        dan akan segera diproses oleh petugas.
      </p>

      {/* Summary Box */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '32px',
        textAlign: 'left',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          Detail Pengajuan
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {infos.map((info, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ marginTop: '2px', flexShrink: 0 }}>{info.icon}</div>
              <div>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>{info.label}</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827', wordBreak: 'break-word' }}>{info.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '380px', margin: '0 auto' }}>
        <button
          onClick={() => router.push(opdId ? `/surveys/${opdId}` : '/surveys')}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            fontWeight: 700,
            fontSize: '15px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            transition: 'all 0.2s',
          }}
        >
          Lanjut Isi Survei
        </button>
        <button
          onClick={() => router.push('/complaints')}
          style={{
            width: '100%',
            padding: '12px 24px',
            borderRadius: '12px',
            background: 'white',
            color: '#2563eb',
            fontWeight: 600,
            fontSize: '15px',
            border: '2px solid #2563eb',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Lihat Status Pengaduan
        </button>
        <button
          onClick={() => router.push('/')}
          style={{
            width: '100%',
            padding: '10px 24px',
            borderRadius: '12px',
            background: 'transparent',
            color: '#6b7280',
            fontWeight: 500,
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Kembali ke Beranda
        </button>
      </div>

      {/* Footer note */}
      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
        Pendapat Anda sangat berarti untuk membantu Pemerintah Kabupaten Madiun meningkatkan kualitas pelayanan publik.
      </p>
    </div>
  );
}
