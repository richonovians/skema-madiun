import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, paginated, surveyFixture } from '@/mocks/handlers';
import AdminKabSurveysPage from '../page';

/**
 * TC-FE-006 — Umpan balik sesudah aksi berhasil maupun gagal.
 *
 * PREMIS ASLI KASUS UJI INI SUDAH USANG. Ia menuntut "notifikasi toast hijau
 * (Success) muncul di layar". **Aplikasi ini tak punya sistem toast sama
 * sekali** — tak ada `sonner`, `react-hot-toast`, maupun komponen toast buatan
 * sendiri di `components/ui/`. Yang dipakai adalah **panel sebaris** yang
 * menetap di atas daftar sampai aksi berikutnya.
 *
 * Itu bukan kekurangan. Toast menghilang sendiri setelah beberapa detik, dan
 * pesan seperti "Periode survei ditutup. Hasil IKM final sudah disimpan sebagai
 * snapshot." adalah keterangan yang perlu sempat dibaca — bukan kedipan. Panel
 * yang menetap juga terbaca pembaca layar tanpa perlu `aria-live`.
 *
 * Yang diuji karena itu bukan bentuknya, melainkan **apakah pengguna benar-benar
 * diberi tahu hasil aksinya**:
 *  - aksi berhasil → pesan yang menyebut APA yang terjadi, bukan "Sukses";
 *  - aksi gagal → pesan backend ditampilkan apa adanya, tidak ditelan;
 *  - pesan sukses lama tidak tertinggal saat aksi berikutnya gagal, dan
 *    sebaliknya — dua pesan bertentangan di layar lebih buruk daripada tak ada.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/admin-kab/surveys',
  useSearchParams: () => new URLSearchParams(),
}));

const SURVEI_DRAF = surveyFixture({
  id: 501,
  judul: 'Survei Uji Publikasi',
  status: 'draft',
  periode: '2026-Q3',
});

/**
 * Amplop GALAT backend yang sesungguhnya.
 *
 * Helper `ok()` di handlers.ts SELALU menulis `success: true` dan
 * `message: 'OK'` — dipakai dengan status 4xx ia menghasilkan amplop yang tak
 * pernah dikirim backend, dan interceptor api.js membaca `message` = "OK"
 * sehingga yang tampil di layar bukan pesan yang diuji. Percobaan pertama
 * memakai `ok(..., 422)` dan gagal persis karena itu.
 */
const gagal = (pesan, status = 422) =>
  HttpResponse.json(
    {
      success: false,
      statusCode: status,
      message: pesan,
      error: { code: 'UNPROCESSABLE_ENTITY', details: pesan },
      meta: { timestamp: new Date().toISOString(), path: '/api/v1/surveys/501/status' },
    },
    { status },
  );

const daftarBerisi = (survei) =>
  server.use(
    http.get(`${API_BASE}/surveys`, () => paginated([survei], '/surveys')),
  );

/**
 * Tekan aksi baris lalu setujui dialog konfirmasinya.
 *
 * Nama keduanya dipakai PERSIS, bukan pola: tombol barisnya berbunyi
 * "Publikasikan" dan tombol konfirmasinya "Ya, Publikasikan", jadi pola longgar
 * mencocokkan dua-duanya sekaligus dan pengujiannya gagal dengan pesan yang
 * tak menyebut sebab sesungguhnya.
 */
async function jalankanAksi(namaTombol, namaKonfirmasi) {
  fireEvent.click(await screen.findByRole('button', { name: namaTombol, exact: true }));
  const konfirmasi = await screen.findByRole('button', { name: namaKonfirmasi, exact: true });
  fireEvent.click(konfirmasi);
}

describe('Umpan balik aksi survei (TC-FE-006)', () => {
  it('menyebut apa yang terjadi, bukan sekadar "berhasil"', async () => {
    daftarBerisi(SURVEI_DRAF);
    server.use(
      http.patch(`${API_BASE}/surveys/:id/status`, () =>
        ok(surveyFixture({ id: 501, status: 'aktif' }), '/surveys/501/status'),
      ),
    );

    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Uji Publikasi');

    await jalankanAksi('Publikasikan', 'Ya, Publikasikan');

    // Kalimatnya menerangkan AKIBATNYA bagi warga, bukan cuma status teknis.
    expect(
      await screen.findByText(/berhasil dipublikasikan dan kini dapat diisi responden/i),
    ).toBeInTheDocument();
  });

  it('menampilkan pesan backend apa adanya saat aksi gagal', async () => {
    daftarBerisi(SURVEI_DRAF);
    server.use(
      http.patch(`${API_BASE}/surveys/:id/status`, () =>
        gagal('Survei tidak memiliki pertanyaan unsur IKM'),
      ),
    );

    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Uji Publikasi');

    await jalankanAksi('Publikasikan', 'Ya, Publikasikan');

    // Menggantinya dengan "Terjadi kesalahan" menghapus satu-satunya petunjuk
    // yang bisa dipakai admin untuk membereskannya sendiri.
    expect(await screen.findByText(/Survei tidak memiliki pertanyaan unsur IKM/)).toBeInTheDocument();
  });

  it('tidak menyisakan pesan sukses lama ketika aksi berikutnya gagal', async () => {
    daftarBerisi(SURVEI_DRAF);
    let panggilan = 0;
    server.use(
      http.patch(`${API_BASE}/surveys/:id/status`, () => {
        panggilan += 1;
        return panggilan === 1
          ? ok(surveyFixture({ id: 501, status: 'aktif' }), '/surveys/501/status')
          : gagal('Transisi status tidak diizinkan');
      }),
    );

    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Uji Publikasi');

    await jalankanAksi('Publikasikan', 'Ya, Publikasikan');
    await screen.findByText(/berhasil dipublikasikan/i);

    await jalankanAksi('Publikasikan', 'Ya, Publikasikan');

    expect(await screen.findByText(/Transisi status tidak diizinkan/)).toBeInTheDocument();
    // Dua pesan bertentangan di layar sekaligus lebih buruk daripada tak ada
    // pesan sama sekali — admin tak tahu mana yang berlaku.
    await waitFor(() =>
      expect(screen.queryByText(/berhasil dipublikasikan/i)).not.toBeInTheDocument(),
    );
  });
});
