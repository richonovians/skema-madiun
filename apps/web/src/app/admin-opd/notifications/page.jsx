'use client';

import React from 'react';
import NotificationHistoryScreen from '@/features/notifications/components/NotificationHistoryScreen';

/**
 * Riwayat notifikasi Admin OPD. Lihat catatan pola di NotificationHistoryScreen.jsx.
 *
 * Tanpa kelas padding: `AdminLayout` (khusus rute OPD) sudah memberi `px-4 pb-4
 * md:px-lg md:pb-lg` dan jarak atas yang diukur dari tinggi bilah navigasi.
 */
export default function NotificationsPage() {
  return <NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />;
}
