import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, paginated, surveyFixture } from '@/mocks/handlers';
import AnalyticsOpdPage from '../page';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));
// Setter stabil: lihat catatan di tanpaJudulGanda.test.jsx.
const mockSetPeriode = jest.fn();
jest.mock('@/components/layouts/AdminLayoutProvider', () => ({
  useAdminLayout: () => ({ periode: '2026-Q2', setPeriode: mockSetPeriode }),
}));

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

jest.setTimeout(30000);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  configure({ asyncUtilTimeout: 5000 });
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  configure({ asyncUtilTimeout: 1000 });
});

/**
 * Menu Ekspor Statistik & Laporan Admin OPD mengumumkan dirinya sebagai menu
 * dan keadaannya (27 Oktober 2026, BUG-044), seperti empat menu ekspor lain di
 * repo (mis. ComplaintDetailHeader): `aria-haspopup="menu"` + `aria-expanded`.
 * Tombolnya hanya ada bila periode aktif punya survei, jadi satu survei dipasang
 * (pola `penyaringJenis.test.jsx`).
 */
const SURVEI = surveyFixture({ id: 2, judul: 'SKM Triwulan Dua', periode: '2026-Q2', status: 'aktif' });

describe('Halaman Statistik & Laporan (Admin OPD) — tombol Ekspor', () => {
  it('aria-haspopup menu, aria-expanded mengikuti panel', async () => {
    server.use(
      http.get(`${API_BASE}/surveys`, () => paginated([SURVEI], '/surveys')),
      http.get(`${API_BASE}/surveys/:id/results`, () =>
        ok(
          {
            surveyId: 2,
            periode: '2026-Q2',
            jenis: 'skm_permenpanrb',
            jumlahResponden: 5,
            nilaiIkm: 80,
            mutu: 'B',
            nilaiRataRata: 3.4,
            nilaiSurvei: null,
            nrrPerUnsur: [],
            sebaranSkor: [],
          },
          '/surveys/2/results',
        ),
      ),
    );
    render(<AnalyticsOpdPage />);
    const tombol = await screen.findByRole('button', { name: /^ekspor$/i });

    expect(tombol).toHaveAttribute('aria-haspopup', 'menu');
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'true');
  });
});
