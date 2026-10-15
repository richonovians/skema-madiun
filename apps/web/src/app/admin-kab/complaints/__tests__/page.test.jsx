import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { handlers, complaintFixture, paginated, ok } from '@/mocks/handlers';
import AdminKabComplaintsPage from '../page';

jest.mock('@/utils/pdf', () => ({
  downloadTablePdf: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

/**
 * HALAMAN INI SEBELUMNYA TANPA UJI SAMA SEKALI (15 Oktober 2026).
 *
 * Catatan pemotongan dipasang di lima halaman admin pada hari itu, tetapi dua
 * halaman tak punya uji halaman mana pun sehingga pemasangannya tak dibuktikan —
 * `admin-kab/complaints` dan `admin-opd/complaints`. Keduanya disebut tersurat
 * di BUG-021 dan TC-FE-051; berkas ini menutup separuhnya.
 *
 * GAYANYA MSW, BUKAN `jest.mock` ATAS SERVICE. Keduanya tak dapat hidup bersama:
 * memalsukan `complaints.api` membuat MSW tak pernah terpanggil. Dengan MSW
 * ujinya menembus `getComplaints` dan `adaptComplaint` sungguhan, sehingga ia
 * ikut membuktikan pemetaan adapternya — `ticketNo` menjadi `id`, `reporterNama`
 * menjadi `reporter.name`, `diterima` menjadi `Diterima`. Kembarannya di
 * `admin-opd/complaints` memakai gaya yang sama, dan keterangan lengkap mengapa
 * ada di sana.
 *
 * Yang dijaga: halaman MENGATAKAN daftarnya terpotong, menyebut bahwa
 * penyaringnya pun hanya bekerja atas irisan yang terambil, dan tidak
 * memperingatkan apa pun ketika totalnya belum diketahui. Pemotongannya sendiri
 * tidak diperbaiki; itu CAT-022, dan menuntut backend menerima `search`.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Baris sebanyak apa pun, judul dan pelapornya dapat ditebak. Baris pertama
 * diberi judul khas supaya pencarian punya satu sasaran yang pasti tunggal.
 */
const banyakBaris = (n) =>
  Array.from({ length: n }, (_, i) =>
    complaintFixture({
      id: i + 1,
      ticketNo: `PGD20261001${String(i + 1).padStart(4, '0')}`,
      judul: i === 0 ? 'Jalan rusak di Mejayan' : `Pengaduan ke-${i + 1}`,
      status: 'diterima',
      opdNama: 'Dinas Kesehatan',
      reporterNama: i === 0 ? 'Siti Aminah' : `Pelapor ${i + 1}`,
    }),
  );

/** Jawab `GET /complaints` dengan `meta.pagination.total` yang ditentukan. */
const sajikan = (items, total = items.length) =>
  server.use(
    http.get(`${API_BASE}/complaints`, () => paginated(items, '/complaints', { total })),
  );

/**
 * Jawab TANPA `meta.pagination` sama sekali — bentuk respons yang membuat
 * `totalSeluruhnya` jatuh ke 0, yaitu "belum diketahui".
 */
const sajikanTanpaTotal = (items) =>
  server.use(http.get(`${API_BASE}/complaints`, () => ok(items, '/complaints')));

const kolomCari = () => screen.getByPlaceholderText(/Cari nomor tiket, judul, pelapor/i);

describe('AdminKabComplaintsPage — catatan pemotongan', () => {
  it('mengatakan daftarnya terpotong ketika total backend melebihi yang terambil', async () => {
    sajikan(banyakBaris(100), 412);

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    const catatan = await screen.findByRole('status');
    expect(catatan).toHaveTextContent('100');
    expect(catatan).toHaveTextContent('412');
  });

  it('menyebut bahwa pencarian dan penyaring pun hanya bekerja atas irisan itu', async () => {
    sajikan(banyakBaris(100), 412);

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    // Halaman ini MENYARING di klien, jadi kalimatnya harus memuat akibat yang
    // paling mudah terlewat — bukan cuma jumlah barisnya.
    expect(await screen.findByRole('status')).toHaveTextContent(
      /termasuk oleh pencarian dan penyaring di atas/i,
    );
  });

  it('TIDAK memasang catatan ketika seluruh baris memang terambil (kendali)', async () => {
    sajikan(banyakBaris(12), 12);

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('TIDAK memasang catatan ketika total belum diketahui', async () => {
    sajikanTanpaTotal(banyakBaris(12));

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('AdminKabComplaintsPage — paginasi dan penyaring di klien', () => {
  beforeEach(() => sajikan(banyakBaris(12), 12));

  it('memotong satu halaman menjadi lima baris dan menyebut angka yang benar', async () => {
    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    expect(screen.getByText(/Menampilkan 1-5 dari 12 pengaduan/i)).toBeInTheDocument();
    expect(screen.queryByText('Pengaduan ke-6')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));

    expect(await screen.findByText('Pengaduan ke-6')).toBeInTheDocument();
    expect(screen.getByText(/Menampilkan 6-10 dari 12 pengaduan/i)).toBeInTheDocument();
  });

  it('pencarian menyaring daftarnya dan mengembalikan ke halaman pertama', async () => {
    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));
    await screen.findByText('Pengaduan ke-6');

    fireEvent.change(kolomCari(), { target: { value: 'mejayan' } });

    expect(await screen.findByText('Jalan rusak di Mejayan')).toBeInTheDocument();
    expect(screen.queryByText('Pengaduan ke-6')).not.toBeInTheDocument();
    expect(screen.getByText(/Menampilkan 1-1 dari 1 pengaduan/i)).toBeInTheDocument();
  });
});
