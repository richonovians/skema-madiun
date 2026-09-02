import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManajemenOPDPage from '../page';
import { getOpdList } from '@/features/opd/services/opd.api';

// Mock API
jest.mock('@/features/opd/services/opd.api', () => ({
  getOpdList: jest.fn(),
  syncOpd: jest.fn(),
}));

const generateMockData = (count) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i + 1,
    code: `OPD-${i + 1}`,
    name: i === 0 ? 'Dinas Kesehatan' : `Instansi Ke-${i + 1}`,
    serviceType: i === 0 ? 'Kesehatan' : 'Layanan Umum',
    activeSurveys: 2,
    openComplaints: 0,
    status: 'ACTIVE',
    syncedAt: '2026-08-01T00:00:00Z',
  }));
};

describe('ManajemenOPDPage (TC-FE-013 & TC-FE-014)', () => {
  beforeEach(() => {
    // Memberikan 15 data dummy agar paginasi muncul (karena ITEMS_PER_PAGE = 10)
    getOpdList.mockResolvedValue({
      data: generateMockData(15),
      meta: { total: 15 },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('TC-FE-013: Fungsi paginasi merender data baru', async () => {
    render(<ManajemenOPDPage />);

    // Tunggu sampai loading selesai dan data muncul
    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
    });

    // Karena per halaman 10 item, item ke-11 seharusnya BELUM ada
    expect(screen.queryByText('Instansi Ke-11')).not.toBeInTheDocument();

    // Pastikan teks indikator paginasi benar (Menampilkan 1-10 dari 15 OPD)
    expect(screen.getByText(/Menampilkan 1-10 dari 15 OPD/i)).toBeInTheDocument();

    // Cari tombol Next dan klik
    const paginationText = screen.getByText(/Menampilkan 1-10 dari 15 OPD/i);
    const paginationContainer = paginationText.parentElement;
    const nextButton = paginationContainer.querySelectorAll('button')[1];

    fireEvent.click(nextButton);

    // Ekspektasi: Setelah di klik, item ke-11 muncul
    expect(await screen.findByText('Instansi Ke-11')).toBeInTheDocument();
    
    // Indikator teks berubah
    expect(screen.getByText(/Menampilkan 11-15 dari 15 OPD/i)).toBeInTheDocument();
    
    // Item 1 tidak ada lagi
    expect(screen.queryByText('Dinas Kesehatan')).not.toBeInTheDocument();
  });

  it('TC-FE-014: Filter bar memicu rerender pada tabel', async () => {
    render(<ManajemenOPDPage />);

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
      expect(screen.getByText('Instansi Ke-2')).toBeInTheDocument();
    });

    // Cari input pencarian
    const searchInput = screen.getByPlaceholderText(/Cari berdasarkan nama OPD atau kode/i);
    
    // Ketik "kesehatan"
    fireEvent.change(searchInput, { target: { value: 'kesehatan' } });

    // Ekspektasi: Hanya 'Dinas Kesehatan' yang tersisa
    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
      expect(screen.queryByText('Instansi Ke-2')).not.toBeInTheDocument();
    });
    
    // Indikator paginasi seharusnya berubah (karena hasil filter cuma 1)
    expect(screen.getByText(/Menampilkan 1-1 dari 1 OPD/i)).toBeInTheDocument();
  });
});
