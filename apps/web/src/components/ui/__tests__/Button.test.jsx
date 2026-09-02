import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

describe('Button Component', () => {
  // Test 1: Memastikan tombol terender dengan benar dan berisi teks yang sesuai
  it('merender tombol dengan teks yang diberikan', () => {
    render(<Button>Klik Saya</Button>);
    
    // Mencari elemen tombol berdasarkan teksnya
    const buttonElement = screen.getByRole('button', { name: /klik saya/i });
    
    // Ekspektasi: Tombol harus ada di dalam dokumen (layar)
    expect(buttonElement).toBeInTheDocument();
    
    // Ekspektasi: Tombol memiliki class default (primary)
    expect(buttonElement).toHaveClass('bg-primary');
  });

  // Test 2: Memastikan fitur variant (warna) berjalan dengan benar
  it('merender tombol dengan variant secondary', () => {
    render(<Button variant="secondary">Batal</Button>);
    
    const buttonElement = screen.getByRole('button', { name: /batal/i });
    
    // Ekspektasi: Tombol secondary harus memiliki background putih (bg-white)
    expect(buttonElement).toHaveClass('bg-white');
  });

  // Test 3: Memastikan aksi interaktif (klik) berfungsi
  it('menjalankan fungsi onClick saat tombol diklik', () => {
    // Membuat fungsi tiruan (mock function) menggunakan jest
    const handleClick = jest.fn(); 
    
    render(<Button onClick={handleClick}>Kirim</Button>);
    const buttonElement = screen.getByRole('button', { name: /kirim/i });
    
    // Mensimulasikan klik dari user
    fireEvent.click(buttonElement);
    
    // Ekspektasi: Fungsi handleClick harus dipanggil tepat 1 kali
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Test 4: Memastikan fallback ke variant primary jika variant tidak valid diberikan
  it('merender tombol dengan class primary saat diberikan variant yang tidak valid', () => {
    render(<Button variant="ngawur">Tidak Valid</Button>);
    
    const buttonElement = screen.getByRole('button', { name: /tidak valid/i });
    
    // Ekspektasi: Meskipun variant "ngawur", ia akan kembali ke class primary (fallback/default)
    expect(buttonElement).toHaveClass('bg-primary');
  });
});
