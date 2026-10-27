import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DashboardNavbar from '../DashboardNavbar';
import Navbar from '../Navbar';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/features/authentication/services/authStorage', () => ({
  isAuthenticated: () => true,
  SESSION_CHANGED_EVENT: 'sesi-berubah',
}));
jest.mock('@/features/profile/components/ProfileAvatarDropdown', () => ({
  __esModule: true,
  default: () => <div />,
}));
jest.mock('@/components/ui/NotificationDropdown', () => ({
  __esModule: true,
  default: () => <div />,
}));

/**
 * Tombol hamburger warga dan publik mengumumkan keadaannya (27 Oktober 2026,
 * BUG-043 & BUG-044).
 *
 * DashboardNavbar: tombolnya hanya berisi ikon, TANPA nama sama sekali --
 * pembaca layar mengumumkannya sebagai "tombol" saja. Navbar publik: namanya
 * berganti Buka/Tutup tetapi tanpa `aria-expanded`/`aria-controls`. Laci
 * keduanya hanya dirender selagi terbuka, jadi `aria-controls` diperiksa
 * sesudah dibuka.
 */
describe.each([
  ['DashboardNavbar (dashboard warga)', DashboardNavbar, /buka menu navigasi/i],
  ['Navbar (halaman publik)', Navbar, /menu navigasi/i],
])('%s — tombol hamburger', (_, Komponen, nama) => {
  it('bernama, dan aria-expanded mengikuti laci', () => {
    render(<Komponen />);
    const tombol = screen.getByRole('button', { name: nama });

    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
  });

  it('aria-controls menunjuk laci yang terbuka', () => {
    render(<Komponen />);
    const tombol = screen.getByRole('button', { name: nama });

    fireEvent.click(tombol);
    const id = tombol.getAttribute('aria-controls');
    expect(id).toBeTruthy();
    const laci = document.getElementById(id);
    expect(laci).not.toBeNull();
    expect(laci).not.toContainElement(tombol);
    expect(laci.querySelectorAll('a').length).toBeGreaterThan(0);
  });
});
