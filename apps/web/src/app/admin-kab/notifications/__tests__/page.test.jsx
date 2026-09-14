import React from 'react';
import { render, screen } from '@testing-library/react';
import NotificationsKabPage from '../page';
import {
  getNotifications,
  getUnreadNotificationCount,
} from '@/features/notifications/services/notifications.api';

jest.mock('@/features/notifications/services/notifications.api', () => ({
  getNotifications: jest.fn(),
  getUnreadNotificationCount: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));

/**
 * Laporan pengguna 13 September 2026: "tampilan riwayat notifikasi pada role
 * admin kabupaten masih kurang tertata".
 *
 * Akarnya terbukti di layout, bukan selera. `AdminKabLayout` memberi `<main>`
 * HANYA `pt-[var(--tinggi-navbar-kab)]` -- tanpa padding sisi maupun bawah --
 * sedangkan `AdminLayout` milik OPD memberi `px-4 pb-4 md:px-lg md:pb-lg`.
 * Itulah sebabnya halaman ini menempel tepi kiri hanya di sisi kabupaten.
 *
 * Ketiga belas halaman admin-kab lainnya sudah menyediakan `p-lg` sendiri
 * (audit-logs, complaints, users, surveys, opd, sampah, ...); halaman notifikasi
 * satu-satunya yang tidak. Uji ini menjaga agar ia tak tertinggal lagi.
 */
beforeEach(() => {
  jest.clearAllMocks();
  getNotifications.mockResolvedValue({
    data: [],
    meta: { pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } },
  });
  getUnreadNotificationCount.mockResolvedValue(0);
});

describe('NotificationsKabPage', () => {
  it('memberi padding sendiri, sebab AdminKabLayout tak memberinya sama sekali', async () => {
    const { container } = render(<NotificationsKabPage />);

    await screen.findByRole('heading', { name: 'Riwayat Notifikasi' });
    expect(container.firstChild.className).toMatch(/\bp-lg\b/);
  });

  it('tautan kembalinya menuju dashboard kabupaten, bukan dashboard peran lain', async () => {
    render(<NotificationsKabPage />);

    const tautan = await screen.findByRole('link', { name: /Kembali ke Dashboard/i });
    expect(tautan).toHaveAttribute('href', '/admin-kab/dashboard');
  });
});
