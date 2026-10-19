import React from 'react';
import { render, screen } from '@testing-library/react';
import AuditTable from '../AuditTable';

/**
 * WARNA LENCANA DIKUNCI PADA KUNCI AKSI, BUKAN PADA LABELNYA (6 Oktober 2026).
 *
 * Cacat yang ditangkap uji ini nyata dan disebabkan sendiri: `ACTION_VARIANT`
 * semula berkunci `CREATE`/`UPDATE`/`DELETE`/`UPDATE STATUS` -- yaitu teks yang
 * TAMPIL. Begitu label diterjemahkan ke bahasa Indonesia atas permintaan
 * pengguna, keempat warnanya hilang tanpa satu pun uji memerah, dan lencananya
 * menjadi kelabu seragam. Mengunci warna pada teks tampilan berarti setiap
 * penggantian kata merusak maknanya.
 *
 * Diperiksa lewat kelas Tailwind-nya, sebab itulah satu-satunya wujud
 * `variant` yang dapat diamati dari luar `Badge`.
 */
const baris = (over = {}) => ({
  id: 1,
  createdAt: '2026-10-06T03:00:00.000Z',
  actorId: 9,
  user: 'Budi Santoso',
  entitas: 'user',
  module: 'Pengguna',
  aksi: 'create',
  action: 'BUAT',
  summary: 'BUAT Pengguna',
  params: null,
  body: null,
  ...over,
});

/** Lencana aksi pada baris pertama. */
const lencana = (teks) => screen.getByText(teks);

describe('AuditTable — warna lencana aksi', () => {
  it('menampilkan label Indonesia-nya', () => {
    render(<AuditTable data={[baris()]} />);

    expect(lencana('BUAT')).toBeInTheDocument();
  });

  it('`create` tetap hijau meski labelnya kini BUAT', () => {
    render(<AuditTable data={[baris()]} />);

    expect(lencana('BUAT')).toHaveClass('bg-green-100');
  });

  it('`delete` tetap merah meski labelnya kini HAPUS', () => {
    render(<AuditTable data={[baris({ aksi: 'delete', action: 'HAPUS' })]} />);

    expect(lencana('HAPUS')).toHaveClass('bg-error-container');
  });

  it('`update` tetap kuning meski labelnya kini UBAH', () => {
    render(<AuditTable data={[baris({ aksi: 'update', action: 'UBAH' })]} />);

    expect(lencana('UBAH')).toHaveClass('bg-yellow-100');
  });

  it('`update_status` tetap kuning meski labelnya kini UBAH STATUS', () => {
    render(<AuditTable data={[baris({ aksi: 'update_status', action: 'UBAH STATUS' })]} />);

    expect(lencana('UBAH STATUS')).toHaveClass('bg-yellow-100');
  });

  it('aksi tanpa warna khusus tetap memakai lencana baku, bukan hilang', () => {
    render(
      <AuditTable data={[baris({ aksi: 'sso_cabut_peran_opd', action: 'SSO CABUT PERAN ADMIN OPD' })]} />,
    );

    const el = lencana('SSO CABUT PERAN ADMIN OPD');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('bg-surface-container-high');
  });
});
