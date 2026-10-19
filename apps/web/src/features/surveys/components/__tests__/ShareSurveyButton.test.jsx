import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ShareSurveyButton from '../ShareSurveyButton';

/**
 * NAMA INSTANSI UNTUK POSTER QR (22 September 2026).
 *
 * Tombol ini menurunkan nama instansi dari `survey.opdName` supaya pemanggil
 * yang sudah menyandingkannya -- tabel monitoring Admin Kabupaten, dan kini
 * halaman survei Admin OPD -- tak perlu meneruskan prop tambahan.
 *
 * Diuji di sini, bukan lewat uji modal: uji modal mengoper `namaInstansi`
 * secara langsung, sehingga penurunan ini akan tetap hijau di sana walau
 * dihapus sama sekali. Yang akan terjadi di layar adalah poster tanpa nama
 * instansi, persis hal yang diminta pengguna.
 */
jest.mock('../ShareSurveyModal', () => ({
  __esModule: true,
  default: ({ namaInstansi }) => <div data-testid="modal">instansi:{namaInstansi}</div>,
}));

const buka = (survey, props = {}) => {
  render(<ShareSurveyButton survey={survey} {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /bagikan/i }));
};

describe('ShareSurveyButton — nama instansi', () => {
  it('menurunkan nama instansi dari survey.opdName', () => {
    buka({ id: 1, title: 'SKM Loket', status: 'AKTIF', opdName: 'Dinas Contoh' });

    expect(screen.getByTestId('modal')).toHaveTextContent('instansi:Dinas Contoh');
  });

  it('prop namaInstansi mengalahkan survey.opdName', () => {
    buka({ id: 1, title: 'SKM Loket', status: 'AKTIF', opdName: 'Dinas Contoh' }, {
      namaInstansi: 'Sekretariat Daerah',
    });

    expect(screen.getByTestId('modal')).toHaveTextContent('instansi:Sekretariat Daerah');
  });

  /**
   * Survei tanpa nama OPD tetap boleh dibagikan. Memaksa nama ini ada berarti
   * satu daftar yang lupa menyandingkannya akan mematikan seluruh unduhan QR.
   */
  it('survei tanpa opdName tetap membuka modal, dengan instansi kosong', () => {
    buka({ id: 1, title: 'SKM Loket', status: 'AKTIF' });

    expect(screen.getByTestId('modal')).toHaveTextContent('instansi:');
  });
});
