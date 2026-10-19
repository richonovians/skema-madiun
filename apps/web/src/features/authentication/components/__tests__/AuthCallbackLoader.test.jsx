import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import AuthCallbackLoader from '../AuthCallbackLoader';

/**
 * TC-FE-043 — Callback SSO Helpdesk.
 *
 * Satu-satunya pintu masuk SSO. Kalau ia gagal tanpa berkata apa-apa, pengguna
 * terdampar di halaman kosong tanpa tahu harus berbuat apa.
 *
 * Kerusakan yang ditangkap:
 *  - callback berujung layar putih ketika fragment membawa `error=` atau ketika
 *    pembacaan sesi gagal;
 *  - fragment galat tertinggal di bilah alamat sehingga ikut tersalin;
 *  - sesi lama tertinggal sesudah masuk gagal, sehingga navbar mengaku "sudah
 *    masuk" tepat di atas halaman galat;
 *  - cookie `role` tak ditulis sebelum navigasi keras, sehingga proxy.js
 *    memantulkan admin dari areanya sendiri.
 *
 * ── Riwayat berkas ini (15 September 2026) ────────────────────────────────
 * Semula bernama `PemilihPeranDanCallback.test.jsx` dan memuat dua blok lagi.
 * Keduanya DIBUANG, bukan diperbaiki, karena yang diujinya sudah tak ada:
 *  - blok "Tabel tujuan peran" menguji `@/constants/roleHome`
 *    (SUPERUSER_AREA_HOME, SUPERUSER_OPD_ENTRY). Modul itu hilang bersama
 *    konsep "area superuser";
 *  - blok "RoleLoginPicker" menguji pemilih AREA berikut daftar OPD-nya.
 *    Pemilih peran 5 September menggantinya dengan pemilih PERAN yang mengirim
 *    `POST /auth/acting-role`, dan `RoleLoginPicker.test.jsx` milik tim dev
 *    sudah mengujinya. Mempertahankan blok lama berarti menguji antarmuka yang
 *    tak pernah lagi dirender — merah palsu hari ini, hijau palsu besok.
 *
 * ── Batas yang perlu dinyatakan terus terang ──────────────────────────────
 * **Tujuan navigasi tidak dapat diperiksa dari sini.** Komponen ini memakai
 * `window.location.assign()` (navigasi keras — proxy.js membaca cookie lewat
 * full request), dan di jsdom 26 `window.location` beserta metodenya
 * `configurable: false, writable: false`. Ketiga cara pemalsuan yang lazim
 * sudah dicoba dan ditolak mesinnya:
 *   - `delete window.location` lalu menugaskannya → diabaikan DIAM-DIAM;
 *   - `Object.defineProperty(window, 'location', …)` → "Cannot redefine property";
 *   - `window.location.assign = fn` → "Cannot assign to read only property".
 *
 * Yang diperiksa karena itu adalah **keadaan yang ditulis SEBELUM navigasi** —
 * dan justru di situlah risikonya: cookie yang ditulis sesudah `assign()` takkan
 * ikut pada permintaan berikutnya.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * `/auth/roles`, BUKAN `/auth/me`. Komponen ini sengaja bertanya ke endpoint itu
 * (lihat komentarnya): akun ber-peran banyak belum punya `actingRole` pada titik
 * ini, dan `/auth/me` justru menolaknya 401. Menirukan `/auth/me` di sini tak
 * berpengaruh apa pun — handler bawaanlah yang menjawab, dan pengujian yang
 * menyandarinya lulus atau gagal karena alasan yang salah. Itu betul-betul
 * terjadi: versi sebelumnya menirukan `/auth/me` dan menuntut peran `opd`,
 * lalu menerima `kabupaten` dari handler bawaan.
 */
const perankan = (roles, over = {}) =>
  server.use(
    http.get(`${API_BASE}/auth/roles`, () =>
      ok(
        { nama: 'Petugas Uji', roles, opdId: null, consentRequired: false, ...over },
        '/auth/roles',
      ),
    ),
  );

/** Fragment hanya ada di sisi klien — mengubah hash memang diizinkan jsdom. */
const denganFragment = (fragment) => {
  window.location.hash = fragment;
};

const detikDepan = () => Math.floor(Date.now() / 1000) + 3600;

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState = jest.fn();
  // `clearSession()` kini menembakkan POST /auth/logout (perbaikan sesi hantu,
  // 8 September 2026). Tanpa tiruan ini jalur galat melempar di dalam komponen.
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
});

afterEach(() => {
  window.location.hash = '';
});

describe('AuthCallbackLoader — kegagalan yang terbaca (TC-FE-043)', () => {
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

  it('menerangkan kegagalan membaca sesi alih-alih menggantung di "memuat"', async () => {
    denganFragment(`#expires=${detikDepan()}`);
    server.use(
      http.get(`${API_BASE}/auth/roles`, () =>
        HttpResponse.json(
          { success: false, statusCode: 401, message: 'Sesi tidak ditemukan' },
          { status: 401 },
        ),
      ),
    );

    render(<AuthCallbackLoader />);

    // Backend sudah menerbitkan sesi tetapi frontend gagal membacanya — hampir
    // selalu salah konfigurasi (cookie tak sampai, atau origin frontend belum
    // ada di CORS_ORIGIN), dan pengguna harus diberi tahu ketimbang dibiarkan
    // menatap "Menyelesaikan proses masuk..." selamanya.
    expect(await screen.findByText(/Sesi tidak ditemukan/)).toBeInTheDocument();
  });
});

describe('AuthCallbackLoader — peran tunggal vs peran banyak (TC-FE-043)', () => {
  it('menyimpan sesi peran tunggal sebelum mengantarnya keluar', async () => {
    const expires = detikDepan();
    denganFragment(`#expires=${expires}`);
    perankan(['opd'], { opdId: 2 });

    render(<AuthCallbackLoader />);

    // Cookie `role` inilah yang dibaca proxy.js; tanpa ia, admin dipantulkan
    // dari areanya sendiri walau cookie `session` backend hidup.
    await waitFor(() => expect(localStorage.getItem('role')).toBe('opd'));
    expect(document.cookie).toContain('role=opd');
    expect(localStorage.getItem('sso_expires_at')).toBe(String(expires));
  });

  it('menahan akun ber-peran banyak pada pemilih peran, tidak mengantarnya ke mana pun', async () => {
    denganFragment(`#expires=${detikDepan()}`);
    // Sejak 5 September 2026 pemilih peran berlaku bagi SIAPA PUN ber-peran
    // lebih dari satu, bukan khusus superuser.
    perankan(['kabupaten', 'responden'], { nama: 'Rahmat Hidayat' });

    render(<AuthCallbackLoader />);

    expect(await screen.findByText(/Masuk sebagai — Rahmat Hidayat/)).toBeInTheDocument();
    // Peran BELUM ditulis: sesi yang perannya belum dipilih tak boleh mewarisi
    // peran dari sesi sebelumnya di peramban yang sama.
    expect(localStorage.getItem('role')).toBeNull();
  });

  it('KONTROL: peran tunggal TIDAK memunculkan pemilih peran', async () => {
    denganFragment(`#expires=${detikDepan()}`);
    perankan(['kabupaten'], { nama: 'Rahmat Hidayat' });

    render(<AuthCallbackLoader />);

    await waitFor(() => expect(localStorage.getItem('role')).toBe('kabupaten'));
    // Tanpa pasangan ini, uji di atas tetap hijau seandainya pemilih peran
    // muncul untuk semua orang.
    expect(screen.queryByText(/Masuk sebagai/)).not.toBeInTheDocument();
  });
});
