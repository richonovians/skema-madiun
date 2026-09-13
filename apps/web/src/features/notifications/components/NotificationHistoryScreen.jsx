'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { BellOff, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import ErrorState from '@/components/ui/ErrorState';
import LoadingState from '@/components/ui/LoadingState';
import Pagination from '@/components/ui/Pagination';
import { useAsync } from '@/hooks/useAsync';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/services/notifications.api';

/**
 * Riwayat notifikasi lengkap (permintaan pengguna 13 September 2026: "melihat
 * notif yang sudah lama hingga terbaru").
 *
 * SATU implementasi untuk tiga area rute -- warga, Admin OPD, Admin Kabupaten --
 * mengikuti pola SurveyResponseDetailScreen.jsx. Yang membedakan hanya tautan
 * "kembali"; alamat tiap notifikasi datang dari backend, bukan disusun di sini,
 * jadi satu komponen ini melayani ketiganya tanpa tahu ia sedang di area mana.
 *
 * Paginasi & saringan dikerjakan BACKEND, bukan di klien. `GET /notifications`
 * sudah menerima `page`, `limit`, dan `unreadOnly` sejak awal, jadi memotong
 * daftar di klien berarti halaman ini hanya akan sepanjang satu permintaan --
 * persis batas yang membuat dropdown tak cukup.
 */
const LIMIT = 20;

export default function NotificationHistoryScreen({ dashboardHref, className = 'w-full pt-4' }) {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchData = useCallback(
    () => getNotifications({ page, limit: LIMIT, ...(unreadOnly ? { unreadOnly: true } : {}) }),
    [page, unreadOnly],
  );
  const { data, isLoading, error, refetch } = useAsync(fetchData);

  const notifications = data?.data ?? [];
  const pagination = data?.meta?.pagination ?? { total: 0, totalPages: 1 };

  // Mengubah saringan SELALU kembali ke halaman 1: "belum dibaca" hampir selalu
  // lebih pendek dari daftar penuh, jadi bertahan di halaman 4 berarti pengguna
  // menatap daftar kosong padahal datanya ada.
  const ubahSaringan = (nilai) => {
    setUnreadOnly(nilai);
    setPage(1);
  };

  const handleItemClick = async (notification) => {
    if (notification.isRead) return;
    try {
      await markNotificationRead(notification.id);
      refetch();
    } catch {
      // Navigasi tetap lanjut meski gagal menandai dibaca -- bukan penghalang.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      refetch();
    } catch {
      // Diamkan; pengguna bisa mencoba lagi.
    }
  };

  return (
    <div className={className}>
      <div className="mb-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">Riwayat Notifikasi</h1>
          <p className="text-body-md text-on-surface-variant mt-xs">
            Seluruh pemberitahuan Anda, dari yang terbaru hingga yang paling lama.
          </p>
        </div>
        <Link href={dashboardHref} className="text-label-lg text-primary hover:underline">
          Kembali ke dasbor
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-sm mb-md">
        <button
          type="button"
          onClick={() => ubahSaringan(false)}
          aria-pressed={!unreadOnly}
          className={`px-md py-sm rounded-full text-label-md transition-colors ${
            unreadOnly
              ? 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              : 'bg-primary text-on-primary'
          }`}
        >
          Semua
        </button>
        <button
          type="button"
          onClick={() => ubahSaringan(true)}
          aria-pressed={unreadOnly}
          className={`px-md py-sm rounded-full text-label-md transition-colors ${
            unreadOnly
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Belum dibaca
        </button>
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="ml-auto flex items-center gap-xs px-md py-sm rounded-full text-label-md text-primary hover:bg-primary/10 transition-colors"
        >
          <Check size={16} /> Tandai semua dibaca
        </button>
      </div>

      {isLoading ? (
        <LoadingState label="Memuat riwayat notifikasi..." />
      ) : error ? (
        <ErrorState
          title="Gagal memuat notifikasi"
          description={error.message}
          onRetry={refetch}
        />
      ) : (
        <Card className="overflow-hidden">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-2xl text-center px-lg">
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mb-md">
                <BellOff size={22} className="text-on-surface-variant" />
              </div>
              <p className="text-body-md text-on-surface-variant">
                {unreadOnly
                  ? 'Belum ada notifikasi yang belum dibaca.'
                  : 'Belum ada notifikasi untuk Anda.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {notifications.map((notification) => {
                const isi = (
                  <div
                    className={`px-lg py-md flex gap-md hover:bg-surface-container-low transition-colors ${
                      notification.isRead ? '' : 'bg-primary/5'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${
                        notification.isRead ? 'bg-transparent' : 'bg-primary'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-on-surface">{notification.title}</p>
                      <p className="text-body-sm text-on-surface-variant mt-xs">
                        {notification.message}
                      </p>
                      <p className="text-label-sm text-on-surface-variant mt-xs">
                        {notification.timeLabel}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={notification.id}>
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => handleItemClick(notification)}
                        className="block"
                      >
                        {isi}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => handleItemClick(notification)}
                      >
                        {isi}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {pagination.total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={LIMIT}
              onPageChange={setPage}
              itemName="notifikasi"
            />
          )}
        </Card>
      )}
    </div>
  );
}
