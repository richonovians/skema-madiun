'use client';

import React from 'react';
import { buildPeriode, parsePeriode } from '@/features/surveys/adapters/survey.adapter';

const CURRENT_YEAR = new Date().getFullYear();
// Rentang wajar utk pemilihan tahun survei -- 1 tahun lalu s.d. 2 tahun ke depan.
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];
const QUARTER_OPTIONS = [
  { value: 1, label: 'Triwulan I' },
  { value: 2, label: 'Triwulan II' },
  { value: 3, label: 'Triwulan III' },
  { value: 4, label: 'Triwulan IV' },
];

/**
 * Pasangan dropdown Tahun + Triwulan yang menyusun/membongkar format kanonik
 * periode `{tahun}-Q{1-4}` (D5+D8; backend memvalidasinya dgn PERIODE_REGEX).
 * Pengguna tak pernah mengetik format mentahnya sendiri.
 *
 * DIEKSTRAK dari BuilderToolbar (2026-08-20) supaya periode dapat disunting di
 * DUA tempat sekaligus -- bilah atas dan kartu judul di kanvas -- tanpa dua
 * salinan daftar tahun/triwulan yang bisa menyimpang. Pemilihan adalah "commit"
 * diskret: `onCommit` langsung menerima periode kanonik yang sudah utuh (beda
 * dari judul yang disimpan on-blur setelah diketik).
 */
export default function PeriodeSelect({
  periode,
  onCommit,
  disabled = false,
  className = 'flex items-center gap-2',
  selectClassName = '',
}) {
  const parsed = parsePeriode(periode) ?? { tahun: CURRENT_YEAR, triwulan: 1 };
  // Survei lama bisa punya tahun di luar rentang wajar (mis. data seed 2025)
  // -- sisipkan agar <select> tak jatuh ke opsi salah krn tak ketemu match.
  const yearOptions = YEAR_OPTIONS.includes(parsed.tahun)
    ? YEAR_OPTIONS
    : [parsed.tahun, ...YEAR_OPTIONS].sort((a, b) => a - b);

  return (
    <div className={className}>
      <select
        value={parsed.triwulan}
        onChange={(e) => onCommit(buildPeriode(parsed.tahun, Number(e.target.value)))}
        disabled={disabled}
        aria-label="Triwulan periode survei"
        className={selectClassName}
      >
        {QUARTER_OPTIONS.map((q) => (
          <option key={q.value} value={q.value}>
            {q.label}
          </option>
        ))}
      </select>
      <select
        value={parsed.tahun}
        onChange={(e) => onCommit(buildPeriode(Number(e.target.value), parsed.triwulan))}
        disabled={disabled}
        aria-label="Tahun periode survei"
        className={selectClassName}
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
