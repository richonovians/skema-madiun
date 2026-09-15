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

/**
 * Dikirim setiap kali status baca notifikasi berubah, agar layar mana pun yang
 * sedang memajang notifikasi menyelaraskan diri (laporan pengguna 15 September
 * 2026: "tandai semua dibaca" di halaman riwayat tak memperbarui lonceng
 * navbar).
 *
 * Lonceng dan halaman riwayat memegang state `useAsync` masing-masing, yang
 * hanya mengambil data sekali saat mount. Lonceng tinggal di layout sehingga
 * tetap terpasang selama pengguna berada di halaman riwayat -- ia memegang
 * hitungan yang diambil SEBELUM tombolnya ditekan, dan tak ada yang
 * memberitahunya bahwa angka itu sudah basi.
 *
 * Namanya mengikuti `SESSION_CHANGED_EVENT` (`skema:sesi-berubah`) di
 * authStorage.js -- pola peristiwa `window` yang sudah dipakai repo ini untuk
 * menjaga Navbar dan HeroSection tetap sejalan, bukan cara baru.
 */
export const NOTIFIKASI_BERUBAH_EVENT = 'skema:notifikasi-berubah';

/**
 * DI SINI, bukan di komponen yang menekan tombolnya.
 *
 * Penanda-dibaca dipanggil dari dua layar sekarang, dan setiap layar berikutnya
 * yang memanggilnya harus ikut mengabarkan perubahan itu. Menaruh pengabaran di
 * komponen berarti pemanggil berikutnya diam-diam mengembalikan bug yang sama
 * -- tak ada galat, hanya lonceng yang kembali basi.
 */
function kabarkanPerubahan() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NOTIFIKASI_BERUBAH_EVENT));
}

export async function markNotificationRead(id) {
  const response = await api.patch(`/notifications/${id}/read`);
  // SESUDAH permintaannya berhasil. Mengabarkan lebih dulu membuat layar
  // menyegarkan diri lalu memperlihatkan angka yang sama saat server menolak,
  // dan pengguna menyimpulkan tombolnya bekerja padahal tak ada yang tertandai.
  kabarkanPerubahan();
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/notifications/read-all');
  kabarkanPerubahan();
  return response.data;
}
