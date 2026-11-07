import React from 'react';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import { COMPLAINT_STATUS_BADGE_VARIANT, COMPLAINT_STATUS_LABEL } from '@/utils/enumLabels';

/**
 * Kolom Prioritas/SLA/Progress% DIHAPUS -- tak ada field ini di backend
 * (lihat gap complaint.adapter.js sejak INT-6). `categoryMap` (kode->nama,
 * dari GET /ref/complaint-categories) dipakai menerjemahkan kode kategori
 * mentah jadi label ramah-baca, tanggung jawab halaman pemanggil (di luar
 * adapter sinkron -- lihat catatan di complaint.adapter.js).
 */
export default function ComplaintTable({ complaints, categoryMap = {}, onForward }) {
  return (
    <div className="overflow-x-auto">
      {/* Padding samping sel `px-md`, bukan `px-lg` (7 November 2026). Sejak
          status, tanggal, dan aksi tak boleh patah baris, tabel ini meluap 63px
          di layar 1280px bersidebar lebar -- tombol aksinya terpotong. Enam
          kolom kali dua sisi kali 8px menutup luapan itu DI DATA LOKAL.

          Di CI ia tetap meluap 51px: label status terpanjang ("Menunggu
          Verifikasi") dan font runner Linux yang lebih lebar. Mengejar lebar
          piksel demi piksel rapuh terhadap font dan data, jadi kolom AKSI kini
          LENGKET di kanan: bila tabel terpaksa bergulir, tombolnya tetap utuh
          terlihat. Kolom judul turun ke `min-w-[10rem]` untuk sisanya. */}
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container text-on-surface-variant">
          <tr>
            <th className="px-md py-md font-label-md text-label-md uppercase tracking-wider">NO. TIKET</th>
            <th className="px-md py-md font-label-md text-label-md uppercase tracking-wider">OPD & KATEGORI</th>
            <th className="px-md py-md font-label-md text-label-md uppercase tracking-wider">JUDUL KELUHAN</th>
            <th className="px-md py-md font-label-md text-label-md uppercase tracking-wider">TANGGAL & UMUR</th>
            <th className="px-md py-md font-label-md text-label-md uppercase tracking-wider">STATUS</th>
            <th className="sticky right-0 z-10 bg-surface-container px-md py-md font-label-md text-label-md uppercase tracking-wider text-left shadow-[-6px_0_6px_-6px_rgb(0_0_0/0.15)]">AKSI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {complaints.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center py-xl text-text-secondary">
                Tidak ada data pengaduan yang ditemukan.
              </td>
            </tr>
          ) : (
            complaints.map((complaint) => (
              <tr key={complaint.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-md py-lg">
                  <div className="font-mono text-sm font-bold text-primary">#{complaint.id}</div>
                </td>

                <td className="px-md py-lg">
                  {/* "Belum bertujuan" sebagai LENCANA, bukan '-': tanda hubung
                      tak dapat dibedakan dari nama OPD yang gagal dimuat,
                      sedangkan baris inilah yang justru menuntut tindakan. */}
                  {complaint.opdId == null ? (
                    <Badge variant="warning">Belum bertujuan</Badge>
                  ) : (
                    <div className="font-body-md text-body-md font-bold text-slate-800">
                      {complaint.target || '-'}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-0.5">
                    {categoryMap[complaint.kategori] ?? complaint.kategori ?? '-'}
                  </div>
                </td>

                {/* `min-w-[10rem] max-w-[20rem]`, BUKAN `max-w-xs` (27 Oktober 2026, BUG-040):
                    di apps/web `max-w-xs` bernilai 4px karena token spasi membajak
                    skala `max-w-*`, jadi kolom judul selalu diperas ke lebar
                    minimumnya. Terukur 101-109px pada layar 1366px. Batas
                    bawahnya turun dari 12rem ke 10rem pada 7 November 2026 demi
                    kolom yang kini tak boleh patah baris; 160px tetap jauh di
                    atas lebar yang dulu dikeluhkan. */}
                <td className="px-md py-lg min-w-[10rem] max-w-[20rem]">
                  <p className="font-body-md text-body-md text-on-surface line-clamp-2" title={complaint.title}>
                    {complaint.title}
                  </p>
                  <div className="text-xs text-slate-500 mt-1">Pelapor: {complaint.reporter?.name ?? '-'}</div>
                </td>

                {/* Status, tanggal, dan tombol aksi TIDAK BOLEH patah baris
                    (7 November 2026, laporan pengguna). `table-layout: auto`
                    memeras kolom-kolom pendek ini lebih dulu, sehingga "Menunggu
                    Verifikasi" patah di dalam kapsulnya dan ukurannya berubah
                    setiap kali sidebar dibuka atau ditutup. Dengan `nowrap` kolom
                    ini mempertahankan lebarnya; layar sempit bergulir lewat
                    `overflow-x-auto` di pembungkus tabel. */}
                <td className="px-md py-lg">
                  <div className="font-body-md text-body-md text-on-surface-variant whitespace-nowrap">{complaint.dateStr}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Umur: {complaint.ageDays} hari</div>
                </td>

                <td className="px-md py-lg">
                  <Badge variant={COMPLAINT_STATUS_BADGE_VARIANT[complaint.status]} className="whitespace-nowrap">
                    {COMPLAINT_STATUS_LABEL[complaint.status] ?? complaint.status}
                  </Badge>
                </td>

                <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors px-md py-lg text-left shadow-[-6px_0_6px_-6px_rgb(0_0_0/0.15)]">
                  {/* Sasaran sentuh 44px (28 Oktober 2026): keduanya dulu ~29px.
                      "Monitor Tiket" dulu `<button>` di dalam `<Link>` --
                      kendali di dalam kendali; kini tautannya yang bergaya tombol. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin-kab/complaints/${complaint.id}`}
                      className="inline-flex items-center min-h-[44px] px-md py-1.5 text-primary border border-primary rounded-lg font-label-md text-label-md whitespace-nowrap hover:bg-primary hover:text-white transition-all"
                    >
                      Monitor Tiket
                    </Link>
                    {/* Hanya pada baris yang BELUM bertujuan: backend menolak
                        400 bila tiketnya sudah menjadi tanggung jawab OPD. */}
                    {complaint.opdId == null && onForward && (
                      <button
                        type="button"
                        onClick={() => onForward(complaint)}
                        className="inline-flex items-center min-h-[44px] px-md py-1.5 text-white bg-primary rounded-lg font-label-md text-label-md whitespace-nowrap hover:opacity-90 transition-all"
                      >
                        Teruskan
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
