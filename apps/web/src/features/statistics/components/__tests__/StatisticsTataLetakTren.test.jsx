import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import StatisticsDashboard from '../StatisticsDashboard';

/**
 * TATA LETAK BARU HALAMAN STATISTIK PUBLIK (2 November 2026, permintaan
 * pemilik produk).
 *
 *   kolom kiri : Top Kategori + Efektivitas (satu kartu), lalu Top OPD
 *   kolom kanan: Tren Jumlah Pengaduan (Bulanan/Tahunan), lalu Tren IKM
 *
 * Mock MSW: `complaintTrendBulanan` 14 bulan (Okt 2025 s.d. Nov 2026),
 * `ikmTrend` tiga triwulan 2026, status `selesai` berjumlah 16.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Indeks sel grid dua-kolom (anak langsungnya) yang memuat elemen ini. */
function selDari(el) {
  const grid = el.closest('[class*="lg:grid-cols-2"]');
  return [...grid.children].findIndex((sel) => sel.contains(el));
}

function selElemen(el) {
  const grid = el.closest('[class*="lg:grid-cols-2"]');
  return [...grid.children].find((sel) => sel.contains(el));
}

/** true bila `a` mendahului `b` di dokumen. */
function mendahului(a, b) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/**
 * GRID 2x2 SETEMA PER BARIS (3 November 2026, permintaan pemilik produk).
 *
 *   baris pengaduan: Top Kategori + Efektivitas | Tren Jumlah Pengaduan
 *   baris IKM      : Top OPD Terbaik            | Tren IKM
 *
 * Urutan sel di DOM juga urutan di ponsel (satu kolom), dan sengaja setema:
 * Kategori, Tren Pengaduan, Top OPD, Tren IKM.
 */
describe('StatisticsDashboard — grid 2x2 per baris', () => {
  it('urutan sel: Kategori, Tren Pengaduan, Top OPD, Tren IKM', async () => {
    render(<StatisticsDashboard />);

    const kategori = await screen.findByText('Top Kategori Pengaduan');
    const efektivitas = screen.getByText('Efektivitas Penyelesaian Aduan');
    const trenPengaduan = screen.getByRole('heading', { name: 'Tren Jumlah Pengaduan' });
    const topOpd = screen.getByText('Top OPD Terbaik');
    const trenIkm = screen.getByRole('heading', { name: 'Tren IKM' });

    expect([kategori, trenPengaduan, topOpd, trenIkm].map(selDari)).toEqual([0, 1, 2, 3]);
    // Efektivitas tetap sekartu dengan kategori, di atas Top OPD.
    expect(selDari(efektivitas)).toBe(0);
    expect(mendahului(efektivitas, topOpd)).toBe(true);
  });

  /**
   * Hanya kartu GRAFIK yang ditarik setinggi barisnya; grafiknya ikut memanjang
   * (lihat TrendChartIsiTinggi.test.jsx). Kartu kiri tetap setinggi isinya:
   * meregangkannya meninggalkan ruang kosong DI DALAM kartu, cacat yang sudah
   * dibereskan 7 Oktober 2026.
   */
  it('kartu kiri tidak diregangkan, kartu grafik diregangkan', async () => {
    render(<StatisticsDashboard />);

    const kategori = selElemen(await screen.findByText('Top Kategori Pengaduan'));
    const topOpd = selElemen(screen.getByText('Top OPD Terbaik'));
    const trenPengaduan = selElemen(screen.getByRole('heading', { name: 'Tren Jumlah Pengaduan' }));
    const trenIkm = selElemen(screen.getByRole('heading', { name: 'Tren IKM' }));

    expect(kategori).toHaveClass('self-start');
    expect(topOpd).toHaveClass('self-start');
    expect(trenPengaduan).not.toHaveClass('self-start');
    expect(trenIkm).not.toHaveClass('self-start');
    expect(kategori.closest('[class*="lg:grid-cols-2"]')).not.toHaveClass('items-start');
  });
});

describe('StatisticsDashboard — tren jumlah pengaduan', () => {
  it('bawaannya Bulanan dan menggambar bulan terakhir', async () => {
    render(<StatisticsDashboard />);

    const bulanan = await screen.findByRole('button', { name: 'Bulanan' });
    expect(bulanan).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tahunan' })).toHaveAttribute('aria-pressed', 'false');

    const kartu = screen.getByRole('heading', { name: 'Tren Jumlah Pengaduan' }).parentElement
      .parentElement;
    expect(within(kartu).getAllByText('Nov 2026').length).toBeGreaterThan(0);
  });

  it('Tahunan menggambar jumlah per tahun', async () => {
    render(<StatisticsDashboard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Tahunan' }));

    expect(screen.getByRole('button', { name: 'Tahunan' })).toHaveAttribute('aria-pressed', 'true');
    const kartu = screen.getByRole('heading', { name: 'Tren Jumlah Pengaduan' }).parentElement
      .parentElement;
    expect(within(kartu).getAllByText('2025').length).toBeGreaterThan(0);
    expect(within(kartu).getAllByText('2026').length).toBeGreaterThan(0);
    expect(within(kartu).queryAllByText('Nov 2026')).toHaveLength(0);
  });

  it('tanpa pengaduan, kartu tren menyebut belum ada data alih-alih grafik kosong', async () => {
    server.use(
      http.get(`${API_BASE}/statistics`, () =>
        ok(
          {
            summary: { ikm: null, totalRespondents: 0, totalComplaints: 0, completionRate: null, avgSlaDays: null, activeOpd: 0 },
            ikmTrend: [],
            complaintTrend: [],
            complaintTrendBulanan: [],
            complaintStatus: [],
            complaintCategories: [],
            serviceElements: [],
            valueDistribution: [],
            topOpd: [],
          },
          '/statistics',
        ),
      ),
    );
    render(<StatisticsDashboard />);

    expect(await screen.findByText('Belum ada pengaduan untuk digambarkan trennya.')).toBeInTheDocument();
    expect(screen.getByText('Belum ada nilai IKM per triwulan.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tahunan' })).toBeNull();
  });
});

describe('StatisticsDashboard — tren IKM', () => {
  it('menggambar nilai IKM per triwulan', async () => {
    render(<StatisticsDashboard />);

    const kartu = (await screen.findByRole('heading', { name: 'Tren IKM' })).parentElement;
    // Label sumbu digambar dua kali: teksnya dan <title> berisi bentuk penuhnya.
    expect(within(kartu).getAllByText('Triwulan III - 2026').length).toBeGreaterThan(0);
  });
});

describe('StatisticsDashboard — aduan selesai', () => {
  it('kotak "Aduan selesai" berada di kanan "Aduan masuk"', async () => {
    render(<StatisticsDashboard />);

    const masuk = await screen.findByText(/^aduan masuk$/i);
    const selesai = screen.getByText(/^aduan selesai$/i);

    expect(selesai.closest('div')).toHaveTextContent('16');
    expect(mendahului(masuk, selesai)).toBe(true);
  });
});
