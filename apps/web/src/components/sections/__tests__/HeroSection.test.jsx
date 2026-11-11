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

  it('memasang tumpukan kartu statistik', async () => {
    isAuthenticated.mockReturnValue(false);

    render(<HeroSection />);

    expect(await screen.findByTestId('nilai-ikm')).toBeInTheDocument();
  });

  /**
   * ILUSTRASI JENDELA PERAMBAN DIBUANG (10 November 2026, keputusan pengguna).
   *
   * Kartu Tren IKM kini isi utama kolom kanan, dan dasbor tiruan di
   * belakangnya berebut tempat dengannya. Lebih dari itu, tiruan tersebut
   * memajang "84%" dan "< 2 Jam" -- angka karangan -- tepat di sebelah angka
   * sungguhan dari /statistics, padahal pembaca tak punya cara membedakan
   * keduanya.
   */
  it('dasbor tiruan beserta angka karangannya tak digambar lagi', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    expect(container.querySelector('[data-rangka-ilustrasi]')).toBeNull();
    expect(screen.queryByText('84%')).not.toBeInTheDocument();
    expect(screen.queryByText(/< 2 Jam/)).not.toBeInTheDocument();
  });

  /**
   * Cahaya gradasi di belakang kartu murni hiasan dan disembunyikan dari
   * pembaca layar; kartu angkanya tidak boleh ikut terbungkam.
   */
  it('cahaya latar disembunyikan dari pembaca layar, kartu angkanya tidak', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    const nilai = await screen.findByTestId('nilai-ikm');

    expect(container.querySelector('[data-cahaya-latar]')).toHaveAttribute('aria-hidden', 'true');
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
   * Kartu statistiknya harus tetap terlihat di bawah `lg`: angka itulah yang
   * seharusnya dibaca warga sebelum memutuskan mengisi survei, dan mayoritas
   * dari mereka datang dari ponsel. Hanya cahaya latarnya yang milik `lg`.
   */
  it('kartu statistiknya tidak disembunyikan di bawah lg', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    const cahaya = container.querySelector('[data-cahaya-latar]').classList;
    expect(cahaya.contains('hidden') && cahaya.contains('lg:block')).toBe(true);
    expect(container.querySelector('[data-tumpukan-statistik]').closest('.hidden')).toBeNull();
  });

  /**
   * PANEL BIRU di belakang kartu (10 November 2026). Bingkai bening kartu Tren
   * IKM hanya terlihat di atas warna -- terukur di Chrome: cahaya radial yang
   * samar sebelumnya tak cukup, panel biru brand muda cukup. Biru tua diuji
   * dan ditolak: ia terbaca sebagai noda bayangan.
   */
  it('latar di belakang kartu adalah panel biru brand muda', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    const panel = container.querySelector('[data-cahaya-latar]');
    expect(panel.hasAttribute('data-panel-biru')).toBe(true);
    expect(panel.style.background).toMatch(/rgba\(68,\s*147,\s*204/);
    expect(panel.style.background).not.toMatch(/radial-gradient/);
  });

  /**
   * JARAK BIRU DI KIRI-KANAN SETARA ATAS-BAWAH (10 November 2026, permintaan
   * pengguna). Panel 460px hanya menyisakan 38px di tiap sisi kartu berbingkai
   * (384px), dan gradasinya sudah memudar di sana -- sisi kartu nyaris putih
   * sementara atas-bawahnya biru. Di atas-bawah panel menjulur 64px melewati
   * panggung yang sendirinya ber-`lg:py-10`; sisi kiri-kanan harus memberi
   * paling sedikit 64px juga.
   */
  it('panel menjulur paling sedikit 64px di kiri dan kanan kartu berbingkai', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    const panel = container.querySelector('[data-cahaya-latar]');
    const lebar = Number(/(?:^|\s)w-\[(\d+)px\]/.exec(panel.className)?.[1]);
    const KARTU_BERBINGKAI = 360 + 2 * 12;
    expect((lebar - KARTU_BERBINGKAI) / 2).toBeGreaterThanOrEqual(64);
  });

  /**
   * KEEMPAT SISI MEMUDAR (10 November 2026, pengguna memilih "contoh 2" dari
   * tiga pratinjau di Chrome). Sebelumnya hanya atas-bawah yang memudar lewat
   * `mask-image`; kiri-kanan pekat sampai dekat tepi lalu putus pendek, jadi
   * panelnya terbaca sebagai balok. Kini dua gradasi -- mendatar dan tegak --
   * diirisi, sehingga setiap sisi memudar sama panjangnya.
   */
  it('panel memudar di keempat sisi lewat dua gradasi yang diirisi', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    const gaya = container.querySelector('[data-cahaya-latar]').style;
    const masker = gaya.maskImage || gaya.webkitMaskImage || '';
    expect(masker).toMatch(/90deg/);
    expect(masker).toMatch(/180deg/);
    expect(gaya.maskComposite || gaya.webkitMaskComposite).toBeTruthy();
  });
});

/**
 * EFEK 3D DIBUANG (10 November 2026), bersama ilustrasi jendela.
 *
 * Kemiringan `perspective(1200px) rotateX(4deg) rotateY(-12deg) rotateZ(2deg)`
 * (16 September 2026) memiringkan rangka jendela beserta kartu yang
 * menumpanginya. Referensi baru menampilkan kartu tegak, dan tanpa rangka di
 * belakangnya kemiringan hanya membuat garis dasar teks dan batang ikut
 * melandai -- tepat di kartu yang angkanya harus dibaca. Uji lamanya menjaga
 * agar kemiringan itu milik `lg` saja; kini yang dijaga adalah ketiadaannya di
 * lebar mana pun.
 */
describe('HeroSection — kartu statistik tegak', () => {
  it('tak ada transformasi putar maupun perspektif di kolom kartu', async () => {
    isAuthenticated.mockReturnValue(false);

    const { container } = render(<HeroSection />);
    await screen.findByTestId('nilai-ikm');

    expect(container.innerHTML).not.toMatch(/rotate[XYZ]\(|perspective\(|translateZ\(/);
    expect(container.querySelector('[data-ilustrasi-3d]')).toBeNull();
  });
});
