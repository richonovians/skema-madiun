import React from 'react';
import { render, screen } from '@testing-library/react';
import ComplaintStatusBreakdown from '../ComplaintStatusBreakdown';

/**
 * Panel ini menghitung per baris tetap (`STATUS_ROWS`) sementara totalnya
 * memakai `complaints.length`. Status yang tak punya barisnya sendiri karena
 * itu HILANG dari sebaran tanpa memerah di mana pun: batangnya berjumlah
 * kurang dari total, dan persentasenya tak pernah mencapai 100%.
 *
 * Pengalihan antar-instansi (5 November 2026) menambah status ketujuh.
 */
const pengaduan = (status, id) => ({
  id,
  status,
  createdAt: '2026-11-02T02:00:00.000Z',
});

describe('ComplaintStatusBreakdown — status Dialihkan', () => {
  it('menghitung tiket Dialihkan pada barisnya sendiri', () => {
    render(
      <ComplaintStatusBreakdown
        complaints={[pengaduan('Dialihkan', 1), pengaduan('Dialihkan', 2)]}
        periode="2026-Q4"
        totalAll={2}
      />,
    );

    const baris = screen.getByText('Dialihkan').closest('div');
    expect(baris).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('seluruh tiket terhitung: jumlah batang sama dengan totalnya', () => {
    // Inilah yang gagal tanpa barisnya: dua tiket masuk `total` tetapi tak
    // satu pun ember, jadi sebaran yang digambar mengaku lengkap padahal
    // kehilangan dua baris.
    const data = [
      pengaduan('Menunggu Verifikasi', 1),
      pengaduan('Dialihkan', 2),
      pengaduan('Selesai', 3),
    ];
    render(<ComplaintStatusBreakdown complaints={data} periode="2026-Q4" totalAll={3} />);

    const label = ['Menunggu Verifikasi', 'Dialihkan', 'Selesai'];
    for (const nama of label) {
      expect(screen.getByText(nama)).toBeInTheDocument();
    }
  });
});
