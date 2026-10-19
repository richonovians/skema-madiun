import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import api from '../api';

/**
 * Dua keadaan yang sama-sama 401 tapi menuntut penanganan BERLAWANAN
 * (5 September 2026):
 *
 * - sesi mati            -> buang artefak sesi, pengguna harus login ulang.
 * - peran belum dipilih  -> sesinya MASIH SAH; yang dibutuhkan hanya satu
 *                           pilihan peran, jadi membuang sesi di sini memaksa
 *                           login ulang tanpa sebab DAN menghalangi pemiliknya
 *                           mencapai halaman pemilih peran.
 *
 * Backend membedakannya lewat `error.code`; berkas ini menjaga agar frontend
 * ikut membedakannya.
 *
 * BATAS YANG PERLU DINYATAKAN TERUS TERANG: pengalihan ke `/pilih-peran` TIDAK
 * diuji di sini, dan itu bukan kelalaian. Di jsdom 26 `window.location.assign`
 * bersifat non-writable DAN non-configurable (diperiksa langsung lewat
 * `getOwnPropertyDescriptor`), sehingga tak dapat di-spy maupun didefinisikan
 * ulang; `Object.defineProperty(window, 'location', ...)` juga ditolak. Menulis
 * uji yang "lulus" untuk itu hanya mungkin dengan membungkus navigasi di
 * lapisan tambahan yang ada semata demi ujinya. Pengalihannya diverifikasi di
 * peramban sungguhan, bukan di sini.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Handler AWAL, bukan lewat `server.use()`: hanya yang diberikan ke
 * `setupServer` yang bertahan melewati `resetHandlers()` di `afterEach`.
 *
 * `POST /auth/logout` ada di sini karena `clearSession()` kini memanggilnya
 * sendiri (perbaikan sesi hantu, 8 September 2026) — cookie `session` HttpOnly
 * hanya dapat dihapus server. Tanpa handler ini, `onUnhandledRequest: 'bypass'`
 * meneruskan permintaan itu ke jaringan sungguhan, dan undici di dalam jsdom
 * gagal dengan `markResourceTiming is not a function` — galat yang sama sekali
 * tak berhubungan dengan apa pun yang diuji berkas ini.
 */
const server = setupServer(
  http.post(`${API_BASE}/auth/logout`, () => HttpResponse.json({ success: true })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

const balas401 = (code) =>
  server.use(
    http.get(`${API_BASE}/auth/me`, () =>
      HttpResponse.json(
        { success: false, statusCode: 401, message: 'x', error: { code, details: null } },
        { status: 401 },
      ),
    ),
  );

describe('interceptor 401', () => {
  it('ROLE_SELECTION_REQUIRED TIDAK membuang sesi', async () => {
    localStorage.setItem('token', 'token-sah');
    // Path disetel ke /pilih-peran supaya interceptor melewati pengalihannya:
    // jsdom mencatat "Not implemented: navigation" ke console.error dan
    // keluaran uji harus bersih. Yang diuji di sini keadaan SESINYA, dan itu
    // tak dipengaruhi cabang navigasi sama sekali.
    window.history.pushState({}, '', '/pilih-peran');
    balas401('ROLE_SELECTION_REQUIRED');

    await expect(api.get('/auth/me')).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBe('token-sah');
  });

  /**
   * KONTROL, dan inilah yang membuat uji di atas bermakna: kalau pembersihan
   * sesi dimatikan untuk SEMUA 401, uji di atas juga lulus -- dan sesi yang
   * benar-benar mati akan dibiarkan menggantung sehingga proxy tetap membuka
   * halaman yang seluruh API-nya 401.
   */
  it('KONTROL: 401 biasa TETAP membuang sesi', async () => {
    localStorage.setItem('token', 'token-basi');
    balas401('UNAUTHORIZED');

    await expect(api.get('/auth/me')).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('403 tidak menyentuh sesi sama sekali', async () => {
    localStorage.setItem('token', 'token-sah');
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json(
          {
            success: false,
            statusCode: 403,
            message: 'Anda tidak memiliki hak akses',
            error: { code: 'FORBIDDEN', details: null },
          },
          { status: 403 },
        ),
      ),
    );

    await expect(api.get('/auth/me')).rejects.toBeDefined();

    // Penolakan karena PERAN bukan penolakan autentikasi. Ini yang membuat
    // "bertindak sebagai role lain lalu ditolak 403" tidak mengeluarkan
    // pengguna dari sesinya -- keadaan yang jadi lumrah sejak multi-role.
    expect(localStorage.getItem('token')).toBe('token-sah');
  });
});

/**
 * PERPANJANGAN SESI YANG DIKABARKAN LEWAT HEADER (17 September 2026, laporan
 * pengguna: sesi kemarin masih hidup hari ini).
 *
 * Backend kini memperpanjang jendela menganggur sesi selama dipakai, lalu
 * menyebut waktu berakhirnya yang baru pada header `X-Sesi-Berakhir`. Frontend
 * WAJIB menerimanya: `isAuthenticated()` memutuskan dari `sso_expires_at` di
 * localStorage, dan pada jalur SSO tokennya HttpOnly sehingga waktu itu tak
 * dapat disimpulkan sendiri. Tanpa langkah ini cookie diperpanjang diam-diam di
 * server sementara antarmuka memantulkan pemiliknya keluar dengan waktu lama.
 */
describe('api — menerima perpanjangan sesi dari header', () => {
  const kemarin = () => Math.floor(Date.now() / 1000) + 60;
  const nanti = () => Math.floor(Date.now() / 1000) + 3600;

  it('memperbarui masa berlaku sesi dari header respons', async () => {
    const baru = nanti();
    localStorage.setItem('sso_logged_in', 'true');
    localStorage.setItem('sso_expires_at', String(kemarin()));
    server.use(
      http.get(`${API_BASE}/apa-saja`, () =>
        HttpResponse.json(
          { success: true, data: { ok: true } },
          { headers: { 'X-Sesi-Berakhir': String(baru) } },
        ),
      ),
    );

    await api.get('/apa-saja');

    expect(Number(localStorage.getItem('sso_expires_at'))).toBe(baru);
  });

  /**
   * KONTROL. Respons biasa jauh lebih banyak daripada yang membawa header ini;
   * menulis ulang masa berlaku pada setiap respons akan memperpanjang sesi
   * tanpa izin server, persis kebalikan dari yang sedang diperbaiki.
   */
  it('KONTROL: respons tanpa header itu tidak mengubah apa pun', async () => {
    const semula = kemarin();
    localStorage.setItem('sso_logged_in', 'true');
    localStorage.setItem('sso_expires_at', String(semula));
    server.use(
      http.get(`${API_BASE}/apa-saja`, () => HttpResponse.json({ success: true, data: {} })),
    );

    await api.get('/apa-saja');

    expect(Number(localStorage.getItem('sso_expires_at'))).toBe(semula);
  });
});
