'use client';

import React from 'react';
import { RotateCcw, Trash2, Trash } from 'lucide-react';

const ACTION_CLASS =
  'px-3 py-1.5 border border-outline rounded-lg text-xs font-bold flex items-center gap-1.5 ' +
  'whitespace-nowrap hover:bg-surface-container-low transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

/** Tanggal pembuangan dalam bahasa Indonesia, lengkap dengan jamnya. */
function formatTanggal(iso) {
  if (!iso) return '-';
  const tanggal = new Date(iso);
  if (Number.isNaN(tanggal.getTime())) return '-';
  return tanggal.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Tabel isi Sampah, dipakai KEDUA peran (11 September 2026). Yang berbeda hanya
 * dua hal, dan keduanya prop: kolom OPD (Admin OPD hanya melihat miliknya
 * sendiri) dan tombol Hapus Permanen (hanya Admin Kabupaten -- backend menolak peran
 * lain 403, tombol ini sekadar tak menawarkan yang pasti ditolak).
 */
export default function TrashedSurveyTable({
  rows = [],
  onRestore,
  onPurge,
  tampilkanKolomOpd = false,
  tampilkanHapusPermanen = false,
  busyId = null,
}) {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <Trash size={40} className="mx-auto text-text-secondary/40" aria-hidden="true" />
        <p className="mt-4 text-sm text-text-secondary">
          Sampah masih kosong. Survei yang Anda hapus akan muncul di sini dan dapat dipulihkan
          kembali.
        </p>
      </div>
    );
  }

  const sedangSibuk = (row) => busyId != null && String(busyId) === String(row.id);

  /** Tombol aksi baris. Dipakai kedua susunan supaya penangannya tak bercabang. */
  const aksi = (row, lebarPenuh = false) => (
    <>
      <button
        onClick={() => onRestore?.(row)}
        disabled={sedangSibuk(row)}
        className={`${ACTION_CLASS} ${lebarPenuh ? 'flex-1 justify-center min-h-[44px]' : ''}`}
      >
        <RotateCcw size={12} />
        Pulihkan
      </button>

      {tampilkanHapusPermanen && (
        <button
          onClick={() => onPurge?.(row)}
          disabled={sedangSibuk(row)}
          className={`${ACTION_CLASS} text-error hover:bg-error-container ${
            lebarPenuh ? 'flex-1 justify-center min-h-[44px]' : ''
          }`}
        >
          <Trash2 size={12} />
          Hapus Permanen
        </button>
      )}
    </>
  );

  return (
    <>
      {/* SUSUNAN KARTU untuk ponsel. Tabelnya lebih lebar daripada layar ponsel,
          sehingga kolom Aksi -- satu-satunya alasan halaman ini ada -- terdorong
          ke luar layar sampai pengguna menemukan sendiri bahwa tabelnya dapat
          digulir ke samping. Di sini aksinya ikut aliran vertikal yang sama. */}
      <div data-susunan="kartu" className="md:hidden divide-y divide-border">
        {rows.map((row) => (
          <div key={row.id} className="p-lg space-y-2">
            <p className="font-bold text-text-primary">{row.title}</p>
            {tampilkanKolomOpd && <p className="text-sm text-text-secondary">{row.opdName}</p>}
            <p className="text-sm text-text-secondary">
              {row.period} · {row.responsesCount ?? 0} jawaban
            </p>
            <p className="text-xs text-text-secondary">
              Dibuang {formatTanggal(row.deletedAt)} oleh{' '}
              {row.deletedByName ?? <span className="italic">Akun sudah dihapus</span>}
            </p>
            <div className="flex items-center gap-2 pt-1">{aksi(row, true)}</div>
          </div>
        ))}
      </div>

      <div data-susunan="tabel" className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-secondary bg-surface-container-low border-b border-border">
              <th className="px-lg py-md font-bold">Survei</th>
              {tampilkanKolomOpd && <th className="px-lg py-md font-bold">OPD</th>}
              <th className="px-lg py-md font-bold">Periode</th>
              <th className="px-lg py-md font-bold text-right">Jawaban</th>
              <th className="px-lg py-md font-bold">Dibuang</th>
              <th className="px-lg py-md font-bold">Oleh</th>
              <th className="px-lg py-md font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              return (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-surface-container-low/50 transition-colors"
                >
                  {/* `min-w` supaya judul pendek tak ikut dipatah dua baris oleh
                    kolom yang menyempit demi kolom OPD; judul panjang tetap
                    boleh membungkus. */}
                  <td className="px-lg py-lg font-bold text-text-primary min-w-[180px]">
                    {row.title}
                  </td>
                  {tampilkanKolomOpd && (
                    <td className="px-lg py-lg text-text-secondary">{row.opdName}</td>
                  )}
                  <td className="px-lg py-lg text-text-secondary whitespace-nowrap">
                    {row.period}
                  </td>
                  {/* Rata kanan + tabular-nums: angkanya dibandingkan antarbaris,
                    dan itu satu-satunya kolom yang dibaca begitu. */}
                  <td className="px-lg py-lg text-right tabular-nums">{row.responsesCount ?? 0}</td>
                  <td className="px-lg py-lg text-text-secondary whitespace-nowrap">
                    {formatTanggal(row.deletedAt)}
                  </td>
                  {/* `whitespace-nowrap`: nama akun paling panjang 50 karakter,
                    dan tabelnya sudah punya gulir horizontalnya sendiri --
                    memaksanya membungkus justru meninggikan tiap baris. */}
                  <td className="px-lg py-lg text-text-secondary whitespace-nowrap">
                    {/* Bukan "-" kosong: FK-nya ON DELETE SET NULL, jadi nilai
                      kosong di sini punya sebab yang pasti dan layak disebut. */}
                    {row.deletedByName ?? <span className="italic">Akun sudah dihapus</span>}
                  </td>
                  <td className="px-lg py-lg">
                    {/* Membungkus hanya di layar sempit. Di layar lebar ruangnya
                      berlimpah, dan dua tombol bertumpuk membuat tiap baris
                      setinggi dua baris tanpa alasan. */}
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5">
                      {aksi(row)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
