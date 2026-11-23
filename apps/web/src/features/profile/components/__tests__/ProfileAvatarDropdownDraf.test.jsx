import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { ambilDraf, simpanDraf } from '@/utils/drafLokal';
import ProfileAvatarDropdown from '../ProfileAvatarDropdown';
import { getMyProfile } from '../../services/profile.api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../../services/profile.api', () => ({ getMyProfile: jest.fn() }));
jest.mock('@/features/authentication/services/sso.api', () => ({
  authApi: { logout: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@/features/authentication/services/authStorage', () => ({
  ...jest.requireActual('@/features/authentication/services/authStorage'),
  clearSession: jest.fn(),
}));

/**
 * Menu akun menyalin logika logout sendiri, tidak memakai `useLogout`. Tanpa
 * uji ini, tombol Logout yang paling sering dipakai warga dapat lupa
 * menghapus draf sementara `useLogout` tetap hijau.
 */
beforeEach(() => {
  global.indexedDB = new IDBFactory();
  getMyProfile.mockResolvedValue({
    name: 'Warga Contoh',
    email: 'warga@example.go.id',
    initials: 'WC',
    roleLabel: 'Responden',
    roles: ['responden'],
  });
});

it('Logout dari menu akun menghapus draf yang tersimpan', async () => {
  await simpanDraf('pengaduan', { pemilik: 10, kedaluwarsa: Date.now() + 60000, isi: {} });
  render(<ProfileAvatarDropdown />);
  fireEvent.click(await screen.findByLabelText(/menu akun saya/i));

  fireEvent.click(await screen.findByRole('button', { name: /logout/i }));

  await waitFor(async () => expect(await ambilDraf('pengaduan')).toBeNull());
});
