import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminSurveyCard from '../AdminSurveyCard';

/**
 * LENCANA SURVEI UTAMA (15 September 2026).
 *
 * Penanda survei utama hidup di dalam builder, satu halaman per survei. Tanpa
 * lencana di daftar, admin tak punya cara tahu survei mana yang sedang menjadi
 * tujuan tombol "Lanjut Isi Survei" selain membuka satu per satu -- dan karena
 * menyalakan yang baru MELEPAS yang lama secara diam-diam, ia juga tak punya
 * cara memastikan penunjukannya berpindah ke tempat yang ia kira.
 */
const survei = (over = {}) => ({
  id: '5',
  title: 'Survei Layanan Loket',
  status: 'AKTIF',
  period: '2026-Q3',
  respondentsCount: 12,
  ikmScore: 82.5,
  isUtama: false,
  ...over,
});

const render_ = (over) =>
  render(
    <AdminSurveyCard
      survey={survei(over)}
      onChangeStatus={jest.fn()}
      onDuplicate={jest.fn()}
      onDelete={jest.fn()}
    />,
  );

describe('AdminSurveyCard — lencana survei utama', () => {
  it('survei utama ditandai di daftar', () => {
    render_({ isUtama: true });

    expect(screen.getByText(/survei utama/i)).toBeInTheDocument();
  });

  /**
   * PASANGAN kontrol. Lencana yang muncul di setiap kartu tak menandai apa pun;
   * justru itu bentuk kegagalan yang paling mudah lolos dari pembacaan sekilas,
   * karena layarnya tetap terlihat "ada lencananya".
   */
  it('KONTROL: survei biasa tidak ikut tertandai', () => {
    render_({ isUtama: false });

    expect(screen.queryByText(/survei utama/i)).toBeNull();
  });
});
