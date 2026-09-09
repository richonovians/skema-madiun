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
