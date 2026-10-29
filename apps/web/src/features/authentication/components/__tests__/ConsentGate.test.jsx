import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConsentGate from '../ConsentGate';
import { authApi } from '../../services/sso.api';

jest.mock('../../services/sso.api', () => ({
  authApi: { recordConsent: jest.fn() },
}));

jest.mock('@/hooks/useLogout', () => ({
  useLogout: () => ({ logout: jest.fn(), isLoggingOut: false }),
}));

/**
 * Tujuan navigasi dibuat berupa fragmen, karena jsdom hanya menjalankan
 * navigasi yang mengubah fragmen saja; alasannya lengkap ada di
 * `RoleLoginPicker.test.jsx`.
 */
jest.mock('@/constants/roleHome', () => ({
  ROLE_HOME: {
    kabupaten: '#beranda-kabupaten',
    opd: '#beranda-opd',
    responden: '#beranda-responden',
  },
}));

/**
 * GERBANG PERSETUJUAN UU PDP, uji pertamanya (26 Oktober 2026).
 *
 * Urutannya bagian dari kontrak: persetujuan dicatat backend, cookie `consent`
 * ditulis, BARU berpindah lewat navigasi keras -- proxy.js membaca cookie itu
 * pada permintaan berikutnya, jadi cookie yang belum tertulis memantulkan
 * pengguna kembali ke gerbang ini.
 */
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.location.hash = '';
  authApi.recordConsent.mockResolvedValue({ data: { consentAt: '2026-10-26T00:00:00.000Z' } });
});

const setujui = () => {
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /setuju & lanjutkan/i }));
};

describe('ConsentGate', () => {
  it('tombol setuju nonaktif sampai kotak persetujuan dicentang', () => {
    render(<ConsentGate />);

    const tombol = screen.getByRole('button', { name: /setuju & lanjutkan/i });
    expect(tombol).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));

    expect(tombol).toBeEnabled();
  });

  it('menyetujui mencatat persetujuan, menulis cookie, lalu mengantar ke beranda peran itu', async () => {
    render(<ConsentGate role="responden" />);

    setujui();

    await waitFor(() => expect(window.location.hash).toBe('#beranda-responden'));
    expect(authApi.recordConsent).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('consent')).toBe('1');
    expect(document.cookie).toContain('consent=1');
  });

  it('tanpa peran, tujuan bakunya beranda warga', async () => {
    render(<ConsentGate />);

    setujui();

    await waitFor(() => expect(window.location.hash).toBe('#beranda-responden'));
  });

  it('tidak berpindah sebelum backend selesai mencatat persetujuan', async () => {
    let selesai;
    authApi.recordConsent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          selesai = resolve;
        }),
    );
    render(<ConsentGate role="responden" />);

    setujui();

    expect(await screen.findByRole('button', { name: /menyimpan/i })).toBeDisabled();
    expect(window.location.hash).toBe('');
    expect(localStorage.getItem('consent')).toBeNull();

    selesai({});
    await waitFor(() => expect(window.location.hash).toBe('#beranda-responden'));
  });

  it('gagal mencatat: galat diumumkan, cookie tak ditulis, tak berpindah, dan dapat dicoba lagi', async () => {
    authApi.recordConsent.mockRejectedValueOnce(new Error('Server sedang bermasalah'));
    render(<ConsentGate role="responden" />);

    setujui();

    expect(await screen.findByRole('alert')).toHaveTextContent('Server sedang bermasalah');
    expect(window.location.hash).toBe('');
    expect(localStorage.getItem('consent')).toBeNull();
    expect(screen.getByRole('button', { name: /setuju & lanjutkan/i })).toBeEnabled();
  });

  it('galat tanpa pesan memakai kalimat cadangan', async () => {
    authApi.recordConsent.mockRejectedValueOnce(new Error(''));
    render(<ConsentGate role="responden" />);

    setujui();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Persetujuan gagal disimpan. Silakan coba lagi.',
    );
  });
});
