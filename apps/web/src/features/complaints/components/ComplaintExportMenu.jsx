'use client';

import React from 'react';
import EksporMenu from '@/components/ui/EksporMenu';
import { downloadComplaintPdf } from '@/utils/pdf';
import { unduhCsv } from '@/utils/unduh';

/**
 * Ekspor satu tiket pengaduan.
 *
 * Versi PDF berupa dokumen arsip lengkap dengan percakapannya. Versi Excel
 * sengaja berisi PERCAKAPANNYA saja, satu pesan per baris: keterangan tiket
 * yang cuma satu baris tak ada gunanya dijadikan lembar kerja, sedangkan
 * percakapan berbaris-baris itulah yang biasa disalin ke laporan lain.
 */
export default function ComplaintExportMenu({ complaint, chatHistory = [] }) {
  const eksporPdf = () => downloadComplaintPdf({ complaint, chatHistory });

  const eksporExcel = () =>
    unduhCsv({
      namaBerkas: `pengaduan-${complaint?.id ?? 'tiket'}.csv`,
      headers: ['Penulis', 'Waktu', 'Pesan', 'Jumlah Lampiran'],
      rows: chatHistory.map((pesan) => [
        pesan.role === 'user' ? (pesan.senderName ?? 'Pelapor') : 'Petugas',
        pesan.timestamp ?? '',
        pesan.text ?? '',
        (pesan.attachments ?? []).length,
      ]),
    });

  return <EksporMenu onPdf={eksporPdf} onExcel={eksporExcel} />;
}
