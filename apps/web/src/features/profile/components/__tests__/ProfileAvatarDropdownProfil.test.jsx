import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ProfileAvatarDropdown from '../ProfileAvatarDropdown';
import { getMyProfile } from '../../services/profile.api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../../services/profile.api', () => ({ getMyProfile: jest.fn() }));

/**
 * JALAN MENUJU HALAMAN PROFIL (4 Oktober 2026, permintaan pengguna:
 * "tambahkan halaman (/profil) ke navbar profil user").
 *
 * Halaman `/profile` sudah lengkap sejak lama -- judul, metadata, isi, dan
 * penjagaan peran di `proxy.js` -- tetapi TAK ADA SATU PUN tautan menujunya di
 * seluruh `apps/web/src`. Sampai sekarang ia hanya dapat dibuka dengan
 * mengetikkan alamatnya sendiri, dan warga biasa tak pernah melakukan itu.
 * Yang hilang bukan halamannya, melainkan pintunya.
 *
 * Rutenya bernama `/profile`, bukan `/profil` seperti bunyi permintaannya.
 * Tautan ke `/profil` akan berujung 404 karena rute itu tak pernah ada;
 * mengganti nama rute yang sudah dijaga `proxy.js` demi selisih satu huruf
 * yang tak dilihat pengguna bukan perbaikan, melainkan risiko.
 *
 * Menunya diambil SENDIRI lewat GET /auth/me, jadi setiap uji di sini menunggu
 * identitasnya muncul dulu sebelum menilai isi panel.
 */
const PENGGUNA = {
  name: 'Admin Magang',
  email: 'admin@example.go.id',
  initials: 'AM',
  roleLabel: 'Responden',
  roles: ['responden'],
};

const bukaMenu = async () => {
  render(<ProfileAvatarDropdown />);
  await screen.findByLabelText(/menu akun saya/i);
  fireEvent.click(screen.getByLabelText(/menu akun saya/i));
};

describe('ProfileAvatarDropdown — tautan ke halaman profil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMyProfile.mockResolvedValue(PENGGUNA);
  });

  it('menampilkan tautan Profil Saya di menu akun', async () => {
    await bukaMenu();

    const tautan = await screen.findByRole('link', { name: /profil saya/i });
    expect(tautan).toHaveAttribute('href', '/profile');
  });

  /**
   * PAGAR UTAMA. Tautan boleh ada tetapi menunjuk ke rute yang tak pernah
   * dibuat (`/profil`), dan kegagalannya baru terlihat sebagai 404 di tangan
   * pengguna -- bukan di sini. Nama rutenya karena itu diuji tersurat, bukan
   * sekadar "ada tautan bernama Profil".
   */
  it('menunjuk ke rute yang benar-benar ada, bukan /profil', async () => {
    await bukaMenu();

    const tautan = await screen.findByRole('link', { name: /profil saya/i });
    expect(tautan.getAttribute('href')).not.toBe('/profil');
  });

  it('meletakkan Profil Saya paling atas, tepat di bawah identitas', async () => {
    await bukaMenu();
    await screen.findByText('Admin Magang');

    const nama = screen.getAllByRole('link').map((t) => t.textContent);
    expect(nama).toEqual(['Profil Saya', 'Dashboard Saya', 'Pengaduan Saya', 'Survei']);
  });

  it('menutup menu setelah tautannya diketuk', async () => {
    await bukaMenu();

    // Tautan ini `href`-nya sungguhan, dan jsdom menjawab klik di atasnya
    // dengan "Not implemented: navigation" ke console.error. Pembatalan default
    // di fase tangkap TIDAK menghalangi penangan React -- ia hanya meniadakan
    // perpindahan halamannya -- sehingga yang diuji tetap utuh dan keluarannya
    // bersih. Tanpa ini, galat yang bukan galat ikut tercetak tiap kali suite
    // dijalankan, dan galat palsu membuat keluaran berhenti dibaca.
    document.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true });

    fireEvent.click(await screen.findByRole('link', { name: /profil saya/i }));

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /profil saya/i })).not.toBeInTheDocument(),
    );
  });

  /**
   * Sasaran sentuh 44px berlaku untuk tautan ini sama seperti tiga saudaranya.
   * Menu ini dipakai di navbar ponsel, dan satu baris yang lebih pendek dari
   * yang lain adalah baris yang meleset saat diketuk.
   */
  it('memakai tinggi sentuh yang sama dengan item menu lainnya', async () => {
    await bukaMenu();

    const tautan = await screen.findByRole('link', { name: /profil saya/i });
    const pembanding = screen.getByRole('link', { name: /dashboard saya/i });
    expect(tautan.className).toContain('min-h-[44px]');
    expect(within(tautan.parentElement).getAllByRole('link')).toContain(pembanding);
  });
});
