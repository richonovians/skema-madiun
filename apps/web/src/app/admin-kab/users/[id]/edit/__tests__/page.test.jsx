import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, userFixture } from '@/mocks/handlers';
import EditUserPage from '../page';

/**
 * Halaman "Ubah Role Admin".
 *
 * Identitas akun (nama & email) datang dari Helpdesk Diskominfo; satu-satunya
 * yang boleh diubah dari SKEMA adalah role untuk sistem SKEMA sendiri.
 *
 * Uji tingkat HALAMAN, bukan cuma komponen: mengunci kotak isian di antarmuka
 * tak berarti apa-apa kalau halamannya masih MENGIRIM nilai itu ke backend.
 * Dua-duanya diperiksa di sini, dan yang kedua yang menentukan.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '22' }),
  useRouter: () => ({ push: pushMock }),
}));

const TARGET = userFixture({
  id: 22,
  ssoSubject: 'seed-admin-opd',
  nama: 'Admin OPD (Contoh)',
  email: 'admin.opd@example.go.id',
  roles: ['opd'],
  opdId: 1,
});

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
beforeEach(() => {
  pushMock.mockClear();
  // Akun yang disunting BUKAN akun yang sedang login (GET /auth/me -> id 21),
  // supaya `roleLocked` (anti self-lockout) tidak ikut aktif dan yang teruji
  // benar-benar penguncian identitas, bukan penguncian role.
  server.use(http.get(`${API_BASE}/users/:id`, () => ok(TARGET, '/users/22')));
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const NAMA = /nama lengkap/i;
const EMAIL = /alamat email/i;

describe('Halaman Ubah Role Admin', () => {
  it('mengunci nama dan email, tapi tetap menampilkan nilainya', async () => {
    render(<EditUserPage />);

    const nama = await screen.findByLabelText(NAMA);
    expect(nama).toBeDisabled();
    expect(nama).toHaveValue('Admin OPD (Contoh)');

    const email = screen.getByLabelText(EMAIL);
    expect(email).toBeDisabled();
    expect(email).toHaveValue('admin.opd@example.go.id');
  });

  it('role TETAP dapat diubah — yang dikunci hanya identitasnya', async () => {
    render(<EditUserPage />);

    await screen.findByLabelText(NAMA);
    // Sejak multi-role (5 September 2026) role dipilih lewat KOTAK CENTANG,
    // bukan dropdown. Yang diperiksa: kotaknya aktif (bukan terkunci) DAN
    // mencerminkan keadaan akun (Admin OPD tercentang, yang lain tidak).
    const adminOpd = screen.getByLabelText('Admin OPD');
    expect(adminOpd).toBeEnabled();
    expect(adminOpd).toBeChecked();
    expect(screen.getByLabelText('Admin Kabupaten')).not.toBeChecked();
  });

  it('TIDAK mengirim `nama` ke backend saat disimpan', async () => {
    let terkirim = null;
    server.use(
      http.patch(`${API_BASE}/users/:id`, async ({ request }) => {
        terkirim = await request.json();
        return ok(TARGET, '/users/22');
      }),
    );

    render(<EditUserPage />);
    await screen.findByLabelText(NAMA);

    // fireEvent, bukan user-event: paket itu tidak terpasang di proyek ini
    // dan uji lain (mis. audit-logs) memakai fireEvent.
    fireEvent.click(screen.getByRole('button', { name: /simpan perubahan/i }));

    await waitFor(() => expect(terkirim).not.toBeNull());
    // Inti perubahan ini: field yang tak bisa disunting juga tak boleh dikirim.
    // Kalau tetap dikirim, satu klik "Simpan" akan MENULIS ULANG nama dengan
    // nilai lama -- menimpa pembaruan yang mungkin baru datang dari Helpdesk.
    expect(Object.keys(terkirim)).not.toContain('nama');
    // Kontrol: role tetap terkirim, jadi ketiadaan `nama` di atas bukan karena
    // permintaannya kosong atau gagal terbentuk.
    expect(terkirim.roles).toEqual(['opd']);
  });

  it('menjelaskan bahwa identitas berasal dari Helpdesk', async () => {
    render(<EditUserPage />);

    await screen.findByLabelText(NAMA);
    // Frasa khas, BUKAN /helpdesk/i: AccountNotice di halaman ini sudah
    // memuat 'SSO Helpdesk Diskominfo', jadi pola selebar itu lulus walau
    // keterangan penguncian belum ditulis sama sekali.
    expect(screen.getByText(new RegExp('tidak dapat diubah dari SKEMA', 'i'))).toBeInTheDocument();
  });
  it('otomatis mencentang role Masyarakat (Responden) saat mencentang Admin Kabupaten atau Admin OPD', async () => {
    render(<EditUserPage />);

    await screen.findByLabelText(NAMA);

    const adminKab = screen.getByLabelText('Admin Kabupaten');
    const responden = screen.getByLabelText('Masyarakat (Responden)');

    expect(adminKab).not.toBeChecked();
    expect(responden).not.toBeChecked();

    // Klik centang Admin Kabupaten
    fireEvent.click(adminKab);

    expect(adminKab).toBeChecked();
    expect(responden).toBeChecked();
  });
});
