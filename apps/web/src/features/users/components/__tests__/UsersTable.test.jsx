import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

/**
 * GERBANG KONFIRMASI AKSI AKUN (permintaan pengguna 8 September 2026).
 *
 * Keadaan sebelum ini, dan sebabnya permintaan itu masuk akal: tombol
 * Nonaktifkan/Aktifkan mengubah status TANPA konfirmasi apa pun, dan Hapus
 * memakai `window.confirm()` bawaan peramban alih-alih komponen desain
 * aplikasi. Jadi ini menambah satu gerbang dan memindahkan satu.
 *
 * Tabelnya kini murni presentasional: ia hanya MEMINTA aksi lewat
 * `onRequestAction(user, tipe)`, dan halaman pemanggil yang memegang
 * ConfirmDialog serta memanggil endpointnya. Dialog yang dipasang di dalam
 * tabel akan membuat tiap baris punya salinan dialognya sendiri.
 */
describe('UsersTable — gerbang konfirmasi', () => {
  it('Nonaktifkan meminta konfirmasi, bukan langsung mengubah status', () => {
    const onRequestAction = jest.fn();
    render(<UsersTable data={[baris()]} onRequestAction={onRequestAction} />);

    fireEvent.click(screen.getByRole('button', { name: /nonaktifkan/i }));

    expect(onRequestAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      'deactivate',
    );
  });

  it('baris yang sudah nonaktif meminta tipe activate', () => {
    const onRequestAction = jest.fn();
    render(<UsersTable data={[baris({ status: 'INACTIVE' })]} onRequestAction={onRequestAction} />);

    fireEvent.click(screen.getByRole('button', { name: /aktifkan/i }));

    expect(onRequestAction).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), 'activate');
  });

  it('Hapus meminta konfirmasi TANPA window.confirm', () => {
    // `window.confirm` di-spy, bukan cuma diperiksa hasil akhirnya: yang diuji
    // bukan sekadar bahwa handlernya terpanggil, melainkan bahwa dialog bawaan
    // peramban SUDAH TIDAK dipakai lagi.
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const onRequestAction = jest.fn();
    render(<UsersTable data={[baris()]} onRequestAction={onRequestAction} />);

    fireEvent.click(screen.getByRole('button', { name: /hapus/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onRequestAction).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), 'delete');
    confirmSpy.mockRestore();
  });
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
