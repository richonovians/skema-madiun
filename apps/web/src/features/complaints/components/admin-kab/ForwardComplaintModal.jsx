'use client';

import React, { useCallback, useState } from 'react';
import { Building2, Send, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { useAsync } from '@/hooks/useAsync';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import { getOpdList } from '@/features/opd/services/opd.api';
import { forwardComplaint } from '../../services/complaints.api';

/**
 * Meneruskan pengaduan yang belum bertujuan ke OPD yang berwenang
 * (permintaan pengguna 6 September 2026).
 *
 * Hanya terpakai oleh Superuser & Admin Kabupaten — haknya ditegakkan BACKEND
 * (ComplaintsService.forward), bukan oleh ada-tidaknya modal ini di layar.
 * Menyembunyikan tombol adalah kenyamanan; penolakan 403-nya yang menjaga.
 *
 * @param {object} props
 * @param {{ id: number, ticketNo?: string }} props.complaint pengaduan yang diteruskan
 * @param {() => void} props.onClose menutup tanpa meneruskan
 * @param {() => void} props.onDone berhasil diteruskan — pemanggil menyegarkan daftarnya
 */
export default function ForwardComplaintModal({ complaint, onClose, onDone }) {
  const [opdId, setOpdId] = useState('');
  const [galat, setGalat] = useState('');
  const [sedangKirim, setSedangKirim] = useState(false);

  useBodyScrollLock();

  const fetchOpd = useCallback(() => getOpdList({ limit: 100, isActive: true }), []);
  const { data: opdResponse } = useAsync(fetchOpd);

  const opdOptions = [
    { label: 'Pilih OPD', value: '' },
    ...(opdResponse?.data ?? []).map((opd) => ({ label: opd.name, value: String(opd.id) })),
  ];

  const kirim = async () => {
    setGalat('');
    setSedangKirim(true);
    try {
      await forwardComplaint(complaint.id, Number(opdId));
      onDone();
    } catch (err) {
      // Modal SENGAJA dibiarkan terbuka: kegagalan yang paling mungkin di sini
      // adalah "sudah bertujuan" (400) karena orang lain menriasenya lebih
      // dulu, dan petugas perlu melihat sebabnya — bukan mendapati daftar yang
      // diam-diam tak berubah.
      setGalat(err.message || 'Gagal meneruskan pengaduan. Silakan coba lagi.');
      setSedangKirim(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-[480px] overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-text-secondary hover:bg-surface-container transition-colors"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
          <h3 className="font-bold text-text-primary text-lg leading-tight flex items-center gap-2">
            <Building2 size={18} className="shrink-0" />
            Teruskan ke OPD berwenang
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Pengaduan {complaint.ticketNo ? `#${complaint.ticketNo}` : 'ini'} dikirim tanpa tujuan.
            Pilih OPD yang berwenang menanganinya.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {galat && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-sm font-semibold">
              {galat}
            </div>
          )}

          <Dropdown
            label="OPD yang berwenang"
            id="forward-opd"
            options={opdOptions}
            value={opdId}
            onChange={setOpdId}
          />

          <p className="text-xs text-text-secondary">
            Sesudah diteruskan, pengaduan menjadi tanggung jawab OPD itu dan tak dapat dialihkan
            lagi dari halaman ini.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={sedangKirim}>
            Batal
          </Button>
          <Button onClick={kirim} disabled={!opdId || sedangKirim}>
            <span className="flex items-center gap-1.5">
              <Send size={14} />
              {sedangKirim ? 'Meneruskan...' : 'Teruskan'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
