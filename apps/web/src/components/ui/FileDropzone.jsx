'use client';

import React, { useRef, useState } from 'react';
import { Paperclip, CheckCircle, X, AlertTriangle } from 'lucide-react';

/**
 * Batas yang ditegakkan di sini SALINAN batas backend, bukan sumbernya.
 *
 * Sumbernya `attachment.util.ts` (daftar izin + pemeriksaan angka ajaib),
 * `complaints.constants.ts:32` (5 MB), dan `complaints.controller.ts:66`
 * (`files: 5`). Bila daftar di sana berubah, daftar di sini harus menyusul;
 * tak ada yang menyinkronkannya otomatis.
 *
 * PENTING, jangan sampai keliru dibaca sebagai lapisan keamanan. Backend
 * memeriksa ANGKA AJAIB isi berkas, bukan `Content-Type` yang dikirim
 * peramban, sehingga `.exe` bernama `.png` tetap tertolak di sana. Yang
 * dikerjakan berkas ini hanya menghemat waktu dan kuota warga: tanpa ia,
 * pengguna di ponsel berkuota terbatas mengunggah 6 MB sampai tuntas lalu
 * ditolak (BUG-007).
 */
const JENIS_DITERIMA = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'application/pdf': 'PDF',
};

const JENIS_ACCEPT = Object.keys(JENIS_DITERIMA).join(',');
const LABEL_JENIS = Object.values(JENIS_DITERIMA).join(', ');
const MAKS_BERKAS = 5;

/**
 * Nama jenis untuk DIBACA pengguna, diambil dari akhiran namanya sendiri.
 *
 * Akhiran dipakai lebih dahulu daripada `file.type` justru karena akhiran
 * itulah yang pengguna lihat di pemilih berkas. Berkas tanpa akhiran jatuh ke
 * subtipe MIME-nya, dan yang tak punya keduanya disebut apa adanya.
 */
function labelJenis(file) {
  const titik = file.name.lastIndexOf('.');
  if (titik > 0 && titik < file.name.length - 1) {
    return file.name.slice(titik + 1).toUpperCase();
  }
  const garis = (file.type || '').lastIndexOf('/');
  return garis >= 0 ? file.type.slice(garis + 1).toUpperCase() : 'tanpa akhiran';
}

/**
 * Satu-satunya tempat yang memutuskan berkas mana yang boleh masuk.
 *
 * Ia dipanggil DUA jalur, dan itu intinya. Atribut `accept` hanya menyaring
 * kotak dialog pemilih berkas dan TIDAK BERLAKU bagi berkas yang dijatuhkan,
 * padahal zona ini mengiklankan seret-lepas tersurat. Pemeriksaan yang hanya
 * duduk di penangan `onChange` karena itu tak akan pernah cukup.
 *
 * Yang sah tetap diterima walau ada yang ditolak dalam kumpulan yang sama:
 * menolak seluruhnya berarti warga kehilangan pilihan yang sudah benar dan
 * harus mengulang dari awal.
 */
function saringBerkas(kandidat, sudahAda, maxSizeMB) {
  const batasBytes = maxSizeMB * 1024 * 1024;
  const diterima = [];
  const ditolak = [];

  for (const file of kandidat) {
    if (!JENIS_DITERIMA[file.type]) {
      ditolak.push({
        nama: file.name,
        alasan: `jenis ${labelJenis(file)} tidak diterima, hanya ${LABEL_JENIS}`,
      });
      continue;
    }
    if (file.size > batasBytes) {
      const mb = (file.size / 1024 / 1024).toFixed(2);
      ditolak.push({ nama: file.name, alasan: `ukurannya ${mb} MB, melebihi batas ${maxSizeMB}MB` });
      continue;
    }
    if (sudahAda.length + diterima.length >= MAKS_BERKAS) {
      ditolak.push({ nama: file.name, alasan: `melebihi batas ${MAKS_BERKAS} berkas` });
      continue;
    }
    diterima.push(file);
  }

  return { diterima, ditolak };
}

export default function FileDropzone({ files = [], onFilesChange, maxSizeMB = 5 }) {
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
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
