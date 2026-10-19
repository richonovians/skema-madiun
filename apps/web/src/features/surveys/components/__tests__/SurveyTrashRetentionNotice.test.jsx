import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyTrashRetentionNotice from '../SurveyTrashRetentionNotice';

/**
 * KETERANGAN UMUR SAMPAH SURVEI (30 September 2026).
 *
 * Sejak pemusnahan otomatis ada, halaman Sampah menjanjikan sesuatu yang tak
 * lagi benar bila diam: isinya memang berkurang sendiri. Komponen ini yang
 * menyatakannya, dan dua sifatnya dijaga di sini.
 *
 * ANGKANYA DARI SERVER. Menulis "365" mati di antarmuka membuat keterangan dan
 * kebijakan tinggal menunggu seseorang mengubah env untuk saling bertentangan.
 *
 * MENYEBUT PENGECUALIANNYA. Survei yang sudah dijawab warga tidak ikut
 * dimusnahkan, dan itu justru bagian yang paling perlu diketahui: tanpa
 * menyebutnya, seorang admin bisa mengira hasil pengukurannya akan lenyap dan
 * buru-buru menyelamatkannya.
 */
describe('SurveyTrashRetentionNotice', () => {
  it('angkanya mengikuti nilai yang diberikan, bukan 365 yang ditulis mati', () => {
    render(<SurveyTrashRetentionNotice hari={90} />);

    expect(screen.getByTestId('sampah-retensi-notice')).toHaveTextContent('90 hari');
  });

  it('menyebut bahwa survei yang sudah dijawab TIDAK ikut dimusnahkan', () => {
    render(<SurveyTrashRetentionNotice hari={365} />);

    expect(screen.getByTestId('sampah-retensi-notice').textContent).toMatch(/dijawab|jawaban/i);
  });

  it('TIDAK merender apa pun bila pemusnahan otomatis dimatikan', () => {
    render(<SurveyTrashRetentionNotice hari={null} />);

    expect(screen.queryByTestId('sampah-retensi-notice')).not.toBeInTheDocument();
  });

  it('TIDAK merender apa pun selagi nilainya belum dimuat', () => {
    render(<SurveyTrashRetentionNotice />);

    expect(screen.queryByTestId('sampah-retensi-notice')).not.toBeInTheDocument();
  });
});
