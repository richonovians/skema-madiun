import { formatRelativeTime } from '@/utils/format';

/**
 * Terjemahkan NotificationEntity backend (GET /notifications, D9) ke bentuk
 * yang dipakai NotificationDropdown.jsx. Satu tempat -- perubahan kontrak
 * backend cukup diubah di sini (INT-6).
 */
export function adaptNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    isRead: notification.isRead,
    timeLabel: formatRelativeTime(notification.createdAt),
  };
}

export function adaptNotificationList(notifications) {
  return notifications.map(adaptNotification);
}
