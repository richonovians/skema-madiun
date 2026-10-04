import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyCompletion from '../SurveyCompletion';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
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
 *   pengisi ANONIM   -> /          , berlabel "Kembali ke Beranda"
 *
 * Yang kedua benar apa adanya: `/` memang beranda publik. Yang pertama tidak,
 * sebab `/dashboard` adalah dasbor warga, bukan beranda. Label yang menjanjikan
 * satu halaman lalu membuka halaman lain adalah cacat kecil yang terus-menerus
 * membingungkan, dan ia hanya terlihat oleh orang yang menekannya.
 *
 * Uji ini menolak label itu kembali, DAN menolak perbaikan yang kebablasan
 * dengan ikut mengganti label tombol anonim.
 */
describe('SurveyCompletion — label tombol', () => {
  describe('pengisi bersesi', () => {
    const render1 = () => render(<SurveyCompletion />);

    it('tombol ke /dashboard berlabel "Dashboard"', () => {
      render1();

      const tautan = screen.getByRole('link', { name: /dashboard/i });
      expect(tautan).toHaveAttribute('href', '/dashboard');
    });

    it('TIDAK lagi menyebut tujuan /dashboard sebagai "Beranda"', () => {
      render1();

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
     * benar-benar beranda, dan labelnya harus tetap menyebut beranda. Mengganti
     * seluruh kata "Beranda" di berkas ini akan membuat tombol ini berbohong ke
     * arah yang berlawanan.
     */
    it('tetap berlabel beranda karena tujuannya memang /', () => {
      render1();

      const tautan = screen.getByRole('link', { name: /beranda/i });
      expect(tautan).toHaveAttribute('href', '/');
    });

    it('tidak menawarkan rute khusus peran yang akan memantulkannya', () => {
      render1();

      expect(screen.queryByRole('link', { name: /daftar survei/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
    });
  });
});
