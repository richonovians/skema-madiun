import React from 'react';
import { render, screen } from '@testing-library/react';
import ShareSurveyModal from '../ShareSurveyModal';

/**
 * Tautan bagikan dipindah dari `/surveys/:id` (rute khusus peran `responden`,
 * dijaga proxy.js) ke rute yang berada DI LUAR matcher proxy. Satu tautan/QR
 * karena itu berlaku untuk semua orang: pengunjung tanpa sesi tak lagi
 * dipantulkan ke beranda.
 *
 * Alamatnya `/survei/:id` sejak 8 September 2026, sebelumnya `/isi/:id`.
 * Alamat lama tetap hidup sebagai pengalihan permanen, tetapi yang DIBAGIKAN
 * harus yang baru: tautan yang lewat pengalihan menambah satu perjalanan
 * jaringan pada setiap pemindaian QR.
 */
describe('ShareSurveyModal', () => {
  const survei = (over = {}) => ({ id: 42, title: 'SKM Loket', status: 'AKTIF', ...over });

  it('membagikan tautan /survei/:id, bukan rute berpenjaga /surveys/:id', () => {
    render(<ShareSurveyModal survey={survei()} onClose={() => {}} />);

    expect(screen.getByDisplayValue(/\/survei\/42$/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/\/surveys\/42$/)).not.toBeInTheDocument();
  });

  it('TIDAK lagi membagikan alamat lama /isi/:id', () => {
    render(<ShareSurveyModal survey={survei()} onClose={() => {}} />);

    expect(screen.queryByDisplayValue(/\/isi\/42$/)).not.toBeInTheDocument();
  });

  it('survei yang mengizinkan anonim: keterangan tak lagi menuntut login', () => {
    render(<ShareSurveyModal survey={survei({ izinkanAnonim: true })} onClose={() => {}} />);

    expect(screen.getByText(/tanpa login/i)).toBeInTheDocument();
    expect(screen.queryByText(/SSO/i)).not.toBeInTheDocument();
  });

  it('survei biasa: keterangan tetap menyebut SSO (kontrol)', () => {
    render(<ShareSurveyModal survey={survei({ izinkanAnonim: false })} onClose={() => {}} />);

    expect(screen.getByText(/SSO/i)).toBeInTheDocument();
    expect(screen.queryByText(/tanpa login/i)).not.toBeInTheDocument();
  });
  /**
   * Panel keterangan biru menggambarkan tautan yang BERFUNGSI ("dapat diisi
   * tanpa login" / "perlu masuk lewat SSO"). Pada survei yang belum aktif ia
   * terpasang tepat di bawah spanduk kuning yang mengatakan tautannya belum
   * dapat diisi -- dua pernyataan berlawanan dalam satu layar, dan yang bawah
   * terdengar lebih meyakinkan karena berbicara soal cara kerja.
   */
  describe('keterangan cara pengisian', () => {
    it('disembunyikan pada survei draf, menyisakan peringatannya saja', () => {
      render(
        <ShareSurveyModal survey={survei({ status: 'DRAF', izinkanAnonim: true })} onClose={() => {}} />,
      );

      expect(screen.getByText(/masih berstatus draf/i)).toBeInTheDocument();
      expect(screen.queryByText(/dapat diisi tanpa login/i)).not.toBeInTheDocument();
    });

    it('disembunyikan pula pada survei yang sudah ditutup', () => {
      render(
        <ShareSurveyModal survey={survei({ status: 'DITUTUP', izinkanAnonim: false })} onClose={() => {}} />,
      );

      expect(screen.getByText(/sudah ditutup/i)).toBeInTheDocument();
      expect(screen.queryByText(/SSO/i)).not.toBeInTheDocument();
    });

    it('tetap tampil pada survei aktif, sebab di sanalah ia benar (kontrol)', () => {
      render(
        <ShareSurveyModal survey={survei({ status: 'AKTIF', izinkanAnonim: true })} onClose={() => {}} />,
      );

      expect(screen.getByText(/dapat diisi tanpa login/i)).toBeInTheDocument();
      expect(screen.queryByText(/masih berstatus draf/i)).not.toBeInTheDocument();
    });
  });
});
