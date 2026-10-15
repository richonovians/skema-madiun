import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminKabComplaintsPage from '../page';
import { getComplaints } from '@/features/complaints/services/complaints.api';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';

jest.mock('@/features/complaints/services/complaints.api', () => ({
  getComplaints: jest.fn(),
}));

jest.mock('@/features/complaints/services/reference.api', () => ({
  getComplaintCategories: jest.fn(),
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
 * Catatan pemotongan dipasang di sini pada hari yang sama dengan lima halaman
 * admin lainnya, tetapi tiga di antaranya punya uji halaman dan dua tidak --
 * `admin-kab/complaints` dan `admin-opd/complaints`. Keduanya karena itu
 * ditandai tersurat sebagai tak terbukti di BUG-021 dan TC-FE-051. Berkas ini
 * menutup separuh lubang itu.
 *
 * Yang dijaga: halaman MENGATAKAN daftarnya terpotong, menyebut bahwa
 * penyaringnya pun hanya bekerja atas irisan yang terambil, dan tidak
 * memperingatkan apa pun ketika totalnya belum diketahui. Pemotongannya sendiri
 * tidak diperbaiki; itu CAT-022, dan menuntut backend menerima `search`.
 */
const baris = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `PGD-${i + 1}`,
    numericId: i + 1,
    title: i === 0 ? 'Jalan rusak di Mejayan' : `Pengaduan ke-${i + 1}`,
    reporter: { name: i === 0 ? 'Siti Aminah' : `Pelapor ${i + 1}`, initials: 'SA' },
    status: 'Diterima',
    dateStr: '1 Oktober 2026',
    ageDays: 3,
    target: 'Dinas Kesehatan',
    opdId: 7,
    kategori: 'infrastruktur',
  }));

const jawab = (jumlahBaris, total) => {
  getComplaints.mockResolvedValue({
    data: baris(jumlahBaris),
    ...(total === undefined ? {} : { meta: { pagination: { total } } }),
  });
};

describe('AdminKabComplaintsPage — catatan pemotongan', () => {
  beforeEach(() => {
    getComplaintCategories.mockResolvedValue([
      { kode: 'infrastruktur', nama: 'Infrastruktur' },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('mengatakan daftarnya terpotong ketika total backend melebihi yang terambil', async () => {
    jawab(100, 412);

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    const catatan = await screen.findByRole('status');
    expect(catatan).toHaveTextContent('100');
    expect(catatan).toHaveTextContent('412');
  });

  it('menyebut bahwa pencarian dan penyaring pun hanya bekerja atas irisan itu', async () => {
    jawab(100, 412);

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    // Halaman ini MENYARING di klien, jadi kalimatnya harus memuat akibat yang
    // paling mudah terlewat -- bukan cuma jumlah barisnya.
    expect(await screen.findByRole('status')).toHaveTextContent(
      /termasuk oleh pencarian dan penyaring di atas/i,
    );
  });

  it('TIDAK memasang catatan ketika seluruh baris memang terambil (kendali)', async () => {
    jawab(12, 12);

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('TIDAK memasang catatan ketika total belum diketahui', async () => {
    // Tanpa `meta` sama sekali: ketiadaan data tak boleh menjadi peringatan
    // palsu.
    jawab(12, undefined);

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('AdminKabComplaintsPage — paginasi dan penyaring di klien', () => {
  beforeEach(() => {
    getComplaintCategories.mockResolvedValue([
      { kode: 'infrastruktur', nama: 'Infrastruktur' },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('memotong satu halaman menjadi lima baris dan menyebut angka yang benar', async () => {
    jawab(12, 12);

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    expect(screen.getByText(/Menampilkan 1-5 dari 12 pengaduan/i)).toBeInTheDocument();
    expect(screen.queryByText('Pengaduan ke-6')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));

    expect(await screen.findByText('Pengaduan ke-6')).toBeInTheDocument();
    expect(screen.getByText(/Menampilkan 6-10 dari 12 pengaduan/i)).toBeInTheDocument();
  });

  it('pencarian menyaring daftarnya dan mengembalikan ke halaman pertama', async () => {
    jawab(12, 12);

    render(<AdminKabComplaintsPage />);
    await screen.findByText('Jalan rusak di Mejayan');

    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));
    await screen.findByText('Pengaduan ke-6');

    fireEvent.change(screen.getByPlaceholderText(/Cari nomor tiket, judul, pelapor/i), {
      target: { value: 'mejayan' },
    });

    await waitFor(() => {
      expect(screen.getByText('Jalan rusak di Mejayan')).toBeInTheDocument();
    });
    expect(screen.queryByText('Pengaduan ke-6')).not.toBeInTheDocument();
    expect(screen.getByText(/Menampilkan 1-1 dari 1 pengaduan/i)).toBeInTheDocument();
  });
});
