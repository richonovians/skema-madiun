'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Building2, Send, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { useAsync } from '@/hooks/useAsync';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { getOpdList } from '@/features/opd/services/opd.api';
import { forwardComplaint } from '../../services/complaints.api';
import { getComplaintCategories } from '../../services/reference.api';

const LABEL_TINGKAT = { kabupaten: 'kabupaten', kecamatan: 'kecamatan' };

/**
 * Meneruskan pengaduan yang belum bertujuan ke OPD yang berwenang
 * (permintaan pengguna 6 September 2026).
 *
 * Hanya terpakai oleh Admin Kabupaten — haknya ditegakkan BACKEND
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
  const [kategori, setKategori] = useState('');
  const [galat, setGalat] = useState('');
  const [sedangKirim, setSedangKirim] = useState(false);

  useBodyScrollLock();

  // DIALOG BAGI PEMBACA LAYAR (2 November 2026, BUG-062) -- pola BUG-037/039.
  // Komponen ini hanya ter-mount selagi modal terbuka, jadi pengurungnya
  // selalu aktif.
  const idJudul = useId();
  const refDialog = useRef(null);
  useFocusTrap(refDialog, true);

  // Escape menutup, kecuali selagi pengiriman berjalan -- tombol Batal pun
  // dimatikan saat itu (ditambahkan bersama BUG-062 atas persetujuan pengguna).
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && !sedangKirim) onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sedangKirim, onClose]);

  const fetchOpd = useCallback(() => getOpdList({ limit: 100, isActive: true }), []);
  const { data: opdResponse } = useAsync(fetchOpd);

  const daftarOpd = opdResponse?.data ?? [];
  const opdOptions = [
    { label: 'Pilih OPD', value: '' },
    ...daftarOpd.map((opd) => ({ label: opd.name, value: String(opd.id) })),
  ];

  /**
   * PENERUSAN LINTAS TINGKAT (BUG-077, keputusan pengguna 12 November 2026).
   * Tiket kecamatan yang diteruskan ke dinas pindah ke tingkat kabupaten, dan
   * kategori `kec_*`-nya tak lagi sah di sana, jadi kategori baru ditanyakan.
   * HANYA saat tingkatnya berubah: penerusan setingkat tetap satu pilihan.
   *
   * Tingkat OPD dibaca dari `OpdEntity.tingkat` kiriman backend, tidak dihitung
   * ulang dari namanya di sini. Tingkat tiket yang tak diketahui (`null`) tak
   * memunculkan isian; backend tetap menolak dengan kalimat yang menjelaskannya.
   */
  const opdTerpilih = daftarOpd.find((o) => String(o.id) === String(opdId)) ?? null;
  const tingkatTujuan = opdTerpilih?.tingkat ?? null;
  const pindahTingkat =
    Boolean(complaint.tingkat) && Boolean(tingkatTujuan) && tingkatTujuan !== complaint.tingkat;

  // Diambil SEKALI dan disaring di peramban, pola yang sama dengan
  // AlihkanComplaintModal: memanggil ulang tiap kali OPD berganti hanya
  // menampilkan "memuat" atas data yang sudah ada.
  const ambilKategori = useCallback(() => getComplaintCategories(), []);
  const { data: kategoriSemua, error: galatKategori } = useAsync(ambilKategori);
  const kategoriOptions = [
    { label: 'Pilih kategori', value: '' },
    ...(kategoriSemua ?? [])
      .filter((k) => k.tingkat === tingkatTujuan)
      .map((k) => ({ label: k.nama, value: k.kode })),
  ];

  const gantiOpd = (nilai) => {
    setOpdId(nilai);
    // Dikosongkan begitu OPD berganti: kategori tingkat lama tak sah di
    // tingkat yang baru, dan backend menolaknya 400 sesudah tombol ditekan.
    setKategori('');
  };

  const siapKirim = Boolean(opdId) && (!pindahTingkat || Boolean(kategori));

  const kirim = async () => {
    setGalat('');
    setSedangKirim(true);
    try {
      await forwardComplaint(complaint.id, Number(opdId), pindahTingkat ? kategori : undefined);
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
      {/* TANPA `overflow-hidden` (14 September 2026). Panel daftar OPD berdiri
          absolut di dalam kartu ini, sehingga pemotongan apa pun di sini
          memenggalnya: terukur hanya 2 dari 63 pilihan yang muat, sisanya
          terpotong 149px di bawah dasar kartu bersama tombol Batal/Teruskan.
          Panelnya kini boleh melewati batas kartu seperti dropdown lazimnya,
          dan menutup sendiri begitu satu OPD dipilih.

          640px, bukan 480px: nama instansi terpanjang 97 karakter dan terpotong
          pada lebar lama. */}
      <div
        ref={refDialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-[640px] focus:outline-none"
      >
        <div className="px-6 pt-6 pb-4 border-b border-border relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-text-secondary hover:bg-surface-container transition-colors"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
          <h3
            id={idJudul}
            className="font-bold text-text-primary text-lg leading-tight flex items-center gap-2"
          >
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
            onChange={gantiOpd}
            /* Petugas triase membuka modal ini sekali per pengaduan yang belum
               bertujuan, dan tiap kali menghadapi seluruh OPD aktif. Syarat
               `> 1` menutup keadaan daftarnya belum termuat, ketika isinya baru
               penampung "Pilih OPD". */
            searchable={opdOptions.length > 1}
            searchPlaceholder="Cari nama OPD..."
            emptySearchLabel="Tidak ada OPD yang cocok"
            /* 320px, bukan 240px bawaan: petugas yang belum tahu nama persis
               instansinya menggulir daftar, dan delapan baris sekaligus lebih
               mudah disapu mata daripada enam. */
            menuMaxHeight="max-h-80"
          />

          {pindahTingkat && (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">
                {opdTerpilih.name} berada di tingkat {LABEL_TINGKAT[tingkatTujuan]}, sedangkan
                pengaduan ini tingkat {LABEL_TINGKAT[complaint.tingkat]}. Pilih kategori yang sesuai
                untuk tingkat {LABEL_TINGKAT[tingkatTujuan]}.
              </p>
              <Dropdown
                label={`Kategori tingkat ${LABEL_TINGKAT[tingkatTujuan]}`}
                id="forward-kategori"
                options={kategoriOptions}
                value={kategori}
                onChange={setKategori}
              />
              {galatKategori && (
                <p className="text-sm text-error font-semibold">
                  Gagal memuat daftar kategori. Tutup lalu buka lagi jendela ini.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-text-secondary">
            Sesudah diteruskan, pengaduan menjadi tanggung jawab OPD itu dan tak dapat dialihkan
            lagi dari halaman ini.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={sedangKirim}>
            Batal
          </Button>
          <Button onClick={kirim} disabled={!siapKirim || sedangKirim}>
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
