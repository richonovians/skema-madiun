import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import StatisticsDashboard from '../StatisticsDashboard';

/**
 * Halaman statistik publik (INT-14) — sebelumnya tanpa cakupan uji sama sekali.
 *
 * `adaptStatistics` membaca sembilan kunci tanpa penjagaan (`insight.text`,
 * `serviceElements.map`, `valueDistribution.map`, `topOpd.map`), jadi respons
 * yang kekurangan salah satunya membuat halaman gagal render — bukan sekadar
 * tampil kosong. Salah satu kasus di bawah mengunci perilaku itu.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Bentuk minimum yang tetap sah bagi adapter — dipakai untuk menguji keadaan kosong. */
const statistikKosong = (over = {}) => ({
  summary: {
    ikm: null,
    totalRespondents: 0,
    totalComplaints: 0,
    completionRate: 0,
    avgSlaDays: 0,
    activeOpd: 0,
  },
  ikmTrend: [],
  complaintTrend: [],
  complaintStatus: [],
  complaintCategories: [],
  serviceElements: [],
  valueDistribution: [],
  topOpd: [],
  insight: { text: null, updatedAt: null },
  ...over,
});

const givenStatistics = (data) =>
  server.use(http.get(`${API_BASE}/statistics`, () => ok(data, '/statistics')));

describe('StatisticsDashboard', () => {
  it('menampilkan keadaan memuat sebelum data tiba', () => {
    render(<StatisticsDashboard />);
    expect(screen.getByText(/memuat statistik/i)).toBeInTheDocument();
  });

  it('menampilkan narasi insight dari API', async () => {
    render(<StatisticsDashboard />);

    // InsightCard membungkus teks dengan tanda kutip, jadi dicocokkan sebagian.
    expect(
      await screen.findByText(/kepuasan masyarakat naik tiga triwulan berturut-turut/i),
    ).toBeInTheDocument();
  });

  it('memakai narasi cadangan ketika backend mengembalikan insight kosong', async () => {
    givenStatistics(statistikKosong());
    render(<StatisticsDashboard />);

    expect(
      await screen.findByText(/belum ada narasi analisis dari admin kabupaten/i),
    ).toBeInTheDocument();
  });

  it('merender kategori pengaduan terbanyak beserta jumlahnya', async () => {
    render(<StatisticsDashboard />);

    expect(await screen.findByText('Top Kategori Pengaduan')).toBeInTheDocument();
    expect(screen.getByText('Aduan')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Lapor')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('merender peringkat OPD lengkap dengan medali dan nilai IKM', async () => {
    render(<StatisticsDashboard />);

    expect(await screen.findByText('Top OPD Terbaik')).toBeInTheDocument();
    expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
    expect(screen.getByText('88.5')).toBeInTheDocument();

    // Peringkat 1–3 memakai medali, bukan angka.
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('menampilkan keadaan kosong ketika belum ada pengaduan maupun hasil IKM', async () => {
    givenStatistics(statistikKosong());
    render(<StatisticsDashboard />);

    expect(await screen.findByText('Belum ada data pengaduan.')).toBeInTheDocument();
    expect(screen.getByText('Belum ada hasil IKM yang tercatat.')).toBeInTheDocument();
    // Grafik tidak boleh ikut dirender saat datanya kosong.
    expect(screen.queryByText('Top Kategori Pengaduan')).not.toBeInTheDocument();
  });

  it('menampilkan ErrorState dengan tombol coba lagi saat API gagal, dan memuat ulang saat diklik', async () => {
    let gagal = true;
    server.use(
      http.get(`${API_BASE}/statistics`, () => {
        if (gagal) {
          return ok({ message: 'Server bermasalah' }, '/statistics', 500);
        }
        return ok(statistikKosong({ insight: { text: 'Pulih kembali.', updatedAt: null } }), '/statistics');
      }),
    );

    render(<StatisticsDashboard />);

    expect(await screen.findByText('Gagal memuat statistik')).toBeInTheDocument();

    // Percobaan berikutnya berhasil — tombol Coba Lagi harus benar-benar memicu fetch ulang.
    gagal = false;
    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));

    await waitFor(() => expect(screen.getByText(/pulih kembali/i)).toBeInTheDocument());
  });
});
