import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import {
  NOTIFIKASI_BERUBAH_EVENT,
  markAllNotificationsRead,
  markNotificationRead,
} from '../notifications.api';

/**
 * PERISTIWA PENYELARAS NOTIFIKASI (laporan pengguna 15 September 2026).
 *
 * "Tandai semua dibaca" di halaman riwayat tidak memperbarui lonceng navbar.
 * Sebabnya kedua tempat itu memegang state `useAsync` masing-masing, yang hanya
 * mengambil data sekali saat mount; lonceng tinggal di layout sehingga tetap
 * terpasang -- memegang hitungan yang diambil SEBELUM tombolnya ditekan.
 *
 * Peristiwanya dikirim dari SERVICE, bukan dari komponen yang menekan tombol.
 * Setiap pemanggil yang ada sekarang dan yang ditulis nanti ikut terliput tanpa
 * harus mengingatnya; menaruhnya di komponen berarti penanda-dibaca berikutnya
 * yang ditulis orang lain akan diam-diam kembali membuat lonceng basi.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Menghitung peristiwa yang benar-benar sampai ke `window` selama satu uji. */
function pantauPeristiwa() {
  const terdengar = [];
  const dengar = () => terdengar.push(Date.now());
  window.addEventListener(NOTIFIKASI_BERUBAH_EVENT, dengar);
  return {
    jumlah: () => terdengar.length,
    lepas: () => window.removeEventListener(NOTIFIKASI_BERUBAH_EVENT, dengar),
  };
}

describe('notifications.api — peristiwa penyelaras', () => {
  it('menandai satu notifikasi mengabarkan perubahan', async () => {
    server.use(
      http.patch(`${API_BASE}/notifications/:id/read`, () => ok({}, '/notifications/1/read')),
    );
    const pantau = pantauPeristiwa();

    await markNotificationRead(1);

    expect(pantau.jumlah()).toBe(1);
    pantau.lepas();
  });

  it('menandai semua dibaca mengabarkan perubahan', async () => {
    server.use(
      http.patch(`${API_BASE}/notifications/read-all`, () => ok({}, '/notifications/read-all')),
    );
    const pantau = pantauPeristiwa();

    await markAllNotificationsRead();

    expect(pantau.jumlah()).toBe(1);
    pantau.lepas();
  });

  /**
   * PASANGAN kontrol, dan yang paling penting di berkas ini. Peristiwa yang
   * tetap dikirim saat servernya menolak membuat lonceng menyegarkan diri lalu
   * memperlihatkan angka yang SAMA -- pengguna menyimpulkan tombolnya bekerja
   * padahal tak satu pun notifikasi tertandai. Lonceng yang basi masih dapat
   * dikoreksi dengan memuat ulang halaman; keyakinan yang keliru tidak.
   */
  it('KONTROL: permintaan yang gagal tidak mengabarkan apa pun', async () => {
    server.use(
      http.patch(`${API_BASE}/notifications/read-all`, () =>
        Response.json({ message: 'Gagal' }, { status: 500 }),
      ),
    );
    const pantau = pantauPeristiwa();

    await expect(markAllNotificationsRead()).rejects.toThrow();

    expect(pantau.jumlah()).toBe(0);
    pantau.lepas();
  });

  it('KONTROL: penandaan satu notifikasi yang gagal juga tidak mengabarkan', async () => {
    server.use(
      http.patch(`${API_BASE}/notifications/:id/read`, () =>
        Response.json({ message: 'Gagal' }, { status: 500 }),
      ),
    );
    const pantau = pantauPeristiwa();

    await expect(markNotificationRead(1)).rejects.toThrow();

    expect(pantau.jumlah()).toBe(0);
    pantau.lepas();
  });
});
