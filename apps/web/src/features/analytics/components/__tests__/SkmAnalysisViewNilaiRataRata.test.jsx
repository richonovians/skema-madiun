import React from 'react';
import { render, screen } from '@testing-library/react';
import SkmAnalysisView from '../SkmAnalysisView';

/**
 * KARTU NILAI RATA-RATA (7 Oktober 2026, permintaan pengguna: tampilkan nilai
 * rata-rata di halaman statistik).
 *
 * Rata-rata SEMUA jawaban skala (1-4), BUKAN IKM. Kartu sendiri di samping IKM:
 * IKM menuntut 9 unsur baku dan "-" untuk survei yang tak memuatnya, sedangkan
 * rata-rata ini tetap terhitung selama ada jawaban skala.
 */
const metrics = (over = {}) => ({
  ikm: { value: 80, trend: null, status: null },
  averageScore: { value: 3.2 },
  totalRespondents: { value: 5, badge: null },
  quality: { grade: 'B - Baik' },
  ...over,
});

const UNSUR = [{ code: 'U1', name: 'Persyaratan', nrr: 3.2, weighted: 0.35 }];

const sajikan = (props = {}) =>
  render(
    <SkmAnalysisView
      metrics={metrics()}
      serviceElements={UNSUR}
      periode="2026-Q2"
      jumlahResponden={5}
      {...props}
    />,
  );

describe('SkmAnalysisView — kartu Nilai Rata-Rata', () => {
  it('menampilkan nilainya dengan dua desimal dan skalanya', () => {
    sajikan({ metrics: metrics({ averageScore: { value: 3.8 } }) });

    expect(screen.getByText('Nilai Rata-Rata')).toBeInTheDocument();
    expect(screen.getByText('3.80')).toBeInTheDocument();
    expect(screen.getByText('/ 4')).toBeInTheDocument();
  });

  it('survei TANPA 9 unsur baku: IKM "-" tetapi rata-rata tampil', () => {
    sajikan({
      metrics: metrics({
        ikm: { value: null, trend: null, status: null },
        averageScore: { value: 3.84 },
        quality: { grade: null },
      }),
      serviceElements: [],
    });

    expect(screen.getByText('3.84')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // IKM
  });

  it('belum ada jawaban skala: "-" tanpa "/ 4", bukan 0.00', () => {
    sajikan({ metrics: metrics({ averageScore: { value: null } }) });

    expect(screen.queryByText('0.00')).toBeNull();
    expect(screen.queryByText('/ 4')).toBeNull();
  });

  it('pemanggil lama yang membentuk metrics TANPA averageScore tidak melempar galat', () => {
    // `metrics.averageScore?.value`: halaman/tes lama membentuk objeknya sendiri.
    const { averageScore, ...lama } = metrics();
    void averageScore;

    expect(() => sajikan({ metrics: lama })).not.toThrow();
  });
});

describe('SkmAnalysisView — tabel 9 unsur untuk survei tanpa unsur baku', () => {
  it('ada responden tetapi tak ada unsur: menjelaskan sebabnya, bukan "belum ada responden"', () => {
    // "Belum ada responden" di sini keliru dan bertentangan dengan kartu Total
    // Responden dan Nilai Rata-Rata tepat di atasnya.
    sajikan({ serviceElements: [], jumlahResponden: 5 });

    expect(screen.getByText(/tidak memuat 9 unsur baku/i)).toBeInTheDocument();
    expect(screen.queryByText(/belum ada responden/i)).toBeNull();
  });

  it('benar-benar tanpa responden: pesan lama tetap berlaku', () => {
    sajikan({ serviceElements: [], jumlahResponden: 0 });

    expect(screen.getByText(/belum ada responden yang mengisi survei ini/i)).toBeInTheDocument();
    expect(screen.queryByText(/tidak memuat 9 unsur baku/i)).toBeNull();
  });

  it('ada unsur dan responden: tabel biasa, tanpa pesan kosong', () => {
    sajikan();

    expect(screen.getByText('Persyaratan')).toBeInTheDocument();
    expect(screen.queryByText(/tidak memuat 9 unsur baku/i)).toBeNull();
    expect(screen.queryByText(/belum ada responden/i)).toBeNull();
  });
});
