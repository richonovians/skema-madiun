import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../Navbar';
import { isAuthenticated } from '@/features/authentication/services/authStorage';

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('@/features/authentication/services/authStorage', () => ({
  isAuthenticated: jest.fn(),
  SESSION_CHANGED_EVENT: 'sesi-berubah',
}));
// Keduanya memanggil API saat dipasang; yang diuji di sini bukan isinya.
jest.mock('@/features/profile/components/ProfileAvatarDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));
jest.mock('@/components/ui/NotificationDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="lonceng" />,
}));

const ALAMAT_DAFTAR = 'https://helpdesk.madiunkab.go.id/register';

describe('Navbar', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('pengunjung belum masuk', () => {
    beforeEach(() => isAuthenticated.mockReturnValue(false));

    it('menawarkan "Registrasi Helpdesk" ke portal pendaftaran di tab baru', () => {
      render(<Navbar />);

      const tautan = screen.getAllByRole('link', { name: /registrasi helpdesk/i })[0];
      expect(tautan).toHaveAttribute('href', ALAMAT_DAFTAR);
      expect(tautan).toHaveAttribute('target', '_blank');
      // Tanpa noopener, halaman tujuan memegang `window.opener` dan dapat
      // mengalihkan tab asal ke mana pun.
      expect(tautan.getAttribute('rel')).toMatch(/noopener/);
    });

    /**
     * Permintaan pengguna 14 September 2026: tombol masuk PINDAH ke hero.
     * Tanpa uji ini, navbar yang masih memuat keduanya tetap lolos, dan
     * halamannya punya dua tombol masuk yang saling berebut perhatian.
     */
    it('TIDAK lagi memuat tombol masuk SSO', () => {
      render(<Navbar />);

      expect(screen.queryByRole('button', { name: /masuk via sso/i })).not.toBeInTheDocument();
    });

    it('drawer ponsel juga memuat tautan registrasi', () => {
      render(<Navbar />);
      const sebelum = screen.getAllByRole('link', { name: /registrasi helpdesk/i }).length;

      fireEvent.click(screen.getByLabelText(/toggle navigation menu/i));

      expect(screen.getAllByRole('link', { name: /registrasi helpdesk/i }).length).toBeGreaterThan(
        sebelum,
      );
    });
  });

  /**
   * PASANGAN yang membuat uji di atas berarti. Tautan yang muncul tanpa syarat
   * juga akan meluluskan ketiganya, sambil menawarkan pendaftaran akun kepada
   * orang yang jelas-jelas sudah punya akun dan sedang memakainya.
   */
  it('KONTROL: yang sudah masuk melihat avatar, bukan tautan registrasi', () => {
    isAuthenticated.mockReturnValue(true);

    render(<Navbar />);

    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /registrasi helpdesk/i })).not.toBeInTheDocument();
  });
});
