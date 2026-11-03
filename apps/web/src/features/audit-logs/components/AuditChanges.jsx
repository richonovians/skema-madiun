import React from 'react';
import { FileDiff } from 'lucide-react';

/**
 * SEBELUMNYA panel "Old Value / New Value" berdampingan -- backend TIDAK
 * simpan diff terstruktur semacam itu sama sekali. AuditInterceptor cuma
 * mencatat `{ params, body }` mentah dari request (lihat
 * apps/api/src/common/interceptors/audit.interceptor.ts) -- payload yang
 * DIKIRIM, bukan hasil bandingan sebelum/sesudah. Ditampilkan apa adanya
 * sbg satu panel "Payload Permintaan", bukan dikarang jadi diff dua kolom.
 *
 * Pengecualian sejak BUG-064 (3 November 2026): tiga rute `update_status`
 * ikut mencatat `sebelum`, nilai kolom status sebelum diubah. Hanya untuk
 * baris yang membawanya, blok "Perubahan" menyandingkan nilai itu dengan
 * nilai baru dari `body`. Baris lama dan aksi lain tampil seperti dulu.
 */

const LABEL_KOLOM = {
  status: 'Status',
  isActive: 'Status akun',
};

function tampilkanNilai(kunci, nilai) {
  if (nilai === undefined || nilai === null) return '—';
  if (kunci === 'isActive') return nilai ? 'Aktif' : 'Nonaktif';
  return String(nilai);
}

function BlokPerubahan({ sebelum, body }) {
  return (
    <div className="mb-md">
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        Perubahan
      </h3>
      <dl className="flex flex-col gap-2">
        {Object.keys(sebelum).map((kunci) => (
          <div
            key={kunci}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <dt className="text-sm font-semibold text-slate-700 min-w-[6rem]">
              {LABEL_KOLOM[kunci] ?? kunci}
            </dt>
            <dd className="flex flex-wrap items-center gap-2 text-sm font-mono">
              <span className="text-slate-500 line-through decoration-slate-400">
                {tampilkanNilai(kunci, sebelum[kunci])}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                →
              </span>
              <span className="sr-only">menjadi</span>
              <span className="font-semibold text-slate-900">
                {tampilkanNilai(kunci, body?.[kunci])}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function AuditChanges({ log }) {
  const adaBody = log.body && Object.keys(log.body).length > 0;
  const adaSebelum = log.sebelum && Object.keys(log.sebelum).length > 0;
  if (!adaBody && !adaSebelum) return null;

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden mt-md">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <FileDiff size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Payload Permintaan</h2>
      </div>

      <div className="p-lg">
        {adaSebelum && <BlokPerubahan sebelum={log.sebelum} body={log.body} />}
        {adaBody && (
          <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            <div className="p-4 overflow-x-auto">
              <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
                {JSON.stringify(log.body, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
