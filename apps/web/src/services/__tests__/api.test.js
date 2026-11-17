import { AxiosError } from 'axios';
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
 *
 * Sebagian dikoreksi 26 Oktober 2026. KAPAN ia mengalihkan kini diuji: jsdom
 * mencatat "Not implemented: navigation" untuk setiap navigasi yang tak ia
 * jalankan, jadi ada-tidaknya pesan itu membuktikan ada-tidaknya pengalihan --
 * termasuk penjaga yang mencegah /pilih-peran mengalihkan ke dirinya sendiri.
 * TUJUANNYA tetap tak diuji. Trik fragmen yang dipakai uji komponen (lihat
 * `RoleLoginPicker.test.jsx`) menuntut uji berdiri di jalur tujuan itu sendiri,
 * dan di /pilih-peran penjaga tadi justru menahan pengalihannya.
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

  describe('pengalihan ke pemilih peran', () => {
    let galat;
    beforeEach(() => {
      galat = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      galat.mockRestore();
      window.history.pushState({}, '', '/');
    });

    const adaNavigasi = () =>
      galat.mock.calls.some((args) =>
        args.some((a) => String(a?.message ?? a).includes('Not implemented: navigation')),
      );

    it('dari halaman lain, ROLE_SELECTION_REQUIRED memicu navigasi keras', async () => {
      window.history.pushState({}, '', '/admin-opd/dashboard');
      balas401('ROLE_SELECTION_REQUIRED');

      await expect(api.get('/auth/me')).rejects.toBeDefined();

      expect(adaNavigasi()).toBe(true);
    });

    /**
     * Halaman pemilih peran sendiri memanggil API yang dapat menjawab
     * ROLE_SELECTION_REQUIRED. Mengalihkannya ke dirinya sendiri = memuat ulang
     * tanpa henti.
     *
     * Fragmen `#awal` WAJIB. Tanpanya `assign('/pilih-peran')` dari
     * `/pilih-peran` adalah alamat yang persis sama, dan jsdom mengabaikannya
     * tanpa pesan apa pun -- uji ini tetap hijau walau penjaganya dibuang
     * (terukur lewat mutasi, 26 Oktober 2026). Dengan fragmen, pengalihan yang
     * lolos membuang `#awal`.
     */
    it('di /pilih-peran sendiri TIDAK bernavigasi', async () => {
      window.history.pushState({}, '', '/pilih-peran#awal');
      balas401('ROLE_SELECTION_REQUIRED');

      await expect(api.get('/auth/me')).rejects.toBeDefined();

      expect(window.location.hash).toBe('#awal');
      expect(adaNavigasi()).toBe(false);
    });

    it('KONTROL: 401 biasa tidak mengalihkan ke pemilih peran', async () => {
      window.history.pushState({}, '', '/admin-opd/dashboard');
      balas401('UNAUTHORIZED');

      await expect(api.get('/auth/me')).rejects.toBeDefined();

      expect(adaNavigasi()).toBe(false);
    });
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

  /**
   * BUG-063 (3 November 2026): pengunjung tanpa sesi memicu satu
   * `POST /auth/logout` untuk setiap 401, padahal tak ada sesi yang dicabut.
   *
   * Dasarnya urutan pembacaan kredensial di backend
   * (`SessionAuthProvider.extractToken`): header Bearer didahulukan, cookie
   * `session` hanya dibaca bila header itu tak ada. Permintaan logout tak
   * pernah membawa Bearer. Jadi bila permintaan yang ditolak pun tak membawa
   * Bearer, yang baru saja ditolak server adalah cookie yang SAMA (atau
   * ketiadaannya) -- logout dengan cookie itu pasti 401 juga.
   *
   * `fetch` diintip, bukan dihitung lewat handler MSW: `clearSession()`
   * memanggilnya SINKRON di dalam interceptor, sehingga panggilannya sudah
   * tercatat begitu `api.get` menolak, tanpa perlu menunggu jeda sembarang
   * untuk membuktikan ketiadaannya. axios sendiri memakai XHR di jsdom, jadi
   * intipan ini hanya melihat logout.
   */
  describe('logout ke server hanya bila masih mungkin berguna (BUG-063)', () => {
    let intipFetch;
    beforeEach(() => {
      intipFetch = jest.spyOn(global, 'fetch');
    });
    afterEach(() => intipFetch.mockRestore());

    const panggilanLogout = () =>
      intipFetch.mock.calls.filter(([url]) => /\/auth\/logout$/.test(String(url)));

    it('401 pada permintaan TANPA Bearer tidak menembakkan POST /auth/logout', async () => {
      balas401('UNAUTHORIZED');

      await expect(api.get('/auth/me')).rejects.toBeDefined();

      expect(panggilanLogout()).toHaveLength(0);
    });

    it('artefak lokal sesi SSO tetap dibuang walau logout-nya dilewati', async () => {
      localStorage.setItem('sso_expires_at', String(Math.floor(Date.now() / 1000) + 3600));
      localStorage.setItem('role', 'responden');
      balas401('UNAUTHORIZED');

      await expect(api.get('/auth/me')).rejects.toBeDefined();

      expect(panggilanLogout()).toHaveLength(0);
      expect(localStorage.getItem('sso_expires_at')).toBeNull();
      expect(localStorage.getItem('role')).toBeNull();
    });

    /**
     * KONTROL. Yang ditolak di sini token Bearer; cookie `session` yang
     * mungkin menempel di peramban belum pernah diperiksa server, dan bisa
     * jadi sesi SSO yang masih hidup. Logout-nya tetap dikirim.
     */
    it('KONTROL: 401 pada permintaan BER-Bearer tetap menembakkan logout', async () => {
      localStorage.setItem('token', 'token-basi');
      balas401('UNAUTHORIZED');

      await expect(api.get('/auth/me')).rejects.toBeDefined();

      expect(panggilanLogout()).toHaveLength(1);
    });
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

/**
 * GALAT VALIDASI DTO (BUG-080, 9 November 2026).
 *
 * `AllExceptionsFilter` menjawab penolakan `ValidationPipe` dengan pesan tetap
 * `'Validation failed'` dan menaruh daftar kalimat class-validator (Inggris)
 * di `error.details`. Interseptor dulu meneruskan `'Validation failed'` apa
 * adanya, sehingga warga melihat kalimat Inggris tanpa petunjuk apa pun.
 *
 * Dikenali dari BENTUKNYA -- 400 dengan `details` berupa daftar -- bukan dari
 * bunyi pesannya: hanya penolakan `ValidationPipe` yang membawa daftar di
 * sana, dan bunyi pesan dapat diubah kapan saja tanpa ada yang memerah.
 */
describe('api — galat validasi DTO', () => {
  const balas400 = (message, details) =>
    server.use(
      http.post(`${API_BASE}/apa-saja`, () =>
        HttpResponse.json(
          {
            success: false,
            statusCode: 400,
            message,
            error: { code: 'BAD_REQUEST', details },
          },
          { status: 400 },
        ),
      ),
    );

  it('menerjemahkan "Validation failed" menjadi kalimat bahasa Indonesia', async () => {
    balas400('Validation failed', ['kategori must be one of the following values: kab_lainnya']);

    await expect(api.post('/apa-saja', {})).rejects.toMatchObject({
      message: 'Isian belum lengkap atau tidak sesuai. Periksa kembali lalu coba lagi.',
    });
  });

  /**
   * KONTROL. Penolakan 400 dari aturan bisnis membawa kalimat bahasa Indonesia
   * yang menyebut sebabnya (mis. kategori yang tak sepadan dengan tingkat).
   * Menimpanya dengan kalimat umum justru membuang satu-satunya petunjuk.
   */
  it('KONTROL: 400 berpesan tunggal tetap membawa pesannya sendiri', async () => {
    balas400('Kategori tidak sesuai dengan tingkat pengaduan.', 'Bad Request');

    await expect(api.post('/apa-saja', {})).rejects.toMatchObject({
      message: 'Kategori tidak sesuai dengan tingkat pengaduan.',
    });
  });
});

/**
 * Jawaban TANPA amplop backend (BUG-075, 17 November 2026).
 *
 * Interseptor hanya menyalin pesan bila jawaban membawa amplop `{ message }`.
 * Halaman 502/503/504 nginx berisi HTML, dan jaringan putus atau timeout tak
 * membawa jawaban sama sekali; pada keduanya `error.message` bawaan axios --
 * "Request failed with status code 502", "Network Error", "timeout of 10000ms
 * exceeded" -- sampai ke layar warga lewat `<ErrorState description=...>`,
 * persis saat layanan padam.
 *
 * Pesan backend tetap didahulukan: kontrol 500 beramplop di bawah menjaganya.
 */
describe('api — galat tanpa amplop backend', () => {
  it('502 berisi HTML nginx menjadi kalimat bahasa Indonesia', async () => {
    server.use(
      http.get(`${API_BASE}/apa-saja`, () =>
        new HttpResponse('<html><body><h1>502 Bad Gateway</h1></body></html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );

    await expect(api.get('/apa-saja')).rejects.toMatchObject({
      message: 'Layanan sedang tidak dapat dihubungi. Coba lagi dalam beberapa saat.',
    });
  });

  it('jaringan putus menjadi kalimat bahasa Indonesia', async () => {
    server.use(http.get(`${API_BASE}/apa-saja`, () => HttpResponse.error()));

    await expect(api.get('/apa-saja')).rejects.toMatchObject({
      message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda, lalu coba lagi.',
    });
  });

  /**
   * Timeout TIDAK dibangkitkan lewat MSW. Dicoba lebih dulu dengan `delay(500)`
   * dan `timeout: 20`: permintaannya malah SELESAI, karena pencegat XHR MSW di
   * jsdom tak pernah memicu `ontimeout`. Jadi adapter-nya diganti satu yang
   * menolak dengan galat yang sama persis dibuat adapter XHR axios saat
   * timeout -- `AxiosError` berkode `ECONNABORTED` -- dan interseptornya tetap
   * yang diuji.
   */
  it('timeout menjadi kalimat bahasa Indonesia', async () => {
    const adapterTimeout = (config) =>
      Promise.reject(
        new AxiosError(
          `timeout of ${config.timeout}ms exceeded`,
          AxiosError.ECONNABORTED,
          config,
        ),
      );

    await expect(
      api.get('/apa-saja', { timeout: 20, adapter: adapterTimeout }),
    ).rejects.toMatchObject({
      message: 'Server terlalu lama menjawab. Coba lagi dalam beberapa saat.',
    });
  });

  it('4xx tanpa amplop menyebut kodenya', async () => {
    server.use(
      http.post(`${API_BASE}/apa-saja`, () =>
        new HttpResponse('<html><body>413 Request Entity Too Large</body></html>', {
          status: 413,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );

    await expect(api.post('/apa-saja', {})).rejects.toMatchObject({
      message: 'Permintaan tidak dapat diproses (kode 413).',
    });
  });

  it('KONTROL: 500 beramplop tetap membawa pesan backend', async () => {
    server.use(
      http.get(`${API_BASE}/apa-saja`, () =>
        HttpResponse.json(
          { success: false, statusCode: 500, message: 'Terjadi kesalahan pada server.' },
          { status: 500 },
        ),
      ),
    );

    await expect(api.get('/apa-saja')).rejects.toMatchObject({
      message: 'Terjadi kesalahan pada server.',
    });
  });
});

/**
 * Galat pada permintaan ber-`responseType: 'blob'` (BUG-075).
 *
 * Ekspor hasil IKM meminta Blob, jadi jawaban galat backend juga tiba sebagai
 * Blob: amplop JSON-nya ada, tetapi terbungkus. Tanpa membacanya, pesan
 * cadangan "tanpa amplop" akan menyebut layanan tak dapat dihubungi padahal
 * backend menjawab dengan sebab yang jelas.
 *
 * Jawabannya TIDAK dibangkitkan lewat MSW. Pencegat XHR MSW membangun
 * `Response` dari Blob jsdom lewat undici, yang memanggil `blob.stream()`;
 * Blob jsdom tak punya metode itu, galatnya tertelan di dalam pencegat, dan
 * permintaannya tak pernah selesai -- uji menggantung sampai batas waktu Jest.
 * Adapter di bawah menolak dengan `AxiosError` yang sama bentuknya dengan
 * buatan adapter XHR axios untuk status di luar 2xx, sehingga interseptornya
 * tetap yang diuji.
 */
function adapterGalatBlob(status, isi, contentType) {
  return (config) => {
    const response = {
      status,
      statusText: '',
      headers: { 'content-type': contentType },
      config,
      data: new Blob([isi], { type: contentType }),
    };
    return Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
        status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
        config,
        null,
        response,
      ),
    );
  };
}

describe('api — galat pada permintaan Blob', () => {
  it('amplop JSON di dalam Blob tetap terbaca pesannya', async () => {
    const adapter = adapterGalatBlob(
      500,
      JSON.stringify({ success: false, statusCode: 500, message: 'Laporan gagal dibuat.' }),
      'application/json; charset=utf-8',
    );

    await expect(
      api.get('/unduh', { responseType: 'blob', adapter }),
    ).rejects.toMatchObject({ message: 'Laporan gagal dibuat.' });
  });

  /**
   * Blob jsdom tak punya `text()`, jadi uji di atas melewati jalur
   * `FileReader`. Peramban sungguhan punya `text()`; uji ini memasangnya pada
   * Blob supaya jalur itu ikut teruji.
   */
  it('amplop JSON di dalam Blob terbaca lewat blob.text() bila tersedia', async () => {
    const isi = JSON.stringify({ success: false, statusCode: 404, message: 'Survei tidak ditemukan.' });
    const data = new Blob([isi], { type: 'application/json' });
    data.text = jest.fn(async () => isi);
    const adapter = (config) =>
       Promise.reject(
        new AxiosError('Request failed with status code 404', AxiosError.ERR_BAD_REQUEST, config, null, {
          status: 404,
          statusText: '',
          headers: { 'content-type': 'application/json' },
          config,
          data,
        }),
      );

    const galat = await api.get('/unduh', { responseType: 'blob', adapter }).catch((e) => e);
    expect(galat.message).toBe('Survei tidak ditemukan.');
    expect(galat.response.data.message).toBe('Survei tidak ditemukan.');
    expect(data.text).toHaveBeenCalled();
  });

  it('KONTROL: halaman HTML nginx pada permintaan Blob memakai pesan cadangan', async () => {
    const adapter = adapterGalatBlob(
      502,
      '<html><body>502 Bad Gateway</body></html>',
      'text/html',
    );

    await expect(
      api.get('/unduh', { responseType: 'blob', adapter }),
    ).rejects.toMatchObject({
      message: 'Layanan sedang tidak dapat dihubungi. Coba lagi dalam beberapa saat.',
    });
  });

  it('KONTROL: Blob berlabel JSON yang rusak memakai pesan cadangan', async () => {
    const adapter = adapterGalatBlob(500, '{bukan json', 'application/json');

    await expect(
      api.get('/unduh', { responseType: 'blob', adapter }),
    ).rejects.toMatchObject({
      message: 'Layanan sedang tidak dapat dihubungi. Coba lagi dalam beberapa saat.',
    });
  });
});
