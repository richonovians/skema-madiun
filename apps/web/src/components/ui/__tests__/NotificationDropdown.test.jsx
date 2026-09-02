import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, paginated, notificationFixture } from '@/mocks/handlers';
import NotificationDropdown from '../NotificationDropdown';

/**
 * Notifikasi in-app (D9) — sebelumnya TIDAK punya cakupan uji sama sekali,
 * padahal komponen ini memanggil empat endpoint sekaligus dan memuat lencana
 * yang dulu selalu bernilai `false` (shell UI murni, tidak pernah fetch).
 *
 * `timeLabel` dihitung dari `Date.now()` lewat `formatRelativeTime`, jadi
 * waktu sekarang dikunci agar labelnya bisa diuji pasti — bukan bergantung
 * kapan test dijalankan.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const NOW = new Date('2026-08-10T10:00:00.000Z').getTime();
const menitLalu = (n) => new Date(NOW - n * 60_000).toISOString();

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Balas daftar notifikasi + jumlah belum dibaca dalam satu penataan. */
const givenNotifications = (list, unreadCount) => {
  server.use(
    http.get(`${API_BASE}/notifications`, () => paginated(list, '/notifications')),
    http.get(`${API_BASE}/notifications/unread-count`, () =>
      ok({ count: unreadCount }, '/notifications/unread-count'),
    ),
  );
};

const BELUM_DIBACA = notificationFixture({
  id: 1,
  title: 'Status Pengaduan Diperbarui',
  message: 'Pengaduan PGD20260806CDPH kini berstatus "Selesai"',
  link: '/admin-kab/complaints/PGD20260806CDPH',
  isRead: false,
  createdAt: menitLalu(5),
});

const SUDAH_DIBACA = notificationFixture({
  id: 2,
  title: 'Survei Baru Dipublikasikan',
  message: 'Survei "SKM Triwulan III" telah aktif',
  link: null,
  isRead: true,
  createdAt: menitLalu(180),
});

describe('NotificationDropdown', () => {
  let nowSpy;

  beforeEach(() => {
    // Hanya Date.now yang dikunci — timer asli dibiarkan supaya waitFor tetap jalan.
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  /**
   * Lonceng dikueri lewat nama yang bisa diakses. Sampai 2 September 2026 helper
   * ini terpaksa berbunyi `{ name: '' }` karena tombolnya memang TIDAK punya nama
   * sama sekali (BUG-002) -- kueri itulah sidik jari cacatnya. Setelah
   * `aria-label` dipasang, sembilan kasus di berkas ini gagal serentak, persis
   * seperti yang diharapkan dari uji yang merekam sebuah cacat.
   */
  const lonceng = () => screen.getByRole('button', { name: /notifikasi/i });

  describe('Lencana belum dibaca', () => {
    it('menyebutkan jumlah belum dibaca pada nama tombol, bukan hanya titik merah', async () => {
      givenNotifications([BELUM_DIBACA, SUDAH_DIBACA], 1);
      const { container } = render(<NotificationDropdown />);

      // Inti perbaikan BUG-002: jumlahnya kini terbaca pembaca layar. Titik
      // merahnya semata-mata visual, jadi tanpa ini pengguna yang tak melihatnya
      // tidak punya cara apa pun mengetahui ada notifikasi baru.
      expect(
        await screen.findByRole('button', { name: 'Notifikasi, 1 belum dibaca' }),
      ).toBeInTheDocument();
      // Penanda visualnya tetap ada berdampingan dengan teks alternatifnya.
      expect(container.querySelector('.bg-error')).toBeInTheDocument();
    });

    it('tidak menampilkan lencana maupun menyebut jumlah ketika semua sudah dibaca', async () => {
      givenNotifications([SUDAH_DIBACA], 0);
      const { container } = render(<NotificationDropdown />);

      // Tunggu pemuatan selesai lewat sinyal semantik, baru periksa lencana.
      fireEvent.click(lonceng());
      expect(await screen.findByText('Survei Baru Dipublikasikan')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Notifikasi' })).toBeInTheDocument();
      expect(container.querySelector('.bg-error')).not.toBeInTheDocument();
    });
  });

  describe('Isi panel', () => {
    it('menampilkan daftar notifikasi dari API beserta label waktu relatif', async () => {
      givenNotifications([BELUM_DIBACA, SUDAH_DIBACA], 1);
      render(<NotificationDropdown />);

      fireEvent.click(lonceng());

      expect(await screen.findByText('Status Pengaduan Diperbarui')).toBeInTheDocument();
      expect(
        screen.getByText('Pengaduan PGD20260806CDPH kini berstatus "Selesai"'),
      ).toBeInTheDocument();
      expect(screen.getByText('5 menit lalu')).toBeInTheDocument();
      expect(screen.getByText('3 jam lalu')).toBeInTheDocument();
    });

    it('menampilkan keadaan kosong ketika tidak ada notifikasi', async () => {
      givenNotifications([], 0);
      render(<NotificationDropdown />);

      fireEvent.click(lonceng());

      expect(await screen.findByText('Pemberitahuan baru akan muncul di sini.')).toBeInTheDocument();
    });

    it('merender notifikasi bertaut sebagai tautan, dan yang tanpa taut sebagai tombol', async () => {
      givenNotifications([BELUM_DIBACA, SUDAH_DIBACA], 1);
      render(<NotificationDropdown />);

      fireEvent.click(lonceng());
      await screen.findByText('Status Pengaduan Diperbarui');

      expect(screen.getByRole('link', { name: /status pengaduan diperbarui/i })).toHaveAttribute(
        'href',
        '/admin-kab/complaints/PGD20260806CDPH',
      );
      expect(
        screen.getByRole('button', { name: /survei baru dipublikasikan/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Tandai dibaca', () => {
    it('menandai satu notifikasi dibaca lalu menutup panel', async () => {
      givenNotifications([BELUM_DIBACA], 1);
      const dipanggil = jest.fn();
      server.use(
        http.patch(`${API_BASE}/notifications/:id/read`, ({ params }) => {
          dipanggil(params.id);
          return ok(notificationFixture({ id: Number(params.id), isRead: true }), '/notifications');
        }),
      );

      render(<NotificationDropdown />);
      fireEvent.click(lonceng());
      fireEvent.click(await screen.findByText('Status Pengaduan Diperbarui'));

      await waitFor(() => expect(dipanggil).toHaveBeenCalledWith('1'));
      // Panel tertutup begitu item diklik.
      await waitFor(() =>
        expect(screen.queryByText('Status Pengaduan Diperbarui')).not.toBeInTheDocument(),
      );
    });

    it('tidak memanggil API ketika notifikasi yang diklik sudah dibaca', async () => {
      givenNotifications([SUDAH_DIBACA], 0);
      const dipanggil = jest.fn();
      server.use(
        http.patch(`${API_BASE}/notifications/:id/read`, ({ params }) => {
          dipanggil(params.id);
          return ok(notificationFixture({ id: Number(params.id) }), '/notifications');
        }),
      );

      render(<NotificationDropdown />);
      fireEvent.click(lonceng());
      fireEvent.click(await screen.findByText('Survei Baru Dipublikasikan'));

      await waitFor(() =>
        expect(screen.queryByText('Survei Baru Dipublikasikan')).not.toBeInTheDocument(),
      );
      expect(dipanggil).not.toHaveBeenCalled();
    });

    it('menampilkan "Tandai semua dibaca" hanya ketika ada yang belum dibaca', async () => {
      givenNotifications([SUDAH_DIBACA], 0);
      render(<NotificationDropdown />);

      fireEvent.click(lonceng());
      await screen.findByText('Survei Baru Dipublikasikan');

      expect(screen.queryByText(/tandai semua dibaca/i)).not.toBeInTheDocument();
    });

    it('"Tandai semua dibaca" memanggil API lalu memuat ulang daftar', async () => {
      givenNotifications([BELUM_DIBACA], 1);
      const dipanggil = jest.fn();
      server.use(
        http.patch(`${API_BASE}/notifications/read-all`, () => {
          dipanggil();
          // Setelah ditandai, pemuatan ulang harus mendapati nol belum dibaca.
          givenNotifications([{ ...BELUM_DIBACA, isRead: true }], 0);
          return ok({ updated: 1 }, '/notifications/read-all');
        }),
      );

      render(<NotificationDropdown />);
      fireEvent.click(lonceng());
      fireEvent.click(await screen.findByText(/tandai semua dibaca/i));

      await waitFor(() => expect(dipanggil).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(screen.queryByText(/tandai semua dibaca/i)).not.toBeInTheDocument(),
      );
    });

    it('tetap menutup panel meski penandaan dibaca gagal di server', async () => {
      givenNotifications([BELUM_DIBACA], 1);
      server.use(
        http.patch(`${API_BASE}/notifications/:id/read`, () =>
          ok({ statusCode: 500, message: 'Gagal' }, '/notifications', 500),
        ),
      );

      render(<NotificationDropdown />);
      fireEvent.click(lonceng());
      fireEvent.click(await screen.findByText('Status Pengaduan Diperbarui'));

      // Kegagalan sengaja ditelan komponen — navigasi tidak boleh terhalang.
      await waitFor(() =>
        expect(screen.queryByText('Status Pengaduan Diperbarui')).not.toBeInTheDocument(),
      );
    });
  });
});
