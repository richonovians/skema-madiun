import api from '@/services/api';
import { adaptNotificationList } from '../adapters/notification.adapter';

/**
 * `sort`/`from`/`to` ditambahkan 13 September 2026. `to` diterima backend tetapi
 * belum dipakai layar mana pun: semua preset rentang berakhir "sampai sekarang".
 *
 * @param {{unreadOnly?: boolean, page?: number, limit?: number,
 *   sort?: 'asc'|'desc', from?: string, to?: string}} params
 */
export async function getNotifications(params = {}) {
  const response = await api.get('/notifications', { params });
  return { data: adaptNotificationList(response.data), meta: response.meta };
}

export async function getUnreadNotificationCount() {
  const response = await api.get('/notifications/unread-count');
  return response.data.count;
}

export async function markNotificationRead(id) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/notifications/read-all');
  return response.data;
}
