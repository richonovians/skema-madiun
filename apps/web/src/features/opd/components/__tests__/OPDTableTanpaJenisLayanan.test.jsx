import React from 'react';
import { render, screen } from '@testing-library/react';
import OPDTable from '../OPDTable';

/**
 * KOLOM JENIS LAYANAN DIBUANG (15 September 2026, permintaan pengguna).
 *
 * Nilainya datang apa adanya dari Helpdesk lewat cache OPD read-only: VarChar
 * bebas tanpa enum tetap. Kolomnya karena itu tak pernah menjadi golongan yang
 * dapat diandalkan, cuma teks yang ikut lewat.
 */
const baris = (over = {}) => ({
  id: 1,
  code: 'DISKOMINFO',
  name: 'Dinas Komunikasi dan Informatika',
  serviceType: 'Administrasi Kependudukan',
  status: 'ACTIVE',
  syncedAt: '2026-09-15T04:00:00.000Z',
  activeSurveys: 2,
  openComplaints: 5,
  ...over,
});

describe('OPDTable — tanpa kolom jenis layanan', () => {
  it('tidak lagi memuat kolom JENIS LAYANAN', () => {
    render(<OPDTable data={[baris()]} />);

    expect(screen.queryByText(/jenis layanan/i)).toBeNull();
  });

  /**
   * Nilainya ikut hilang, bukan cuma judul kolomnya. Tabel yang kehilangan satu
   * `<th>` tetapi menyimpan `<td>`-nya akan menggeser SELURUH sel di kanannya
   * satu kolom, sehingga tanggal sinkron tercetak di bawah judul STATUS.
   */
  it('nilainya ikut hilang, bukan cuma judul kolomnya', () => {
    render(<OPDTable data={[baris()]} />);

    expect(screen.queryByText('Administrasi Kependudukan')).toBeNull();
  });

  /**
   * PASANGAN kontrol. Tabel yang gagal dirender sama sekali juga lolos kedua
   * uji di atas.
   */
  it('KONTROL: kolom lain tetap berdiri', () => {
    render(<OPDTable data={[baris()]} />);

    for (const judul of [/kode opd/i, /nama instansi/i, /aktivitas sistem/i, /status/i, /terakhir disinkron/i]) {
      expect(screen.getByText(judul)).toBeInTheDocument();
    }
    expect(screen.getByText('Dinas Komunikasi dan Informatika')).toBeInTheDocument();
  });
});
