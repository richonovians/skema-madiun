import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import ComplaintSuccessCard from '../ComplaintSuccessCard';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

const push = jest.fn();

/**
 * Halaman ini menerima id instansi lewat query `?opdId=`. Angka itu berasal dari
 * tabel `opd`, sedangkan `/surveys/:id` membaca `:id` sebagai id SURVEI -- dua
 * ruang nomor yang berbeda. Menaruh yang satu di lubang yang lain tak pernah
 * memunculkan galat: nomornya sah di kedua tabel, hanya menunjuk baris yang
 * salah. Itu sebabnya bug ini perlu dijaga uji, bukan sekadar dibaca.
 */
function renderKartu(query) {
  useRouter.mockReturnValue({ push });
  useSearchParams.mockReturnValue(new URLSearchParams(query));
  return render(<ComplaintSuccessCard />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ComplaintSuccessCard -- tombol "Lanjut Isi Survei"', () => {
  /**
   * Laporan pengguna 14 September 2026: tombolnya "kadang tidak membuka daftar
   * survei tetapi malah membuka salah satu survei".
   *
   * Di basis data setempat, instansi 22 (Bappeda) bertabrakan dengan survei 22
   * milik Satpol PP. Warga yang mengadu ke Bappeda karena itu mendarat di
   * kuesioner instansi yang sama sekali tak ia adukan -- dan jawabannya masuk
   * ke IKM instansi tersebut.
   */
  it('membuka daftar survei yang tersaring instansi, bukan satu survei', () => {
    renderKartu('complaintId=PGD1&opdId=22&opdName=Bappeda');

    fireEvent.click(screen.getByRole('button', { name: /lanjut isi survei/i }));

    expect(push).toHaveBeenCalledWith('/surveys?opdId=22');
    expect(push).not.toHaveBeenCalledWith('/surveys/22');
  });

  it('id instansi lain ikut terbawa, bukan dipatok satu nilai', () => {
    renderKartu('complaintId=PGD2&opdId=24&opdName=Dinas%20Lingkungan%20Hidup');

    fireEvent.click(screen.getByRole('button', { name: /lanjut isi survei/i }));

    expect(push).toHaveBeenCalledWith('/surveys?opdId=24');
  });

  /**
   * Pengaduan "Lainnya (belum tahu tujuannya)" dikirim tanpa `opdId`. Tak ada
   * instansi untuk disaring, jadi daftarnya dibuka utuh -- satu-satunya kondisi
   * yang selama ini sudah benar, dan yang paling mudah ikut rusak saat
   * perbaikannya ditulis.
   */
  it('tanpa instansi tujuan membuka daftar survei utuh', () => {
    renderKartu('complaintId=PGD3');

    fireEvent.click(screen.getByRole('button', { name: /lanjut isi survei/i }));

    expect(push).toHaveBeenCalledWith('/surveys');
  });
});
