import React from 'react';
import { render, screen } from '@testing-library/react';
import VisionMission from '../VisionMission';
import { aboutContent } from '../../constants/aboutContent';

/**
 * Teks Visi digambar tanpa tanda petik (permintaan pengguna, 7 Oktober 2026).
 *
 * Petiknya tak pernah ada di `aboutContent.vision`; komponen ini yang
 * menambahkannya lewat sepasang `&quot;`. Jadi yang diperiksa keluaran yang
 * dirender, bukan datanya -- memeriksa konstantanya akan lulus tanpa
 * membuktikan apa pun.
 */
describe('VisionMission', () => {
  it('menggambar teks Visi tanpa tanda petik', () => {
    render(<VisionMission />);

    const paragraf = screen.getByText(/Menjadi platform pelayanan publik terdepan/);

    expect(paragraf.textContent.trim()).toBe(aboutContent.vision);
    expect(paragraf.textContent).not.toContain('"');
  });

  it('KONTROL: isi visinya sendiri tetap utuh', () => {
    // Membuang petik tak boleh ikut memangkas kalimatnya.
    render(<VisionMission />);

    expect(screen.getByText(/tata kelola pemerintahan Kabupaten Madiun yang bersih dan melayani\./)).toBeInTheDocument();
  });
});
