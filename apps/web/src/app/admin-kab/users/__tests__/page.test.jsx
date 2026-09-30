import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ManajemenUsersPage from '../page';
import { USER_ROLES } from '@/features/users/constants/userConstants';
import {
  getUsers,
  getUserStats,
  updateUser,
  updateUserStatus,
  deleteUser,
} from '@/features/users/services/users.api';

jest.mock('@/features/users/services/users.api', () => ({
  getUsers: jest.fn(),
  getUserStats: jest.fn(),
  updateUser: jest.fn(),
  updateUserStatus: jest.fn(),
  deleteUser: jest.fn(),
}));

/**
 * GERBANG KONFIRMASI DI MANAJEMEN USER (permintaan pengguna 8 September 2026).
 *
 * Yang diuji di sini bukan tombolnya (itu di
 * features/users/components/__tests__/UsersTable.test.jsx), melainkan bahwa
 * halaman ini benar-benar menahan aksinya di ConfirmDialog. Bedanya penting:
 * tabel yang benar tak berarti apa-apa kalau halamannya memanggil endpoint
 * begitu tombol ditekan.
 *
 * SEJAK 30 SEPTEMBER 2026 aksi barisnya tinggal di dalam menu titik-tiga, jadi
 * tiap uji membukanya lebih dahulu lewat `pilihButir`.
 */
const AKUN = {
  id: 42,
  name: 'Budi Santoso',
  email: 'budi@madiunkab.go.id',
  initials: 'BS',
  roles: ['responden'],
  opdId: null,
  organization: null,
  createdAt: '6 Sep 2026',
  status: 'ACTIVE',
};

/**
 * ASN yang instansinya SUDAH tertaut -- satu-satunya bentuk akun yang dapat
 * dinaikkan menjadi Admin OPD. `roles` memakai nilai hasil adapter (bukan nilai
 * mentah backend seperti AKUN di atas) karena payload yang dikirim halaman ini
 * disusun dari nilai itu.
 */
const AKUN_ASN = {
  ...AKUN,
  id: 77,
  name: 'Siti ASN',
  email: 'siti@madiunkab.go.id',
  roles: [USER_ROLES.RESPONDENT],
  opdId: 16,
  organization: 'Dinas Komunikasi dan Informatika',
};

/** Buka menu aksi barisnya, lalu pilih satu butir. */
const pilihButir = (nama) => {
  fireEvent.click(screen.getByRole('button', { name: /aksi untuk/i }));
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: nama }));
};

beforeEach(() => {
  jest.clearAllMocks();
  getUsers.mockResolvedValue({ data: [AKUN], meta: { total: 1 } });
  getUserStats.mockResolvedValue({ activeUsers: 1, totalUsers: 1 });
  updateUser.mockResolvedValue({});
  updateUserStatus.mockResolvedValue({});
  deleteUser.mockResolvedValue({});
});

describe('ManajemenUsersPage — konfirmasi aksi', () => {
  it('Nonaktifkan menahan di dialog dan menyebut nama akunnya', async () => {
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');

    pilihButir(/nonaktifkan/i);

    expect(screen.getByText('Nonaktifkan akun ini?')).toBeInTheDocument();
    expect(screen.getByText(/"Budi Santoso" tidak akan dapat masuk ke SKEMA/)).toBeInTheDocument();
    expect(updateUserStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /ya, nonaktifkan/i }));

    await waitFor(() => expect(updateUserStatus).toHaveBeenCalledWith(42, false));
  });

  it('akun nonaktif memakai naskah Aktifkan dan mengirim true', async () => {
    getUsers.mockResolvedValue({ data: [{ ...AKUN, status: 'INACTIVE' }], meta: { total: 1 } });
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');

    pilihButir(/aktifkan/i);

    expect(screen.getByText('Aktifkan kembali akun ini?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ya, aktifkan/i }));

    await waitFor(() => expect(updateUserStatus).toHaveBeenCalledWith(42, true));
  });

  it('Batal tidak memanggil apa pun', async () => {
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');

    pilihButir(/hapus/i);
    fireEvent.click(screen.getByRole('button', { name: /^batal$/i }));

    expect(deleteUser).not.toHaveBeenCalled();
    expect(updateUserStatus).not.toHaveBeenCalled();
    expect(screen.queryByText('Hapus akun ini?')).not.toBeInTheDocument();
  });

  it('Hapus yang dikonfirmasi memanggil deleteUser dengan id barisnya', async () => {
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');

    pilihButir(/hapus/i);
    fireEvent.click(screen.getByRole('button', { name: /ya, hapus akun/i }));

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith(42));
  });

  it('daftar dimuat ulang sesudah aksi berhasil', async () => {
    // Tanpa ini, akun yang baru dinonaktifkan masih tampil aktif sampai
    // pengguna memuat ulang halaman sendiri, dan itu terbaca sebagai gagal.
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');
    expect(getUsers).toHaveBeenCalledTimes(1);

    pilihButir(/nonaktifkan/i);
    fireEvent.click(screen.getByRole('button', { name: /ya, nonaktifkan/i }));

    await waitFor(() => expect(getUsers).toHaveBeenCalledTimes(2));
  });
});

/**
 * PINTASAN JADIKAN ADMIN OPD (permintaan pengguna 30 September 2026).
 *
 * Kemampuannya sudah ada sebelum ini -- halaman "Ubah Role" punya kotak centang
 * Admin OPD. Yang diuji di sini bahwa pintasan tiga-klik-menjadi-satu ini
 * mengirim hal yang SAMA dengan cara panjangnya, dan tak melewatkan gerbang
 * konfirmasinya.
 */
describe('ManajemenUsersPage — jadikan Admin OPD', () => {
  beforeEach(() => {
    getUsers.mockResolvedValue({ data: [AKUN_ASN], meta: { total: 1 } });
  });

  it('menahan di dialog yang MENYEBUT instansinya', async () => {
    render(<ManajemenUsersPage />);
    await screen.findByText('Siti ASN');

    pilihButir(/jadikan admin opd/i);

    expect(screen.getByText('Jadikan Admin OPD?')).toBeInTheDocument();
    // Instansinya wajib disebut: yang diserahkan adalah kuasa atas data satu
    // instansi, dan yang menekan harus melihat instansi mana SEBELUM menekan.
    //
    // Dicocokkan bersama KALIMAT dialognya, bukan nama instansinya saja: nama
    // itu juga muncul di kolom AFILIASI INSTANSI pada barisnya, sehingga
    // pencocokan pendek menemukan dua elemen dan tak membuktikan bahwa yang
    // menyebutnya adalah dialog ini.
    expect(
      screen.getByText(
        /akan dapat mengelola survei, pertanyaan, respons, dan pengaduan milik Dinas Komunikasi dan Informatika/,
      ),
    ).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('dikonfirmasi: mengirim roles + opd dan MEMPERTAHANKAN responden', async () => {
    render(<ManajemenUsersPage />);
    await screen.findByText('Siti ASN');

    pilihButir(/jadikan admin opd/i);
    fireEvent.click(screen.getByRole('button', { name: /ya, jadikan admin opd/i }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));
    const [id, payload] = updateUser.mock.calls[0];
    expect(id).toBe(77);
    expect(payload.roles).toEqual(
      expect.arrayContaining([USER_ROLES.ADMIN_OPD, USER_ROLES.RESPONDENT]),
    );
    // `opdId` TIDAK boleh ikut: ia milik Helpdesk dan UpdateUserDto menolaknya
    // 400, yang akan menggagalkan seluruh permintaan.
    expect(payload).not.toHaveProperty('opdId');
  });

  it('daftar dimuat ulang sesudah kenaikan berhasil', async () => {
    render(<ManajemenUsersPage />);
    await screen.findByText('Siti ASN');
    expect(getUsers).toHaveBeenCalledTimes(1);

    pilihButir(/jadikan admin opd/i);
    fireEvent.click(screen.getByRole('button', { name: /ya, jadikan admin opd/i }));

    await waitFor(() => expect(getUsers).toHaveBeenCalledTimes(2));
  });
});

describe('ManajemenUsersPage — tombol Buat Akun Admin Baru dibuang', () => {
  it('tak ada tombol maupun tautan membuat akun di halaman ini', async () => {
    // Diminta pengguna 30 September 2026. Rute /admin-kab/users/create sengaja
    // dibiarkan hidup; yang dibuang hanya jalan masuk dari halaman ini.
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');

    expect(screen.queryByRole('button', { name: /buat akun/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /buat akun/i })).not.toBeInTheDocument();
  });
});
