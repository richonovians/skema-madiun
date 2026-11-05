import React from 'react';
import Card from '@/components/ui/Card';
import { Check, Hourglass, XCircle, AlertTriangle, Forward } from 'lucide-react';
import clsx from 'clsx';
import { COMPLAINT_ALUR_UTAMA, COMPLAINT_STATUS_LABEL } from '@/utils/enumLabels';

/**
 * Penanda kemajuan lima tahap (4 November 2026, permintaan pengguna).
 *
 * Menggantikan tiga tahap lama Diterima -> Diproses -> Selesai.
 *
 * KETERANGAN TAHAP ADA DI SINI, bukan datang dari backend: ia kalimat
 * antarmuka, dan backend sudah mengirim `label` untuk nama tahapnya. Yang
 * disalin dari backend hanyalah URUTAN (`COMPLAINT_ALUR_UTAMA`), dan itu
 * disadari -- lihat catatannya di `enumLabels.js`.
 */
const KETERANGAN_TAHAP = {
  Terkirim: 'Pengaduan berhasil dikirim dan tersimpan di sistem. Anda menerima nomor tiket.',
  'Menunggu Verifikasi': 'Pengaduan menunggu pemeriksaan kelengkapan dan kesesuaian oleh petugas.',
  Diverifikasi: 'Pengaduan dinyatakan valid dan diteruskan kepada instansi yang berwenang.',
  'Sedang Ditindaklanjuti': 'Instansi tujuan sedang melakukan pemeriksaan atau penanganan.',
  Selesai: 'Penanganan telah selesai dan hasil tindak lanjutnya disampaikan kepada Anda.',
};

/**
 * Status di luar alur utama. Keduanya TIDAK punya tempat di antara kelima
 * tahap -- menyelipkannya akan menyiratkan bahwa tiket yang ditolak toh
 * sedang menuju "Selesai". Jadi alurnya digambar membeku pada tahap terakhir
 * yang terlampaui, dan keadaannya dijelaskan di panel terpisah di bawah.
 */
const STATUS_ALTERNATIF = {
  Ditolak: {
    Ikon: XCircle,
    kelas: 'bg-error-container/40 border-error/30 text-on-error-container',
    kelasIkon: 'text-error',
    keterangan: 'Pengaduan tidak dapat diproses. Alasannya tercantum pada riwayat di bawah.',
  },
  'Perlu Perbaikan': {
    Ikon: AlertTriangle,
    kelas: 'bg-amber-50 border-amber-200 text-amber-900',
    kelasIkon: 'text-amber-600',
    keterangan:
      'Petugas meminta Anda melengkapi informasi atau bukti. Balas lewat percakapan di halaman ini.',
  },
  /**
   * Pengalihan antar-instansi (5 November 2026).
   *
   * KALIMATNYA MENYEBUT PENGULANGAN, dan itu perlu: tiket yang dialihkan dari
   * "Sedang Ditindaklanjuti" memang mundur ke antrean verifikasi OPD baru.
   * Tanpa kalimat ini pelapor melihat penanda kemajuannya surut tanpa sebab.
   */
  Dialihkan: {
    Ikon: Forward,
    // Palet mentah, sama seperti "Perlu Perbaikan" di atas: tema ini tak
    // mendefinisikan token `info-container`, jadi kelas semacam
    // `bg-info-container/40` tak menghasilkan CSS apa pun dan panelnya
    // tergambar polos.
    kelas: 'bg-sky-50 border-sky-200 text-sky-900',
    kelasIkon: 'text-sky-600',
    keterangan:
      'Pengaduan Anda dialihkan ke instansi yang lebih berwenang. Penanganannya dimulai kembali dari verifikasi di instansi tersebut; nama instansi dan alasannya tercantum pada riwayat di bawah.',
  },
};

/**
 * Tahap terakhir yang sudah terlampaui ketika statusnya di LUAR alur utama.
 *
 * Diturunkan dari riwayat, bukan ditebak: pengaduan yang ditolak pada tahap
 * verifikasi dan yang ditolak setelah ditindaklanjuti berhenti di tempat yang
 * berbeda, dan hanya riwayatnya yang tahu di mana. Tanpa riwayat (daftar tak
 * menariknya) jatuh ke tahap pertama -- menebak lebih jauh berarti menggambar
 * kemajuan yang mungkin tak pernah terjadi.
 */
function tahapTerakhirDilalui(riwayat) {
  const indeks = (riwayat ?? [])
    .map((baris) => COMPLAINT_ALUR_UTAMA.indexOf(baris.label))
    .filter((i) => i >= 0);
  return indeks.length > 0 ? Math.max(...indeks) : 0;
}

export default function ComplaintProgressStepper({ currentStatus = 'Terkirim', riwayat }) {
  const alternatif = STATUS_ALTERNATIF[currentStatus];
  const indeksBerjalan = alternatif
    ? tahapTerakhirDilalui(riwayat)
    : COMPLAINT_ALUR_UTAMA.indexOf(currentStatus);

  const keadaanTahap = (indeksTahap) => {
    if (indeksTahap < indeksBerjalan) return 'completed';
    // Pada status alternatif tak ada tahap yang "berjalan": tiketnya memang
    // tidak sedang bergerak di alur utama.
    if (indeksTahap === indeksBerjalan) return alternatif ? 'completed' : 'active';
    return 'pending';
  };

  return (
    <Card className="p-5 sm:p-6 md:p-8">
      {/* "Progres", satu s: serapan Indonesia untuk *progress*.
          SurveyProgress.jsx sudah menulisnya begitu sejak awal, dan dua ejaan
          berbeda untuk hal yang sama dalam satu aplikasi terbaca seperti
          kelalaian. Diperbaiki 22 September 2026 atas permintaan pengguna. */}
      <h3 className="font-h3 text-h3 mb-6 text-text-primary">Status Progres</h3>

      <ol className="relative space-y-6">
        {COMPLAINT_ALUR_UTAMA.map((tahap, index) => {
          const state = keadaanTahap(index);
          const isLast = index === COMPLAINT_ALUR_UTAMA.length - 1;

          return (
            <li key={tahap} className="flex gap-3 sm:gap-4 relative">
              <div className="z-10 flex flex-col items-center shrink-0 w-8 relative">
                {state === 'completed' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                    <Check size={18} strokeWidth={3} aria-hidden="true" />
                  </div>
                )}
                {state === 'active' && (
                  <div className="w-8 h-8 relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-primary-container animate-pulse"></div>
                    <div className="w-3 h-3 bg-primary rounded-full relative z-10"></div>
                  </div>
                )}
                {state === 'pending' && (
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-outline">
                    <Hourglass size={18} aria-hidden="true" />
                  </div>
                )}

                {!isLast && (
                  <div
                    className={clsx(
                      'w-[2px] h-[calc(100%-8px)] absolute top-8 left-0 right-0 mx-auto',
                      state === 'completed' ? 'bg-primary' : 'bg-outline-variant',
                    )}
                  ></div>
                )}
              </div>

              <div className={clsx(!isLast && 'pb-md')}>
                <p
                  className={clsx(
                    'font-bold',
                    state === 'completed'
                      ? 'text-text-primary'
                      : state === 'active'
                        ? 'text-primary'
                        : 'text-outline',
                  )}
                >
                  {COMPLAINT_STATUS_LABEL[tahap] ?? tahap}
                  {/* Keadaan tahap dibedakan WARNA & IKON saja tanpa ini, dan
                      keduanya tak terbaca pembaca layar. */}
                  <span className="sr-only">
                    {state === 'completed'
                      ? ' — selesai'
                      : state === 'active'
                        ? ' — sedang berjalan'
                        : ' — belum dilalui'}
                  </span>
                </p>
                <p className="text-text-secondary text-label-md">{KETERANGAN_TAHAP[tahap]}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {alternatif && (
        <div
          className={clsx(
            'mt-6 flex items-start gap-3 rounded-xl border p-4',
            alternatif.kelas,
          )}
        >
          <alternatif.Ikon
            size={18}
            className={clsx('shrink-0 mt-0.5', alternatif.kelasIkon)}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-bold">{COMPLAINT_STATUS_LABEL[currentStatus]}</p>
            <p className="text-xs leading-relaxed mt-0.5">{alternatif.keterangan}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
