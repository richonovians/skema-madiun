import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ManajemenUsersPage from '../page';
import {
  getUsers,
  getUserStats,
  updateUserStatus,
  deleteUser,
} from '@/features/users/services/users.api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock('@/features/users/services/users.api', () => ({
  getUsers: jest.fn(),
  getUserStats: jest.fn(),
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

beforeEach(() => {
  jest.clearAllMocks();
  getUsers.mockResolvedValue({ data: [AKUN], meta: { total: 1 } });
  getUserStats.mockResolvedValue({ activeUsers: 1, totalUsers: 1 });
  updateUserStatus.mockResolvedValue({});
  deleteUser.mockResolvedValue({});
});

describe('ManajemenUsersPage — konfirmasi aksi', () => {
  it('Nonaktifkan menahan di dialog dan menyebut nama akunnya', async () => {
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');

    fireEvent.click(screen.getByRole('button', { name: /nonaktifkan/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /aktifkan/i }));

    expect(screen.getByText('Aktifkan kembali akun ini?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ya, aktifkan/i }));

    await waitFor(() => expect(updateUserStatus).toHaveBeenCalledWith(42, true));
  });

  it('Batal tidak memanggil apa pun', async () => {
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');

    fireEvent.click(screen.getByRole('button', { name: /hapus/i }));
    fireEvent.click(screen.getByRole('button', { name: /^batal$/i }));

    expect(deleteUser).not.toHaveBeenCalled();
    expect(updateUserStatus).not.toHaveBeenCalled();
    expect(screen.queryByText('Hapus akun ini?')).not.toBeInTheDocument();
  });

  it('Hapus yang dikonfirmasi memanggil deleteUser dengan id barisnya', async () => {
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');

    fireEvent.click(screen.getByRole('button', { name: /hapus/i }));
    fireEvent.click(screen.getByRole('button', { name: /ya, hapus akun/i }));

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith(42));
  });

  it('daftar dimuat ulang sesudah aksi berhasil', async () => {
    // Tanpa ini, akun yang baru dinonaktifkan masih tampil aktif sampai
    // pengguna memuat ulang halaman sendiri, dan itu terbaca sebagai gagal.
    render(<ManajemenUsersPage />);
    await screen.findByText('Budi Santoso');
    expect(getUsers).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /nonaktifkan/i }));
    fireEvent.click(screen.getByRole('button', { name: /ya, nonaktifkan/i }));

    await waitFor(() => expect(getUsers).toHaveBeenCalledTimes(2));
  });
});
