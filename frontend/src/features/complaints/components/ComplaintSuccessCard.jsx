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
    <div className="w-full max-w-[640px] mx-auto bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 p-6 sm:p-10 md:p-12 text-center box-border">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
        Pengaduan Berhasil Dikirim
      </h1>
      <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-8 max-w-[480px] mx-auto">
        Terima kasih. Pengaduan Anda telah berhasil dikirim kepada{' '}
        <strong className="text-slate-900">{opdName}</strong>{' '}
        dan akan segera diproses oleh petugas.
      </p>

      {/* Summary Box */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 sm:p-6 mb-8 text-left">
        <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-4 border-b border-slate-200 pb-3">
          Detail Pengajuan
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {infos.map((info, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{info.icon}</div>
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">{info.label}</p>
                <p className="text-sm font-bold text-slate-900 break-words">{info.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3 max-w-[380px] mx-auto">
        <button
          type="button"
          onClick={() => router.push(opdId ? `/surveys/${opdId}` : '/surveys')}
          className="w-full py-3.5 px-6 min-h-[48px] rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          Lanjut Isi Survei
        </button>
        <button
          type="button"
          onClick={() => router.push('/complaints')}
          className="w-full py-3 px-6 min-h-[48px] rounded-xl bg-white text-blue-600 font-semibold text-sm sm:text-base border-2 border-blue-600 hover:bg-blue-50 transition-all"
        >
          Lihat Status Pengaduan
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="w-full py-2.5 px-6 min-h-[44px] rounded-xl bg-transparent text-slate-500 font-medium text-sm hover:text-slate-700 transition-all"
        >
          Kembali ke Beranda
        </button>
      </div>

      {/* Footer note */}
      <p className="text-xs text-slate-400 mt-8 pt-6 border-t border-slate-100">
        Pendapat Anda sangat berarti untuk membantu Pemerintah Kabupaten Madiun meningkatkan kualitas pelayanan publik.
      </p>
    </div>
  );
}
