import React from 'react';
import { render, screen } from '@testing-library/react';
import AvailableSurveysWidget from '../AvailableSurveysWidget';

/**
 * JUDUL WIDGET SURVEI DI DASHBOARD WARGA (2 November 2026).
 *
 * Widget ini memuat survei SKM DAN survei custom, dan yang kedua tidak selalu
 * mengukur kepuasan (tujuannya bisa `evaluasi` atau `penilaian`). Judul
 * "Survei Kepuasan Tersedia" karena itu terlalu sempit; diganti "Survei
 * Tersedia" atas permintaan pemilik produk.
 */
describe('AvailableSurveysWidget — judul', () => {
  it('berjudul "Survei Tersedia"', async () => {
    render(<AvailableSurveysWidget />);

    expect(screen.getByRole('heading', { name: 'Survei Tersedia' })).toBeInTheDocument();
    // tunggu fetch selesai supaya tak ada pembaruan state sesudah uji berakhir
    await screen.findByText('Lihat Semua Survei');
  });

  it('KONTROL: judul lama "Survei Kepuasan Tersedia" tidak tertinggal', () => {
    render(<AvailableSurveysWidget />);

    expect(screen.queryByText('Survei Kepuasan Tersedia')).toBeNull();
  });
});
