import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, paginated, auditLogFixture } from '@/mocks/handlers';
import AdminKabAuditLogsPage from '../page';

/**
 * Halaman Audit Log Admin Kabupaten (INT-34) — sebelumnya tanpa cakupan uji.
 *
 * Beberapa nilai yang tampil DIDERIVASI adapter, bukan dikirim backend:
 *   - `module`  <- entitas         (`survey` -> "Survei")
 *   - `action`  <- aksi            (`update_status` -> "UPDATE STATUS")
 *   - `summary` <- aksi + entitas  ("UPDATE STATUS Pengaduan")
 * Backend hanya menyimpan actorId/aksi/entitas/detail/timestamp, jadi
 * pengujian di sini sekaligus mengunci aturan penerjemahan itu.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Opsi dropdown dirender sebagai <button>; sel tabel tidak — dipakai untuk membedakan. */
const opsiDropdown = (teks) =>
  screen.getAllByText(teks).find((el) => el.closest('button') !== null);

describe('Halaman Audit Log (Admin Kabupaten)', () => {
  it('menampilkan keadaan memuat sebelum data tiba', () => {
    render(<AdminKabAuditLogsPage />);
    expect(screen.getByText(/memuat log aktivitas/i)).toBeInTheDocument();
  });

  it('merender daftar log beserta modul dan ringkasan hasil penerjemahan adapter', async () => {
    render(<AdminKabAuditLogsPage />);

    expect(await screen.findByText('CREATE Survei')).toBeInTheDocument();
    expect(screen.getByText('UPDATE STATUS Pengaduan')).toBeInTheDocument();
    expect(screen.getByText('SYNC OPD')).toBeInTheDocument();

    // Nama aktor datang dari backend (sudah di-join sebagai `actorNama`).
    expect(screen.getAllByText('Admin Kabupaten (Contoh)')).toHaveLength(2);
    expect(screen.getByText('Admin OPD (Contoh)')).toBeInTheDocument();
  });

  it('menautkan tiap baris ke halaman detailnya', async () => {
    render(<AdminKabAuditLogsPage />);
    await screen.findByText('CREATE Survei');

    const tautan = screen.getAllByRole('link');
    expect(tautan[0]).toHaveAttribute('href', '/admin-kab/audit-logs/1');
  });

  it('menampilkan keadaan kosong ketika tidak ada log', async () => {
    server.use(http.get(`${API_BASE}/audit-logs`, () => paginated([], '/audit-logs', { total: 0 })));
    render(<AdminKabAuditLogsPage />);

    expect(await screen.findByText('Tidak ada log aktivitas')).toBeInTheDocument();
  });

  it('mengirim filter entitas ke API saat modul dipilih', async () => {
    const entitasDiminta = jest.fn();
    server.use(
      http.get(`${API_BASE}/audit-logs`, ({ request }) => {
        const entitas = new URL(request.url).searchParams.get('entitas');
        entitasDiminta(entitas);
        const list = entitas
          ? [
              auditLogFixture({
                id: 2,
                aksi: 'update_status',
                entitas: 'complaint',
                actorNama: 'Admin OPD (Contoh)',
              }),
            ]
          : [auditLogFixture(), auditLogFixture({ id: 2, entitas: 'complaint' })];
        return paginated(list, '/audit-logs', { total: list.length });
      }),
    );

    render(<AdminKabAuditLogsPage />);
    await screen.findByText('CREATE Survei');

    fireEvent.click(screen.getByText('Semua Modul'));
    fireEvent.click(opsiDropdown('Pengaduan'));

    await waitFor(() => expect(entitasDiminta).toHaveBeenLastCalledWith('complaint'));
    expect(await screen.findByText('UPDATE STATUS Pengaduan')).toBeInTheDocument();
    expect(screen.queryByText('CREATE Survei')).not.toBeInTheDocument();
  });

  it('tombol Reset Filter mengembalikan tampilan ke seluruh modul', async () => {
    render(<AdminKabAuditLogsPage />);
    await screen.findByText('CREATE Survei');

    fireEvent.click(screen.getByText('Semua Modul'));
    fireEvent.click(opsiDropdown('Pengaduan'));
    await waitFor(() => expect(screen.queryByText('CREATE Survei')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /reset filter/i }));

    expect(await screen.findByText('CREATE Survei')).toBeInTheDocument();
    expect(screen.getByText('SYNC OPD')).toBeInTheDocument();
  });

  it('menampilkan ErrorState dan memuat ulang saat tombol coba lagi ditekan', async () => {
    let gagal = true;
    server.use(
      http.get(`${API_BASE}/audit-logs`, () => {
        if (gagal) return ok({ message: 'Server bermasalah' }, '/audit-logs', 500);
        return paginated([auditLogFixture()], '/audit-logs', { total: 1 });
      }),
    );

    render(<AdminKabAuditLogsPage />);
    expect(await screen.findByText('Gagal memuat log aktivitas')).toBeInTheDocument();

    gagal = false;
    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));

    expect(await screen.findByText('CREATE Survei')).toBeInTheDocument();
  });
  it('menyaring log aktivitas berdasarkan input pencarian', async () => {
    render(<AdminKabAuditLogsPage />);
    await screen.findByText('CREATE Survei');

    const inputSearch = screen.getByPlaceholderText(/cari berdasarkan nama pengguna, modul, atau aksi/i);
    expect(inputSearch).toBeInTheDocument();

    fireEvent.change(inputSearch, { target: { value: 'Survei' } });
    await waitFor(() => expect(screen.getByDisplayValue('Survei')).toBeInTheDocument());
  });

  it('menyediakan pilihan filter Aksi', async () => {
    render(<AdminKabAuditLogsPage />);
    await screen.findByText('CREATE Survei');

    expect(screen.getByText('Semua Aksi')).toBeInTheDocument();
    expect(screen.getByLabelText(/dari tanggal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sampai tanggal/i)).toBeInTheDocument();
  });
});

/**
 * KETERANGAN RETENSI (30 September 2026).
 *
 * Diuji di tingkat HALAMAN, bukan cuma komponennya: yang perlu dibuktikan bukan
 * bahwa komponennya dapat merender angka, melainkan bahwa halaman ini
 * benar-benar mengambil angka itu dari server dan menaruhnya SEBELUM penyaring
 * tanggal. Letak itu seluruh gunanya — keterangan yang muncul di bawah tabel
 * terbaca sesudah orangnya sudah bingung.
 */
describe('Halaman Audit Log — keterangan retensi', () => {
  it('mengambil lama retensi dari server dan menaruhnya di ATAS penyaring', async () => {
    render(<AdminKabAuditLogsPage />);

    const keterangan = await screen.findByTestId('audit-retention-notice');
    expect(keterangan).toHaveTextContent(/14 hari/);

    // Letaknya ikut dijaga: penyaring tanggal harus MENYUSUL keterangan ini.
    const cari = screen.getByPlaceholderText(/cari berdasarkan nama pengguna/i);
    /* eslint-disable-next-line no-bitwise */
    expect(keterangan.compareDocumentPosition(cari) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('retensi mati -> tak ada janji penyimpanan yang dipajang', async () => {
    // `hari: null` berarti AUDIT_RETENTION_DAYS tak disetel dan tak ada baris
    // yang pernah dipangkas. Memajang "disimpan N hari" di keadaan itu adalah
    // pernyataan yang tidak benar.
    server.use(
      http.get(`${API_BASE}/audit-logs/retensi`, () => ok({ hari: null }, '/audit-logs/retensi')),
    );

    render(<AdminKabAuditLogsPage />);
    await screen.findByText('CREATE Survei');

    expect(screen.queryByTestId('audit-retention-notice')).not.toBeInTheDocument();
  });

  it('endpoint retensi gagal TIDAK menggagalkan halaman', async () => {
    // Angka retensi itu keterangan; daftar lognya isi utama. Satu endpoint yang
    // bermasalah tak boleh mengosongkan tabelnya.
    server.use(
      http.get(`${API_BASE}/audit-logs/retensi`, () => new Response(null, { status: 500 })),
    );

    render(<AdminKabAuditLogsPage />);

    expect(await screen.findByText('CREATE Survei')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-retention-notice')).not.toBeInTheDocument();
  });
});
