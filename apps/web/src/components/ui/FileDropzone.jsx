'use client';

import React, { useRef, useState } from 'react';
import { Paperclip, CheckCircle, X, AlertTriangle } from 'lucide-react';
import {
  BATAS_MB,
  JENIS_ACCEPT,
  LABEL_JENIS,
  MAKS_BERKAS,
  formatMb,
  saringBerkas,
} from '@/utils/lampiran';

/**
 * Aturannya TIDAK lagi tinggal di sini. Ia diangkat ke `@/utils/lampiran` pada
 * 23 Oktober 2026, ketika separuh BUG-007 yang tersisa dikerjakan: dua
 * unggahan lain -- `AdminResolutionWorkspace.jsx` dan `ChatReplyForm.jsx` --
 * membutuhkan aturan yang sama, dan menyalinnya ke sana akan menjadikannya
 * tiga salinan batas backend yang tak ada penyinkronnya.
 *
 * Komponen ini karena itu memegang TAMPILANnya saja: zona, daftar berkas
 * terpilih, dan kabar penolakan.
 */
export default function FileDropzone({ files = [], onFilesChange, maxSizeMB = BATAS_MB }) {
  const fileInputRef = useRef(null);
  const [ditolak, setDitolak] = useState([]);

  // Prop `accept` DIBUANG 23 Oktober 2026, dan tak seorang pemanggil pun
  // mengirimnya. Ia menjadi jebakan begitu validasi di atas ada: menimpanya
  // hanya melonggarkan dialog pemilih berkas, sementara `saringBerkas` tetap
  // menolak -- sebuah prop yang tampak melebarkan daftar izin padahal tidak.
  const terima = (kandidat) => {
    const hasil = saringBerkas(kandidat, files, maxSizeMB);
    setDitolak(hasil.ditolak);
    if (hasil.diterima.length > 0 && onFilesChange) {
      onFilesChange([...files, ...hasil.diterima]);
    }
  };

  const handleFileSelect = (e) => {
    terima(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    terima(Array.from(e.dataTransfer.files || []));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (indexToRemove) => {
    if (onFilesChange) {
      onFilesChange(files.filter((_, idx) => idx !== indexToRemove));
    }
  };

  return (
    <div className="space-y-4">
      {/* Inputnya saudara, bukan anak tombolnya: elemen interaktif bersarang di
          dalam `<button>` bukan HTML yang sah. Pola yang sama dipakai
          `AdminResolutionWorkspace.jsx` dan `ChatReplyForm.jsx` sejak
          21 September 2026. */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept={JENIS_ACCEPT}
        onChange={handleFileSelect}
      />

      {/* `<button>` SUNGGUHAN, bukan `div` ber-`role="button"` + `tabIndex`
          (23 Oktober 2026). Zona ini dahulu `div` ber-`onClick` saja, tanpa
          `tabIndex`, tanpa `role`, tanpa `onKeyDown`, dengan inputnya
          `display: none` -- jadi warga yang memakai keyboard TIDAK DAPAT
          melampirkan bukti ke pengaduannya sama sekali. Itu fungsi yang
          hilang, bukan sekadar nama yang kurang; kalimat itu sudah tertulis di
          `AdminResolutionWorkspace.jsx` sejak dua komponen percakapan
          dibereskan 21 September 2026, dan dropzone warga terlewat.

          Sebagai tombol, fokus serta Enter dan Spasi datang dari peramban, dan
          namanya datang dari tulisan yang memang sudah tampak di layar. Isinya
          karena itu `<span>`, bukan `<p>` dan `<div>`: `<button>` hanya boleh
          memuat phrasing content.

          Penangan seret tetap di elemen yang sama -- tombol menerima peristiwa
          seret seperti elemen lain. */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="w-full border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center bg-surface-container-low hover:bg-surface-container hover:border-primary transition-colors cursor-pointer group"
      >
        <span className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Paperclip className="text-primary w-8 h-8" aria-hidden="true" />
        </span>
        <span className="block font-semibold text-lg text-text-primary mb-1 text-center">
          Klik atau seret berkas untuk melampirkan foto bukti
        </span>
        {/* WEBP ikut disebut. Teks lama berbunyi "Format: JPG, PNG, PDF" --
            lebih sempit daripada yang backend sungguh terima, jadi warga
            diberi tahu daftar yang salah. */}
        <span className="block text-sm font-medium text-text-secondary text-center">
          Maksimal ukuran file {maxSizeMB}MB per file. Format: {LABEL_JENIS}. Paling banyak{' '}
          {MAKS_BERKAS} berkas.
        </span>
      </button>

      {/* `role="status"` supaya penolakannya TERDENGAR. Tanpa itu pengguna
          tunanetra hanya mengalami berkasnya tak muncul, tanpa satu pun sebab
          di layar. Sopan, bukan `role="alert"`: di basis kode ini `alert`
          khusus untuk galat, dan ini akibat dari tindakan pengguna sendiri. */}
      {ditolak.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            {ditolak.length} berkas tidak dilampirkan
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
            {ditolak.map((berkas, idx) => (
              <li key={`${berkas.nama}-${idx}`}>
                {berkas.nama}: {berkas.alasan}
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.length > 0 && (
        <div className="w-full space-y-2 mt-4">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-emerald-100 p-2 rounded-md text-emerald-600 shrink-0">
                  <CheckCircle size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  {/* "File berhasil diunggah" sampai 23 Oktober 2026, dan itu
                      tidak benar: `onFilesChange` hanya menaruh berkasnya di
                      state pemanggil, dan unggahannya baru terjadi saat
                      formulirnya disubmit. Warga yang menutup tab di titik itu
                      meyakini lampirannya sudah aman. */}
                  <p className="text-sm font-medium text-emerald-800">Siap dikirim</p>
                  <p className="text-xs text-emerald-600 truncate">
                    {file.name} ({formatMb(file.size / 1024 / 1024)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                aria-label={`Hapus ${file.name}`}
                className="text-emerald-600 hover:text-emerald-800 p-1.5 hover:bg-emerald-100 rounded-md transition-colors shrink-0"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
