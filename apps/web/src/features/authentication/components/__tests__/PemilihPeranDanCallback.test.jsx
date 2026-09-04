import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, userFixture, opdFixture, paginated } from '@/mocks/handlers';
import RoleLoginPicker from '../RoleLoginPicker';
import AuthCallbackLoader from '../AuthCallbackLoader';
import { SUPERUSER_AREA_HOME, SUPERUSER_OPD_ENTRY, ROLE_HOME } from '@/constants/roleHome';

/**
 * TC-FE-043 — Pemilih peran superuser & callback SSO.
 *
 * Dua halaman yang jarang dilihat tetapi berakibat besar bila rusak: yang satu
 * menentukan area mana yang dibuka superuser, yang lain adalah satu-satunya
 * pintu masuk SSO Helpdesk. Keduanya belum pernah punya kasus uji.
 *
 * Kerusakan yang ditangkap:
 *  - memilih area tidak menuliskan cookie `area` → proxy.js tak tahu batasnya
 *    dan superuser bebas ke mana saja, bertentangan dengan keputusan 2026-08-20;
 *  - memilih "Admin OPD" langsung masuk tanpa memilih OPD → daftar survei &
 *    pengaduan menampilkan data SELURUH OPD dan pembuatan survei gagal;
 *  - callback SSO berujung layar putih ketika fragment-nya membawa `error=`
 *    atau ketika `GET /auth/me` gagal — pengguna terdampar tanpa satu kata pun;
 *  - fragment galat tertinggal di bilah alamat sehingga ikut tersalin;
 *  - sesi lama tertinggal sesudah masuk gagal → navbar mengaku "sudah masuk"
 *    tepat di atas halaman galat.
 *
 * ── Batas yang perlu dinyatakan terus terang ──────────────────────────────
 * **Tujuan navigasi tidak dapat diperiksa dari sini.** Kedua komponen sengaja
 * memakai `window.location.assign()` (navigasi keras — proxy.js membaca cookie
 * lewat full request), dan di jsdom 26 `window.location` beserta metodenya
 * `configurable: false, writable: false`. Ketiga cara pemalsuan yang lazim
 * sudah dicoba dan ditolak mesinnya:
 *   - `delete window.location` lalu menugaskannya → diabaikan DIAM-DIAM,
 *     komponen tetap memakai Location asli. Gejalanya menipu: pengujian yang
 *     menuntut "tidak ada navigasi" justru LULUS tanpa membuktikan apa pun;
 *   - `Object.defineProperty(window, 'location', …)` → "Cannot redefine property";
 *   - `window.location.assign = fn` → "Cannot assign to read only property".
 *
 * Yang diperiksa karena itu adalah **keadaan yang ditulis SEBELUM navigasi** —
 * dan justru di situlah risikonya. Cookie yang ditulis sesudah `assign()`
 * takkan ikut pada permintaan berikutnya, sehingga proxy memantulkan superuser
 * kembali ke pemilih peran. Tujuannya sendiri berasal dari tabel tetap
 * `roleHome.js`, yang ikut diuji harfiah di blok pertama.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
  for (const nama of ['token', 'role', 'area', 'opd', 'consent']) {
    document.cookie = `${nama}=; path=/; max-age=0`;
  }
});
afterAll(() => server.close());

/**
 * jsdom menuliskan "Not implemented: navigation (except hash changes)" ke
 * console.error setiap kali `assign()` dipanggil. Itu bukan kegagalan yang
 * ditemukan pengujian melainkan batas mesinnya, dan membiarkannya membuat
 * keluaran uji berisik sehingga galat sungguhan lebih mudah terlewat.
 */
let konsolAsli;
beforeEach(() => {
  konsolAsli = console.error;
  console.error = (...args) => {
    if (String(args[0]).includes('Not implemented: navigation')) return;
    konsolAsli(...args);
  };
});
afterEach(() => {
  console.error = konsolAsli;
});

describe('Tabel tujuan peran (TC-FE-043)', () => {
  it('memetakan tiap area superuser ke beranda yang tak memantulkan balik', () => {
    // Area OPD SENGAJA daftar survei, bukan dashboard: nilai ini juga menjadi
    // tujuan pantulan ketika superuser membuka dashboard OPD TANPA memilih OPD.
    // Kalau isinya dashboard itu sendiri, pantulannya menuju halaman yang
    // memantulkan lagi — lingkaran pengalihan tanpa akhir.
    expect(SUPERUSER_AREA_HOME).toEqual({
      kabupaten: '/admin-kab/dashboard',
      opd: '/admin-opd/surveys',
      responden: '/dashboard',
    });
    // Pintu masuk SESUDAH OPD dipilih berbeda, dan memang harus berbeda.
    expect(SUPERUSER_OPD_ENTRY).toBe('/admin-opd/dashboard');
    expect(ROLE_HOME.responden).toBe('/dashboard');
    expect(ROLE_HOME.opd).toBe('/admin-opd/dashboard');
  });
});

describe('RoleLoginPicker (TC-FE-043)', () => {
  it('menawarkan ketiga area kerja beserta keterangan batasnya', () => {
    render(<RoleLoginPicker superuserName="Rahmat" onCancel={jest.fn()} />);

    expect(screen.getByRole('button', { name: /Admin Kabupaten/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Admin OPD/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Warga/ })).toBeInTheDocument();
    // Sifat pembatasnya dinyatakan terus terang: ia mengatur NAVIGASI, bukan hak.
    expect(screen.getByText(/mengatur\s+NAVIGASI, bukan hak akses di server/)).toBeInTheDocument();
  });

  it('menuliskan cookie `area` saat memilih, bukan menunda sampai halaman berikutnya', () => {
    render(<RoleLoginPicker superuserName="Rahmat" onCancel={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Admin Kabupaten/ }));

    // proxy.js membaca cookie ini pada permintaan BERIKUTNYA — kalau ia baru
    // ditulis sesudah navigasi, permintaan pertama berangkat tanpa area dan
    // superuser dipantulkan kembali ke pemilih ini.
    expect(localStorage.getItem('area')).toBe('kabupaten');
    expect(document.cookie).toContain('area=kabupaten');
  });

  it('menuntut pemilihan OPD sebelum area OPD dibuka', async () => {
    server.use(
      http.get(`${API_BASE}/opd`, () =>
        paginated(
          [
            opdFixture({ id: 4, nama: 'Dinas Perhubungan', kode: 'DISHUB' }),
            opdFixture({ id: 5, nama: 'Dinas Sosial', kode: 'DINSOS' }),
          ],
          '/opd',
        ),
      ),
    );

    render(<RoleLoginPicker superuserName="Rahmat" onCancel={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Admin OPD/ }));

    // Langkah kedua, bukan langsung masuk: tanpa OPD terpilih, area OPD
    // menampilkan data SELURUH OPD dan pembuatan survei gagal ("opdId wajib").
    expect(await screen.findByText('Pilih OPD')).toBeInTheDocument();
    // Belum satu pun keadaan ditulis — memilih peran saja tak cukup.
    expect(localStorage.getItem('area')).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: /Dinas Sosial/ }));

    await waitFor(() => expect(localStorage.getItem('area')).toBe('opd'));
    // OPD yang diperankan ikut ditulis; tanpa ini penyaring `?opdId=` kosong.
    expect(document.cookie).toContain('opd=5');
  });

  it('dapat kembali dari daftar OPD ke daftar peran tanpa memilih apa pun', async () => {
    server.use(http.get(`${API_BASE}/opd`, () => paginated([opdFixture({ id: 4 })], '/opd')));

    render(<RoleLoginPicker superuserName="Rahmat" onCancel={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Admin OPD/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Kembali ke daftar peran/ }));

    expect(await screen.findByRole('button', { name: /Admin Kabupaten/ })).toBeInTheDocument();
    expect(localStorage.getItem('area')).toBeNull();
  });

  it('menerangkan keadaan kosong ketika belum ada OPD aktif', async () => {
    server.use(http.get(`${API_BASE}/opd`, () => paginated([], '/opd')));

    render(<RoleLoginPicker superuserName="Rahmat" onCancel={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Admin OPD/ }));

    // Daftar kosong tanpa keterangan terbaca sebagai halaman rusak.
    expect(await screen.findByText(/Belum ada OPD aktif/)).toBeInTheDocument();
  });

  it('menutup pemilih membatalkan login, tidak meninggalkan pengguna setengah masuk', () => {
    const onCancel = jest.fn();
    render(<RoleLoginPicker superuserName="Rahmat" onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Batalkan login' }));

    expect(onCancel).toHaveBeenCalled();
    expect(localStorage.getItem('area')).toBeNull();
  });
});

describe('AuthCallbackLoader (TC-FE-043)', () => {
  /** Fragment hanya ada di sisi klien — mengubah hash memang diizinkan jsdom. */
  const denganFragment = (fragment) => {
    window.location.hash = fragment;
  };

  beforeEach(() => {
    window.history.replaceState = jest.fn();
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('menampilkan pesan galat dari fragment, bukan layar putih', async () => {
    denganFragment('#error=akses%20ditolak%20oleh%20pengguna');

    render(<AuthCallbackLoader />);

    expect(await screen.findByText(/akses ditolak oleh pengguna/)).toBeInTheDocument();
  });

  it('membuang fragment dari bilah alamat supaya pesan galat tak ikut tersalin', async () => {
    denganFragment('#error=state%20tidak%20cocok');

    render(<AuthCallbackLoader />);
    await screen.findByText(/state tidak cocok/);

    // Alamat ditulis ulang TANPA fragment — pengguna yang menyalin URL tak ikut
    // membawa pesan galat, dan memuat ulang tak menampilkannya lagi.
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', window.location.pathname);
  });

  it('membuang sesi lokal yang tertinggal ketika masuk gagal', async () => {
    localStorage.setItem('token', 'sesi-lama');
    localStorage.setItem('role', 'kabupaten');
    denganFragment('#error=gagal%20menukar%20kode');

    render(<AuthCallbackLoader />);
    await screen.findByText(/gagal menukar kode/);

    // Membiarkannya membuat navbar menampilkan keadaan "sudah masuk" tepat di
    // atas halaman galat ini.
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
  });

  it('menyimpan sesi peran non-superuser sebelum mengantarnya keluar', async () => {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    denganFragment(`#expires=${expires}`);
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        ok(userFixture({ id: 9, role: 'opd', opdId: 2 }), '/auth/me'),
      ),
    );

    render(<AuthCallbackLoader />);

    // Cookie `role` inilah yang dibaca proxy.js; tanpa ia, admin dipantulkan
    // dari areanya sendiri walau cookie `session` backend hidup.
    await waitFor(() => expect(localStorage.getItem('role')).toBe('opd'));
    expect(document.cookie).toContain('role=opd');
    expect(localStorage.getItem('sso_expires_at')).toBe(String(expires));
  });

  it('menahan superuser pada pemilih peran, tidak mengantarnya ke mana pun', async () => {
    denganFragment(`#expires=${Math.floor(Date.now() / 1000) + 3600}`);
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        ok(
          userFixture({ id: 2, nama: 'Rahmat Hidayat', role: 'superuser', opdId: null }),
          '/auth/me',
        ),
      ),
    );

    render(<AuthCallbackLoader />);

    expect(await screen.findByText(/Masuk sebagai — Rahmat Hidayat/)).toBeInTheDocument();
    // Area BELUM ditulis: superuser yang batal memilih tak boleh mewarisi
    // pembatasan area dari sesi sebelumnya.
    expect(localStorage.getItem('area')).toBeNull();
  });

  it('menerangkan kegagalan membaca sesi alih-alih menggantung di "memuat"', async () => {
    denganFragment(`#expires=${Math.floor(Date.now() / 1000) + 3600}`);
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json(
          { success: false, statusCode: 401, message: 'Sesi tidak ditemukan' },
          { status: 401 },
        ),
      ),
    );

    render(<AuthCallbackLoader />);

    // Backend sudah menerbitkan sesi tetapi frontend tak bisa membacanya —
    // hampir selalu salah konfigurasi (cookie tak sampai / origin belum di
    // CORS_ORIGIN), dan pengguna harus diberi tahu ketimbang dibiarkan menatap
    // "Menyelesaikan proses masuk..." selamanya.
    expect(await screen.findByText(/Sesi tidak ditemukan/)).toBeInTheDocument();
  });
});
