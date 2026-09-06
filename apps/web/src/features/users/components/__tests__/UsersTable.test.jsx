import React from 'react';
import { render, screen } from '@testing-library/react';
import { USER_ROLES } from '../../constants/userConstants';
import UsersTable from '../UsersTable';

/**
 * PENJAGA REGRESI (permintaan pengguna 6 September 2026: "pada manajemen user
 * di halaman superuser, tambahkan juga tombol ubah role untuk warga").
 *
 * Tombolnya sebenarnya SUDAH tampil sebelum berkas ini ada — tapi karena bug,
 * bukan karena keputusan: syaratnya `user.role !== USER_ROLES.RESPONDENT`,
 * sementara `user.role` tak ada lagi sejak adapter beralih ke `roles`
 * (5 September 2026). `undefined !== 'responden'` selalu benar, jadi syarat itu
 * mati dan tombolnya lolos untuk semua orang — di bawah komentar yang
 * menyatakan kebalikannya.
 *
 * Uji ini dibuktikan berarti dengan cara memasang kembali syarat lama sesaat:
 * bila `roles` diganti `role` pada komponennya, uji pertama di bawah GAGAL.
 */
const baris = (over = {}) => ({
  id: 42,
  name: 'Warga Contoh',
  email: 'warga@example.go.id',
  initials: 'WC',
  roles: [USER_ROLES.RESPONDENT],
  opdId: null,
  organization: null,
  createdAt: '6 Sep 2026',
  status: 'ACTIVE',
  ...over,
});

describe('UsersTable — Ubah Role', () => {
  it('baris WARGA punya tautan Ubah Role ke halaman edit akun itu', () => {
    render(<UsersTable data={[baris()]} />);

    const tautan = screen.getByRole('link', { name: /ubah role/i });
    expect(tautan).toHaveAttribute('href', '/admin-kab/users/42/edit');
  });

  it('baris admin juga punya tautan itu', () => {
    render(<UsersTable data={[baris({ id: 7, roles: [USER_ROLES.ADMIN_OPD] })]} />);

    expect(screen.getByRole('link', { name: /ubah role/i })).toHaveAttribute(
      'href',
      '/admin-kab/users/7/edit',
    );
  });

  it('akun ber-beberapa role menampilkan seluruh lencananya', () => {
    render(
      <UsersTable data={[baris({ roles: [USER_ROLES.SUPERUSER, USER_ROLES.RESPONDENT] })]} />,
    );

    expect(screen.getByText('Superuser')).toBeInTheDocument();
    expect(screen.getByText('Responden Aktif')).toBeInTheDocument();
  });
});
