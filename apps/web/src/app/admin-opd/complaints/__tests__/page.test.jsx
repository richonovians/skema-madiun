import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminOPDComplaintsPage from '../page';
import { getComplaints } from '@/features/complaints/services/complaints.api';

jest.mock('@/features/complaints/services/complaints.api', () => ({
  getComplaints: jest.fn(),
}));

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
 * Kembaran `app/admin-kab/complaints/__tests__/page.test.jsx`, dan keduanya
 * lahir dari sebab yang sama: catatan pemotongan dipasang di lima halaman admin
 * hari itu, tetapi dua halaman tak punya uji halaman mana pun sehingga
 * pemasangannya tak terbukti. Disebut tersurat di BUG-021 dan TC-FE-051.
 *
 * Satu bedanya dari halaman Kabupaten dan itu disengaja: di sini `?opdId=` TIDAK
 * dikirim dari klien (dibuang 5 September 2026 -- backend menurunkan instansinya
 * sendiri dari `users.opd_id`), jadi uji di bawah memeriksa parameter yang
 * benar-benar dikirim, bukan hanya apa yang tampil.
 */
const baris = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `PGD-${i + 1}`,
    title: i === 0 ? 'Lampu jalan mati' : `Pengaduan ke-${i + 1}`,
    reporter: { name: i === 0 ? 'Budi Santoso' : `Pelapor ${i + 1}`, initials: 'BS' },
    status: 'Diterima',
    dateStr: '1 Oktober 2026',
  }));

const jawab = (jumlahBaris, total) => {
  getComplaints.mockResolvedValue({
    data: baris(jumlahBaris),
    ...(total === undefined ? {} : { meta: { pagination: { total } } }),
  });
};

describe('AdminOPDComplaintsPage — catatan pemotongan', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('mengatakan daftarnya terpotong ketika total backend melebihi yang terambil', async () => {
    jawab(100, 318);

    render(<AdminOPDComplaintsPage />);
    await screen.findByText('Lampu jalan mati');

    const catatan = await screen.findByRole('status');
    expect(catatan).toHaveTextContent('100');
    expect(catatan).toHaveTextContent('318');
  });

  it('menyebut bahwa pencarian dan penyaring pun hanya bekerja atas irisan itu', async () => {
    jawab(100, 318);

    render(<AdminOPDComplaintsPage />);
    await screen.findByText('Lampu jalan mati');

    expect(await screen.findByRole('status')).toHaveTextContent(
      /termasuk oleh pencarian dan penyaring di atas/i,
    );
  });

  it('TIDAK memasang catatan ketika seluruh baris memang terambil (kendali)', async () => {
    jawab(12, 12);

    render(<AdminOPDComplaintsPage />);
    await screen.findByText('Lampu jalan mati');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('TIDAK memasang catatan ketika total belum diketahui', async () => {
    jawab(12, undefined);

    render(<AdminOPDComplaintsPage />);
    await screen.findByText('Lampu jalan mati');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('AdminOPDComplaintsPage — paginasi dan penyaring di klien', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('memotong satu halaman menjadi lima baris dan menyebut angka yang benar', async () => {
    jawab(12, 12);

    render(<AdminOPDComplaintsPage />);
    await screen.findByText('Lampu jalan mati');

    expect(screen.getByText(/Menampilkan 1-5 dari 12 pengaduan/i)).toBeInTheDocument();
    expect(screen.queryByText('Pengaduan ke-6')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));

    expect(await screen.findByText('Pengaduan ke-6')).toBeInTheDocument();
    expect(screen.getByText(/Menampilkan 6-10 dari 12 pengaduan/i)).toBeInTheDocument();
  });

  it('pencarian menyaring daftarnya dan mengembalikan ke halaman pertama', async () => {
    jawab(12, 12);

    render(<AdminOPDComplaintsPage />);
    await screen.findByText('Lampu jalan mati');

    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));
    await screen.findByText('Pengaduan ke-6');

    fireEvent.change(
      screen.getByPlaceholderText(/Cari nomor tiket, judul, atau nama pelapor/i),
      { target: { value: 'lampu' } },
    );

    await waitFor(() => {
      expect(screen.getByText('Lampu jalan mati')).toBeInTheDocument();
    });
    expect(screen.queryByText('Pengaduan ke-6')).not.toBeInTheDocument();
    expect(screen.getByText(/Menampilkan 1-1 dari 1 pengaduan/i)).toBeInTheDocument();
  });

  it('TIDAK mengirim `opdId` ke backend; cakupan OPD diturunkan backend sendiri', async () => {
    jawab(12, 12);

    render(<AdminOPDComplaintsPage />);
    await screen.findByText('Lampu jalan mati');

    expect(getComplaints).toHaveBeenCalledWith({ limit: 100 });
  });
});
