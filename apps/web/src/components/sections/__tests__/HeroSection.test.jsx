import React from 'react';
import { render, screen } from '@testing-library/react';
import HeroSection from '../HeroSection';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isAuthenticated } from '@/features/authentication/services/authStorage';

// Tumpukan kartunya kini milik KartuStatistikHero, yang memanggil jaringan
// sendiri dan diuji terpisah. Di sini ia cukup dijamin TERPASANG.
jest.mock('@/features/statistics/services/statistics.api', () => ({
  getStatistics: jest.fn(() =>
    Promise.resolve({
      summary: { ikm: 91.2, totalRespondents: 438, totalComplaints: 77, activeOpd: 62 },
      ikmTrend: [{ month: '2026 Q3', value: 91.2 }],
    }),
  ),
}));

jest.mock('@/features/authentication/services/authStorage', () => ({
  isAuthenticated: jest.fn(),
  SESSION_CHANGED_EVENT: 'sesi-berubah',
  clearSession: jest.fn(),
}));

describe('HeroSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('menawarkan tombol masuk SSO kepada pengunjung yang belum masuk', () => {
    isAuthenticated.mockReturnValue(false);

    render(<HeroSection />);

    expect(screen.getByRole('button', { name: /masuk via sso/i })).toBeInTheDocument();
  });

  /**
   * PASANGAN kontrol. Tombol masuk yang tetap terpampang bagi orang yang sudah
   * masuk bukan sekadar mubazir: menekannya membuang sesi yang sedang berjalan
   * (handleSsoLogin memanggil clearSession sebelum berpindah).
   */
  it('KONTROL: yang sudah masuk tidak melihat tombol itu', () => {
    isAuthenticated.mockReturnValue(true);

    render(<HeroSection />);

    expect(screen.queryByRole('button', { name: /masuk via sso/i })).not.toBeInTheDocument();
  });

  it('memasang tumpukan kartu statistik di atas ilustrasi', async () => {
    isAuthenticated.mockReturnValue(false);

    render(<HeroSection />);

    expect(await screen.findByTestId('nilai-ikm')).toBeInTheDocument();
  });

  /**
   * Rangka jendelanya hiasan belaka dan harus disembunyikan dari pembaca layar
   * -- membacakan selusin kotak kosong tak memberi apa pun. Kartu statusnya
   * lain: isinya pernyataan sungguhan tentang layanan ini, jadi ia justru harus
   * terbaca. Menyembunyikan seluruh kolom kanan sekaligus, seperti versi
   * sebelumnya, ikut membungkam pernyataan itu.
   */
  it('rangka jendela disembunyikan dari pembaca layar, kartu angkanya tidak', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    const nilai = await screen.findByTestId('nilai-ikm');

    expect(container.querySelector('[data-rangka-ilustrasi]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(nilai.closest('[aria-hidden="true"]')).toBeNull();
  });

  /**
   * Animasi yang namanya tak terdaftar di globals.css TIDAK melakukan apa pun,
   * dan itu bukan kekhawatiran karangan: `animate-fade-in-up` sempat dipakai di
   * sepuluh tempat selama berminggu-minggu tanpa satu pun keyframes, sehingga
   * seluruh animasi masuk halaman ini memang tak pernah berjalan.
   */
  it('kartu status memakai kelas animasi yang benar-benar terdaftar', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');
    const dipakai = new Set();
    container.querySelectorAll('[class*="animate-"]').forEach((el) => {
      el.classList.forEach((k) => k.startsWith('animate-') && dipakai.add(k));
    });

    const css = readFileSync(join(__dirname, '..', '..', '..', 'app', 'globals.css'), 'utf8');
    // Bawaan Tailwind memang tak pernah muncul di globals.css; yang dicari uji
    // ini adalah nama BUATAN SENDIRI yang lupa didaftarkan.
    const BAWAAN_TAILWIND = ['animate-pulse', 'animate-spin', 'animate-bounce', 'animate-ping'];
    const takTerdaftar = [...dipakai].filter(
      (k) => !BAWAAN_TAILWIND.includes(k) && !css.includes(`--${k}:`) && !css.includes(`.${k}`),
    );
    expect(takTerdaftar).toEqual([]);
  });

  /**
   * Permintaan pengguna: "pastikan jangan cdn". Ilustrasi dan kartunya harus
   * tergambar dari elemen biasa, bukan berkas yang diambil dari luar -- alamat
   * luar berarti halaman utama bergantung pada layanan yang tak dikendalikan
   * Diskominfo, dan ikut bocor ke pihak ketiga setiap kali halaman dibuka.
   */
  it('tidak memuat satu pun gambar atau alamat luar', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    expect(container.querySelectorAll('img')).toHaveLength(0);
    const alamatLuar = Array.from(container.querySelectorAll('[src], [href]')).filter((el) =>
      /^(https?:)?\/\//.test(el.getAttribute('src') || el.getAttribute('href') || ''),
    );
    expect(alamatLuar).toHaveLength(0);
  });

  /**
   * Sebelumnya `hidden lg:block` menempel di SELURUH kolom kanan, jadi rangka
   * hiasannya dan angka-angkanya lenyap bersama-sama di bawah `lg`. Rangkanya
   * memang pantas hilang di ponsel -- ia cuma hiasan yang memanjangkan halaman.
   * Angkanya tidak: justru itu yang seharusnya dibaca warga sebelum memutuskan
   * mengisi survei, dan mayoritas dari mereka datang dari ponsel.
   */
  it('kartu statistiknya tidak ikut disembunyikan bersama rangka ilustrasi', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    expect(container.querySelector('[data-rangka-ilustrasi]').className).toMatch(/hidden/);
    expect(container.querySelector('[data-tumpukan-statistik]').closest('.hidden')).toBeNull();
  });
});

/**
 * EFEK 3D MILIK LAYAR LEBAR SAJA (16 September 2026, saat menggabungkan
 * redesain hero 3D dari `main` dengan tumpukan kartu ponsel).
 *
 * `IlustrasiJendela` memasang `perspective(1200px) rotateX(4deg) rotateY(-12deg)
 * rotateZ(2deg)` lewat `style` sebaris, jadi berlaku di SETIAP lebar. Sejak
 * kartu statistik ikut hidup di ponsel sebagai tumpukan dalam alur biasa,
 * ketiganya ikut termiringkan.
 *
 * Terukur di Chrome pada 393px sesudah penggabungan: lebar kotak pembatas
 * tumpukan berubah-ubah 358-367px alih-alih tetap 361px -- tanda kotaknya
 * memang terputar, sebab `getBoundingClientRect` mengembalikan kotak sejajar
 * sumbu dari elemen yang miring. Tangkapan layarnya memastikan: garis dasar
 * teksnya melandai.
 *
 * Rangka ilustrasi yang dinaungi efek ini sendiri `hidden lg:block`, jadi
 * mengurungnya ke `lg` mempertahankan maksud aslinya dan sekaligus menegakkan
 * kembali kartu di ponsel.
 */
describe('HeroSection — efek 3D tidak memiringkan kartu ponsel', () => {
  it('transformasi 3D-nya tidak berlaku tanpa syarat', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    const pembungkus = container.querySelector('[data-ilustrasi-3d]');

    expect(pembungkus).not.toBeNull();
    expect(pembungkus.style.transform).toBe('');
  });

  it('dipasang lewat kelas yang hanya hidup mulai lg', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    const kelas = container.querySelector('[data-ilustrasi-3d]').className;

    expect(kelas).toMatch(/lg:\[transform:perspective/);
    expect(kelas).toMatch(/lg:\[transform-style:preserve-3d\]/);
  });

  /**
   * PASANGAN kontrol. Efek yang dibuang seluruhnya juga meluluskan kedua uji di
   * atas, sambil menghapus redesain yang baru saja masuk ke `main`.
   */
  it('KONTROL: sudut putaran aslinya dipertahankan apa adanya', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    const kelas = container.querySelector('[data-ilustrasi-3d]').className;

    for (const bagian of ['rotateX(4deg)', 'rotateY(-12deg)', 'rotateZ(2deg)']) {
      expect(kelas).toContain(bagian);
    }
  });
});
