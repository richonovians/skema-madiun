import React from 'react';
import { render, screen } from '@testing-library/react';
import KabFilterScopeNote from '../KabFilterScopeNote';

/**
 * Catatan cakupan menjelaskan APA yang sedang menyaring layar. Sesudah
 * penyaring jenis layanan dibuang (15 September 2026), kalimat yang masih
 * menyebutnya menjanjikan kendali yang tak ada di mana pun -- pembacanya akan
 * mencari dropdown itu di navbar dan menyimpulkan aplikasinya rusak.
 */
describe('KabFilterScopeNote — sesudah penyaring layanan dibuang', () => {
  it('tidak lagi menyebut jenis layanan', () => {
    render(<KabFilterScopeNote periode="" />);

    expect(screen.queryByText(/jenis layanan/i)).toBeNull();
  });

  /**
   * PASANGAN kontrol. Catatan yang dikosongkan seluruhnya juga lolos uji di
   * atas, dan bersamanya hilang keterangan mana angka yang mengikuti triwulan
   * -- satu-satunya hal yang membuat dashboard ini dapat dibaca dengan benar.
   */
  it('KONTROL: cakupan periode tetap dijelaskan', () => {
    render(<KabFilterScopeNote periode="" />);

    expect(screen.getByText(/semua periode/i)).toBeInTheDocument();
    expect(screen.getByText(/Mengikuti penyaring:/)).toBeInTheDocument();
  });
});
