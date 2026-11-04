import React from 'react';
import { Calendar, CalendarClock, Building2, Layers, MapPin, User, Tag } from 'lucide-react';

const LABEL_TINGKAT = {
  kabupaten: 'Kabupaten',
  kecamatan: 'Kecamatan',
};

/**
 * Ringkasan satu pengaduan. Dipakai KETIGA halaman detail (warga, Admin OPD,
 * Admin Kabupaten), jadi medan yang ditambahkan di sini muncul bagi ketiganya
 * sekaligus.
 *
 * Catatan lama di sini berbunyi: 'Field "Lokasi" (kecamatan) DIHAPUS -- backend
 * tak punya data kecamatan (D13, belum dijawab Helpdesk)'. Itu TIDAK LAGI
 * BENAR sejak 4 November 2026: pengaduan kini membawa tingkatnya sendiri
 * (`tingkat`) serta tanggal & lokasi kejadian yang diketik pelapornya. Yang
 * masih belum ada adalah kecamatan tempat tinggal pelapor dari Helpdesk --
 * urusan yang berbeda, dan memang tak ditampilkan di sini.
 */
export default function ComplaintSummaryCard({ complaint }) {
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return (
      date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    );
  };

  /**
   * Pengaduan yang dibuat SEBELUM 4 November 2026 tak punya tanggal & lokasi
   * kejadian, dan `null`-nya berarti "tak pernah ditanyakan" -- bukan
   * "dikosongkan pelapor". Barisnya DISEMBUNYIKAN alih-alih menggambar tanda
   * hubung: tanda hubung di sebelah label "Lokasi Kejadian" terbaca seperti
   * data yang hilang, dan petugas akan mencarinya.
   */
  const adaKejadian = complaint.incidentDate != null || complaint.incidentLocation != null;

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50">
        <h2 className="text-title-md font-bold text-slate-800">Ringkasan Pengaduan</h2>
      </div>

      <div className="p-lg grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} /> Tingkat
          </span>
          {/* `?? complaint.tingkat`: kode tingkat yang kelak ditambahkan tanpa
              label di sini tetap terbaca apa adanya, bukan menjadi '-'. */}
          <p className="font-semibold text-slate-900">
            {LABEL_TINGKAT[complaint.tingkat] ?? complaint.tingkat ?? '-'}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Tag size={14} /> Kategori
          </span>
          <p className="font-semibold text-slate-900">{complaint.categoryLabel || '-'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={14} /> OPD Tujuan
          </span>
          <p className="font-semibold text-slate-900">{complaint.target || '-'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} /> Tanggal Dibuat
          </span>
          <p className="font-semibold text-slate-900">{formatDate(complaint.createdAt)}</p>
        </div>

        {adaKejadian && (
          <>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarClock size={14} /> Tanggal Kejadian
              </span>
              {/* `incidentDateStr` sudah diformat adapter (formatDateId), TANPA
                  jam: kolomnya DATE di basis data, jadi menggambar "00.00 WIB"
                  di sebelahnya akan menyatakan ketelitian yang tak pernah
                  dikumpulkan. Itu sebabnya `formatDate` di atas tak dipakai. */}
              <p className="font-semibold text-slate-900">
                {complaint.incidentDateStr || '-'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} /> Lokasi Kejadian
              </span>
              {/* `break-words`: lokasi boleh sampai 255 aksara dan lazim berupa
                  alamat panjang tanpa spasi yang menolong ("Jl.Raya..."). */}
              <p className="font-semibold text-slate-900 break-words">
                {complaint.incidentLocation || '-'}
              </p>
            </div>
          </>
        )}

        <div className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <User size={14} /> Nama Pelapor
          </span>
          <p className="font-semibold text-slate-900">{complaint.reporter?.name || '-'}</p>
        </div>
      </div>
    </div>
  );
}
