import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminSurveyCardActions from '../AdminSurveyCardActions';

/**
 * AKSI KARTU SURVEI ADMIN OPD (permintaan pengguna 11 September 2026).
 * Sebelumnya Ubah & Hapus hanya ada pada kartu DRAF, sehingga survei yang
 * terlanjur terbit tak punya jalan perbaikan maupun pembatalan.
 */
const survey = { id: 5, title: 'Survei Aktif', status: 'AKTIF' };

const render1 = (props = {}) =>
  render(
    <AdminSurveyCardActions
      isDraft={false}
      surveyId={5}
      survey={survey}
      onDelete={jest.fn()}
      {...props}
    />,
  );

describe('AdminSurveyCardActions — survei terbit', () => {
  it('kartu survei terbit punya Ubah & Hapus', () => {
    render1();

    expect(screen.getByRole('link', { name: /^ubah$/i })).toHaveAttribute(
      'href',
      '/admin-opd/surveys/builder/5',
    );
    expect(screen.getByRole('button', { name: /^hapus$/i })).toBeInTheDocument();
  });

  it('Hapus pada survei terbit menjelaskan bahwa surveinya masuk Sampah, bukan hilang', () => {
    const onDelete = jest.fn();
    render1({ onDelete });

    fireEvent.click(screen.getByRole('button', { name: /^hapus$/i }));

    // Diarahkan ke DESKRIPSInya, bukan sekadar /Sampah/ -- judul dialognya pun
    // memuat kata itu, sehingga pencarian longgar cocok dua kali dan lulus
    // tanpa benar-benar memeriksa keterangannya.
    expect(screen.getByText(/dipindahkan ke Sampah/i)).toBeInTheDocument();
    expect(screen.getByText(/berhenti menerima jawaban/i)).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled(); // masih menunggu konfirmasi
  });

  it('sesudah dikonfirmasi, baru onDelete terpanggil', () => {
    const onDelete = jest.fn();
    render1({ onDelete });

    fireEvent.click(screen.getByRole('button', { name: /^hapus$/i }));
    fireEvent.click(screen.getByRole('button', { name: /ya, pindahkan/i }));

    expect(onDelete).toHaveBeenCalledWith(5);
  });

  it('kartu DRAF: dialognya tidak lagi menjanjikan penghapusan permanen', () => {
    // Draf pun kini masuk Sampah. Kalimat lama ("tidak dapat dipulihkan")
    // menakut-nakuti pengguna atas sesuatu yang tak lagi terjadi.
    const onDelete = jest.fn();
    render1({ isDraft: true, onDelete });

    fireEvent.click(screen.getByRole('button', { name: /^hapus$/i }));

    expect(screen.getByText(/dipindahkan ke Sampah dan dapat dipulihkan/i)).toBeInTheDocument();
    expect(screen.queryByText(/tidak dapat dipulihkan/i)).not.toBeInTheDocument();
  });
});

/**
 * TOMBOL BAGIKAN HANYA PADA SURVEI AKTIF (permintaan pengguna 22 September
 * 2026).
 *
 * Ini MEMBALIK keputusan 11 September yang tercatat di komponennya: dulu draf
 * pun boleh dibagikan supaya poster/QR dapat disiapkan lebih dulu, sebab id
 * survei -- dan karenanya tautannya -- sudah final sejak survei dibuat.
 * Pengguna memilih sebaliknya: tombol hanya muncul bila tautannya benar-benar
 * dapat diisi, termasuk menyembunyikannya pada survei yang periodenya sudah
 * ditutup.
 */
describe('AdminSurveyCardActions — tombol Bagikan mengikuti status', () => {
  it('menampilkan Bagikan pada survei AKTIF', () => {
    render1({ isDraft: false, survey: { id: 5, title: 'Survei Aktif', status: 'AKTIF' } });

    expect(screen.getByRole('button', { name: /bagikan/i })).toBeInTheDocument();
  });

  it('menyembunyikan Bagikan pada survei DRAF', () => {
    render1({ isDraft: true, survey: { id: 6, title: 'Survei Draf', status: 'DRAF' } });

    expect(screen.queryByRole('button', { name: /bagikan/i })).not.toBeInTheDocument();
  });

  it('menyembunyikan Bagikan pada survei DITUTUP', () => {
    render1({ isDraft: false, survey: { id: 7, title: 'Survei Ditutup', status: 'DITUTUP' } });

    expect(screen.queryByRole('button', { name: /bagikan/i })).not.toBeInTheDocument();
  });

  /**
   * KONTROL. Tanpa ini, menghapus tombolnya sama sekali dari komponen akan
   * membuat kedua uji "menyembunyikan" di atas hijau selamanya.
   */
  it('KONTROL: aksi lain tetap ada pada survei DRAF maupun DITUTUP', () => {
    render1({ isDraft: true, survey: { id: 6, title: 'Survei Draf', status: 'DRAF' } });
    expect(screen.getByRole('button', { name: /^hapus$/i })).toBeInTheDocument();
  });
});
