import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyCompletion from '../SurveyCompletion';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }) => <span role="img" aria-label={alt} />,
}));

jest.mock('../../store/useSurveyStore', () => ({
  __esModule: true,
  default: () => ({ surveyData: { title: 'Survei Kepuasan Masyarakat Layanan Pendidikan Dasar' } }),
}));

/**
 * LAYAR SESUDAH PENGISIAN, dan satu-satunya hal yang dijaga di sini adalah
 * KECOCOKAN LABEL DENGAN TUJUANNYA (4 Oktober 2026, laporan pengguna).
 *
 * Komponen ini punya DUA tombol rumah yang mudah tertukar, dan hanya satu yang
 * sempat salah:
 *
 *   pengisi BERSESI  -> /dashboard, dulu berlabel "Beranda"
 *   pengisi ANONIM   -> /          , berlabel "Kembali ke Layanan"
 *
 * Yang kedua benar apa adanya: `/` memang halaman depan publik. Yang pertama
 * tidak, sebab `/dashboard` adalah dasbor warga. Label yang menjanjikan satu
 * halaman lalu membuka halaman lain adalah cacat kecil yang terus-menerus
 * membingungkan, dan ia hanya terlihat oleh orang yang menekannya.
 *
 * Uji ini menolak label itu kembali, DAN menolak perbaikan yang kebablasan
 * dengan ikut mengganti label tombol anonim.
 *
 * KATANYA BERGANTI, PEMBEDAANNYA TIDAK (15 Oktober 2026). Seluruh teks
 * "Beranda" yang dilihat pengguna menjadi "Layanan" atas permintaan pengguna,
 * jadi kedua pagar di bawah kini menyebut "Layanan". Yang dijaga tetap sama:
 * `/dashboard` tidak boleh memakai label halaman depan, dan `/` harus
 * memakainya.
 */
describe('SurveyCompletion — label tombol', () => {
  describe('pengisi bersesi', () => {
    const render1 = () => render(<SurveyCompletion />);

    it('tombol ke /dashboard berlabel "Dashboard"', () => {
      render1();

      const tautan = screen.getByRole('link', { name: /dashboard/i });
      expect(tautan).toHaveAttribute('href', '/dashboard');
    });

    it('TIDAK menyebut tujuan /dashboard dengan label halaman depan', () => {
      render1();

      // Dulu `/^beranda$/i`; katanya berganti, larangannya tidak.
      expect(screen.queryByRole('link', { name: /^layanan$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^beranda$/i })).not.toBeInTheDocument();
    });

    it('tautan daftar survei tetap ada', () => {
      render1();

      expect(screen.getByRole('link', { name: /daftar survei/i })).toHaveAttribute(
        'href',
        '/surveys',
      );
    });
  });

  describe('pengisi anonim', () => {
    const render1 = () => render(<SurveyCompletion tampilkanTautanWarga={false} />);

    /**
     * PAGAR TERHADAP PERBAIKAN YANG KEBABLASAN. Tombol ini menuju `/`, yang
     * benar-benar halaman depan publik, dan labelnya harus tetap menyebutnya.
     * Menghapus label itu dari berkas ini akan membuat tombol ini berbohong ke
     * arah yang berlawanan.
     */
    it('tetap berlabel Layanan karena tujuannya memang /', () => {
      render1();

      const tautan = screen.getByRole('link', { name: /layanan/i });
      expect(tautan).toHaveAttribute('href', '/');
    });

    it('tidak menawarkan rute khusus peran yang akan memantulkannya', () => {
      render1();

      expect(screen.queryByRole('link', { name: /daftar survei/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
    });
  });
});

/**
 * KARTU UNTUK PENGISI BERSESI (30 Oktober 2026, permintaan pengguna). Di
 * `/surveys/[id]` kartu ini tampil di bawah navbar aplikasi, jadi logo + nama
 * "SKEMA Madiun" di kepalanya hanya mengulang merek, dan lencana "Terkirim"
 * mengulang judul "Terima Kasih!". Kartunya juga melebar selebar kontainer
 * halaman. Halaman publik `/survei/[id]` tak punya navbar, jadi kepalanya tetap.
 */
describe('SurveyCompletion — kepala kartu', () => {
  it('tanpa kepala: logo, nama SKEMA Madiun, dan lencana Terkirim tak tampil', () => {
    render(<SurveyCompletion tampilkanKepala={false} />);

    expect(screen.queryByRole('img', { name: 'Logo SKEMA' })).not.toBeInTheDocument();
    expect(screen.queryByText('SKEMA Madiun')).not.toBeInTheDocument();
    expect(screen.queryByText('Terkirim')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Terima Kasih!' })).toBeInTheDocument();
  });

  it('lebarnya dibatasi 500px, sama seperti halaman publik', () => {
    const { container } = render(<SurveyCompletion tampilkanKepala={false} />);

    expect(container.firstChild).toHaveClass('max-w-[500px]', 'mx-auto');
  });

  it('KONTROL: bawaannya tetap berkepala, untuk halaman publik', () => {
    render(<SurveyCompletion tampilkanTautanWarga={false} />);

    expect(screen.getByRole('img', { name: 'Logo SKEMA' })).toBeInTheDocument();
    expect(screen.getByText('SKEMA Madiun')).toBeInTheDocument();
    expect(screen.getByText('Terkirim')).toBeInTheDocument();
  });
});
