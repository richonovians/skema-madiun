import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, paginated, notificationFixture } from '@/mocks/handlers';
import NotificationHistoryScreen from '../NotificationHistoryScreen';

/**
 * Permintaan pengguna 13 September 2026: "tambahkan halaman dan tombol pada
 * notifikasi untuk melihat semua histori notifikasi agar dapat melihat notif
 * yang sudah lama hingga terbaru".
 *
 * Dropdown hanya mengambil 10 teratas dan tak punya jalan ke sisanya. Backend
 * sudah mendukung `page`/`limit`/`unreadOnly` beserta meta paginasi, jadi yang
 * diuji di sini murni layarnya: apakah ia benar-benar meminta halaman
 * berikutnya, dan apakah saringan "belum dibaca" sampai ke permintaan.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const NOW = new Date('2026-09-13T10:00:00.000Z').getTime();
const menitLalu = (n) => new Date(NOW - n * 60_000).toISOString();

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BARU = notificationFixture({
  id: 1,
  title: 'Survei Mulai Menerima Jawaban',
  message: 'Survei "SKM Loket" menerima jawaban pertama',
  link: '/admin-opd/surveys/7/responses',
  isRead: false,
  createdAt: menitLalu(5),
});

const LAMA = notificationFixture({
  id: 2,
  title: 'Pengaduan Baru Masuk',
  message: 'Pengaduan baru PGD20260101AAAA masuk',
  link: null,
  isRead: true,
  createdAt: menitLalu(60 * 24 * 120),
});

describe('NotificationHistoryScreen', () => {
  let nowSpy;

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => nowSpy.mockRestore());

  /** Rekam setiap query yang dikirim ke GET /notifications. */
  const rekamPermintaan = (list = [BARU, LAMA], { total = 2, limit = 20 } = {}) => {
    const query = [];
    server.use(
      http.get(`${API_BASE}/notifications`, ({ request }) => {
        const url = new URL(request.url);
        query.push(Object.fromEntries(url.searchParams));
        return paginated(list, '/notifications', {
          page: Number(url.searchParams.get('page') ?? 1),
          limit,
          total,
        });
      }),
      http.get(`${API_BASE}/notifications/unread-count`, () =>
        ok({ count: 1 }, '/notifications/unread-count'),
      ),
    );
    return query;
  };

  it('menampilkan notifikasi lama maupun terbaru dalam satu daftar', async () => {
    rekamPermintaan();
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    expect(await screen.findByText('Survei Mulai Menerima Jawaban')).toBeInTheDocument();
    expect(screen.getByText('Pengaduan Baru Masuk')).toBeInTheDocument();
  });

  /**
   * Inilah yang membedakan halaman ini dari dropdown: dropdown terkunci di 10
   * teratas, sedangkan halaman ini harus benar-benar meminta halaman berikutnya.
   */
  it('meminta halaman berikutnya ke backend, bukan memotong daftar di klien', async () => {
    const query = rekamPermintaan([BARU, LAMA], { total: 45 });
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    await screen.findByText('Survei Mulai Menerima Jawaban');
    expect(query[0].page).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: /berikutnya|selanjutnya|next/i }));

    await waitFor(() => expect(query.length).toBeGreaterThan(1));
    expect(query[query.length - 1].page).toBe('2');
  });

  it('saringan "belum dibaca" diteruskan ke permintaan, bukan disaring di klien', async () => {
    const query = rekamPermintaan();
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    await screen.findByText('Survei Mulai Menerima Jawaban');
    fireEvent.click(screen.getByRole('button', { name: /belum dibaca/i }));

    await waitFor(() =>
      expect(query.some((q) => q.unreadOnly === 'true' || q.unreadOnly === true)).toBe(true),
    );
  });

  it('kembali ke halaman 1 saat saringan diubah', async () => {
    const query = rekamPermintaan([BARU, LAMA], { total: 45 });
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    await screen.findByText('Survei Mulai Menerima Jawaban');
    fireEvent.click(screen.getByRole('button', { name: /berikutnya|selanjutnya|next/i }));
    await waitFor(() => expect(query[query.length - 1].page).toBe('2'));

    fireEvent.click(screen.getByRole('button', { name: /belum dibaca/i }));

    // Tanpa ini, saringan baru dibuka pada halaman 2 yang mungkin sudah kosong,
    // dan pengguna melihat daftar hampa padahal datanya ada.
    await waitFor(() => expect(query[query.length - 1].page).toBe('1'));
  });

  it('notifikasi bertaut dirender sebagai tautan ke alamatnya', async () => {
    rekamPermintaan();
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    const tautan = await screen.findByRole('link', { name: /Survei Mulai Menerima Jawaban/i });
    expect(tautan).toHaveAttribute('href', '/admin-opd/surveys/7/responses');
  });

  it('daftar kosong menjelaskan keadaannya, bukan diam', async () => {
    rekamPermintaan([], { total: 0 });
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    expect(await screen.findByText(/belum ada notifikasi/i)).toBeInTheDocument();
  });

  it('tombol tandai semua dibaca memanggil backend lalu memuat ulang', async () => {
    const query = rekamPermintaan();
    let dipanggil = 0;
    server.use(
      http.patch(`${API_BASE}/notifications/read-all`, () => {
        dipanggil += 1;
        return ok({ updated: 1 }, '/notifications/read-all');
      }),
    );
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    await screen.findByText('Survei Mulai Menerima Jawaban');
    const sebelum = query.length;
    fireEvent.click(screen.getByRole('button', { name: /tandai semua dibaca/i }));

    await waitFor(() => expect(dipanggil).toBe(1));
    await waitFor(() => expect(query.length).toBeGreaterThan(sebelum));
  });
});
