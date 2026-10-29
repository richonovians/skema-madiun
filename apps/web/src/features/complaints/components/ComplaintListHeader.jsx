import React from 'react';
import { Download, FileText } from 'lucide-react';

/**
 * Ekor kalimat judul menurut penyaring status (26 Oktober 2026, permintaan
 * pengguna). Sebelumnya halaman Admin OPD selalu menulis "tiket pengaduan aktif
 * yang membutuhkan tindak lanjut segera", juga ketika yang tersaring pengaduan
 * Selesai atau Ditolak -- dua keadaan yang justru tak menuntut tindak lanjut.
 * Kuncinya nilai penyaring di `ComplaintListFilter`.
 */
const KALIMAT_STATUS = {
  'Semua Status': 'pengaduan.',
  Diterima: 'pengaduan baru yang belum ditindaklanjuti.',
  Diproses: 'pengaduan yang sedang diproses.',
  Selesai: 'pengaduan yang sudah selesai ditangani.',
  Ditolak: 'pengaduan yang ditolak.',
};

/**
 * @param {object} props
 * @param {number} [props.totalComplaints]
 * @param {string} [props.statusFilter] penyaring status yang dipilih. Halaman
 *   warga tak punya penyaring dan tak mengirimnya, jadi kalimat lamanya tetap.
 */
export default function ComplaintListHeader({
  totalComplaints = 0,
  statusFilter,
  onExportExcel,
  onExportPDF,
}) {
  const ekor =
    statusFilter === undefined
      ? 'tiket pengaduan aktif yang membutuhkan tindak lanjut segera.'
      : (KALIMAT_STATUS[statusFilter] ?? KALIMAT_STATUS['Semua Status']);

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-h1 text-h1 text-text-primary tracking-tight">Daftar Pengaduan Masyarakat</h2>
          <p className="font-body-md text-body-md text-text-secondary mt-2">
            Menampilkan {totalComplaints} {ekor}
          </p>
        </div>
      </div>
    </div>
  );
}
