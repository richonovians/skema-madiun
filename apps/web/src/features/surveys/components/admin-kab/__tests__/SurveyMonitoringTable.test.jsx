import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyMonitoringTable from '../SurveyMonitoringTable';

/**
 * SALIN SURVEI DI ADMIN KABUPATEN (permintaan pengguna 8 September 2026,
 * "seperti pada admin opd").
 *
 * Backend sudah mengizinkannya sejak sebelum berkas ini ada:
 * `POST /surveys/:id/duplicate` ber-`@Roles(kabupaten, superuser, opd)`, dan
 * `duplicateSurvey` sudah ada di surveys.api.js. Yang belum ada cuma tombolnya
 * di area kabupaten, jadi tugasnya murni frontend.
 *
 * TANPA SYARAT STATUS, dan itu bukan kelalaian: `surveysService.duplicate`
 * tidak memanggil `assertDraft`, sehingga survei aktif maupun yang sudah
 * ditutup boleh disalin. Salinannya selalu draf baru, jadi aslinya tak
 * tersentuh. Uji pertama di bawah yang menjaga itu.
 */
const barisSurvei = (over = {}) => ({
  id: 1,
  title: 'Survei Layanan Adminduk',
  opdName: 'Dinas Kependudukan dan Pencatatan Sipil',
  period: '2026-Q3',
  respondentsCount: 0,
  ikmScore: null,
  status: 'DRAF',
  ...over,
});

describe('SurveyMonitoringTable — Salin', () => {
  it('tombol Salin ada pada setiap baris, apa pun statusnya', () => {
    render(
      <SurveyMonitoringTable
        surveys={[
          barisSurvei({ id: 1, status: 'DRAF' }),
          barisSurvei({ id: 2, status: 'AKTIF', respondentsCount: 12, ikmScore: 3.2 }),
          barisSurvei({ id: 3, status: 'DITUTUP', respondentsCount: 40, ikmScore: 3.5 }),
        ]}
      />,
    );

    expect(screen.getAllByRole('button', { name: /^salin$/i })).toHaveLength(3);
  });

  it('menekan Salin meneruskan survei barisnya, bukan baris lain', () => {
    const onDuplicate = jest.fn();
    render(
      <SurveyMonitoringTable
        surveys={[barisSurvei({ id: 1 }), barisSurvei({ id: 2 })]}
        onDuplicate={onDuplicate}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /^salin$/i })[1]);

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDuplicate.mock.calls[0][0].id).toBe(2);
  });

  it('Salin ikut mati saat baris itu sedang sibuk', () => {
    // Pola yang sama dengan aksi baris lain di tabel ini (`busySurveyId`):
    // tanpa ini, klik kedua saat permintaan pertama masih jalan akan membuat
    // DUA salinan, dan pengguna cuma melihat satu daftar yang belum termuat.
    const onDuplicate = jest.fn();
    render(
      <SurveyMonitoringTable
        surveys={[barisSurvei({ id: 1 })]}
        onDuplicate={onDuplicate}
        busySurveyId={1}
      />,
    );

    expect(screen.getByRole('button', { name: /^salin$/i })).toBeDisabled();
  });
});

/**
 * TOMBOL AKSI SURVEI TERBIT (permintaan pengguna 11 September 2026). Sebelumnya
 * Ubah, Pertanyaan, dan Hapus hanya muncul pada baris DRAF, sehingga survei yang
 * terlanjur dipublikasikan tak punya jalan perbaikan sama sekali.
 */
describe('SurveyMonitoringTable — aksi survei terbit', () => {
  const barisAktif = (over = {}) =>
    barisSurvei({ id: 5, title: 'Survei Aktif', status: 'AKTIF', respondentsCount: 0, ...over });

  it('survei AKTIF kini punya tombol Ubah, Pertanyaan, dan Hapus', () => {
    render(<SurveyMonitoringTable surveys={[barisAktif()]} />);

    expect(screen.getByRole('button', { name: /^ubah$/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: /pertanyaan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^hapus$/i })).toBeEnabled();
  });

  it('survei aktif yang SUDAH dijawab: Pertanyaan tetap ada, Hapus tetap hidup', () => {
    // Tombolnya tetap ada karena teks pertanyaan masih boleh diperbaiki; yang
    // terkunci adalah SUSUNANNYA, dan penjaganya di backend
    // (assertSurveyEditable), bukan hilangnya tombol ini.
    render(<SurveyMonitoringTable surveys={[barisAktif({ respondentsCount: 142 })]} />);

    expect(screen.getByRole('link', { name: /pertanyaan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^hapus$/i })).toBeEnabled();
  });

  it('survei DITUTUP: Ubah mati beserta sebabnya, Pertanyaan hilang, Hapus tetap hidup', () => {
    // Hasil IKM survei tertutup sudah terbit, jadi isinya terkunci penuh --
    // tetapi membuangnya ke Sampah tetap boleh, dan dapat dipulihkan.
    render(<SurveyMonitoringTable surveys={[barisAktif({ status: 'DITUTUP' })]} />);

    const ubah = screen.getByRole('button', { name: /^ubah$/i });
    expect(ubah).toBeDisabled();
    expect(ubah).toHaveAttribute('title', expect.stringMatching(/ditutup/i));
    expect(screen.queryByRole('link', { name: /pertanyaan/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^hapus$/i })).toBeEnabled();
  });

  it('Hapus meneruskan baris yang benar, dan ikut mati saat baris itu sibuk', () => {
    const onDelete = jest.fn();
    const { rerender } = render(
      <SurveyMonitoringTable surveys={[barisAktif({ id: 9 })]} onDelete={onDelete} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^hapus$/i }));
    expect(onDelete.mock.calls[0][0].id).toBe(9);

    rerender(
      <SurveyMonitoringTable
        surveys={[barisAktif({ id: 9 })]}
        onDelete={onDelete}
        busySurveyId={9}
      />,
    );
    expect(screen.getByRole('button', { name: /^hapus$/i })).toBeDisabled();
  });
});
