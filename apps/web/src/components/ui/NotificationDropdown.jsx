'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Check, Loader2 } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/features/notifications/services/notifications.api';

const LIST_LIMIT = 10;

/**
 * D9 (2026-08-05, in-app saja): SEBELUMNYA murni shell UI -- panel selalu
 * menampilkan state kosong ("Pemberitahuan baru akan muncul di sini"), tak
 * pernah fetch data sama sekali, `hasIndicator` diisi manual oleh pemanggil
 * (AdminNavbar SELALU `false`, tak pernah diisi dinamis). Kini fetch nyata
 * (GET /notifications + /notifications/unread-count) saat komponen mount --
 * TIDAK ada polling (scope MVP, sesuai gaya proyek yg belum pakai websocket
 * di mana pun) -- lencana & daftar hanya refresh saat mount ulang atau
 * setelah aksi tandai-dibaca.
 */
export default function NotificationDropdown({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchData = useCallback(async () => {
    const [{ data: notifications }, unreadCount] = await Promise.all([
      getNotifications({ limit: LIST_LIMIT }),
      getUnreadNotificationCount(),
    ]);
    return { notifications, unreadCount };
  }, []);
  const { data, isLoading, refetch } = useAsync(fetchData);

  // TIDAK memakai useBodyScrollLock (2026-08-24, permintaan user: "ketika panel
  // notif muncul masih tetap bisa di scroll backgroundnya"). Kunci gulir halaman
  // memang keliru di sini: ini dropdown, bukan dialog -- ia tak menutupi halaman
  // dan tak menuntut keputusan, jadi membekukan halaman di belakangnya membuat
  // panel terasa seperti modal padahal bukan.
  //
  // Masalah yang dulu dituju kunci itu (guliran melewati ujung daftar merembet ke
  // halaman) tetap ditangani, tapi oleh `overscroll-contain` pada daftar di bawah
  // -- itu memutus perembetan TANPA menyentuh kemampuan gulir halaman.

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = async (notification) => {
    setIsOpen(false);
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        refetch();
      } catch {
        // Navigasi tetap lanjut meski gagal menandai dibaca -- bukan blocker.
      }
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsRead();
      refetch();
    } catch {
      // Diamkan -- pengguna bisa coba lagi, tak perlu ganggu alur dropdown.
    }
  };

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const hasIndicator = unreadCount > 0;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 hover:bg-surface-container-low rounded-full transition-all flex items-center justify-center min-w-[44px] min-h-[44px] relative ${isOpen ? 'bg-surface-container-low text-primary' : 'text-outline'}`}
      >
        <Bell size={20} className={isOpen ? 'text-primary' : 'text-on-surface'} />
        {hasIndicator && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-3 w-[300px] sm:w-[360px] bg-white/95 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 origin-top-right transition-all duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-700">Notifikasi</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Check size={12} /> Tandai semua dibaca
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 text-center">
                <div className="relative w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2.5">
                  <div className="absolute inset-0 rounded-full border border-slate-300 animate-ping opacity-20"></div>
                  <BellOff size={18} className="text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Pemberitahuan baru akan muncul di sini.
                </p>
              </div>
            ) : (
              <ul className="max-h-96 overflow-y-auto overscroll-contain divide-y divide-slate-50">
                {notifications.map((notification) => {
                  const content = (
                    <div
                      className={`px-4 py-3 flex gap-2.5 hover:bg-slate-50 transition-colors ${!notification.isRead ? 'bg-primary/5' : ''}`}
                    >
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-primary' : 'bg-transparent'}`}
                      ></span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{notification.title}</p>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{notification.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{notification.timeLabel}</p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={notification.id}>
                      {notification.link ? (
                        <Link href={notification.link} onClick={() => handleItemClick(notification)}>
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => handleItemClick(notification)}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
