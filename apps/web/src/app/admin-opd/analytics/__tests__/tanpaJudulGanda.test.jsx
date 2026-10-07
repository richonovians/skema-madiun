import React from 'react';
import { render, screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';
import AnalyticsOpdPage from '../page';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));

/**
 * JUDUL "Statistik & Analisis" DIBUANG (7 Oktober 2026, permintaan pengguna:
 * "pada halaman statistik & laporan khususnya opd, hapus teks Statistik &
 * Analisis").
 *
 * Sehari sebelumnya saya justru MEMPERTAHANKAN judul ini saat membuang
 * padanannya di halaman Kabupaten, dengan alasan navbar Admin OPD menampilkan
 * nama OPD dan bukan judul halaman, sehingga halaman ini akan kehilangan satu-
 * satunya judul di layarnya. Pemilik produk menimbang lain, dan itu
 * keputusannya; dicatat supaya alasan lama tak dihidupkan kembali tanpa sadar.
 *
 * Penanda lokasinya tidak hilang: `metadata.title` di layout.jsx tetap
 * "Statistik & Laporan", dan itulah yang diumumkan pembaca layar saat pindah
 * halaman.
 *
 * Bunyinya juga pernah BERBEDA dari menu sidebar yang menuju ke sini
 * ("Statistik & Laporan"). Satu halaman dengan dua nama itu sendiri cacat;
 * membuangnya sekaligus menutupnya.
 */
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Halaman Statistik & Laporan (Admin OPD)', () => {
  it('tidak lagi menuliskan judul di badan halaman', async () => {
    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis skm/i });

    expect(screen.queryByRole('heading', { name: /statistik & analisis/i })).toBeNull();
  });

  it('KONTROL: kedua tabnya tetap ada', async () => {
    render(<AnalyticsOpdPage />);

    expect(await screen.findByRole('button', { name: /analisis skm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analisis pengaduan/i })).toBeInTheDocument();
  });
});
