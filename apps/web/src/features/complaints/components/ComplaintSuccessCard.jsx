'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Ticket, Building2, Calendar, Clock } from 'lucide-react';
import { getActiveSurveys } from '@/features/surveys/services/surveys.api';

export default function ComplaintSuccessCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mencariSurvei, setMencariSurvei] = useState(false);

  const complaintId = searchParams.get('complaintId') || 'COM-2026-00000';
  const opdId = searchParams.get('opdId') || '';
  const opdName = decodeURIComponent(searchParams.get('opdName') || 'Instansi Terkait');

  /**
   * Ada-tidaknya tujuan dibaca dari `opdId`, BUKAN dari ada-tidaknya nama.
   * `opdName` punya cadangan sendiri di CreateComplaintForm ketika pencarian
   * namanya meleset, sehingga pengaduan yang sebenarnya bertujuan bisa salah
   * terbaca sebagai tanpa tujuan.
   */
  const adaTujuan = opdId !== '';

  /**
   * Tujuan tombol "Lanjut Isi Survei" (15 September 2026).
   *
   * OPD boleh menunjuk satu survei utama, dan warga yang baru mengadu dibawa
   * langsung ke sana alih-alih ke daftar yang masih harus dipilihnya sendiri.
   *
   * SETIAP kegagalan jatuh ke daftar tersaring, tak satu pun berhenti di tempat:
   * OPD yang belum menunjuk survei utama, jaringan yang putus, dan tanggapan
   * yang bentuknya tak terduga. Tombol yang diam setelah ditekan adalah jalan
   * buntu bagi orang yang baru saja menuliskan keluhannya.
   *
   * `opdId` dan id survei adalah DUA RUANG NOMOR yang berbeda (laporan 14
   * September 2026: pengadu ke instansi 22 mendarat di survei 22 milik instansi
   * lain). Id yang dipakai di sini hanya yang datang dari daftar survei, tak
   * pernah dari `opdId`.
   */
  const lanjutIsiSurvei = async () => {
    if (!opdId) {
      router.push('/surveys');
      return;
    }

    setMencariSurvei(true);
    try {
      const { data } = await getActiveSurveys({ opdId, limit: 100 });
      const utama = (data ?? []).find((s) => s.isUtama);
      router.push(utama ? `/surveys/${utama.id}` : `/surveys?opdId=${opdId}`);
    } catch {
      router.push(`/surveys?opdId=${opdId}`);
    } finally {
      setMencariSurvei(false);
    }
  };

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const infos = [
    {
      icon: <Ticket size={18} className="text-primary" />,
      label: 'Nomor Tiket',
      value: complaintId,
    },
    // "Belum ditentukan", bukan '-': alasannya sama dengan lencana "Belum
    // bertujuan" di ComplaintTable.jsx -- tanda hubung tak dapat dibedakan dari
    // nama instansi yang gagal dimuat.
    {
      icon: <Building2 size={18} className="text-blue-500" />,
      label: 'Instansi Tujuan',
      value: adaTujuan ? opdName : 'Belum ditentukan',
    },
    {
      icon: <Calendar size={18} className="text-orange-500" />,
      label: 'Tanggal Pengiriman',
      value: today,
    },
    {
      icon: <Clock size={18} className="text-amber-500" />,
      label: 'Status Awal',
      value: 'Menunggu Verifikasi',
    },
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
        {adaTujuan ? (
          <>
            Terima kasih. Pengaduan Anda telah berhasil dikirim kepada{' '}
            <strong className="text-slate-900">{opdName}</strong> dan akan segera diproses oleh
            petugas.
          </>
        ) : (
          // Tanpa tujuan, kalimat lama menjanjikan dua hal yang belum terjadi:
          // tiketnya sudah sampai ke suatu instansi, dan petugas instansi itu
          // akan memprosesnya. Keduanya baru benar sesudah Admin Kabupaten
          // meneruskannya.
          <>
            Terima kasih. Pengaduan Anda telah kami terima dan sedang menunggu penentuan instansi
            yang berwenang menanganinya.
          </>
        )}
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
          onClick={lanjutIsiSurvei}
          disabled={mencariSurvei}
          className="w-full py-3.5 px-6 min-h-[48px] rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-70"
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
        Pendapat Anda sangat berarti untuk membantu Pemerintah Kabupaten Madiun meningkatkan
        kualitas pelayanan publik.
      </p>
    </div>
  );
}
