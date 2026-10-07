import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileContent from '../ProfileContent';
import { getMyProfile } from '../../services/profile.api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../../services/profile.api', () => ({ getMyProfile: jest.fn() }));

/**
 * KOLOM KANAN TIDAK LAGI MENEMPEL (6 Oktober 2026, permintaan pengguna: "pada
 * halaman profil, ketika saya scroll ke bawah bagian Koneksi SSO ikut ke
 * bawah").
 *
 * Kartu itu ber-`lg:sticky lg:top-24`, jadi di layar lebar ia mengikuti
 * gulungan sementara kolom kirinya berjalan -- yang terbaca sebagai kartu yang
 * membuntuti, bukan sebagai tata letak yang disengaja.
 *
 * DIPERIKSA LEWAT KELASNYA, bukan lewat posisi terhitung: jsdom tak menjalankan
 * tata letak, sehingga `getBoundingClientRect` selalu nol dan "menempel" tak
 * dapat diamati dari sana. Kelas itulah satu-satunya wujud keputusannya.
 */
const PENGGUNA = {
  name: 'Siti Aminah',
  email: 'siti@example.go.id',
  initials: 'SA',
  roleLabel: 'Responden',
  roles: ['responden'],
  sso: { providerName: null, accountId: 'SKEMA-00042', portalUrl: null, lastSynced: null },
};

describe('ProfileContent — kolom kanan ikut menggulung', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMyProfile.mockResolvedValue(PENGGUNA);
  });

  it('kolom Koneksi SSO tidak memakai kelas sticky', async () => {
    const { container } = render(<ProfileContent />);
    await screen.findByText('Koneksi SSO');

    const kolom = container.querySelector('[class*="col-span-5"]');
    expect(kolom).not.toBeNull();
    expect(kolom.className).not.toMatch(/sticky/);
  });

  it('kolom kirinya tetap utuh, bukan ikut diubah', async () => {
    const { container } = render(<ProfileContent />);
    await screen.findByText('Informasi Biodata');

    expect(container.querySelector('[class*="col-span-7"]')).not.toBeNull();
  });
});
