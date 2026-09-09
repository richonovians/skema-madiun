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
});
