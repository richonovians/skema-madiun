import React from 'react';
import { render, screen } from '@testing-library/react';
import KartuStatistikHero from '../KartuStatistikHero';
import { getStatistics } from '@/features/statistics/services/statistics.api';

jest.mock('@/features/statistics/services/statistics.api', () => ({
  getStatistics: jest.fn(),
}));

/**
 * KARTU STATISTIK DI PONSEL (15 September 2026, laporan pengguna: "floating
 * card tidak terlihat di hp saya").
 *
 * Terukur di Chrome sebelum perbaikan, pada 393px dan 412px:
 *
 *   berhasil -> pembungkus kartu `display: none`, 0x0. Yang tersisa hanya
 *               strip abu berisi nilai IKM.
 *   memuat   -> kerangkanya JUSTRU digambar, absolut terhadap rangka ilustrasi
 *               yang sendirinya `hidden`: kiri=-32, kiri=177 kanan=377,
 *               kiri=56.
 *   gagal    -> dua kartu pernyataan saling menindih, kiri=-12 dan kanan=397
 *               pada layar 393px.
 *
 * Geseran halamannya 0px di ketiga keadaan -- `overflow-hidden` pada <section>
 * hero menjepitnya -- jadi sapuan responsif yang membaca `window.scrollX` tak
 * pernah melihatnya.
 *
 * jsdom tak mengevaluasi media query, jadi berkas ini tak bisa membuktikan
 * sesuatu muat di layar. Yang dijaganya adalah ATURANNYA: tata letak melayang
 * milik `lg` ke atas, dan apa pun yang berlaku tanpa syarat harus bisa hidup di
 * alur biasa. Buktinya datang dari pengukuran peramban, dilaporkan terpisah.
 */
const DATA = {
  summary: {
    ikm: 91.2,
    totalRespondents: 438,
    totalComplaints: 77,
    activeOpd: 62,
    avgSlaDays: 3.4,
  },
  ikmTrend: [
    { month: 'Triwulan I - 2026', value: 88 },
    { month: 'Triwulan III - 2026', value: 91.2 },
  ],
  complaintStatus: {
    total: 1000,
    status: [{ id: 'selesai', label: 'Selesai', count: 333, percentage: 33 }],
  },
};

const tumpukan = (container) => container.querySelector('[data-tumpukan-statistik]');

describe('KartuStatistikHero — kartu sampai ke layar ponsel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tumpukan kartunya tidak disembunyikan di bawah lg', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const wadah = tumpukan(container);
    expect(wadah).not.toBeNull();
    expect(wadah.className).not.toMatch(/(^|\s)hidden\b/);
    expect(wadah.closest('.hidden')).toBeNull();
  });

  /**
   * Inilah yang membuat kartunya mustahil di ponsel: posisi absolut terhadap
   * rangka ilustrasi yang di bawah `lg` tak digambar sama sekali. Yang boleh
   * tersisa hanyalah `lg:absolute`.
   */
  it('posisi absolutnya berlaku mulai lg, bukan tanpa syarat', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const wadah = tumpukan(container);
    expect(wadah.querySelectorAll('.absolute')).toHaveLength(0);
    expect(wadah.querySelectorAll('[class*="lg:absolute"]')).toHaveLength(3);
  });

  /**
   * Kartu yang mengayun 13px tanpa henti di layar 393px membuat angkanya jadi
   * sasaran bergerak. Ayunannya milik desktop.
   */
  it('ayunannya juga berlaku mulai lg', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const wadah = tumpukan(container);
    expect(wadah.querySelectorAll('[class~="animate-melayang"]')).toHaveLength(0);
    expect(wadah.querySelectorAll('[class~="animate-melayang-lambat"]')).toHaveLength(0);
    expect(wadah.querySelectorAll('[class*="lg:animate-melayang"]').length).toBeGreaterThan(0);
  });

  /**
   * Lebar tetap 268px pada layar selebar 393px menyisakan 93px untuk seluruh
   * tepi halaman. Di ponsel kartunya mengikuti lebar yang tersedia; angka
   * tetapnya baru berlaku ketika ada rangka ilustrasi untuk ditumpangi.
   */
  it('lebar tetapnya baru berlaku mulai lg', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const wadah = tumpukan(container);
    expect(wadah.innerHTML).not.toMatch(/class="[^"]*(^|\s)w-\[\d+px\]/);
    expect(wadah.querySelectorAll('[class*="lg:w-[268px]"]').length).toBeGreaterThan(0);
  });

  /**
   * KONTROL. Tumpukan yang "aman di ponsel" karena tata letak melayangnya
   * dibuang sama sekali juga meluluskan ketiga uji di atas, sambil menghapus
   * susunan yang memang diminta pengguna untuk desktop.
   */
  it('KONTROL: susunan melayang desktop tetap utuh', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const wadah = tumpukan(container);
    for (const kelas of ['lg:top-14', 'lg:-left-12', 'lg:-top-9', 'lg:right-0', 'lg:-bottom-10']) {
      expect(wadah.querySelectorAll(`[class*="${kelas}"]`).length).toBeGreaterThan(0);
    }
  });

  it('KONTROL: angkanya tetap yang diambil dari /statistics', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    expect(tumpukan(container)).toHaveTextContent('91,2');
    expect(tumpukan(container)).toHaveTextContent('438');
  });
});

/**
 * Kedua keadaan di bawah ini TAK PERNAH punya palang `lg` sama sekali, jadi
 * merekalah yang benar-benar digambar di ponsel -- menindih satu sama lain dan
 * terpotong kedua tepi layar. Uji jalur berhasil di atas tak menyentuhnya.
 */
describe('KartuStatistikHero — keadaan memuat dan gagal di ponsel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('kerangka pemuatan tidak lagi keluar dari alur', () => {
    getStatistics.mockReturnValue(new Promise(() => {}));

    const { container } = render(<KartuStatistikHero />);

    const kerangka = screen.getByTestId('kerangka-statistik');
    expect(kerangka.querySelectorAll('.absolute')).toHaveLength(0);
    expect(kerangka.querySelectorAll('[class*="lg:absolute"]')).toHaveLength(3);
    expect(container.innerHTML).not.toMatch(/class="[^"]*(^|\s)w-\[\d+px\]/);
  });

  it('kartu pernyataan saat gagal tidak lagi keluar dari alur', async () => {
    getStatistics.mockRejectedValue(new Error('jaringan putus'));

    const { container } = render(<KartuStatistikHero />);
    await screen.findByText(/terhubung sso madiun/i);

    const wadah = container.querySelector('[data-kartu-pernyataan]');
    expect(wadah).not.toBeNull();
    expect(wadah.querySelectorAll('.absolute')).toHaveLength(0);
    expect(wadah.querySelectorAll('[class*="lg:absolute"]')).toHaveLength(2);
  });

  /**
   * KONTROL. Kedua kalimat inilah satu-satunya penjelasan yang tersisa ketika
   * /statistics tak terjawab; kartu yang "diperbaiki" dengan cara dihilangkan
   * di ponsel meninggalkan kolom kosong tanpa sebab.
   */
  it('KONTROL: kedua pernyataannya tetap terbaca', async () => {
    getStatistics.mockRejectedValue(new Error('jaringan putus'));

    const { container } = render(<KartuStatistikHero />);
    await screen.findByText(/terhubung sso madiun/i);

    const wadah = container.querySelector('[data-kartu-pernyataan]');
    expect(wadah).toHaveTextContent(/terhubung sso madiun/i);
    expect(wadah).toHaveTextContent(/dengan persetujuan anda/i);
  });
});
