import React from 'react';
import { render, screen } from '@testing-library/react';
import KabFilterScopeNote from '../KabFilterScopeNote';

/**
 * Catatan cakupan penyaring menyebutkan SATU PER SATU angka mana yang bergeming
 * saat penyaring navbar diubah. Kartu "Akun Aktif" (15 September 2026) termasuk
 * di dalamnya -- asalnya `GET /statistics`, yang tak menerima parameter periode
 * maupun jenis layanan.
 *
 * Tanpa disebut, ia menjadi satu-satunya angka di baris teratas yang diam tanpa
 * penjelasan ketika periode diganti, dan pembacanya akan menyangka datanya
 * kedaluwarsa atau penyaringnya rusak.
 */
describe('KabFilterScopeNote — cakupan kartu akun aktif', () => {
  it('menyebut Akun Aktif sebagai angka yang tidak ikut tersaring', () => {
    render(<KabFilterScopeNote periode="2026-Q3" jenisLayanan="semua" />);

    expect(screen.getByText(/Akun Aktif/)).toBeInTheDocument();
  });

  /**
   * PASANGAN kontrol. Kalimat yang menyebut Akun Aktif di daftar yang SALAH --
   * ikut tersaring -- juga lolos uji di atas.
   */
  it('KONTROL: tidak masuk daftar yang mengikuti penyaring', () => {
    render(<KabFilterScopeNote periode="2026-Q3" jenisLayanan="semua" />);

    const mengikuti = screen.getByText(/Mengikuti penyaring:/).textContent;

    expect(mengikuti.split('Hitungan pengaduan')[0]).not.toMatch(/Akun Aktif/);
  });
});
