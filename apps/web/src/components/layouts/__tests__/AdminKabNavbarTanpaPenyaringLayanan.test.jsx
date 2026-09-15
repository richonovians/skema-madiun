import React from 'react';
import { act, render, screen } from '@testing-library/react';
import AdminKabNavbar from '../AdminKabNavbar';

jest.mock('next/navigation', () => ({ usePathname: () => '/admin-kab/dashboard' }));

const setPeriode = jest.fn();
jest.mock('../AdminKabLayoutProvider', () => ({
  useAdminKabLayout: () => ({
    periode: '',
    setPeriode,
    isMobileSidebarOpen: false,
    setIsMobileSidebarOpen: () => {},
  }),
}));

jest.mock('../AdminAccountMenu', () => ({ __esModule: true, default: () => <div /> }));
jest.mock('@/components/ui/NotificationDropdown', () => ({
  __esModule: true,
  default: () => <div />,
}));

/**
 * Profil dipakai menu akun; yang diuji di sini bukan isinya. `useAsync`
 * dibiarkan ASLI supaya pemanggilan data yang masih tertinggal benar-benar
 * dijalankan -- kalau di-mock, penyaring layanan yang masih mengambil daftar
 * OPD justru tak akan ketahuan.
 */
jest.mock('@/features/profile/services/profile.api', () => ({
  getMyProfile: jest.fn().mockResolvedValue({ nama: 'Uji', roleLabel: 'Admin Kabupaten' }),
}));

const getOpdList = jest.fn().mockResolvedValue({
  data: [{ id: 1, serviceType: 'Kesehatan' }],
});
jest.mock('@/features/opd/services/opd.api', () => ({
  getOpdList: (...args) => getOpdList(...args),
}));

/**
 * PENYARING JENIS LAYANAN DIBUANG DARI AREA ADMIN KABUPATEN (15 September 2026,
 * permintaan pengguna).
 *
 * Bukan cuma dropdown yang hilang. Opsinya diturunkan dari `GET /opd` yang
 * dipanggil HANYA untuk mengisi daftar itu, pada setiap halaman Admin Kabupaten
 * -- termasuk lima halaman yang tak punya penyaring sama sekali.
 */
describe('AdminKabNavbar — tanpa penyaring jenis layanan', () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * Pemasangannya DITUNGGU sampai janji-janjinya selesai. Dropdown itu baru
   * muncul setelah daftar OPD tiba (`hasServiceFilter` bergantung pada
   * panjangnya), jadi pemeriksaan pada render pertama akan menyatakan ia sudah
   * hilang padahal ia cuma belum sempat digambar.
   */
  const pasang = async () => {
    await act(async () => {
      render(<AdminKabNavbar />);
    });
  };

  it('tidak lagi memuat dropdown jenis layanan', async () => {
    await pasang();

    expect(document.querySelector('#filter-kab-layanan')).toBeNull();
    expect(screen.queryByText(/semua layanan/i)).toBeNull();
  });

  it('tidak lagi mengambil daftar OPD hanya untuk mengisi pilihannya', async () => {
    await pasang();

    expect(getOpdList).not.toHaveBeenCalled();
  });

  /**
   * PASANGAN kontrol. Navbar yang gagal dirender, atau penyaring periode yang
   * ikut terbawa saat dropdown tetangganya dicabut, juga lolos kedua uji di
   * atas -- dan dashboard eksekutif kehilangan satu-satunya cara memilih
   * triwulan.
   */
  it('KONTROL: penyaring periode tetap berdiri', async () => {
    await pasang();

    expect(document.querySelector('#filter-kab-periode')).not.toBeNull();
    expect(screen.getByText(/semua periode/i)).toBeInTheDocument();
  });
});
