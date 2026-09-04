import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { useRouter } from 'next/navigation';
import { handlers } from '@/mocks/handlers';
import CreateComplaintForm from '../CreateComplaintForm';

/**
 * TC-FE-039 — Formulir pengaduan warga.
 *
 * Sampai 2 September 2026 Modul H berisi 29 kasus uji yang SELURUHNYA bertipe
 * `Integ`/`Unit` — ranah backend. Padahal `features/complaints` adalah fitur
 * frontend terbesar di proyek ini (28 komponen) dan formulir inilah pintu
 * masuknya warga. Berkas ini menutup lubang itu dari sisi antarmuka.
 *
 * Kerusakan yang ditangkap:
 *  - daftar OPD/kategori berhenti dimuat sehingga pilihannya kosong;
 *  - penyaringan sub-kategori memakai nama field yang salah, membuat
 *    sub-kategori tak pernah muncul (justru ini yang menjatuhkan berkas ini
 *    pada jalan pertamanya — lihat catatan di bawah);
 *  - sub-kategori lama tertinggal saat kategorinya diganti, sehingga terkirim
 *    pasangan kategori/sub-kategori yang tak cocok;
 *  - nama field payload multipart menyimpang dari yang diterima backend;
 *  - kegagalan server ditelan diam-diam, bukan ditampilkan.
 */

// Sama seperti `handlers.ts` dan berkas uji lain: `next/jest` memuat `.env.local`,
// tempat NEXT_PUBLIC_API_URL bernilai relatif (`/api/v1`). Menuliskan alamat
// mutlak di sini membuat `server.use()` tak pernah cocok — handler bawaanlah yang
// tetap menjawab, dan uji "kegagalan server" justru melihat keberhasilan.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CreateComplaintForm (TC-FE-039)', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    useRouter.mockReturnValue({ push: mockPush });
    mockPush.mockClear();
  });

  const dropdown = (label) => screen.getByLabelText(label);
  /** Opsi dropdown adalah <button> di dalam panel, bukan <option>. */
  const pilihOpsi = async (label, opsi) => {
    fireEvent.click(dropdown(label));
    fireEvent.click(await screen.findByRole('button', { name: opsi }));
  };

  it('memuat daftar OPD dan kategori dari API sebagai pilihan', async () => {
    render(<CreateComplaintForm />);

    fireEvent.click(await screen.findByLabelText('OPD / Instansi Tujuan'));
    expect(await screen.findByRole('button', { name: 'Dinas Kesehatan' })).toBeInTheDocument();

    fireEvent.click(dropdown('Kategori Pengaduan'));
    expect(await screen.findByRole('button', { name: 'Infrastruktur' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keamanan dan Ketertiban' })).toBeInTheDocument();
  });

  it('menampilkan sub-kategori hanya yang sesuai kategori terpilih', async () => {
    render(<CreateComplaintForm />);
    await screen.findByLabelText('Kategori Pengaduan');

    // Sebelum kategori dipilih, dropdown sub-kategori belum dirender sama sekali.
    expect(screen.queryByLabelText(/sub-kategori/i)).not.toBeInTheDocument();

    await pilihOpsi('Kategori Pengaduan', 'Infrastruktur');

    fireEvent.click(await screen.findByLabelText(/sub-kategori/i));
    expect(await screen.findByRole('button', { name: 'Jalan Rusak' })).toBeInTheDocument();
    // Milik kategori lain — tak boleh ikut tampil.
    expect(screen.queryByRole('button', { name: 'Rambu Lalu Lintas' })).not.toBeInTheDocument();
  });

  it('tidak mengirim sub-kategori lama setelah kategorinya diganti', async () => {
    // Diperiksa lewat PAYLOAD, bukan lewat tampilan. Tampilan tak dapat
    // membuktikan apa pun di sini: `Dropdown` jatuh ke `options[0]` ketika nilai
    // terpilih tak ada dalam daftar barunya, jadi layar menampilkan placeholder
    // yang sama persis baik nilai lamanya sudah dibuang maupun masih tertinggal
    // di state. Versi pertama uji ini memeriksa tampilan dan lolos bahkan
    // sesudah pengosongan sengaja dilumpuhkan — tautologi yang hanya ketahuan
    // lewat pemeriksaan mutasi.
    let terkirim = null;
    server.use(
      http.post(`${API}/complaints`, async ({ request }) => {
        terkirim = Object.fromEntries((await request.formData()).entries());
        return HttpResponse.json(
          { success: true, statusCode: 201, message: 'Created', data: { id: 99, ticketNo: 'PGD20260902TEST' } },
          { status: 201 },
        );
      }),
    );

    render(<CreateComplaintForm />);
    await screen.findByLabelText('Kategori Pengaduan');

    await pilihOpsi('OPD / Instansi Tujuan', 'Dinas Kesehatan');
    await pilihOpsi('Kategori Pengaduan', 'Infrastruktur');
    await pilihOpsi(/sub-kategori/i, 'Jalan Rusak');
    // "Jalan Rusak" milik kategori Infrastruktur. Sesudah kategorinya berganti,
    // pasangan itu tak sah — mengirimnya berarti pengaduan tersimpan dengan
    // sub-kategori yang tak berada di bawah kategorinya.
    await pilihOpsi('Kategori Pengaduan', 'Keamanan dan Ketertiban');

    fireEvent.change(screen.getByLabelText('Judul Laporan'), { target: { value: 'Judul uji' } });
    fireEvent.change(screen.getByLabelText('Uraian Detail Kejadian'), { target: { value: 'Uraian uji' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Laporan' }));

    await waitFor(() => expect(terkirim).not.toBeNull());
    expect(terkirim.kategori).toBe('keamanan_ketertiban');
    expect(terkirim).not.toHaveProperty('subKategori');
  });

  it('menandai judul dan uraian sebagai wajib diisi', async () => {
    render(<CreateComplaintForm />);

    expect(await screen.findByLabelText('Judul Laporan')).toBeRequired();
    expect(screen.getByLabelText('Uraian Detail Kejadian')).toBeRequired();
  });

  it('mengirim payload multipart dengan nama field yang diterima backend', async () => {
    let terkirim = null;
    server.use(
      http.post(`${API}/complaints`, async ({ request }) => {
        const fd = await request.formData();
        terkirim = Object.fromEntries(fd.entries());
        return HttpResponse.json(
          { success: true, statusCode: 201, message: 'Created', data: { id: 99, ticketNo: 'PGD20260902TEST' } },
          { status: 201 },
        );
      }),
    );

    render(<CreateComplaintForm />);
    await screen.findByLabelText('Kategori Pengaduan');

    await pilihOpsi('OPD / Instansi Tujuan', 'Dinas Kesehatan');
    await pilihOpsi('Kategori Pengaduan', 'Infrastruktur');
    await pilihOpsi(/sub-kategori/i, 'Jalan Rusak');
    fireEvent.change(screen.getByLabelText('Judul Laporan'), {
      target: { value: 'Jalan berlubang di depan kantor' },
    });
    fireEvent.change(screen.getByLabelText('Uraian Detail Kejadian'), {
      target: { value: 'Sudah dua pekan dan belum diperbaiki.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Laporan' }));

    // Nama field ditulis harfiah, sesuai `CreateComplaintDto` backend —
    // `judul`/`uraian`, bukan `title`/`description` yang dipakai formulir.
    await waitFor(() => expect(terkirim).not.toBeNull());
    expect(terkirim).toEqual({
      opdId: '1',
      kategori: 'infrastruktur',
      subKategori: 'jalan_rusak',
      judul: 'Jalan berlubang di depan kantor',
      uraian: 'Sudah dua pekan dan belum diperbaiki.',
    });
  });

  it('mengarahkan ke halaman sukses dengan identitas pengaduan yang baru dibuat', async () => {
    server.use(
      http.post(`${API}/complaints`, () =>
        HttpResponse.json(
          { success: true, statusCode: 201, message: 'Created', data: { id: 99, ticketNo: 'PGD20260902TEST' } },
          { status: 201 },
        ),
      ),
    );

    render(<CreateComplaintForm />);
    await screen.findByLabelText('Kategori Pengaduan');

    await pilihOpsi('OPD / Instansi Tujuan', 'Dinas Kesehatan');
    await pilihOpsi('Kategori Pengaduan', 'Infrastruktur');
    fireEvent.change(screen.getByLabelText('Judul Laporan'), { target: { value: 'Judul uji' } });
    fireEvent.change(screen.getByLabelText('Uraian Detail Kejadian'), { target: { value: 'Uraian uji' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Laporan' }));

    // `complaintId` yang diteruskan adalah **nomor tiket**, bukan id numerik.
    // Itu disengaja: `adaptComplaint` memetakan `id: complaint.ticketNo` dan
    // menyimpan id numeriknya terpisah sebagai `numericId`, karena seluruh rute
    // detail pengaduan berkunci pada nomor tiket. Menukar keduanya akan
    // mematahkan halaman sukses sekaligus setiap tautan detail.
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        '/complaints/success?complaintId=PGD20260902TEST&opdId=1&opdName=Dinas%20Kesehatan',
      ),
    );
  });

  it('menampilkan kegagalan server alih-alih menelannya', async () => {
    server.use(
      http.post(`${API}/complaints`, () =>
        HttpResponse.json(
          { success: false, statusCode: 400, message: 'Kategori tidak dikenal' },
          { status: 400 },
        ),
      ),
    );

    render(<CreateComplaintForm />);
    await screen.findByLabelText('Kategori Pengaduan');

    await pilihOpsi('OPD / Instansi Tujuan', 'Dinas Kesehatan');
    await pilihOpsi('Kategori Pengaduan', 'Infrastruktur');
    fireEvent.change(screen.getByLabelText('Judul Laporan'), { target: { value: 'Judul uji' } });
    fireEvent.change(screen.getByLabelText('Uraian Detail Kejadian'), { target: { value: 'Uraian uji' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Laporan' }));

    expect(await screen.findByText('Kategori tidak dikenal')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    // Tombol harus bisa ditekan lagi — kegagalan tidak boleh mengunci formulir.
    expect(screen.getByRole('button', { name: 'Kirim Laporan' })).toBeEnabled();
  });
});
