'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Forward, Send, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { useAsync } from '@/hooks/useAsync';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { getSemuaOpd } from '@/features/opd/services/opd.api';
import { getComplaintCategories } from '../services/reference.api';
import { alihkanComplaint } from '../services/complaints.api';

/** Batas alasan pengalihan, sama dengan `@MaxLength(1000)` di backend. */
const BATAS_ALASAN = 1000;

/**
 * Mengalihkan pengaduan yang SUDAH bertujuan ke instansi lain yang lebih
 * berwenang (5 November 2026).
 *
 * DI `components/`, BUKAN `components/admin-kab/`: Admin OPD pemiliknya
 * sendiri juga memakainya. Haknya ditegakkan BACKEND
 * (`ComplaintsService.alihkan`), bukan oleh ada-tidaknya modal ini di layar.
 *
 * KATEGORI IKUT DIGANTI, dan itu bukan isian tambahan yang dapat dilewati:
 * alasan fitur ini ada memang kategori yang tak sesuai dengan instansi
 * tujuannya, dan tingkat OPD tujuan dapat berbeda sehingga kategori lama bisa
 * jadi sudah tak sah.
 *
 * @param {object} props
 * @param {{ id: number, ticketNo?: string, opdId?: number|null, target?: string|null }} props.complaint
 * @param {() => void} props.onClose menutup tanpa mengalihkan
 * @param {() => void} props.onDone berhasil dialihkan — pemanggil menyegarkan tampilannya
 */
export default function AlihkanComplaintModal({ complaint, onClose, onDone }) {
  const [opdId, setOpdId] = useState('');
  const [kategori, setKategori] = useState('');
  const [catatan, setCatatan] = useState('');
  const [galat, setGalat] = useState('');
  const [sedangKirim, setSedangKirim] = useState(false);

  useBodyScrollLock();

  const idJudul = useId();
  const idCatatan = useId();
  const refDialog = useRef(null);
  useFocusTrap(refDialog, true);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && !sedangKirim) onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sedangKirim, onClose]);

  /**
   * `getSemuaOpd` MENELUSURI HALAMAN, bukan meminta satu halaman berlimit
   * besar. Versi pertama layar ini mengirim `limit: 500` dan dijawab 400 oleh
   * `PaginationQueryDto` (`@Max(100)`), sehingga daftarnya tak pernah termuat
   * — dropdown instansi kosong, dan dropdown kategori ikut kosong karena
   * tingkatnya tak dapat diketahui tanpa instansi terpilih (laporan pengguna
   * 5 November 2026).
   *
   * SELURUH TINGKAT, tidak disaring: pengalihan lintas tingkat justru kasus
   * yang paling sering (jalan rusak dilaporkan ke kecamatan, wewenangnya di
   * Dinas PUPR).
   */
  const ambilOpd = useCallback(() => getSemuaOpd({ isActive: true }), []);
  /**
   * `error` DIPAKAI, tidak dibuang. Daftar yang gagal dimuat tergambar
   * identik dengan daftar yang memang kosong, dan itulah yang membuat cacat
   * `limit: 500` di atas tak terlihat saat dicoba manual: dropdown kosong
   * tanpa satu pun pesan. Sesi kedaluwarsa dan 500 dari server punya gejala
   * yang persis sama.
   */
  const { data: daftarOpdAktif, error: galatOpd } = useAsync(ambilOpd);

  /**
   * Kategori diambil SEKALI tanpa kueri `tingkat`, lalu disaring di peramban —
   * pola yang sama dengan `CreateComplaintForm`. Memanggil ulang tiap kali
   * instansi tujuan berganti akan menampilkan "Memuat kategori..." atas data
   * yang sudah ada di memori.
   */
  const ambilKategori = useCallback(() => getComplaintCategories(), []);
  const { data: kategoriSemua, error: galatKategori } = useAsync(ambilKategori);

  // Satu kalimat per daftar yang gagal, bukan satu kalimat umum: petugas
  // perlu tahu daftar mana yang tak dapat dimuat.
  const galatMuat = [
    galatOpd ? 'Gagal memuat daftar instansi.' : null,
    galatKategori ? 'Gagal memuat daftar kategori.' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const daftarOpd = useMemo(
    () =>
      (daftarOpdAktif ?? []).filter(
        // Pemilik saat ini tak ditawarkan: backend menolaknya 400, dan
        // menawarkannya hanya mengundang penekanan tombol yang pasti gagal.
        (opd) => opd.id !== complaint.opdId,
      ),
    [daftarOpdAktif, complaint.opdId],
  );

  const opdTerpilih = daftarOpd.find((o) => String(o.id) === String(opdId)) ?? null;
  // Tingkat DIBACA dari `OpdEntity.tingkat` yang dikirim backend, tidak
  // dihitung ulang dari nama instansinya di sini (lihat opd.adapter.js).
  const tingkatTujuan = opdTerpilih?.tingkat ?? null;

  const opsiOpd = [
    { label: 'Pilih instansi tujuan', value: '' },
    ...daftarOpd.map((opd) => ({ label: opd.name, value: String(opd.id) })),
  ];

  const kategoriTingkat = useMemo(
    () => (kategoriSemua ?? []).filter((k) => k.tingkat === tingkatTujuan),
    [kategoriSemua, tingkatTujuan],
  );

  const opsiKategori = [
    { label: 'Pilih kategori', value: '' },
    ...kategoriTingkat.map((k) => ({ label: k.nama, value: k.kode })),
  ];

  const gantiOpd = (nilai) => {
    setOpdId(nilai);
    // Kategori terpilih DIKOSONGKAN begitu instansi tujuan berganti. Tanpa ini,
    // berpindah ke instansi bertingkat lain menyisakan kode kategori yang
    // sudah tak sah di tingkat barunya, dan backend menolaknya 400 setelah
    // petugas menekan tombol.
    setKategori('');
  };

  const siapKirim = Boolean(opdId) && Boolean(kategori) && catatan.trim().length > 0;

  const kirim = async () => {
    setGalat('');
    setSedangKirim(true);
    try {
      await alihkanComplaint(complaint.id, { opdId, kategori, catatan: catatan.trim() });
      onDone();
    } catch (err) {
      // Modal SENGAJA dibiarkan terbuka. Kegagalan yang paling mungkin di sini
      // adalah instansi tujuan yang baru saja dinonaktifkan atau status tiket
      // yang sudah berubah di tangan orang lain, dan petugas perlu melihat
      // sebabnya — bukan mendapati halaman yang diam-diam tak berubah.
      setGalat(err.message || 'Gagal mengalihkan pengaduan. Silakan coba lagi.');
      setSedangKirim(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      {/* TANPA `overflow-hidden`, dan 640px: alasan yang sama dengan
          ForwardComplaintModal — panel dropdown berdiri absolut di dalam kartu
          ini, dan nama instansi terpanjang 97 karakter. */}
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
            <Forward size={18} className="shrink-0" />
            Alihkan ke instansi berwenang
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Pengaduan {complaint.ticketNo ? `#${complaint.ticketNo}` : 'ini'} akan berpindah ke
            instansi lain. Pelapor diberi tahu, dan nomor tiketnya tetap sama.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {(galat || galatMuat) && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-sm font-semibold">
              {galat || `${galatMuat} Tutup lalu buka kembali untuk mencoba lagi.`}
            </div>
          )}

          <Dropdown
            label="Instansi tujuan"
            id="alihkan-opd"
            options={opsiOpd}
            value={opdId}
            onChange={gantiOpd}
            searchable={opsiOpd.length > 1}
            searchPlaceholder="Cari nama instansi..."
            emptySearchLabel="Tidak ada instansi yang cocok"
            menuMaxHeight="max-h-80"
          />

          <div>
            <Dropdown
              label="Kategori baru"
              id="alihkan-kategori"
              options={opsiKategori}
              value={kategori}
              onChange={setKategori}
              searchable={opsiKategori.length > 1}
              searchPlaceholder="Cari kategori..."
              emptySearchLabel="Tidak ada kategori yang cocok"
              menuMaxHeight="max-h-80"
            />
            <p className="text-xs text-text-secondary mt-1">
              {opdTerpilih
                ? `Kategori tingkat ${tingkatTujuan === 'kecamatan' ? 'kecamatan' : 'kabupaten'}, mengikuti instansi tujuan.`
                : 'Pilih instansi tujuan lebih dahulu. Daftar kategorinya mengikuti tingkat instansi itu.'}
            </p>
          </div>

          <div>
            <label
              htmlFor={idCatatan}
              className="block text-sm font-semibold text-text-primary mb-1"
            >
              Alasan pengalihan
            </label>
            <textarea
              id={idCatatan}
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Mis. Berkaitan dengan kewenangan infrastruktur."
              // Batas yang SAMA dengan `@MaxLength(1000)` di
              // `AlihkanComplaintDto.catatan` (BUG-080). Tanpanya alasan yang
              // lebih panjang baru ditolak sesudah tombol ditekan, dengan pesan
              // umum yang tak menyebut medan mana yang salah.
              maxLength={BATAS_ALASAN}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {/* Penghitungnya penjelasan bagi `maxLength`: tanpa itu ketikan
                berhenti di karakter ke-1.000, dan alasan yang ditempel
                terpotong, tanpa satu pun keterangan. */}
            <p className="text-xs text-text-secondary mt-1 flex justify-between gap-3">
              <span>Alasan ini ditampilkan kepada pelapor pada riwayat pengaduannya.</span>
              <span className="shrink-0 tabular-nums">
                {catatan.length.toLocaleString('id-ID')}/{BATAS_ALASAN.toLocaleString('id-ID')}
              </span>
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={sedangKirim}>
            Batal
          </Button>
          {/* Tombol mati sampai ketiganya terisi: backend menolak 400, dan
              mengetahuinya sesudah menekan tombol jauh lebih buruk daripada
              melihat tombol yang belum dapat ditekan. */}
          <Button onClick={kirim} disabled={!siapKirim || sedangKirim}>
            <span className="flex items-center gap-1.5">
              <Send size={14} />
              {sedangKirim ? 'Mengalihkan...' : 'Alihkan Pengaduan'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
