import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../Footer';
import DashboardFooter from '../DashboardFooter';
import ServiceSelector from '@/components/sections/ServiceSelector';

/**
 * Footer dan kartu "Pilih Layanan" berlatar navy, warna yang sama dengan token
 * `primary` (4 November 2026). Isinya karena itu tak boleh ikut memakai
 * `primary`: ikon kontak dan bola cahaya di kartu akan lenyap tanpa satu galat
 * pun, sebab jsdom tidak memuat CSS.
 */
describe('permukaan navy', () => {
  it('Footer berlatar navy dan ikon kontaknya tidak senada dengan latar', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');

    expect(footer).toHaveClass('bg-primary');
    expect(footer.querySelectorAll('svg.text-primary')).toHaveLength(0);
    expect(footer.querySelectorAll('svg.text-brand-cyan')).toHaveLength(3);
  });

  it('DashboardFooter berlatar navy', () => {
    const { container } = render(<DashboardFooter />);

    expect(container.querySelector('footer')).toHaveClass('bg-primary');
  });

  it('kartu Pilih Layanan berlatar navy dengan keterangan yang terbaca', () => {
    render(<ServiceSelector />);
    const kartu = screen.getByRole('heading', { name: 'Pilih Layanan' }).closest('.rounded-3xl');

    expect(kartu).toHaveClass('bg-primary');
    expect(kartu.querySelector('.bg-primary\\/20')).toBeNull();
    expect(screen.getByText(/Akses cepat ke berbagai layanan/)).toHaveClass('text-slate-300');
  });
});
