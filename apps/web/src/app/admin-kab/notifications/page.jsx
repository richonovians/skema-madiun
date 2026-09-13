'use client';

import React from 'react';
import NotificationHistoryScreen from '@/features/notifications/components/NotificationHistoryScreen';

/** Riwayat notifikasi Admin Kabupaten. Lihat catatan pola di NotificationHistoryScreen.jsx. */
export default function NotificationsPage() {
  return <NotificationHistoryScreen dashboardHref="/admin-kab/dashboard" />;
}
