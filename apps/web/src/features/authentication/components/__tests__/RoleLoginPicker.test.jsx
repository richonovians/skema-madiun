import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RoleLoginPicker from '../RoleLoginPicker';
import { setActingRole } from '../../services/actingRole.api';

jest.mock('../../services/actingRole.api', () => ({
  setActingRole: jest.fn().mockResolvedValue({}),
}));

/**
 * SAMBUNGAN antara tombol dan peran yang dikirim (8 September 2026).
 *
 * Pemetaannya sendiri diuji terpisah di `utils/__tests__/tombolPeran.test.js`;
 * yang diuji DI SINI adalah bahwa komponennya benar-benar memakai pemetaan itu.
 * Bedanya bukan kerapian: versi sebelumnya menyaring tombol dengan
 * `roles.includes(c.key)` dan memanggil `setActingRole(c.key)` langsung, jadi
 * util yang benar pun tak akan berpengaruh apa-apa kalau sambungannya lupa
 * dipasang.
 *
 * Peran `superuser` dilebur ke `kabupaten` pada 15 September 2026; uji yang dulu
 * membuktikan "tombolnya sama, haknya berbeda" ikut lenyap bersama perbedaan
 * yang dibuktikannya.
 */
const render1 = (props = {}) =>
  render(<RoleLoginPicker roles={props.roles ?? []} onCancel={() => {}} {...props} />);

// `window.location.assign` dipanggil sesudah berpindah peran; jsdom
// mengimplementasikannya sebagai navigasi sungguhan dan memuntahkan galat.
beforeAll(() => {
  delete window.location;
  window.location = { assign: jest.fn() };
});

beforeEach(() => jest.clearAllMocks());

describe('RoleLoginPicker — tiga tombol', () => {
  /**
   * Tak ada lagi tombol "Superuser" di layar mana pun (peleburan 15 September
   * 2026). Akun yang tokennya masih menyebut peran itu tak melihat tombol hantu.
   */
  it('tak ada tombol Superuser, dan peran yang sudah dihapus tak memunculkan tombol', () => {
    render1({ roles: ['superuser', 'kabupaten'] });

    expect(screen.getByText('Admin Kabupaten')).toBeInTheDocument();
    expect(screen.queryByText('Superuser')).not.toBeInTheDocument();
    expect(screen.getByText(/1 pilihan peran/i)).toBeInTheDocument();
  });

  it('akun kabupaten mengirim act=kabupaten', async () => {
    render1({ roles: ['kabupaten'] });

    fireEvent.click(screen.getByText('Admin Kabupaten'));

    await waitFor(() => expect(setActingRole).toHaveBeenCalledWith('kabupaten'));
  });

  it('KONTROL: Admin Kabupaten yang memilih Masyarakat tetap menjadi responden — gerbang PDP tak terlewati', async () => {
    render1({ roles: ['kabupaten', 'responden'] });

    fireEvent.click(screen.getByText('Masyarakat'));

    await waitFor(() => expect(setActingRole).toHaveBeenCalledWith('responden'));
  });

  it('tombol peran responden berlabel "Masyarakat", bukan "Warga"', () => {
    // Permintaan pengguna 8 September 2026. Nilai perannya TIDAK ikut berubah:
    // `setActingRole` tetap dipanggil dengan 'responden', dan itu dijaga uji
    // KONTROL di atas.
    render1({ roles: ['responden'] });

    expect(screen.getByText('Masyarakat')).toBeInTheDocument();
    expect(screen.queryByText('Warga')).not.toBeInTheDocument();
  });

  /**
   * Keterangannya kini MENJANJIKAN log aktivitas & manajemen pengguna, kebalikan
   * dari sebelum peleburan. Menjanjikan hal yang salah di sini membuat pengguna
   * mengira fiturnya rusak, bukan bahwa ia tak berhak.
   */
  it('keterangan tombol Admin Kabupaten menyebut log aktivitas & manajemen pengguna', () => {
    render1({ roles: ['kabupaten'] });

    expect(screen.getByText(/log aktivitas & manajemen pengguna/i)).toBeInTheDocument();
    expect(screen.queryByText(/TIDAK terbuka pada peran ini/i)).not.toBeInTheDocument();
  });

  it('KONTROL: penanda "sedang dipakai" tetap muncul', () => {
    render1({ roles: ['kabupaten'], currentRole: 'kabupaten' });

    expect(screen.getByText('sedang dipakai')).toBeInTheDocument();
  });
});
