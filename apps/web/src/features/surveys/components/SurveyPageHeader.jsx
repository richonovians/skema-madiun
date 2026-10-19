import React from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import SurveyListExportMenu from './SurveyListExportMenu';

/** `surveys` adalah daftar yang SEDANG tampil, sehingga ekspornya mengikuti tab aktif. */
export default function SurveyPageHeader({ surveys = [] }) {
  return (
    // `flex-wrap` + `min-w-0` pada blok judul: terukur di Chrome pada 768px,
    // judul yang menolak menyusut mendorong baris tombol 87px ke luar layar.
    <div className="flex flex-col md:flex-row md:flex-wrap justify-between items-start md:items-center gap-md mb-xl">
      <div data-blok-judul className="min-w-0">
        <h1 className="font-h1 text-h1 text-text-primary tracking-tight">
          Paket Survei Kepuasan Masyarakat
        </h1>
        <p className="text-text-secondary font-body mt-2">
          Kelola seluruh instrumen survei unit layanan di bawah naungan OPD Anda.
        </p>
      </div>

      <div className="flex items-center gap-sm">
        <SurveyListExportMenu surveys={surveys} />

        {/* Tanpa tautan ini halaman Sampah tak punya pintu masuk sama sekali --
            survei yang terlanjur dibuang akan terlihat seperti hilang. */}
        <Link
          href="/admin-opd/surveys/sampah"
          className="px-lg py-sm border border-outline rounded-lg text-sm font-bold flex items-center gap-sm hover:bg-surface-container-low transition-colors"
        >
          <Trash2 size={16} />
          Sampah
        </Link>
      </div>
    </div>
  );
}
