import api from '@/services/api';
import { adaptNotificationList } from '../adapters/notification.adapter';

/** @param {{unreadOnly?: boolean, page?: number, limit?: number}} params */
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
