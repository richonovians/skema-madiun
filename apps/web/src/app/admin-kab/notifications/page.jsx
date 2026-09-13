'use client';

import React from 'react';
import NotificationHistoryScreen from '@/features/notifications/components/NotificationHistoryScreen';

/**
 * Riwayat notifikasi Admin Kabupaten. Lihat catatan pola di NotificationHistoryScreen.jsx.
 *
 * `p-lg` DISEDIAKAN DI SINI. Catatan sebelumnya di berkas ini keliru: rute
 * kabupaten memakai `AdminKabLayout`, bukan `AdminLayout`, dan `<main>`-nya
 * hanya membawa `pt-[var(--tinggi-navbar-kab)]` -- tanpa padding sisi maupun
 * bawah. Itulah sebabnya halaman ini menempel tepi kiri hanya di sisi
 * kabupaten, sementara sisi OPD baik-baik saja (`AdminLayout` memberi
 * `px-4 pb-4 md:px-lg md:pb-lg`).
 *
 * Paddingnya ditaruh di halaman, bukan di layout: ketiga belas halaman
 * admin-kab lainnya sudah menyediakan `p-lg` sendiri, jadi menambahkannya di
 * `AdminKabLayout` akan menggandakannya di semua halaman itu sekaligus.
 */
export default function NotificationsPage() {
  return <NotificationHistoryScreen dashboardHref="/admin-kab/dashboard" className="p-lg" />;
}
