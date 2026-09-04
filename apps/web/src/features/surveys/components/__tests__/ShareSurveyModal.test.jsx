import React from 'react';
import { render, screen } from '@testing-library/react';
import ShareSurveyModal from '../ShareSurveyModal';

/**
 * Tautan bagikan dipindah dari `/surveys/:id` (rute khusus peran `responden`,
 * dijaga proxy.js) ke `/isi/:id` yang berada di luar matcher proxy. Satu
 * tautan/QR karena itu berlaku untuk semua orang: pengunjung tanpa sesi tak
 * lagi dipantulkan ke beranda.
 */
describe('ShareSurveyModal', () => {
  const survei = (over = {}) => ({ id: 42, title: 'SKM Loket', status: 'AKTIF', ...over });

  it('membagikan tautan /isi/:id, bukan rute berpenjaga /surveys/:id', () => {
    render(<ShareSurveyModal survey={survei()} onClose={() => {}} />);

    expect(screen.getByDisplayValue(/\/isi\/42$/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/\/surveys\/42$/)).not.toBeInTheDocument();
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
