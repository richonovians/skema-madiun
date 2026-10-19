import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileContent from '../ProfileContent';
import { getMyProfile } from '../../services/profile.api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../../services/profile.api', () => ({ getMyProfile: jest.fn() }));

/**
 * TOMBOL LOGOUT DIBUANG DARI HALAMAN PROFIL (4 Oktober 2026, permintaan
 * pengguna: "sudah ada di navbar").
 *
 * Tombolnya adalah seluruh isi `ProfileActions.jsx`, dan berkas itu dihapus
 * bersama tombolnya karena tak punya isi lain dan tak punya pemanggil lain.
 *
 * Ada sebab kedua yang tak terlihat dari layar: ProfileActions MENYALIN SENDIRI
 * urutan logout (authApi.logout -> clearSession -> router.push), padahal hook
 * bersama `useLogout` dibuat justru supaya tempat-tempat itu tak diam-diam tak
 * sinkron -- dan ProfileActions tak pernah ikut memakainya. Menghapusnya
 * sekaligus menghapus salinan yang tertinggal.
 *
 * Uji ini merender SELURUH ProfileContent, bukan potongan, sebab yang dijanjikan
 * kepada pengguna adalah tak ada lagi tombol itu DI HALAMANNYA.
 */
const PENGGUNA = {
  name: 'Siti Aminah',
  email: 'siti@example.go.id',
  initials: 'SA',
  roleLabel: 'Responden',
  roles: ['responden'],
  sso: { providerName: null, accountId: 'SKEMA-00042', portalUrl: null, lastSynced: null },
};

describe('ProfileContent — tanpa tombol logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMyProfile.mockResolvedValue(PENGGUNA);
  });

  it('tidak lagi menampilkan tombol Logout di halaman profil', async () => {
    render(<ProfileContent />);
    await screen.findByText('Informasi Biodata');

    expect(screen.queryByRole('button', { name: /logout|keluar/i })).not.toBeInTheDocument();
  });

  /**
   * PAGAR UTAMA. Uji di atas juga hijau bila halamannya gagal termuat dan tak
   * menggambar apa pun -- ketiadaan tombol pada halaman kosong tidak
   * membuktikan apa-apa. Karena itu isi halaman yang HARUS tetap ada
   * dinyatakan tersurat di sini.
   */
  it('tetap menampilkan seluruh kartu profil lainnya', async () => {
    render(<ProfileContent />);

    expect(await screen.findByText('Informasi Biodata')).toBeInTheDocument();
    expect(screen.getByText('Informasi Akun')).toBeInTheDocument();
    expect(screen.getByText('Koneksi SSO')).toBeInTheDocument();
  });
});
