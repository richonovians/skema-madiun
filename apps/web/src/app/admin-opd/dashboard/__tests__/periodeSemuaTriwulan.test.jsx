import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import AdminDashboardPage from '../page';

/**
 * "SEMUA TRIWULAN" TIDAK MENGOSONGKAN DASHBOARD (7 Oktober 2026, laporan
 * pengguna: "ketika saya memilih dropdown semua triwulan pada halaman opd
 * malah bagian Kinerja Periode dan Status Pengaduan tidak menampilkan data").
 *
 * CACAT YANG SAYA SEBABKAN SENDIRI. Sampai penyaring periode dipisah menjadi
 * Tahun + Triwulan (6 Oktober 2026), `periode` selalu berbentuk kanonik
 * `2026-Q4`, sehingga `survey.period === periode` memang memadai. "Semua
 * Triwulan" melahirkan bentuk kedua -- tahun saja, `2026` -- dan kesamaan
 * string persis tak pernah mencocokinya: survei berperiode `2026-Q1` tidak
 * sama dengan `2026`.
 *
 * Penawarnya sudah ada di repo sejak hari yang sama, `cocokPeriode()`, dan
 * dipakai penyaring daftar survei Kabupaten. Halaman ini saja yang terlewat.
 *
 * Diamati lewat KEADAAN KOSONGNYA, bukan lewat penanda uji yang ditanam di
 * komponen produksi: kalimat "Belum ada survei pada periode ini" persis yang
 * dilihat pengguna saat melapor.
 */
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let periodeAktif = '2026-Q1';
jest.mock('@/components/layouts/AdminLayoutProvider', () => ({
  useAdminLayout: () => ({ periode: periodeAktif }),
}));

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Mock baku `/dashboard/opd` di handlers.ts terlalu ringkas untuk halaman ini:
 * adapternya memanggil `.map()` atas `ikmTrend` dan `performanceMetrics`, yang
 * tak ada di sana, sehingga halaman jatuh ke "Gagal memuat dashboard" sebelum
 * penyaring periodenya sempat berjalan. Bentuk penuhnya dipasang di sini saja,
 * bukan diubah di handlers bersama, supaya tak menggeser uji lain.
 */
const pasangDashboardPenuh = () =>
  server.use(
    http.get(`${API_BASE}/dashboard/opd`, () =>
      ok(
        {
          ikmScore: 81.25,
          ikmMutu: 'B',
          totalRespondents: 12,
          respondentTrendPercent: 5,
          activeTickets: 2,
          activeOpdUsers: 3,
          avgResponseHours: 4,
          slaTargetHours: 48,
          completionRate: 50,
          performanceMetrics: [{ name: 'Waktu respons', realization: 4, target: 48 }],
          recentFeedback: [],
          ikmTrend: [{ periode: '2026-Q1', value: 78.2 }],
        },
        '/dashboard/opd',
      ),
    ),
  );

const sajikan = async (periode) => {
  periodeAktif = periode;
  pasangDashboardPenuh();
  render(<AdminDashboardPage />);
  await waitFor(() => expect(screen.queryByText(/memuat dashboard/i)).not.toBeInTheDocument());
  await screen.findByRole('heading', { name: /kinerja periode/i });
};

const surveiKosong = () => screen.queryByText(/belum ada survei pada periode ini/i);

describe('Dashboard OPD — penyaring "Semua Triwulan"', () => {
  it('KONTROL: triwulan yang punya survei tetap menampilkannya', async () => {
    // Fixture MSW: satu survei berperiode 2026-Q1.
    await sajikan('2026-Q1');

    expect(surveiKosong()).toBeNull();
  });

  it('KONTROL: triwulan tanpa survei memang kosong', async () => {
    await sajikan('2026-Q4');

    expect(surveiKosong()).toBeInTheDocument();
  });

  it('tahun saja menampilkan survei dari SELURUH triwulan tahun itu', async () => {
    // Inilah laporan penggunanya: `2026` harus mencakup 2026-Q1.
    await sajikan('2026');

    expect(surveiKosong()).toBeNull();
  });

  it('tahun lain tetap tersaring keluar', async () => {
    // Pagar: "longgar" tak boleh berarti "tak menyaring sama sekali".
    await sajikan('2019');

    expect(surveiKosong()).toBeInTheDocument();
  });
});
