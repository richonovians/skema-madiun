import React from 'react';
import { render, screen } from '@testing-library/react';
import ComplaintProgressStepper from '../ComplaintProgressStepper';
import ComplaintStatusControl from '../ComplaintStatusControl';

/**
 * Label status pengaduan datang dari SATU sumber (utils/enumLabels.js).
 *
 * Yang dikunci di sini bukan kata tertentu -- kata boleh berubah kapan saja
 * sesuai keputusan tim -- melainkan bahwa komponen MENGAMBILNYA dari peta itu,
 * bukan menuliskannya sendiri. Sebelum 11 September 2026 peta itu sudah ada
 * namun tak satu pun komponen memakainya, sehingga mengganti satu kata berarti
 * menyunting dua belas berkas dan berharap tak ada yang terlewat.
 *
 * Petanya diganti dengan kata penanda yang mustahil muncul secara kebetulan:
 * komponen yang masih menuliskan labelnya sendiri tak akan menampilkannya.
 */
const PENANDA = 'KATA-PENANDA-UJI';

jest.mock('@/utils/enumLabels', () => {
  const asli = jest.requireActual('@/utils/enumLabels');
  return {
    ...asli,
    COMPLAINT_STATUS_LABEL: {
      ...asli.COMPLAINT_STATUS_LABEL,
      'Menunggu Verifikasi': 'KATA-PENANDA-UJI',
    },
  };
});

describe('Label status pengaduan', () => {
  it('lini masa warga mengambil katanya dari peta, bukan menuliskannya sendiri', () => {
    render(<ComplaintProgressStepper currentStatus="Menunggu Verifikasi" />);

    expect(screen.getByText(PENANDA)).toBeInTheDocument();
    expect(screen.queryByText('Menunggu Verifikasi')).not.toBeInTheDocument();
    // Keterangan tahap pertama dahulu berbunyi "Tiket telah diverifikasi
    // sistem" -- klaim yang tak pernah terjadi. Sejak alur lima tahap
    // (4 November 2026) verifikasi punya tahapnya SENDIRI, jadi tak satu pun
    // keterangan boleh mengaku pengaduannya sudah diverifikasi selama tahap
    // itu belum terlampaui.
    expect(screen.queryByText(/telah diverifikasi/i)).not.toBeInTheDocument();
  });

  it('kontrol status admin mengambil katanya dari peta yang sama', () => {
    render(<ComplaintStatusControl currentStatus="Menunggu Verifikasi" onStatusChangeRequest={jest.fn()} />);

    expect(screen.getByText(PENANDA)).toBeInTheDocument();
    expect(screen.queryByText('Menunggu Verifikasi')).not.toBeInTheDocument();
  });
});

/**
 * EJAANNYA "Status Progres", bukan "Status Progress" (permintaan pengguna
 * 22 September 2026). Serapan Indonesia untuk *progress* adalah "progres"
 * dengan satu s, dan SurveyProgress.jsx sudah menulisnya begitu sejak awal --
 * dua ejaan berbeda untuk hal yang sama di satu aplikasi.
 */
describe('ComplaintProgressStepper — ejaan kepala kartu', () => {
  it('berbunyi "Status Progres"', () => {
    render(<ComplaintProgressStepper currentStatus="Menunggu Verifikasi" />);

    expect(screen.getByText('Status Progres')).toBeInTheDocument();
  });

  it('tidak lagi memakai ejaan lama "Status Progress"', () => {
    render(<ComplaintProgressStepper currentStatus="Menunggu Verifikasi" />);

    expect(screen.queryByText('Status Progress')).not.toBeInTheDocument();
  });
});
