import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { handlers, complaintFixture, paginated } from '@/mocks/handlers';
import AdminOPDComplaintsPage from '../page';

/**
 * TC-FE-041 — Daftar & filter pengaduan (Admin OPD).
 *
 * Kerusakan yang ditangkap:
 *  - penyaring status tak lagi mencocokkan label yang dipakai dropdown-nya,
 *    sehingga menyaring habis seluruh baris atau tak menyaring apa pun;
 *  - pencarian berhenti mencakup nomor tiket atau nama pelapor, padahal itulah
 *    dua cara admin biasanya mencari;
 *  - **Reset Filter mengisi status dengan `''` alih-alih `'Semua Status'`.**
 *    Nilai netral penyaring ini bukan string kosong, jadi kekeliruan itu
 *    menyaring habis seluruh tabel — tombol "reset" yang justru mengosongkan
 *    layar. Catatan di `handleResetFilters` menyebut jebakan ini secara khusus;
 *  - paginasi 5 baris per halaman salah hitung.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Tujuh pengaduan: cukup untuk menguji paginasi 5-baris sekaligus penyaringan. */
const DAFTAR = [
  complaintFixture({ id: 1, ticketNo: 'PGD20260901AAAA', judul: 'Rambu lalu lintas rusak', status: 'diterima', reporterNama: 'Budi Santoso' }),
  complaintFixture({ id: 2, ticketNo: 'PGD20260901BBBB', judul: 'Jalan berlubang', status: 'diproses', reporterNama: 'Siti Aminah' }),
  complaintFixture({ id: 3, ticketNo: 'PGD20260901CCCC', judul: 'Lampu jalan padam', status: 'selesai', reporterNama: 'Budi Santoso' }),
  complaintFixture({ id: 4, ticketNo: 'PGD20260901DDDD', judul: 'Sampah menumpuk', status: 'ditolak', reporterNama: 'Andi Wijaya' }),
  complaintFixture({ id: 5, ticketNo: 'PGD20260901EEEE', judul: 'Saluran air mampet', status: 'diterima', reporterNama: 'Rina Dewi' }),
  complaintFixture({ id: 6, ticketNo: 'PGD20260901FFFF', judul: 'Trotoar rusak', status: 'diproses', reporterNama: 'Joko Susilo' }),
  complaintFixture({ id: 7, ticketNo: 'PGD20260901GGGG', judul: 'Pohon tumbang', status: 'selesai', reporterNama: 'Maya Sari' }),
];

beforeEach(() => {
  server.use(
    http.get(`${API_BASE}/complaints`, () => paginated(DAFTAR, '/complaints', { total: DAFTAR.length })),
  );
});

const barisTabel = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const judulBaris = () => barisTabel().map((r) => within(r).getAllByRole('cell')[2].textContent.trim());
const dropdownStatus = () => screen.getByRole('button', { name: /semua status|diterima|diproses|selesai|ditolak/i });
const kolomCari = () => screen.getByPlaceholderText(/cari nomor tiket, judul, atau nama pelapor/i);

const pilihStatus = async (status) => {
  fireEvent.click(dropdownStatus());
  fireEvent.click(await screen.findByRole('button', { name: status }));
};

describe('Daftar pengaduan Admin OPD (TC-FE-041)', () => {
  it('menampilkan lima baris pertama dan mengumumkan jumlah seluruhnya', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    // ITEMS_PER_PAGE = 5, jadi dua pengaduan terakhir ada di halaman berikutnya.
    expect(barisTabel()).toHaveLength(5);
    expect(screen.getByText(/Menampilkan 7 tiket pengaduan/)).toBeInTheDocument();
  });

  it('menyaring menurut status yang dipilih', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    await pilihStatus('Selesai');

    expect(judulBaris()).toEqual(['Lampu jalan padam', 'Pohon tumbang']);
  });

  it('mencari berdasarkan nomor tiket, bukan hanya judul', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    fireEvent.change(kolomCari(), { target: { value: 'PGD20260901DDDD' } });

    expect(judulBaris()).toEqual(['Sampah menumpuk']);
  });

  it('mencari berdasarkan nama pelapor', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    fireEvent.change(kolomCari(), { target: { value: 'budi' } });

    expect(judulBaris()).toEqual(['Rambu lalu lintas rusak', 'Lampu jalan padam']);
  });

  it('menampilkan keadaan kosong yang jujur saat tak ada yang cocok', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    fireEvent.change(kolomCari(), { target: { value: 'tidak ada yang begini' } });

    expect(screen.getByText('Tidak ada data pengaduan yang ditemukan.')).toBeInTheDocument();
  });

  it('mengembalikan seluruh daftar setelah Reset Filter ditekan', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    fireEvent.change(kolomCari(), { target: { value: 'budi' } });
    await pilihStatus('Selesai');
    expect(judulBaris()).toEqual(['Lampu jalan padam']);

    fireEvent.click(screen.getByRole('button', { name: 'Reset Filter' }));

    // Nilai netral penyaring status adalah 'Semua Status', BUKAN string kosong.
    // Menyetelnya ke '' membuat tombol reset justru mengosongkan tabel.
    expect(barisTabel()).toHaveLength(5);
    expect(kolomCari()).toHaveValue('');
    expect(screen.getByText(/Menampilkan 7 tiket pengaduan/)).toBeInTheDocument();
  });
});
