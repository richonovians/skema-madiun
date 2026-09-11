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
