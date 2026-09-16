import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../Navbar';
import { isAuthenticated } from '@/features/authentication/services/authStorage';

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('@/features/authentication/services/authStorage', () => ({
  isAuthenticated: jest.fn(),
  SESSION_CHANGED_EVENT: 'sesi-berubah',
}));
// Keduanya memanggil API saat dipasang; yang diuji di sini bukan isinya.
jest.mock('@/features/profile/components/ProfileAvatarDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));
jest.mock('@/components/ui/NotificationDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="lonceng" />,
}));

const ALAMAT_DAFTAR = 'https://helpdesk.madiunkab.go.id/register';

describe('Navbar', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('pengunjung belum masuk', () => {
    beforeEach(() => isAuthenticated.mockReturnValue(false));

    it('menawarkan "Registrasi Helpdesk" ke portal pendaftaran di tab baru', () => {
      render(<Navbar />);

      const tautan = screen.getAllByRole('link', { name: /registrasi helpdesk/i })[0];
      expect(tautan).toHaveAttribute('href', ALAMAT_DAFTAR);
      expect(tautan).toHaveAttribute('target', '_blank');
      // Tanpa noopener, halaman tujuan memegang `window.opener` dan dapat
      // mengalihkan tab asal ke mana pun.
      expect(tautan.getAttribute('rel')).toMatch(/noopener/);
    });

    /**
     * Permintaan pengguna 14 September 2026: tombol masuk PINDAH ke hero.
     * Tanpa uji ini, navbar yang masih memuat keduanya tetap lolos, dan
     * halamannya punya dua tombol masuk yang saling berebut perhatian.
     */
    it('TIDAK lagi memuat tombol masuk SSO', () => {
      render(<Navbar />);

      expect(screen.queryByRole('button', { name: /masuk via sso/i })).not.toBeInTheDocument();
    });

    it('drawer ponsel juga memuat tautan registrasi', () => {
      render(<Navbar />);
      const sebelum = screen.getAllByRole('link', { name: /registrasi helpdesk/i }).length;

      fireEvent.click(screen.getByLabelText(/toggle navigation menu/i));

      expect(screen.getAllByRole('link', { name: /registrasi helpdesk/i }).length).toBeGreaterThan(
        sebelum,
      );
    });
  });

  /**
   * PASANGAN yang membuat uji di atas berarti. Tautan yang muncul tanpa syarat
   * juga akan meluluskan ketiganya, sambil menawarkan pendaftaran akun kepada
   * orang yang jelas-jelas sudah punya akun dan sedang memakainya.
   */
  it('KONTROL: yang sudah masuk melihat avatar, bukan tautan registrasi', () => {
    isAuthenticated.mockReturnValue(true);

    render(<Navbar />);

    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /registrasi helpdesk/i })).not.toBeInTheDocument();
  });
});

/**
 * PENAMAAN MENU (15 September 2026, permintaan pengguna): "Tentang Kami"
 * menjadi "Tentang Platform".
 *
 * Navbar ini dipakai DUA kali -- versi desktop dan versi drawer ponsel -- dari
 * dua daftar tautan yang ditulis terpisah di berkas yang sama. Nama yang
 * diganti pada satu daftar saja menghasilkan aplikasi yang menyebut halaman
 * yang sama dengan dua nama, tergantung lebar layar pembacanya.
 */
describe('Navbar — penamaan menu', () => {
  beforeEach(() => isAuthenticated.mockReturnValue(false));

  it('menu /about bernama "Tentang Platform" pada daftar desktop', () => {
    render(<Navbar />);

    expect(screen.getByRole('link', { name: 'Tentang Platform' })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  /**
   * Daftar ponsel hidup di dalam drawer dan baru digambar setelah tombolnya
   * ditekan, jadi ia HARUS dibuka. Tanpa langkah ini, nama lama yang tertinggal
   * di sana tak akan pernah tersentuh uji mana pun.
   */
  it('nama yang sama dipakai daftar ponsel', () => {
    render(<Navbar />);

    fireEvent.click(screen.getByLabelText(/toggle navigation menu/i));

    expect(screen.getAllByRole('link', { name: 'Tentang Platform' })).toHaveLength(2);
  });

  it('KONTROL: nama lamanya tak tertinggal di salah satu daftar', () => {
    render(<Navbar />);

    fireEvent.click(screen.getByLabelText(/toggle navigation menu/i));

    expect(screen.queryByRole('link', { name: /tentang kami/i })).toBeNull();
  });
});

/**
 * NAMA APLIKASI DI PONSEL (15 September 2026, permintaan pengguna).
 *
 * "SKEMA Madiun" dulu `hidden sm:block`, jadi lenyap di bawah 640px -- lebar
 * hampir semua ponsel. Terukur di Chrome pada 360px: navbar hanya berisi
 * lambang ~30px dan tombol menu ~40px, menyisakan sekitar 250px kosong di
 * antaranya. Yang disembunyikan bukan sesuatu yang tak muat.
 */
describe('Navbar — nama aplikasi di layar kecil', () => {
  beforeEach(() => isAuthenticated.mockReturnValue(false));

  it('"SKEMA Madiun" tidak lagi disembunyikan di layar sempit', () => {
    render(<Navbar />);

    const nama = screen.getByText('SKEMA Madiun');

    expect(nama.className).not.toMatch(/\bhidden\b/);
  });

  /**
   * PASANGAN kontrol: nama yang tampil tapi boleh mendorong tombol menu keluar
   * layar menukar satu cacat dengan cacat yang lebih buruk.
   */
  it('boleh terpotong, tidak boleh mendorong tombol menu', () => {
    render(<Navbar />);

    const nama = screen.getByText('SKEMA Madiun');

    expect(nama.className).toMatch(/\btruncate\b/);
  });

  /**
   * `truncate` pada namanya saja TIDAK cukup, dan ini terbukti di peramban:
   * tautan merek yang membungkusnya `shrink-0`, jadi seluruh blok merek menolak
   * menyusut dan justru mendorong kelompok kanan navbar -- avatar dan tombol
   * menu -- sampai 28px ke luar layar pada 320px. Yang harus boleh menyusut
   * adalah tautannya, bukan cuma teks di dalamnya.
   */
  it('tautan mereknya boleh menyusut, bukan menolak', () => {
    render(<Navbar />);

    const tautan = screen.getByText('SKEMA Madiun').closest('a');

    expect(tautan.className).not.toMatch(/(^|\s)shrink-0\b/);
    expect(tautan.className).toMatch(/\bmin-w-0\b/);
  });
});

/**
 * PITA TABLET 768-899px (16 September 2026, laporan pengguna: navbar "belum
 * bisa menyesuaikan dengan layar perangkat", disertai tangkapan layar bertulisan
 * "SKEMA M...").
 *
 * Terukur di Chrome, dan batasnya tajam:
 *
 *   640-740px : tautan desktop tersembunyi, tombol menu tampil -> merek utuh 132px
 *   768px     : tautan desktop MENYALA, tombol menu padam      -> merek 112 dari 147px
 *   800px     : 125 dari 147px
 *   850px     : 144 dari 147px
 *   900px+    : utuh 147px
 *
 * Pada 768px pil navbar selebar 720px harus memuat merek 183px + tiga tautan
 * 289px + tombol registrasi 206px, ditambah jaraknya. Merek satu-satunya yang
 * boleh menyusut, jadi ia menanggung seluruh kekurangannya sendirian.
 *
 * Yang salah letak adalah TITIK PERALIHANNYA, bukan `truncate`: `md` menyala
 * sekitar 130px terlalu dini untuk isi sebanyak ini. Uji di bawah menjaga
 * peralihan itu tetap di `lg`.
 */
describe('Navbar — titik peralihan menu', () => {
  beforeEach(() => isAuthenticated.mockReturnValue(false));

  it('daftar tautan desktop baru menyala mulai lg', () => {
    const { container } = render(<Navbar />);

    const daftar = container.querySelector('[data-tautan-desktop]');

    expect(daftar).not.toBeNull();
    expect(daftar.className).toMatch(/\blg:flex\b/);
    expect(daftar.className).not.toMatch(/\bmd:flex\b/);
  });

  /**
   * PASANGAN yang membuat uji di atas berarti. Tautan yang dipindah ke `lg`
   * tanpa tombol menunya ikut dipindah meninggalkan pita 768-1023px tanpa jalan
   * apa pun menuju Beranda, Tentang Platform, dan Statistik -- dan tanpa tombol
   * registrasi, yang di drawer itulah satu-satunya tempatnya bagi lebar ini.
   */
  it('tombol menu bertahan sampai tepat sebelum lg', () => {
    render(<Navbar />);

    const tombol = screen.getByLabelText(/toggle navigation menu/i);

    expect(tombol.className).toMatch(/\blg:hidden\b/);
    expect(tombol.className).not.toMatch(/\bmd:hidden\b/);
  });

  it('KONTROL: ketiga tautan tetap ada di daftar desktop', () => {
    const { container } = render(<Navbar />);

    const daftar = container.querySelector('[data-tautan-desktop]');
    const nama = [...daftar.querySelectorAll('a')].map((a) => a.textContent.trim());

    expect(nama).toEqual(['Beranda', 'Tentang Platform', 'Statistik']);
  });
});
