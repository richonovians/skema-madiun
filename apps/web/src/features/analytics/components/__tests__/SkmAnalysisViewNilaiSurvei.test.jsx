import React from 'react';
import { render, screen } from '@testing-library/react';
import SkmAnalysisView from '../SkmAnalysisView';

/**
 * ANALISIS SURVEI CUSTOM (8 Oktober 2026). Angka utamanya Nilai Survei dari
 * backend, bukan Nilai IKM: tak ada kartu Nilai IKM, Nilai Rata-Rata, maupun Mutu
 * Layanan, tak ada tabel 9 unsur, dan tak ada tren IKM. Distribusi skor tetap
 * ada: ia berlaku untuk semua pertanyaan skala.
 */
const metrics = (over = {}) => ({
  jenis: 'custom',
  nilaiSurvei: {
    judul: 'Indeks Kepuasan',
    nilai: 85,
    tampilan: '85%',
    kategori: 'Sangat Puas',
  },
  ikm: { value: null, trend: null, status: null },
  averageScore: { value: 3.4 },
  totalRespondents: { value: 5, badge: null },
  quality: { grade: null },
  ...over,
});

const sajikan = (props = {}) =>
  render(
    <SkmAnalysisView
      metrics={metrics()}
      serviceElements={[]}
      periode="2026-Q2"
      jumlahResponden={5}
      {...props}
    />,
  );

describe('SkmAnalysisView — survei custom', () => {
  it('kartu utama: judul, angka, dan kategori dari backend', () => {
    sajikan();

    expect(screen.getByText('Indeks Kepuasan')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Sangat Puas')).toBeInTheDocument();
  });

  it('tidak menampilkan kartu Nilai IKM, Nilai Rata-Rata, Mutu Layanan, maupun tabel 9 unsur', () => {
    sajikan();

    expect(screen.queryByText(/nilai ikm/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Nilai Rata-Rata')).not.toBeInTheDocument();
    expect(screen.queryByText('Mutu Layanan')).not.toBeInTheDocument();
    expect(screen.queryByText(/analisis 9 unsur/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tidak memuat 9 unsur baku/i)).not.toBeInTheDocument();
  });

  it('Total Responden tetap tampil', () => {
    sajikan();

    expect(screen.getByText('Total Responden')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('belum dapat dinilai (nilaiSurvei null): "Nilai Survei" dan "-", bukan nol', () => {
    sajikan({ metrics: metrics({ nilaiSurvei: null, averageScore: { value: null } }) });

    expect(screen.getByText('Nilai Survei')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('tidak menggambar tren IKM walau pemanggil mengirimnya', () => {
    sajikan({ ikmTrend: [{ month: '2026-Q1', nilaiIkm: 80 }] });

    expect(screen.queryByText(/tren nilai ikm/i)).not.toBeInTheDocument();
  });
});

describe('SkmAnalysisView — survei SKM tak berubah', () => {
  it('jenis skm_permenpanrb memakai kartu IKM seperti semula', () => {
    render(
      <SkmAnalysisView
        metrics={{
          jenis: 'skm_permenpanrb',
          nilaiSurvei: null,
          ikm: { value: 80, trend: null, status: null },
          averageScore: { value: 3.2 },
          totalRespondents: { value: 5, badge: null },
          quality: { grade: 'B - Baik' },
        }}
        serviceElements={[{ code: 'U1', name: 'Persyaratan', nrr: 3.2, weighted: 0.35 }]}
        periode="2026-Q2"
        jumlahResponden={5}
      />,
    );

    expect(screen.getByText(/nilai ikm/i)).toBeInTheDocument();
    expect(screen.getByText('Nilai Rata-Rata')).toBeInTheDocument();
    expect(screen.getByText('Mutu Layanan')).toBeInTheDocument();
  });
});
