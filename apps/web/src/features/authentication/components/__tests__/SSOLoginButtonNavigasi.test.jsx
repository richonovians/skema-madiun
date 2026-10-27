import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SSOLoginButton from '../SSOLoginButton';
import { authApi } from '../../services/sso.api';
import { clearSession, saveSession } from '../../services/authStorage';

/**
 * TUJUAN NAVIGASI SSOLoginButton (27 Oktober 2026).
 *
 * Tempat navigasi terakhir yang belum teruji sejak BUG-038: uji yang ada
 * (`SSOLoginButton.test.jsx`) hanya menjaga tampilan galat. Polanya sama dengan
 * `RoleLoginPicker.test.jsx`: jsdom HANYA menjalankan navigasi yang mengubah
 * fragmen, jadi alamat SSO dan setiap beranda dipetakan ke `#...`, dan
 * `location.hash` sesudahnya menyebut ke mana komponennya mengarah.
 */
jest.mock('@/constants/roleHome', () => ({
  ROLE_HOME: {
    kabupaten: '#beranda-kabupaten',
    opd: '#beranda-opd',
    responden: '#beranda-responden',
  },
}));
jest.mock('../../services/sso.api', () => ({
  getSsoLoginUrl: () => '#masuk-sso',
  authApi: { devLogin: jest.fn() },
}));
jest.mock('../../services/authStorage', () => ({
  saveSession: jest.fn(),
  clearSession: jest.fn(),
}));
jest.mock('../RoleLoginPicker', () => ({
  __esModule: true,
  default: ({ userName, roles }) => (
    <div data-testid="pemilih-peran">
      {userName}:{roles.join(',')}
    </div>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
  window.location.hash = '';
});

const loginDev = async (user) => {
  authApi.devLogin.mockResolvedValue({ data: { token: 'token-uji', user } });
  render(<SSOLoginButton />);
  fireEvent.click(screen.getByRole('button', { name: /akun dev/i }));
  fireEvent.change(screen.getByPlaceholderText(/email akun/i), {
    target: { value: 'uji@example.go.id' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
  await waitFor(() => expect(authApi.devLogin).toHaveBeenCalledWith('uji@example.go.id'));
};

describe('SSOLoginButton — tombol SSO', () => {
  it('membersihkan sesi lama lalu menuju alamat mulai-login SSO', () => {
    render(<SSOLoginButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Masuk via SSO Helpdesk' }));

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#masuk-sso');
    expect(screen.getByRole('button', { name: 'Mengalihkan...' })).toBeDisabled();
  });
});

describe('SSOLoginButton — dev-login', () => {
  it('satu peran: menyimpan sesi lalu menuju beranda actingRole', async () => {
    await loginDev({ nama: 'Uji', roles: ['opd'], actingRole: 'opd', consentRequired: false });

    await waitFor(() => expect(window.location.hash).toBe('#beranda-opd'));
    expect(saveSession).toHaveBeenCalledWith('token-uji', 'opd', false);
  });

  it('actingRole kosong: beranda peran pertama', async () => {
    await loginDev({ nama: 'Uji', roles: ['kabupaten'], actingRole: null });

    await waitFor(() => expect(window.location.hash).toBe('#beranda-kabupaten'));
  });

  it('daftar peran tak dikirim: actingRole tetap menentukan beranda', async () => {
    // Satu-satunya keadaan yang membedakan `actingRole ?? roles[0]` dari
    // `roles[0]` saja: dengan satu peran keduanya selalu sama.
    await loginDev({ nama: 'Uji', actingRole: 'responden' });

    await waitFor(() => expect(window.location.hash).toBe('#beranda-responden'));
  });

  it('peran tak dikenal: kembali ke "/"', async () => {
    // Dari alamat ber-fragmen: navigasi ke "/" membuang fragmennya, dan hanya
    // itu jejak yang dapat dibaca jsdom.
    window.location.hash = '#awal';

    await loginDev({ nama: 'Uji', roles: ['asing'], actingRole: 'asing' });

    await waitFor(() => expect(window.location.hash).toBe(''));
  });

  it('banyak peran: membuka pemilih peran, TIDAK bernavigasi', async () => {
    await loginDev({ nama: 'Uji', roles: ['responden', 'opd'], actingRole: null, opdId: 3 });

    expect(await screen.findByTestId('pemilih-peran')).toHaveTextContent('Uji:responden,opd');
    expect(window.location.hash).toBe('');
  });

  it('login gagal: TIDAK bernavigasi', async () => {
    authApi.devLogin.mockRejectedValue(new Error('Pengguna tidak ditemukan'));
    render(<SSOLoginButton />);
    fireEvent.click(screen.getByRole('button', { name: /akun dev/i }));
    fireEvent.change(screen.getByPlaceholderText(/email akun/i), {
      target: { value: 'tak@ada.go.id' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Pengguna tidak ditemukan');
    expect(window.location.hash).toBe('');
    expect(saveSession).not.toHaveBeenCalled();
  });
});
