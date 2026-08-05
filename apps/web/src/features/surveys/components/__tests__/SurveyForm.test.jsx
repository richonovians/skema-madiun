import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SurveyForm from '../SurveyForm';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('SurveyForm Component (TC-FE-004: Validasi Field Wajib)', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    useRouter.mockReturnValue({
      push: mockPush,
    });
    mockPush.mockClear();
  });

  it('menampilkan error "wajib isi" jika submit ditekan tanpa memilih OPD', async () => {
    render(<SurveyForm />);
    
    // Cari tombol "Mulai Survei"
    const submitBtn = screen.getByRole('button', { name: /mulai survei/i });
    fireEvent.click(submitBtn);
    
    // Ekspektasi pesan error muncul
    expect(await screen.findByText(/silakan pilih instansi \/ opd/i)).toBeInTheDocument();
    
    // router.push tidak boleh dipanggil
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('menampilkan error jika OPD dipilih tapi Layanan belum dipilih', async () => {
    render(<SurveyForm />);
    
    // 1. Klik tombol Dropdown OPD untuk membuka menu
    const opdTrigger = screen.getByText('Pilih Instansi');
    fireEvent.click(opdTrigger);
    
    // 2. Klik opsi "Dinas Kependudukan"
    const opdOption = screen.getByText(/dinas kependudukan dan pencatatan sipil/i);
    fireEvent.click(opdOption);
    
    // Submit
    const submitBtn = screen.getByRole('button', { name: /mulai survei/i });
    fireEvent.click(submitBtn);
    
    // Ekspektasi pesan error muncul
    expect(await screen.findByText(/silakan pilih layanan/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('berhasil melakukan redirect jika OPD dan Layanan sudah dipilih dengan benar', () => {
    render(<SurveyForm />);
    
    // 1. Pilih OPD
    const opdTrigger = screen.getByText('Pilih Instansi');
    fireEvent.click(opdTrigger);
    
    const opdOption = screen.getByText(/dinas kesehatan/i);
    fireEvent.click(opdOption);
    
    // 2. Pilih Layanan
    // (Setelah OPD dipilih, tulisan default berubah menjadi 'Pilih Layanan')
    const layananTrigger = screen.getByText('Pilih Layanan');
    fireEvent.click(layananTrigger);
    
    const layananOption = screen.getByText(/layanan bpjs/i);
    fireEvent.click(layananOption);
    
    // Submit
    const submitBtn = screen.getByRole('button', { name: /mulai survei/i });
    fireEvent.click(submitBtn);
    
    // Ekspektasi router.push dipanggil dengan URL yang benar
    expect(mockPush).toHaveBeenCalledWith('/surveys/dinkes?layanan=bpjs&anonymous=false');
  });
});
