import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, userFixture, opdFixture } from '@/mocks/handlers';
import AdminNavbar from '../AdminNavbar';
import AdminKabNavbar from '../AdminKabNavbar';
import { AdminLayoutProvider } from '../AdminLayoutProvider';
import { AdminKabLayoutProvider } from '../AdminKabLayoutProvider';

/**
 * TC-FE-028 — Identitas navbar admin datang dari API, bukan dikarang.
 *
 * MENGUNCI [BUG-001](../../../../../docs/BUG_REPORTS.md#bug-001) yang sudah
 * diperbarui (`efb7b9f`, `4e3e0c9`). Sebelum perbaikan itu kedua bilah
 * menampilkan identitas mati yang ditulis di dalam komponennya sendiri —
 * "Dr. Handoko", "Kepala Dinas", inisial "AK", "Admin Kabupaten" — sehingga
 * setiap petugas melihat nama orang lain, dan tak ada satu pun cara mengetahui
 * akun mana yang sedang dipakai. Pada sistem yang mencatat log aktivitas per
 * aktor, itu bukan sekadar kosmetik.
 *
 * Yang ditangkap berkas ini:
 *  - komponen berhenti memanggil `GET /auth/me` dan kembali memakai nilai tetap;
 *  - nama/peran dari API diabaikan dan diganti nilai bawaan;
 *  - nama OPD tak lagi diambil dari `GET /opd/:id`;
 *  - `GET /opd/:id` dipanggil untuk admin kabupaten yang `opdId`-nya null.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin-opd/surveys',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

/** Nilai-nilai karangan yang dulu tertanam di komponen. Tak satu pun boleh
 *  muncul lagi, apa pun yang dikirim backend. */
const IDENTITAS_KARANGAN = ['Dr. Handoko', 'Kepala Dinas', 'Admin Kabupaten (Dummy)'];

/**
 * Kedua bilah membaca state layout lewat context dan MELEMPAR bila providernya
 * tak ada — jadi dipasang di sini, bukan di-mock. Mem-mock context berarti
 * menguji tiruan penyedia state, bukan bilah yang sesungguhnya dirender aplikasi.
 */
const renderOpd = () => render(<AdminLayoutProvider><AdminNavbar /></AdminLayoutProvider>);
const renderKab = () => render(<AdminKabLayoutProvider><AdminKabNavbar /></AdminKabLayoutProvider>);

describe('AdminNavbar — Admin OPD (TC-FE-028)', () => {
  it('menampilkan nama & peran dari GET /auth/me, bukan nilai tetap', async () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        ok(
          userFixture({
            id: 7,
            nama: 'Budi Santoso',
            email: 'budi@madiunkab.go.id',
            role: 'opd',
            opdId: 3,
            respondentProfile: null,
          }),
          '/auth/me',
        ),
      ),
      http.get(`${API_BASE}/opd/:id`, ({ params }) =>
        ok(opdFixture({ id: Number(params.id), nama: 'Dinas Pendidikan', kode: 'DISDIK' }), '/opd'),
      ),
    );

    renderOpd();

    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
    // "Admin OPD" adalah LABEL PERAN hasil terjemahan `me.adapter.js`, bukan
    // jabatan yang dikirim backend — backend tak punya field jabatan sama sekali.
    expect(await screen.findByText('Admin OPD')).toBeInTheDocument();
  });

  it('mengambil nama OPD dari GET /opd/:id sesuai opdId akun', async () => {
    let opdDiminta = null;
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        ok(userFixture({ id: 7, nama: 'Budi Santoso', role: 'opd', opdId: 3 }), '/auth/me'),
      ),
      http.get(`${API_BASE}/opd/:id`, ({ params }) => {
        opdDiminta = params.id;
        return ok(opdFixture({ id: Number(params.id), nama: 'Dinas Pendidikan' }), '/opd');
      }),
    );

    renderOpd();

    expect(await screen.findByText('Dinas Pendidikan')).toBeInTheDocument();
    // Id yang diminta harus id milik AKUN, bukan angka tetap.
    expect(opdDiminta).toBe('3');
  });

  it('tidak memanggil /opd/:id untuk akun yang tak tertaut OPD', async () => {
    // Admin Kabupaten boleh membuka halaman /admin-opd/* (proxy.js) dan
    // `opdId`-nya null. Memanggil `/opd/null` menghasilkan 404 dan bilahnya
    // jatuh ke keadaan galat — padahal tak ada yang salah.
    let dipanggil = 0;
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        ok(userFixture({ id: 1, nama: 'Siti Aminah', role: 'kabupaten', opdId: null }), '/auth/me'),
      ),
      http.get(`${API_BASE}/opd/:id`, ({ params }) => {
        dipanggil += 1;
        return ok(opdFixture({ id: Number(params.id) }), '/opd');
      }),
    );

    renderOpd();

    expect(await screen.findByText('Siti Aminah')).toBeInTheDocument();
    expect(dipanggil).toBe(0);
    // Tanpa OPD, judulnya menyebut cakupannya apa adanya.
    expect(screen.getByText('Lintas OPD')).toBeInTheDocument();
  });

  it('tidak menampilkan satu pun identitas karangan lama', async () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        ok(userFixture({ id: 7, nama: 'Budi Santoso', role: 'opd', opdId: 3 }), '/auth/me'),
      ),
    );

    const { container } = renderOpd();
    await screen.findByText('Budi Santoso');

    for (const karangan of IDENTITAS_KARANGAN) {
      expect(container.textContent).not.toContain(karangan);
    }
  });
});

describe('AdminKabNavbar — Admin Kabupaten (TC-FE-028)', () => {
  it('menampilkan nama & peran dari GET /auth/me', async () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        ok(
          userFixture({
            id: 1,
            nama: 'Siti Aminah',
            email: 'siti@madiunkab.go.id',
            role: 'kabupaten',
            opdId: null,
            respondentProfile: null,
          }),
          '/auth/me',
        ),
      ),
    );

    renderKab();

    expect(await screen.findByText('Siti Aminah')).toBeInTheDocument();
    expect(await screen.findByText('Admin Kabupaten')).toBeInTheDocument();
  });

  it('membedakan superuser dari admin kabupaten biasa', async () => {
    // Peran inilah yang menentukan tampil-tidaknya log aktivitas & manajemen
    // pengguna, dan ia datang dari backend — bukan dari cookie yang bisa
    // disunting di peramban.
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        ok(userFixture({ id: 2, nama: 'Rahmat Hidayat', role: 'superuser', opdId: null }), '/auth/me'),
      ),
    );

    renderKab();

    expect(await screen.findByText('Rahmat Hidayat')).toBeInTheDocument();
    expect(await screen.findByText('Superuser')).toBeInTheDocument();
  });

  it('tidak menampilkan satu pun identitas karangan lama', async () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        ok(userFixture({ id: 1, nama: 'Siti Aminah', role: 'kabupaten', opdId: null }), '/auth/me'),
      ),
    );

    const { container } = renderKab();
    await screen.findByText('Siti Aminah');

    for (const karangan of IDENTITAS_KARANGAN) {
      expect(container.textContent).not.toContain(karangan);
    }
    // Inisial "AK" yang dulu dipatok — kini harus diturunkan dari nama asli.
    await waitFor(() => expect(screen.queryByText('AK')).not.toBeInTheDocument());
  });
});
