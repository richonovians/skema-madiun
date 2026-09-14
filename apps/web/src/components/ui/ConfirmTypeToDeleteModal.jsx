'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import Button from './Button';

/**
 * Konfirmasi bagi tindakan yang TAK DAPAT DIBATALKAN: pengguna harus mengetik
 * ulang teks yang diminta sebelum tombolnya hidup.
 *
 * Berbeda dari ConfirmActionModal yang cukup satu klik. Bedanya disengaja:
 * satu klik memadai untuk tindakan yang dapat dibatalkan (membuang ke Sampah),
 * sedangkan menghapus permanen jawaban responden tak punya jalan kembali. Mengetik
 * ulang judulnya memaksa pembacaan, bukan sekadar penekanan tombol.
 */
export default function ConfirmTypeToDeleteModal({
  isOpen,
  judul,
  deskripsi,
  teksKonfirmasi,
  labelTombol = 'Hapus Permanen',
  onConfirm,
  onCancel,
}) {
  const [ketikan, setKetikan] = useState('');

  // Ketikan DIKOSONGKAN pada tiap peralihan buka/tutup. Komponennya tetap
  // ter-mount (induknya merender dengan `isOpen={false}`), jadi tanpa ini dialog
  // berikutnya terbuka dengan tombol yang sudah hidup dari ketikan sebelumnya --
  // padahal sasarannya survei yang berbeda.
  //
  // Disesuaikan SAAT RENDER, bukan lewat useEffect: inilah pola yang dianjurkan
  // React untuk menyetel ulang state ketika prop berubah, dan ia tidak
  // menimbulkan render berjenjang seperti setState di dalam efek.
  const [sedangTerbuka, setSedangTerbuka] = useState(isOpen);
  if (sedangTerbuka !== isOpen) {
    setSedangTerbuka(isOpen);
    setKetikan('');
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const cocok = ketikan.trim() === String(teksKonfirmasi ?? '').trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-hapus-permanen"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-[480px] overflow-hidden">
        <div className="flex items-start gap-3 px-6 pt-6 pb-4 bg-red-50 border-b border-red-100">
          <div className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0">
            <ShieldAlert size={20} aria-hidden="true" />
          </div>
          <div>
            <h3
              id="judul-hapus-permanen"
              className="font-bold text-text-primary text-lg leading-tight"
            >
              {judul}
            </h3>
            <p className="text-sm text-text-secondary mt-1">{deskripsi}</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-2">
          <label htmlFor="ketik-ulang" className="block text-sm text-text-secondary">
            Ketik <strong className="text-text-primary">{teksKonfirmasi}</strong> untuk melanjutkan.
          </label>
          <input
            id="ketik-ulang"
            type="text"
            value={ketikan}
            onChange={(e) => setKetikan(e.target.value)}
            autoComplete="off"
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="px-6 py-4 border-t border-border flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!cocok}
            className="bg-red-600 hover:bg-red-700 text-white py-sm px-md rounded-full font-bold text-sm justify-center"
          >
            {labelTombol}
          </Button>
        </div>
      </div>
    </div>
  );
}
