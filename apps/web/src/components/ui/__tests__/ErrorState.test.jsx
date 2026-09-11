import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from '../ErrorState';

describe('ErrorState Component (TC-FE-011)', () => {
  it('merender dengan judul dan deskripsi bawaan jika tidak ada props yang diberikan', () => {
    render(<ErrorState />);
    
    expect(screen.getByText('Gagal memuat data')).toBeInTheDocument();
    expect(screen.getByText('Terjadi kesalahan saat mengambil data. Silakan coba lagi.')).toBeInTheDocument();
    
    // Tombol Coba Lagi tidak muncul jika onRetry tidak diberikan
    expect(screen.queryByRole('button', { name: /coba lagi/i })).not.toBeInTheDocument();
  });

  it('merender judul dan deskripsi kustom sesuai props yang diberikan', () => {
    render(
      <ErrorState 
        title="Koneksi Terputus" 
        description="Silakan periksa koneksi internet Anda." 
      />
    );
    
    expect(screen.getByText('Koneksi Terputus')).toBeInTheDocument();
    expect(screen.getByText('Silakan periksa koneksi internet Anda.')).toBeInTheDocument();
  });

  it('menampilkan tombol "Coba Lagi" dan memanggil onRetry saat diklik', () => {
    const mockOnRetry = jest.fn();
    render(<ErrorState onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /coba lagi/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  /**
   * Deskripsi & aksi (11 September 2026, permintaan pengguna atas layar galat
   * /survei/:id: "hapus kalimat ... dan tombol coba lagi").
   *
   * `description={null}` DIBEDAKAN dari prop yang tidak diberikan sama sekali.
   * Parameter berbawaan hanya menyala untuk `undefined`, jadi `null` berarti
   * "sengaja tanpa paragraf", sedangkan menghilangkan propnya tetap memunculkan
   * kalimat bawaan. Tanpa pembedaan itu, satu-satunya cara menghilangkan
   * paragraf adalah mengirim string kosong -- yang tetap menyisakan paragraf
   * kosong beserta jarak bawahnya.
   */
  it('melewatkan paragraf deskripsi bila sengaja dikosongkan dengan null', () => {
    const { container } = render(
      <ErrorState title="Survei tidak dapat ditemukan" description={null} />,
    );

    expect(screen.getByText('Survei tidak dapat ditemukan')).toBeInTheDocument();
    expect(screen.queryByText(/terjadi kesalahan saat mengambil data/i)).not.toBeInTheDocument();
    // Diperiksa lewat DOM, BUKAN lewat ketiadaan teks. Versi pertama uji ini
    // hanya memastikan kalimat bawaannya tak muncul, dan itu tetap lulus
    // sekalipun paragrafnya dirender kosong -- terbukti lewat mutasi yang
    // membuatnya selalu dirender. Paragraf kosong bukan hal yang tak kasat
    // mata: ia membawa `mb-6`, jadi yang tersisa adalah jarak menganga di
    // bawah judul.
    expect(container.querySelector('p')).toBeNull();
  });

  it('merender aksi kustom, dan tak menampilkan "Coba Lagi" tanpa onRetry', () => {
    // Galat yang tak dapat diperbaiki dengan mengulang -- mis. survei yang
    // memang tidak ada -- perlu jalan keluar, bukan tombol ulang.
    // Aksinya sengaja elemen biasa, bukan <a href="/">: tautan internal di
    // dalam berkas uji melanggar aturan @next/next/no-html-link-for-pages.
    // Tautan sungguhannya diuji di tempat ia benar-benar dipakai, yaitu
    // app/survei/__tests__/page.test.jsx.
    render(<ErrorState action={<button type="button">Kembali ke Beranda</button>} />);

    expect(screen.getByRole('button', { name: /kembali ke beranda/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /coba lagi/i })).not.toBeInTheDocument();
  });
});
