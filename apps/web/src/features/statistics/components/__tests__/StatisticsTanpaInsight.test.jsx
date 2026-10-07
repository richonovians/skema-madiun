import React from 'react';
import { render, screen } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import StatisticsDashboard from '../StatisticsDashboard';

/**
 * FITUR INSIGHT & KESIMPULAN DIBUANG (6 Oktober 2026, permintaan pengguna:
 * "hapus fitur insight & kesimpulan").
 *
 * Terukur sebelum dibuang: tabel `statistics_insight` berisi NOL baris, tak ada
 * satu pun penyunting di frontend, dan endpoint `PATCH /statistics/insight`
 * tak pernah dipanggil antarmuka mana pun. Fiturnya disediakan 5 Agustus 2026
 * (keputusan D6) dan tak pernah hidup.
 *
 * Uji ini merender halamannya terhadap respons yang MASIH membawa `insight` --
 * bentuk yang dikirim backend lama. Tanpa itu, membuang kartunya akan lulus
 * hanya karena data tiruannya ikut dibuang, dan halaman yang meledak pada
 * respons lama tak akan ketahuan.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const STATISTIK = {
  summary: {
    ikm: 82.5,
    totalRespondents: 10,
    totalComplaints: 4,
    completionRate: 75,
    avgSlaDays: 2,
    activeOpd: 3,
    activeUsers: 5,
  },
  ikmTrend: [],
  complaintTrend: [],
  complaintStatus: [],
  complaintCategories: [{ nama: 'Infrastruktur', count: 3 }],
  serviceElements: [],
  valueDistribution: [],
  topOpd: [{ peringkat: 1, opdNama: 'Dinas Kesehatan', nilaiIkm: 88.1 }],
  // SENGAJA MASIH ADA: respons backend lama, dan halaman harus tetap tegak.
  insight: { text: 'Narasi lama yang tak boleh tampil lagi.', updatedAt: null },
};

describe('StatisticsDashboard — tanpa Insight & Kesimpulan', () => {
  beforeEach(() => {
    server.use(http.get(`${API_BASE}/statistics`, () => ok(STATISTIK, '/statistics')));
  });

  it('tidak lagi menampilkan judul kartunya', async () => {
    render(<StatisticsDashboard />);
    await screen.findByText(/Statistik Pengaduan/i);

    expect(screen.queryByText(/Insight\s*&\s*Kesimpulan/i)).not.toBeInTheDocument();
  });

  it('tidak menampilkan narasinya walau backend masih mengirimkannya', async () => {
    render(<StatisticsDashboard />);
    await screen.findByText(/Statistik Pengaduan/i);

    expect(screen.queryByText(/Narasi lama yang tak boleh tampil lagi/)).not.toBeInTheDocument();
  });

  it('bagian halaman yang lain TETAP tergambar', async () => {
    // Penjaga pasangan: membuang kartunya tak boleh menjatuhkan seluruh
    // halaman, dan `adaptStatistics` membaca kuncinya tanpa penjagaan.
    render(<StatisticsDashboard />);

    expect(await screen.findByText('Infrastruktur')).toBeInTheDocument();
    expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
  });

  it('respons TANPA `insight` sama sekali tidak menjatuhkan halaman', async () => {
    // Bentuk yang dikirim backend SESUDAH endpointnya ikut dibuang.
    const tanpaInsight = { ...STATISTIK };
    delete tanpaInsight.insight;
    server.use(http.get(`${API_BASE}/statistics`, () => ok(tanpaInsight, '/statistics')));

    render(<StatisticsDashboard />);

    expect(await screen.findByText('Infrastruktur')).toBeInTheDocument();
  });
});
