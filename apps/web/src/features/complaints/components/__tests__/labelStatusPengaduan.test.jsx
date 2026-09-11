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
    COMPLAINT_STATUS_LABEL: { ...asli.COMPLAINT_STATUS_LABEL, Diterima: 'KATA-PENANDA-UJI' },
  };
});

describe('Label status pengaduan', () => {
  it('lini masa warga mengambil katanya dari peta, bukan menuliskannya sendiri', () => {
    render(<ComplaintProgressStepper currentStatus="diterima" />);

    expect(screen.getByText(PENANDA)).toBeInTheDocument();
    expect(screen.queryByText('Diterima')).not.toBeInTheDocument();
    // Keterangannya dahulu berbunyi "Tiket telah diverifikasi sistem" -- klaim
    // yang tak pernah terjadi: status ini terpasang saat warga menekan kirim,
    // sebelum ada petugas yang melihatnya.
    expect(screen.queryByText(/telah diverifikasi/i)).not.toBeInTheDocument();
  });

  it('kontrol status admin mengambil katanya dari peta yang sama', () => {
    render(<ComplaintStatusControl currentStatus="Diterima" onStatusChangeRequest={jest.fn()} />);

    expect(screen.getByText(PENANDA)).toBeInTheDocument();
    expect(screen.queryByText('Diterima')).not.toBeInTheDocument();
  });
});
