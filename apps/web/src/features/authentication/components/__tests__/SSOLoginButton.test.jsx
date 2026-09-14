import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, fail } from '@/mocks/handlers';
import SSOLoginButton from '../SSOLoginButton';

/**
 * Tampilan galat pada form dev-login di navbar (keluhan 7 September 2026:
 * "kenapa tampilan error gagal login jadi seperti pada gambar?").
 *
 * Galatnya DULU sekadar `<span>` yang jadi anggota flex keempat pada baris yang
 * sama dengan kolom email, tombol Masuk, dan tautan "pakai SSO". Begitu terisi,
 * barisnya kelebihan lebar dan `flex-wrap` menurunkannya ke baris kedua --
 * padahal navbar bertinggi mati `h-16` (64 px) sementara kolom emailnya sendiri
 * sudah 56 px (`p-md` 16 px x2 + tinggi baris ~24 px). Baris kedua itu tergambar
 * DI LUAR latar navbar, menimpa hero di bawahnya, dan karena navbar `z-50` ia
 * menang gambar.
 *
 * Karena itu yang dijaga di sini bukan cuma "pesannya tampil", tapi bahwa
 * pesannya KELUAR DARI ALUR baris navbar. jsdom tak menghitung tata letak, jadi
 * mekanismenya diperiksa lewat kelasnya -- itu satu-satunya jejak yang tersisa
 * di DOM, dan justru kelas itulah yang menentukan hasilnya di peramban.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Pesan asli backend (auth.service.ts:44) -- panjang, dan panjangnya itulah yang
// dulu memicu pembungkusan baris.
const PESAN = 'Pengguna dengan email/ssoSubject "warga@exmple.go.id" tidak ditemukan';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const bukaFormDev = () => {
  render(<SSOLoginButton />);
  fireEvent.click(screen.getByRole('button', { name: /akun dev/i }));
  return screen.getByPlaceholderText(/email akun/i);
};

const gagalkanLogin = () =>
  server.use(http.post(`${API_BASE}/auth/dev-login`, () => fail(404, PESAN)));

describe('SSOLoginButton — tampilan galat dev-login', () => {
  it('sebelum ada galat, tak ada alert sama sekali', () => {
    bukaFormDev();

    // Kontrol: kalau alert-nya tetap ada dalam keadaan bersih, uji di bawah
    // tak membuktikan apa pun.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('galat login diumumkan sebagai alert dengan pesan utuh dari backend', async () => {
    gagalkanLogin();
    const kolom = bukaFormDev();

    fireEvent.change(kolom, { target: { value: 'warga@exmple.go.id' } });
    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));

    const galat = await screen.findByRole('alert');
    expect(galat).toHaveTextContent(PESAN);
  });

  it('galatnya keluar dari alur baris navbar, bukan jadi anggota flex-nya', async () => {
    gagalkanLogin();
    const kolom = bukaFormDev();

    fireEvent.change(kolom, { target: { value: 'warga@exmple.go.id' } });
    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));

    const galat = await screen.findByRole('alert');
    // Keluar dari alur: elemen di luar alur tak bisa lagi menjadi baris kedua
    // yang menjebol `h-16`, sepanjang apa pun pesannya.
    expect(galat).toHaveClass('absolute');
    // Dan dijangkar ke formnya. Tanpa leluhur `relative`, `absolute` mengacu ke
    // blok terluar dan kartunya melayang di tempat yang tak berhubungan -- jadi
    // dua kelas ini cuma benar kalau BERPASANGAN.
    expect(galat.closest('.relative')).toBe(galat.parentElement);
    // `flex-wrap` pada formnya SENGAJA dibiarkan (drawer mobile
    // membutuhkannya), jadi yang dijaga bukan hilangnya pembungkusan melainkan
    // galatnya tak lagi ikut dibungkus.
    expect(galat.parentElement).toHaveClass('flex-wrap');
  });

  it('kolom emailnya ditandai tak sah dan dijelaskan oleh galat itu', async () => {
    gagalkanLogin();
    const kolom = bukaFormDev();

    fireEvent.change(kolom, { target: { value: 'warga@exmple.go.id' } });
    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));

    await screen.findByRole('alert');
    expect(kolom).toHaveAttribute('aria-invalid', 'true');
    expect(kolom).toHaveAccessibleDescription(PESAN);
  });

  it('membatalkan ke jalur SSO membuang galatnya', async () => {
    gagalkanLogin();
    const kolom = bukaFormDev();

    fireEvent.change(kolom, { target: { value: 'warga@exmple.go.id' } });
    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: /pakai sso/i }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
