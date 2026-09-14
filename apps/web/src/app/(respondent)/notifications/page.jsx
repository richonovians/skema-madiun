'use client';

import React from 'react';
import NotificationHistoryScreen from '@/features/notifications/components/NotificationHistoryScreen';

/**
 * Riwayat notifikasi warga. Lihat catatan pola di NotificationHistoryScreen.jsx.
 *
 * Padding disediakan DI SINI, bukan di komponen: `(respondent)/layout.jsx` tak
 * memberi padding mendatar sama sekali -- ketiga halaman warga lain memakai
 * `py-8 px-4 sm:px-6` yang sama. Di sisi admin, AdminLayout sudah memberinya,
 * jadi menaruhnya di komponen akan menggandakannya di sana.
 */
export default function NotificationsPage() {
  return <NotificationHistoryScreen dashboardHref="/dashboard" className="py-8 px-4 sm:px-6" />;
}
