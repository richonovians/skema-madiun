'use client';
import React from 'react';
import { TrendingUp, Verified } from 'lucide-react';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';
import TrendChart from '@/features/statistics/components/charts/TrendChart';
import DistribusiSkor from './DistribusiSkor';
import NilaiSurvei from '@/features/surveys/components/NilaiSurvei';

/**
 * Hasil IKM sungguhan per survei (GET /surveys/:id/results, INT-21) -- props
 * datang dari adaptIkmMetrics/adaptIkmServiceElements (ikm.adapter.js), BUKAN
 * lagi konstanta dummy (skmMetrics/skmServiceElements/skmDistribution/
 * skmYearlyTrend di constants/skmAnalytics.js, berkasnya kini sudah dihapus).
 *
 * CATATAN GAP (lihat komentar ikm.adapter.js): status/trend PER UNSUR belum
 * punya sumber backend -- butuh data historis lintas periode yang belum
 * dibangun (Fase 3, INT-15). Field terkait bernilai `null`, bukan dikarang.
 *
 * Dua yang dulu tercatat sebagai gap kini ada: tren IKM per triwulan (prop
 * `ikmTrend`, hanya Admin OPD) dan distribusi skor per pertanyaan (prop
 * `sebaranSkor`, 8 Oktober 2026).
 */
export default function SkmAnalysisView({
  metrics,
  serviceElements = [],
  periode,
  jumlahResponden,
  ikmTrend,
  judulTren = 'Tren Nilai IKM per Triwulan',
  sebaranSkor,
}) {
  const hasResponden = jumlahResponden > 0 && serviceElements.length > 0;
  // Survei CUSTOM (8 Oktober 2026): angka utamanya Nilai Survei dari backend, tanpa
  // kartu IKM/Mutu, tanpa tabel 9 unsur, dan tanpa tren IKM -- semuanya milik SKM.
  const custom = metrics.jenis === 'custom';

  return (
    <section className="space-y-xl animate-in fade-in duration-500">
      {periode && (
        <p className="text-label-md text-secondary">
          Periode: <span className="font-bold text-on-surface">{formatPeriodeLabel(periode)}</span>
        </p>
      )}

      {/* Summary Metrics. Empat kartu sejak 7 Oktober 2026 (Nilai Rata-Rata
          ditambahkan): `sm:grid-cols-2 xl:grid-cols-4`, bukan `md:grid-cols-4`,
          karena sidebar admin memakan 256px di md dan empat kartu sejajar di
          lebar itu terlalu sempit untuk judul kartu yang panjang. */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-lg ${custom ? '' : 'xl:grid-cols-4'}`}
      >
        {custom && (
          <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-center min-h-32 shadow-sm border border-border border-l-4 border-l-primary">
            <NilaiSurvei nilaiSurvei={metrics.nilaiSurvei} />
          </div>
        )}
        {!custom && (
          <>
        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-primary">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Nilai IKM (Indeks Kepuasan Masyarakat)</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-lg text-headline-lg text-primary">
              {metrics.ikm.value !== null ? metrics.ikm.value.toFixed(2) : '-'}
            </span>
            {metrics.ikm.trend && (
              <span className="text-label-md text-green-600 font-bold flex items-center">
                <TrendingUp size={16} className="mr-1" />
                {metrics.ikm.trend}
              </span>
            )}
          </div>
        </div>

        {/* NILAI RATA-RATA (7 Oktober 2026): rata-rata SEMUA jawaban skala, skala
            1-4, BUKAN IKM. Kartu sendiri di samping IKM, bukan pengganti: IKM
            menuntut 9 unsur baku dan "-" untuk survei yang tak memuatnya,
            sedangkan rata-rata ini tetap terhitung selama ada jawaban skala.
            `?.` karena pemanggil/tes lama membentuk `metrics` tanpa kuncinya. */}
        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-secondary">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Nilai Rata-Rata</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-lg text-headline-lg text-on-surface">
              {metrics.averageScore?.value != null ? metrics.averageScore.value.toFixed(2) : '-'}
            </span>
            {metrics.averageScore?.value != null && (
              <span className="text-label-md text-secondary font-semibold">/ 4</span>
            )}
          </div>
        </div>
          </>
        )}

        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-tertiary">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Total Responden</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-lg text-headline-lg text-on-surface">{metrics.totalRespondents.value}</span>
            {metrics.totalRespondents.badge && (
              <span className="text-label-md bg-secondary-container px-sm py-xs rounded text-primary font-bold">
                {metrics.totalRespondents.badge}
              </span>
            )}
          </div>
        </div>

        {!custom && (
        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-green-600">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Mutu Layanan</span>
          <div>
            {metrics.quality.grade ? (
              /* Ukuran penuhnya baru mulai `lg`. Terukur di Chrome pada
                 768px: lencana 153px melewati kartunya sendiri dan mendorong
                 halaman 18px ke samping. */
              <span
                data-lencana-mutu
                className="inline-flex items-center max-w-full px-md py-xs lg:px-lg lg:py-sm rounded-full bg-green-100 text-green-800 font-bold text-body-lg lg:text-headline-md"
              >
                <Verified size={20} className="mr-xs shrink-0" />
                <span className="truncate">{metrics.quality.grade}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-lg py-sm rounded-full bg-surface-variant text-on-surface-variant font-bold text-body-md">
                Belum dapat dinilai
              </span>
            )}
          </div>
        </div>
        )}
      </div>

      {/* 9 Unsur Table. Survei custom tak punya unsur baku, jadi tabel ini (dan
          pesan "tidak memuat 9 unsur baku"-nya) tidak ditampilkan. */}
      {!custom && (
      <div className="bg-white/95 backdrop-blur rounded-xl overflow-hidden shadow-sm border border-border">
        <div className="px-lg py-md border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
          <h3 className="font-h3 text-h3 text-primary">Analisis 9 Unsur Pelayanan</h3>
          <span className="text-label-md text-secondary italic">NRR: Nilai Rata-Rata per Unsur</span>
        </div>
        {!hasResponden ? (
          <div className="py-2xl text-center text-secondary">
            {jumlahResponden > 0
              ? /* Ada responden, tetapi tak ada unsur baku untuk dirata-ratakan.
                   "Belum ada responden" di sini keliru dan bertentangan dengan
                   kartu Total Responden dan Nilai Rata-Rata di atasnya. */
                'Survei ini tidak memuat 9 unsur baku, sehingga NRR per unsur tidak dapat dihitung. Nilai rata-rata seluruh jawaban skala tetap ditampilkan di atas.'
              : 'Belum ada responden yang mengisi survei ini. NRR per unsur baru dapat dihitung setelah ada jawaban masuk.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-label-md text-secondary font-bold border-b border-outline-variant">
                  <th className="px-lg py-md">Kode</th>
                  <th className="px-lg py-md whitespace-nowrap">Unsur Pelayanan</th>
                  <th className="px-lg py-md">NRR</th>
                  <th className="px-lg py-md whitespace-nowrap">NRR Tertimbang</th>
                </tr>
              </thead>
              <tbody className="text-body-md divide-y divide-outline-variant">
                {serviceElements.map((item) => (
                  <tr key={item.code} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-lg py-md font-mono font-bold text-primary">{item.code}</td>
                    <td className="px-lg py-md font-medium">{item.name}</td>
                    <td className="px-lg py-md">{item.nrr.toFixed(2)}</td>
                    <td className="px-lg py-md font-bold">{item.weighted.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* TREN IKM LINTAS PERIODE (7 Oktober 2026). Catatan lama di sini --
          "tren IKM lintas periode/tahun memerlukan agregasi data historis yang
          belum dibangun di backend" -- sudah tidak benar: `GET /dashboard/opd`
          dan `GET /statistics` membawa `ikmTrend`. Tren hanya digambar bila
          pemanggil mengirimnya; halaman yang tak punya sumbernya tak
          menampilkan apa pun di sini, bukan grafik karangan.

          Larik KOSONG dibedakan dari `undefined`: yang pertama berarti "ada
          sumbernya tetapi tak ada titik pada penyaring ini". */}
      {!custom &&
        Array.isArray(ikmTrend) &&
        (ikmTrend.length > 0 ? (
          <TrendChart
            title={judulTren}
            data={ikmTrend}
            dataKey="nilaiIkm"
            yMin={0}
            yMax={100}
          />
        ) : (
          <div className="bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm text-body-md text-secondary">
            Belum ada hasil IKM final yang tercatat pada tahun ini, jadi tren belum dapat
            digambar.
          </div>
        ))}

      {/* DISTRIBUSI SKOR (8 Oktober 2026, permintaan pengguna). Menggantikan kartu
          "Belum Tersedia": backend kini mengirim `sebaranSkor` (berapa responden
          memilih tiap nilai 1-4 pada tiap pertanyaan skala). `undefined` --
          backend lama yang belum membawanya -- tak menggambar apa pun; komponennya
          menangani larik kosong dan pertanyaan yang belum dijawab. */}
      <DistribusiSkor sebaran={sebaranSkor} />
    </section>
  );
}
