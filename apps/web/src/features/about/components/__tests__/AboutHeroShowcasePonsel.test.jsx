import React from 'react';
import { render, screen } from '@testing-library/react';
import AboutHeroShowcase from '../AboutHeroShowcase';
import { getStatistics } from '@/features/statistics/services/statistics.api';

jest.mock('@/features/statistics/services/statistics.api', () => ({
  getStatistics: jest.fn(),
}));

/**
 * SHOWCASE HALAMAN TENTANG DI PONSEL (16 September 2026, laporan pengguna).
 *
 * Terukur di Chrome sebelum perbaikan:
 *
 *   @360px  Indeks IKM -> display: none, 0x0
 *           Responden  -> display: none, 0x0
 *           wadah 328x328 `aspect-square overflow-hidden`, isinya satu kartu
 *   @640px  keduanya muncul, 160x65 dan 176x65
 *
 * Cacat yang sama persis dengan hero beranda, di komponen lain: yang tak bisa
 * hidup di layar 360px adalah TATA LETAKNYA -- posisi absolut di sudut kotak dan
 * kotak berasio tetap -- bukan datanya.
 *
 * Rasio `aspect-square` ikut dipindah ke `sm`, dan itu bukan kerapian belaka:
 * tiga kartu bertumpuk butuh sekitar 420px sementara kotaknya di 360px hanya
 * 328px tinggi dan ber-`overflow-hidden`. Tanpa itu pemotongannya cuma berpindah.
 *
 * jsdom tak mengevaluasi media query, jadi berkas ini menjaga kontrak kelasnya
 * saja. Buktinya datang dari pengukuran peramban, dilaporkan terpisah.
 */
const DATA = {
  summary: { ikm: 82.64, totalRespondents: 6, totalComplaints: 7, completionRate: 57.14 },
};

const showcase = (container) => container.querySelector('[data-showcase]');

describe('AboutHeroShowcase — kartu sampai ke layar ponsel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('kedua kartu kecil tidak lagi disembunyikan di bawah sm', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<AboutHeroShowcase />);
    await screen.findByText('82.64');

    for (const penanda of ['[data-kartu-ikm]', '[data-kartu-responden]']) {
      const kartu = container.querySelector(penanda);
      expect(kartu).not.toBeNull();
      expect(kartu.className).not.toMatch(/(^|\s)hidden\b/);
    }
  });

  it('posisi absolut kedua kartu berlaku mulai sm', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<AboutHeroShowcase />);
    await screen.findByText('82.64');

    for (const penanda of ['[data-kartu-ikm]', '[data-kartu-responden]']) {
      const kartu = container.querySelector(penanda);
      expect(kartu.className).not.toMatch(/(^|\s)absolute\b/);
      expect(kartu.className).toMatch(/\bsm:absolute\b/);
    }
  });

  /**
   * Lebar tetap 160px dan 176px menyisakan ruang kosong yang banyak pada kartu
   * yang kini berdiri sendiri-sendiri dalam kolom; di layar sempit ketiganya
   * mengikuti lebar yang tersedia.
   */
  it('ketiga kartunya selebar ruang yang ada di layar sempit', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<AboutHeroShowcase />);
    await screen.findByText('82.64');

    for (const penanda of ['[data-kartu-utama]', '[data-kartu-ikm]', '[data-kartu-responden]']) {
      expect(container.querySelector(penanda).className).toMatch(/\bw-full\b/);
    }
  });

  /**
   * Kotak berasio tetap ber-`overflow-hidden` memotong apa pun yang lebih
   * tinggi darinya. Di bawah `sm` wadahnya harus mengikuti isinya.
   */
  it('kotak berasio tetap baru berlaku mulai sm', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<AboutHeroShowcase />);
    await screen.findByText('82.64');

    const wadah = showcase(container);
    expect(wadah).not.toBeNull();
    expect(wadah.className).not.toMatch(/(^|\s)aspect-square\b/);
    expect(wadah.className).toMatch(/\bsm:aspect-square\b/);
  });

  /**
   * KONTROL. Kartu yang "muat" karena angkanya dihapus juga meluluskan keempat
   * uji di atas. Angka inilah alasan kartunya ada.
   */
  it('KONTROL: ketiga angkanya tetap terbaca', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<AboutHeroShowcase />);
    await screen.findByText('82.64');

    expect(container.querySelector('[data-kartu-utama]')).toHaveTextContent('7');
    expect(container.querySelector('[data-kartu-ikm]')).toHaveTextContent('82.64');
    expect(container.querySelector('[data-kartu-responden]')).toHaveTextContent('6');
  });
});
