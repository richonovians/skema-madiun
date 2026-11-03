'use client';

import React, { useState } from 'react';
import TrendChart from './charts/TrendChart';

/**
 * Tren jumlah pengaduan masuk di halaman statistik publik (2 November 2026),
 * dengan pilihan Bulanan (dua belas bulan terakhir) atau Tahunan.
 *
 * Kedua deret disiapkan adapter dari SATU deret bulanan backend, jadi berganti
 * tampilan tak memanggil jaringan dan angkanya tak dapat berselisih.
 */
const PILIHAN = [
  { kunci: 'bulanan', label: 'Bulanan' },
  { kunci: 'tahunan', label: 'Tahunan' },
];

/**
 * Batas atas sumbu Y: dibulatkan ke bilangan GENAP supaya garis bantu tengah
 * (setengahnya) tetap bilangan bulat -- "2,5 pengaduan" tak bermakna. Minimal
 * 2 agar deret yang seluruhnya nol tetap punya sumbu.
 */
function batasAtas(deret) {
  const tertinggi = Math.max(0, ...deret.map((p) => p.value));
  return Math.max(2, Math.ceil(tertinggi / 2) * 2);
}

export default function TrenPengaduan({ bulanan, tahunan }) {
  const [mode, setMode] = useState('bulanan');

  if (bulanan.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
        <h3 className="text-lg font-bold text-text-primary mb-2">Tren Jumlah Pengaduan</h3>
        <p className="text-sm text-text-secondary">Belum ada pengaduan untuk digambarkan trennya.</p>
      </div>
    );
  }

  const deret = mode === 'bulanan' ? bulanan : tahunan;

  const aksi = (
    <div
      role="group"
      aria-label="Rentang tren pengaduan"
      className="inline-flex rounded-xl bg-surface-container-low p-1"
    >
      {PILIHAN.map(({ kunci, label }) => {
        const aktif = mode === kunci;
        return (
          <button
            key={kunci}
            type="button"
            aria-pressed={aktif}
            onClick={() => setMode(kunci)}
            className={`min-h-[44px] rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              aktif ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <TrendChart
      title="Tren Jumlah Pengaduan"
      data={deret}
      dataKey="value"
      yMin={0}
      yMax={batasAtas(deret)}
      aksi={aksi}
      isiTinggi
    />
  );
}
