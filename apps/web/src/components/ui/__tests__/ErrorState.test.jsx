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
});
