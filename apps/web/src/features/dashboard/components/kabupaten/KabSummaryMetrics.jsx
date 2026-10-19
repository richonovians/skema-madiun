'use client';
import React from 'react';
import { LineChart, Users, AlertTriangle, Network, UserCheck } from 'lucide-react';

/**
 * @param {object} props
 * @param {object} props.data ringkasan dari `GET /dashboard/ikm`, mengikuti
 *   penyaring periode & jenis layanan di navbar
 * @param {number|null} [props.activeUsers] jumlah akun aktif seluruh sistem.
 *   Prop TERSENDIRI karena asalnya `GET /statistics`, yang TIDAK mengikuti
 *   penyaring itu -- sama seperti "Keaktifan Sistem" di sebelahnya.
 */
export default function KabSummaryMetrics({ data, activeUsers = null }) {
  if (!data) return null;

  // GAP (bukan dikarang): mutu agregat lintas-OPD TIDAK dihitung backend --
  // `IkmService.mutuFromNilai` cuma utk NILAI PER-SURVEI, rata-rata gabungan
  // banyak OPD tak py padanan huruf mutu resmi. Tampilkan '-' saat null,
  // bukan derivasi sendiri (beda dgn label mutu per-survei di ikm.adapter.js
  // yang memang official).
  const ikmGradeLabel = data.ikmGrade ? `Mutu: ${data.ikmGrade} (${data.ikmLabel})` : 'Mutu: -';

  // `null` DIBEDAKAN dari 0. Halaman ini mengambil kedua sumbernya terpisah,
  // jadi keempat kartu lain sudah tergambar ketika angka ini belum tiba -- dan
  // "0 akun aktif" pada saat itu adalah kabar palsu.
  const akunAktif = activeUsers == null ? '-' : activeUsers.toLocaleString('id-ID');

  return (
    // LIMA kolom sejak kartu "Akun Aktif" bergabung (15 September 2026,
    // permintaan pengguna).
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-lg">

      {/* Metric Card 1 */}
      <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
        <div className="flex justify-between items-start mb-md">
          <span className="p-sm bg-primary/10 text-primary rounded-lg">
            <LineChart size={24} />
          </span>
          <span className="bg-blue-100 text-primary text-[10px] font-bold px-sm py-xs rounded-full uppercase tracking-wider">
            {ikmGradeLabel}
          </span>
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-xs">Rata-Rata IKM Kabupaten</p>
          <h3 className="text-4xl font-extrabold text-text-primary tracking-tight">
            {data.ikmScore != null ? data.ikmScore.toFixed(2) : '-'}
          </h3>
        </div>
      </div>

      {/* Metric Card 2 */}
      <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
        <div className="flex justify-between items-start mb-md">
          <span className="p-sm bg-secondary-container/30 text-secondary rounded-lg">
            <Users size={24} />
          </span>
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-xs">Partisipasi Responden</p>
          <div className="flex items-baseline gap-xs">
            <h3 className="text-4xl font-extrabold text-text-primary tracking-tight">
              {data.totalRespondents.toLocaleString('id-ID')}
            </h3>
            <span className="text-text-secondary text-xs font-semibold">Masyarakat</span>
          </div>
        </div>
      </div>

      {/* Metric Card 3 */}
      <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
        <div className="flex justify-between items-start mb-md">
          <span className="p-sm bg-error-container/30 text-error rounded-lg">
            <AlertTriangle size={24} />
          </span>
          {data.newComplaints > 0 && (
            <span className="text-error text-xs font-bold px-sm py-xs">
              +{data.newComplaints} Baru
            </span>
          )}
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-xs">Total Pengaduan Terbuka</p>
          <div className="flex items-baseline gap-xs">
            <h3 className="text-4xl font-extrabold text-text-primary tracking-tight">
              {data.openComplaints}
            </h3>
            <span className="text-text-secondary text-xs font-semibold">Tiket</span>
          </div>
        </div>
      </div>

      {/* Metric Card 4 */}
      <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
        <div className="flex justify-between items-start mb-md">
          <span className="p-sm bg-surface-container-highest/50 text-on-surface-variant rounded-lg">
            <Network size={24} />
          </span>
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-xs">Keaktifan Sistem</p>
          <h3 className="text-4xl font-extrabold text-text-primary tracking-tight">
            {data.systemActivityPercent}%
          </h3>
          <p className="text-[10px] text-text-secondary mt-xs">Seluruh OPD Terintegrasi</p>
        </div>
      </div>

      {/* Metric Card 5 */}
      <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
        <div className="flex justify-between items-start mb-md">
          <span className="p-sm bg-primary-container/40 text-primary rounded-lg">
            <UserCheck size={24} />
          </span>
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-xs">Akun Aktif</p>
          <h3 className="text-4xl font-extrabold text-text-primary tracking-tight tabular-nums">
            {akunAktif}
          </h3>
          {/* Lingkupnya tersurat: angka ini menghitung AKUN, bukan warga yang
              dilayani, dan tak mengikuti penyaring periode di navbar. */}
          <p className="text-[10px] text-text-secondary mt-xs">Di seluruh sistem</p>
        </div>
      </div>

    </div>
  );
}
