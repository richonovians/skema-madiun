import React from 'react';
import { render, screen } from '@testing-library/react';
import OpdDashboardHeader from '../OpdDashboardHeader';

/**
 * Keterangan di kepala halaman MENGHITUNG kartu yang ada di bawahnya. Sejak
 * kartu "Akun Aktif" bergabung (15 September 2026) jumlahnya lima, dan kalimat
 * yang masih berbunyi "empat" bukan sekadar usang: pembacanya akan mencari
 * kartu mana yang tidak termasuk, lalu menyimpulkan sendiri -- keliru -- bahwa
 * salah satunya mengikuti penyaring triwulan.
 */
describe('OpdDashboardHeader — jumlah kartu yang disebut', () => {
  it('menyebut lima kartu, bukan empat', () => {
    render(<OpdDashboardHeader periode="2026-Q3" />);

    expect(screen.getByText(/lima kartu di bawah/i)).toBeInTheDocument();
  });

  it('KONTROL: kalimat lamanya tak tertinggal', () => {
    render(<OpdDashboardHeader periode="2026-Q3" />);

    expect(screen.queryByText(/empat kartu/i)).toBeNull();
  });
});
