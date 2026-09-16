import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, paginated, notificationFixture } from '@/mocks/handlers';
import NotificationDropdown, { JEDA_SEGARKAN_MS } from '../NotificationDropdown';
import { NOTIFIKASI_BERUBAH_EVENT } from '@/features/notifications/services/notifications.api';

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

  /**
   * Permintaan pengguna 13 September 2026: dropdown hanya memuat 10 teratas dan
   * tak punya satu pun jalan menuju sisanya, sehingga notifikasi lama praktis
   * tak terjangkau.
   */
  describe('jalan menuju riwayat lengkap', () => {
    it('menawarkan tautan lihat semua ke alamat yang diberikan pemanggil', async () => {
      givenNotifications([BELUM_DIBACA], 1);

      render(<NotificationDropdown allHref="/admin-opd/notifications" />);
      fireEvent.click(lonceng());

      const tautan = await screen.findByRole('link', { name: /lihat semua notifikasi/i });
      expect(tautan).toHaveAttribute('href', '/admin-opd/notifications');
    });

    /**
     * Bakunya rute warga: `Navbar` dipakai juga di halaman publik, dan
     * DashboardNavbar.jsx (kini tak terpakai) tak meneruskan prop apa pun.
     */
    it('tanpa prop, mengarah ke rute notifikasi warga', async () => {
      givenNotifications([BELUM_DIBACA], 1);

      render(<NotificationDropdown />);
      fireEvent.click(lonceng());

      expect(await screen.findByRole('link', { name: /lihat semua notifikasi/i })).toHaveAttribute(
        'href',
        '/notifications',
      );
    });

    it('tetap tampil saat daftar kosong -- justru di situ riwayat lama dicari', async () => {
      givenNotifications([], 0);

      render(<NotificationDropdown />);
      fireEvent.click(lonceng());

      expect(await screen.findByRole('link', { name: /lihat semua notifikasi/i })).toBeInTheDocument();
    });
  });
});

/**
 * LONCENG IKUT MENYELARASKAN DIRI (laporan pengguna 15 September 2026).
 *
 * "Tandai semua dibaca" di halaman riwayat tak memperbarui lonceng ini.
 * Sebabnya lonceng dan halaman itu memegang state `useAsync` masing-masing,
 * yang hanya mengambil data sekali saat mount -- dan lonceng tinggal di layout,
 * sehingga ia tetap terpasang selama pengguna berada di halaman riwayat,
 * memegang hitungan yang diambil SEBELUM tombolnya ditekan.
 *
 * Yang diuji di sini bukan tombol halaman itu, melainkan kesediaan lonceng
 * mendengar: apakah ia mengambil ulang hitungannya ketika ada yang mengabarkan
 * status baca berubah, dari mana pun kabar itu datang.
 */
describe('NotificationDropdown — menyelaraskan diri dengan layar lain', () => {
  const lonceng = () => screen.getByRole('button', { name: /notifikasi/i });

  it('mengambil ulang hitungannya saat status baca dikabarkan berubah', async () => {
    givenNotifications([BELUM_DIBACA], 3);
    render(<NotificationDropdown />);
    expect(await screen.findByRole('button', { name: /3 belum dibaca/i })).toBeInTheDocument();

    // Layar lain menandai semuanya terbaca: server kini menjawab nol.
    givenNotifications([], 0);
    await act(async () => {
      window.dispatchEvent(new Event(NOTIFIKASI_BERUBAH_EVENT));
    });

    await waitFor(() => expect(lonceng()).toHaveAccessibleName('Notifikasi'));
  });

  /**
   * PASANGAN kontrol. Tanpa ini, uji di atas tetap hijau seandainya lonceng
   * mengambil ulang datanya karena sebab lain -- polling, render ulang, atau
   * sekadar urutan janji yang kebetulan menguntungkan. Yang harus dibuktikan
   * adalah PERISTIWA itu yang melakukannya.
   */
  it('KONTROL: tanpa kabar apa pun, hitungannya tidak berubah sendiri', async () => {
    givenNotifications([BELUM_DIBACA], 3);
    render(<NotificationDropdown />);
    expect(await screen.findByRole('button', { name: /3 belum dibaca/i })).toBeInTheDocument();

    givenNotifications([], 0);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(lonceng()).toHaveAccessibleName('Notifikasi, 3 belum dibaca');
  });
});

/**
 * LENCANA YANG TAK IKUT BERUBAH SAAT ADA NOTIFIKASI BARU (16 September 2026,
 * pertanyaan pengguna).
 *
 * `useAsync` mengambil data sekali per pemasangan, dan satu-satunya penyegaran
 * lain adalah `skema:notifikasi-berubah` yang HANYA ditembakkan tab ini sendiri
 * sesudah menandai notifikasi terbaca. Notifikasi yang dibuat pihak lain, mis.
 * OPD membalas pengaduan, tak pernah sampai. Loncengnya hidup di navbar milik
 * layout, jadi berpindah halaman pun tak memasangnya ulang.
 *
 * Aturan tidurnya diuji terpisah di useSegarkanBerkala.test.js; berkas ini
 * menguji bahwa loncengnya benar-benar memakainya.
 */
describe('NotificationDropdown — penyegaran berkala', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lencananya ikut naik tanpa komponen dipasang ulang', async () => {
    givenNotifications([BELUM_DIBACA], 1);
    render(<NotificationDropdown />);

    expect(
      await screen.findByRole('button', { name: 'Notifikasi, 1 belum dibaca' }),
    ).toBeInTheDocument();

    // Notifikasi baru muncul di server, bukan karena aksi pengguna di tab ini.
    givenNotifications([BELUM_DIBACA], 3);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(JEDA_SEGARKAN_MS);
    });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Notifikasi, 3 belum dibaca' }),
      ).toBeInTheDocument(),
    );
  });

  /**
   * KONTROL, dan inilah yang membuat perubahan ini terasa mengganggu bila
   * keliru: `useAsync.execute` menyalakan `isLoading` pada SETIAP panggilan,
   * sementara panel merender `isLoading ? spinner : daftar`. Tanpa syarat
   * "hanya saat belum ada data", panel yang sedang dibuka berkedip jadi spinner
   * tiap satu jeda.
   */
  it('KONTROL: panel yang terbuka tidak berkedip jadi spinner saat menyegarkan', async () => {
    givenNotifications([BELUM_DIBACA], 1);
    const { container } = render(<NotificationDropdown />);

    fireEvent.click(screen.getByRole('button', { name: /notifikasi/i }));
    expect(await screen.findByText('Status Pengaduan Diperbarui')).toBeInTheDocument();

    let lepaskan;
    server.use(
      http.get(`${API_BASE}/notifications`, async () => {
        await new Promise((resolve) => {
          lepaskan = resolve;
        });
        return paginated([BELUM_DIBACA], '/notifications');
      }),
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(JEDA_SEGARKAN_MS);
    });

    // Permintaan masih menggantung: isinya harus tetap terlihat, tanpa spinner.
    expect(screen.getByText('Status Pengaduan Diperbarui')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();

    await act(async () => {
      lepaskan?.();
      await jest.advanceTimersByTimeAsync(0);
    });
  });
});
