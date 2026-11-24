import { act, renderHook } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { ambilDraf, simpanDraf } from '@/utils/drafLokal';
import { useLogout } from '../useLogout';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/features/authentication/services/sso.api', () => ({
  authApi: { logout: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@/features/authentication/services/authStorage', () => ({
  ...jest.requireActual('@/features/authentication/services/authStorage'),
  clearSession: jest.fn(),
}));

/**
 * Logout yang disengaja menghapus SEMUA draf di peramban (23 November 2026).
 * Inilah jalan keluar warga di komputer bersama, dan teks penyimpanan draf
 * menjanjikannya: "Keluar dari akun akan menghapusnya.", atau saat sesi sudah
 * berakhir "masuk lalu keluar dari akun".
 */
beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

it('logout menghapus draf yang tersimpan', async () => {
  await simpanDraf('pengaduan', { pemilik: 10, kedaluwarsa: Date.now() + 60000, isi: {} });
  const { result } = renderHook(() => useLogout());

  await act(() => result.current.logout());

  expect(await ambilDraf('pengaduan')).toBeNull();
});
