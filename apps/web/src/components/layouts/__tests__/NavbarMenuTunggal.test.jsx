import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../Navbar';
import { isAuthenticated } from '@/features/authentication/services/authStorage';

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('@/features/authentication/services/authStorage', () => ({
  isAuthenticated: jest.fn(),
  SESSION_CHANGED_EVENT: 'sesi-berubah',
}));
// Keduanya memanggil API saat dipasang; yang diuji di sini bukan isinya,
// melainkan bahwa laci navigasi menutup diri ketika salah satunya diketuk.
jest.mock('@/features/profile/components/ProfileAvatarDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));
jest.mock('@/components/ui/NotificationDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="lonceng" />,
}));

/**
 * SATU MENU SAJA YANG BOLEH TERBUKA (23 September 2026, laporan pengguna
 * berikut tangkapan layar).
 *
 * Gejalanya: laci navigasi dan panel akun terbuka bersamaan dan saling
 * menumpuk, dengan panel akun tampak TERPOTONG -- hanya Survei, Ganti Peran,
 * dan Logout yang terlihat.
 *
 * Dua cacat bertemu di sana, dan yang diuji berkas ini hanya yang pertama:
 *
 * 1. Keduanya bisa terbuka sekaligus. Satu arah kebetulan sudah aman:
 *    menekan hamburger memicu `mousedown` yang menutup panel akun lewat
 *    handleClickOutside milik ProfileAvatarDropdown. Arah sebaliknya -- laci
 *    dibuka dulu, lalu avatar diketuk -- tak ada penjaganya sama sekali.
 *
 * 2. `z-50` pada panel akun tak berlaku terhadap laci, sehingga yang bertumpuk
 *    tampak terpotong alih-alih sekadar bertindih. Penyebabnya dibuktikan di
 *    peramban sungguhan: pil navbar memakai `backdrop-blur`, dan
 *    `backdrop-filter` membuat KONTEKS PENUMPUKAN baru, sehingga `z-50` panel
 *    terkurung di dalam pil sementara laci adalah adik kandung pil yang muncul
 *    belakangan di DOM. Percobaan terkendali: apa adanya -> laci di atas;
 *    hanya backdrop-filter dimatikan -> panel di atas; dipasang lagi -> laci di
 *    atas. Cacat ini SENGAJA tidak diperbaiki (keputusan pengguna), hanya
 *    dicatat, sebab ia tak lagi terlihat begitu keduanya saling meniadakan.
 *
 * Tautan desktop SELALU ada di DOM -- yang menyembunyikannya cuma `hidden
 * lg:flex`, dan jsdom tak menerapkan CSS. Karena itu yang dihitung di sini
 * jumlah salinannya: satu saat laci tertutup, dua saat laci terbuka.
 */
const NAMA_TAUTAN = 'Tentang Platform';

const hitungTautan = () => screen.getAllByRole('link', { name: NAMA_TAUTAN }).length;

describe('Navbar — hanya satu menu yang boleh terbuka', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isAuthenticated.mockReturnValue(true);
  });

  it('menutup laci navigasi ketika menu akun diketuk', () => {
    render(<Navbar />);
    const tertutup = hitungTautan();

    fireEvent.click(screen.getByLabelText(/buka menu navigasi/i));
    expect(hitungTautan()).toBe(tertutup + 1);

    // `mousedown`, bukan `click`: itu peristiwa yang dipakai pola tutup-di-luar
    // di komponen ini, dan ia mendahului `click` sehingga panel akun sempat
    // terbuka pada ketukan yang sama.
    fireEvent.mouseDown(screen.getByTestId('avatar'));

    expect(hitungTautan()).toBe(tertutup);
  });

  it('menutup laci navigasi ketika lonceng notifikasi diketuk', () => {
    render(<Navbar />);
    const tertutup = hitungTautan();

    fireEvent.click(screen.getByLabelText(/buka menu navigasi/i));
    expect(hitungTautan()).toBe(tertutup + 1);

    fireEvent.mouseDown(screen.getByTestId('lonceng'));

    expect(hitungTautan()).toBe(tertutup);
  });

  it('TIDAK menutup laci ketika isinya sendiri yang diketuk', () => {
    // Kalau tutup-di-luar dipasang tanpa pengecualian, laci yang sedang
    // digulir atau ditekan di area kosongnya ikut tertutup.
    render(<Navbar />);
    const tertutup = hitungTautan();

    fireEvent.click(screen.getByLabelText(/buka menu navigasi/i));
    const dalamLaci = screen.getAllByRole('link', { name: NAMA_TAUTAN })[1];

    fireEvent.mouseDown(dalamLaci);

    expect(hitungTautan()).toBe(tertutup + 1);
  });

  it('tombol hamburger tetap menutup laci yang sedang terbuka', () => {
    // Jebakan pola tutup-di-luar: hamburger berada DI LUAR laci, jadi tanpa
    // pengecualian ia akan menutup laci pada `mousedown` lalu membukanya lagi
    // pada `click` -- tombolnya berhenti berfungsi sebagai penutup.
    render(<Navbar />);
    const tertutup = hitungTautan();

    fireEvent.click(screen.getByLabelText(/buka menu navigasi/i));
    expect(hitungTautan()).toBe(tertutup + 1);

    const tombol = screen.getByLabelText(/tutup menu navigasi/i);
    fireEvent.mouseDown(tombol);
    fireEvent.click(tombol);

    expect(hitungTautan()).toBe(tertutup);
  });
});
