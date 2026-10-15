import React from 'react';
import { render, screen } from '@testing-library/react';
import ComplaintTable from '../ComplaintTable';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

/**
 * KENDALI PAGINASI YANG BERDUSTA (15 Oktober 2026).
 *
 * Tabel ini dipakai halaman `/complaints` milik warga. Halamannya mengambil 50
 * baris dan merender SELURUHNYA, sementara `Pagination` di bawahnya dipatok
 * mati `totalPages={1} currentPage={1} itemsPerPage={3}` -- jadi kendalinya
 * berbunyi "Menampilkan 1-3 dari 12 pengaduan" di bawah tabel yang menampilkan
 * dua belas baris, dengan kedua tombol panah mati.
 *
 * Angka itu bukan sekadar salah; ia membuat warga menyangka ada sembilan
 * pengaduan lain yang tak dapat ia buka.
 *
 * Yang dijaga di sini DUA hal yang berbeda: bahwa kendalinya menyebut apa yang
 * benar-benar ditampilkan, dan bahwa pemotongan di atas batas ambil 50 baris
 * dikatakan tersurat alih-alih disembunyikan.
 */
const baris = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `PGD-${i + 1}`,
    date: '1 Oktober 2026',
    department: 'Dinas Kesehatan',
    title: `Pengaduan ${i + 1}`,
    status: 'Diterima',
  }));

describe('ComplaintTable — kejujuran kendali paginasi', () => {
  it('menyebut SELURUH baris yang ditampilkan, bukan tiga', () => {
    render(<ComplaintTable complaints={baris(12)} />);

    // Sebelum 15 Oktober 2026 baris ini berbunyi "Menampilkan 1-3 dari 12".
    expect(screen.getByText(/Menampilkan 1-12 dari 12 pengaduan/i)).toBeInTheDocument();
  });

  it('tidak memasang catatan pemotongan ketika semuanya memang terambil', () => {
    render(<ComplaintTable complaints={baris(12)} totalAll={12} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mengatakan tersurat ketika daftarnya terpotong batas ambil', () => {
    render(<ComplaintTable complaints={baris(50)} totalAll={73} />);

    const catatan = screen.getByRole('status');
    expect(catatan).toHaveTextContent('50');
    expect(catatan).toHaveTextContent('73');
  });

  it('tidak memasang catatan ketika totalnya belum diketahui', () => {
    // Halaman lama memanggil tabel ini tanpa `totalAll`; ketiadaan data tak
    // boleh menjadi peringatan palsu.
    render(<ComplaintTable complaints={baris(12)} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('tidak runtuh pada daftar kosong', () => {
    render(<ComplaintTable complaints={[]} />);

    expect(screen.getByText(/Menampilkan 0-0 dari 0 pengaduan/i)).toBeInTheDocument();
  });
});
