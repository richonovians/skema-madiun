import React from 'react';
import { render, screen } from '@testing-library/react';
import SkmAnalysisView from '../SkmAnalysisView';

/**
 * KARTU "DISTRIBUSI SKOR BELUM TERSEDIA" DIGANTI FITUR SUNGGUHAN (8 Oktober 2026,
 * permintaan pengguna). Kartu lama menyatakan sebaran jawaban 1-4 "belum
 * disediakan backend"; backend kini mengirim `sebaranSkor` dan tampilannya
 * menggambar `DistribusiSkor`.
 */
const metrics = {
  ikm: { value: 80, trend: null, status: null },
  averageScore: { value: 3.2 },
  totalRespondents: { value: 5, badge: null },
  quality: { grade: 'B - Baik' },
};

const UNSUR = [{ code: 'U1', name: 'Persyaratan', nrr: 3.2, weighted: 0.35 }];

const SEBARAN = [
  {
    id: 1,
    kode: 'U1',
    teks: 'Persyaratan pelayanan',
    total: 2,
    nilai: [
      { nilai: 1, label: 'Buruk', jumlah: 0, persen: 0 },
      { nilai: 2, label: 'Kurang', jumlah: 0, persen: 0 },
      { nilai: 3, label: 'Baik', jumlah: 1, persen: 50 },
      { nilai: 4, label: 'Sangat Baik', jumlah: 1, persen: 50 },
    ],
  },
];

const sajikan = (props = {}) =>
  render(
    <SkmAnalysisView
      metrics={metrics}
      serviceElements={UNSUR}
      periode="2026-Q2"
      jumlahResponden={5}
      {...props}
    />,
  );

describe('SkmAnalysisView — distribusi skor', () => {
  it('menggambar kartu Distribusi Skor per Pertanyaan dari sebaranSkor', () => {
    sajikan({ sebaranSkor: SEBARAN });

    expect(
      screen.getByRole('heading', { name: /distribusi skor per pertanyaan/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Persyaratan pelayanan')).toBeInTheDocument();
  });

  it('kartu lama "Belum Tersedia" TIDAK ada lagi', () => {
    sajikan({ sebaranSkor: SEBARAN });

    expect(screen.queryByText(/belum tersedia/i)).toBeNull();
    expect(screen.queryByText(/belum disediakan backend/i)).toBeNull();
  });

  it('survei tanpa pertanyaan skala: kartu tetap ada dan menyatakan sebabnya', () => {
    sajikan({ sebaranSkor: [] });

    expect(screen.getByText(/belum memuat pertanyaan skala/i)).toBeInTheDocument();
  });

  it('sebaranSkor tak dikirim (backend lama): tak menggambar kartu apa pun', () => {
    // Tanpa kartu lama dan tanpa kartu baru -- bukan klaim "tak punya pertanyaan".
    sajikan();

    expect(screen.queryByRole('heading', { name: /distribusi skor/i })).toBeNull();
    expect(screen.queryByText(/belum memuat pertanyaan skala/i)).toBeNull();
  });

  it('KONTROL: bagian lain tetap ada (kartu ringkasan dan tabel 9 unsur)', () => {
    // Menukar kartu tak boleh menggeser yang lain.
    sajikan({ sebaranSkor: SEBARAN });

    expect(screen.getByText('Nilai IKM (Indeks Kepuasan Masyarakat)')).toBeInTheDocument();
    expect(screen.getByText(/analisis 9 unsur pelayanan/i)).toBeInTheDocument();
    expect(screen.getByText('Persyaratan')).toBeInTheDocument();
  });
});
