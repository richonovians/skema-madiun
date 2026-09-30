import React from 'react';
import { render } from '@testing-library/react';
import HeroSection from '../HeroSection';
import { isAuthenticated } from '@/features/authentication/services/authStorage';

jest.mock('@/features/statistics/services/statistics.api', () => ({
  getStatistics: jest.fn(() => new Promise(() => {})),
}));

jest.mock('@/features/authentication/services/authStorage', () => ({
  isAuthenticated: jest.fn(() => false),
  SESSION_CHANGED_EVENT: 'sesi-berubah',
  clearSession: jest.fn(),
}));

/**
 * HERO TAK MEMUSAT TEGAK DI PONSEL (30 September 2026).
 *
 * TERUKUR di Chrome terpasang pada 393x852, dengan /statistics ditunda 2,5 detik
 * lalu digagalkan:
 *
 *   tinggi <section>  896px -> 724px  (mentok di lantai `min-h-[85vh]`)
 *   posisi <h1>       y=170 -> y=264  (JUDUL UTAMA MELOMPAT TURUN 94px)
 *
 * Sebabnya BUKAN runtuhnya kerangka statistik itu sendiri. Hero memakai
 * `flex items-center`; begitu isinya memendek sampai di bawah `min-h-[85vh]`,
 * seluruh tumpukan memusat ulang secara tegak dan kolom pertama ikut terdorong.
 * Yang bergeser karenanya bukan kartu dekoratif di bawah, melainkan judul utama
 * halaman -- elemen yang paling mahal untuk digeser.
 *
 * Perbaikannya memaku isi ke atas DI BAWAH `lg` saja. Di `lg` ke atas kartunya
 * `absolute` dan tak pernah ikut menentukan tinggi, jadi pemusatan di sana aman
 * dan sengaja dipertahankan.
 *
 * MENGAPA BUKAN MENYEMBUNYIKAN KERANGKANYA DI PONSEL, yang sempat terpikir:
 * terukur juga bahwa kerangka 360px itu pas untuk tumpukan asli yang 396px, dan
 * pada jalur berhasil judulnya hanya bergerak -10px. Membuang kerangka berarti
 * menukar geseran 36px pada jalur yang PALING SERING terjadi dengan penyisipan
 * 396px. Kerangkanya sudah benar; yang salah pemusatan tegaknya.
 *
 * jsdom tak menerapkan CSS dan tak punya tata letak, jadi yang dijaga di sini
 * kontrak kelasnya. Bahwa 94px itu benar-benar menjadi 0 dibuktikan dengan
 * pengukuran peramban, dilaporkan terpisah.
 */
const hero = () => {
  isAuthenticated.mockReturnValue(false);
  return render(<HeroSection />).container.querySelector('section');
};

describe('HeroSection — pemusatan tegak hanya mulai lg', () => {
  beforeEach(() => jest.clearAllMocks());

  it('TIDAK memusat tegak tanpa syarat lebar layar', () => {
    // Pola `(^|\s)` perlu: tanpanya ia ikut cocok dengan `lg:items-center`,
    // dan ujinya memerah selamanya betapapun benar kodenya.
    expect(hero().className).not.toMatch(/(^|\s)items-center\b/);
  });

  it('isinya dipaku ke atas di bawah lg', () => {
    expect(hero().className).toMatch(/(^|\s)items-start\b/);
  });

  it('tetap memusat tegak mulai lg', () => {
    // Di sana kartunya `absolute`, jadi tinggi kolom kedua tak bisa menggerakkan
    // judul. Membuang pemusatan di desktop bukan bagian dari perbaikan ini.
    expect(hero().className).toMatch(/\blg:items-center\b/);
  });

  /**
   * KONTROL. Tanpa ini, membuang `flex` atau `min-h-[85vh]` sama sekali akan
   * membuat ketiga uji di atas hijau -- padahal hero tanpa lantai tinggi adalah
   * perubahan tampilan yang jauh lebih besar daripada yang disetujui.
   */
  it('KONTROL: tetap flex dan tetap punya lantai tinggi', () => {
    const k = hero().className;

    expect(k).toMatch(/(^|\s)flex\b/);
    expect(k).toMatch(/\bmin-h-\[85vh\]/);
    expect(k).toMatch(/\blg:min-h-\[90vh\]/);
  });
});
