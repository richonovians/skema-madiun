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
 * dipasang — dan akun ber-role `[superuser]` melihat NOL tombol.
 *
 * DIJALANKAN terhadap komponen LAMA: 3 dari 6 memerah. Tiga yang tetap hijau
 * ditandai KONTROL di bawah — mereka menjaga arah sebaliknya (bahwa perubahan
 * ini TIDAK mengubah perilaku peran lain), bukan membuktikan perubahannya.
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
  it('akun HANYA superuser melihat tombol Admin Kabupaten, bukan nol tombol', () => {
    render1({ roles: ['superuser'] });

    expect(screen.getByText('Admin Kabupaten')).toBeInTheDocument();
    expect(screen.queryByText('Superuser')).not.toBeInTheDocument();
  });

  it('menekan tombol itu mengirim act=superuser, bukan act=kabupaten', async () => {
    render1({ roles: ['superuser'] });

    fireEvent.click(screen.getByText('Admin Kabupaten'));

    // Inti permintaan pengguna: tombolnya Admin Kabupaten, haknya superuser.
    await waitFor(() => expect(setActingRole).toHaveBeenCalledWith('superuser'));
  });

  it('KONTROL: akun kabupaten biasa tetap mengirim act=kabupaten', async () => {
    render1({ roles: ['kabupaten'] });

    fireEvent.click(screen.getByText('Admin Kabupaten'));

    await waitFor(() => expect(setActingRole).toHaveBeenCalledWith('kabupaten'));
  });

  it('KONTROL: superuser yang memilih Masyarakat tetap menjadi responden — gerbang PDP tak terlewati', async () => {
    render1({ roles: ['superuser', 'responden'] });

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

  it('akun bersuperuser diberi keterangan yang BERBEDA pada tombol yang sama', () => {
    // Tombolnya satu, haknya tidak sama. Menjanjikan hal yang salah di sini
    // membuat pengguna mengira manajemen pengguna rusak, bukan tak berhak.
    render1({ roles: ['superuser'] });
    expect(screen.getByText(/bersuperuser, jadi log aktivitas/i)).toBeInTheDocument();

    render1({ roles: ['kabupaten'] });
    expect(screen.getByText(/TIDAK terbuka pada peran ini/i)).toBeInTheDocument();
  });

  it('KONTROL: penanda "sedang dipakai" tetap muncul untuk superuser', () => {
    render1({ roles: ['superuser'], currentRole: 'superuser' });

    expect(screen.getByText('sedang dipakai')).toBeInTheDocument();
  });
});
