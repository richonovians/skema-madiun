import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import AlihkanComplaintModal from '../AlihkanComplaintModal';

/**
 * PENGALIHAN PENGADUAN ANTAR-INSTANSI (5 November 2026).
 *
 * Bedanya dari triase (`ForwardComplaintModal`): tiketnya SUDAH bertujuan,
 * pelakunya boleh Admin OPD pemiliknya sendiri, dan kategorinya ikut diganti
 * karena tingkat OPD tujuan dapat berbeda.
 *
 * Haknya ditegakkan BACKEND (`ComplaintsService.alihkan`), bukan oleh
 * ada-tidaknya modal ini di layar.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Tiket milik OPD id 1 ("Dinas Kesehatan" pada fixture). */
const pengaduan = (over = {}) => ({
  id: 77,
  ticketNo: 'PGD20261105AAAA',
  opdId: 1,
  target: 'Dinas Kesehatan',
  kategori: 'kab_kesehatan',
  ...over,
});

/**
 * `Dropdown` BELUM memakai pola combobox/listbox penuh — pemicunya `<button>`
 * berlabel `<label htmlFor>`, dan tiap pilihan `<button>` di dalam `<li>`
 * (lihat catatannya di Dropdown.jsx). Pembantu di bawah membacanya apa adanya,
 * pola yang sama dengan triase.test.jsx.
 */
const bukaDropdown = async (namaLabel) => {
  fireEvent.click(await screen.findByLabelText(new RegExp(namaLabel, 'i')));
};

const opsi = (teks) => screen.queryByRole('button', { name: teks });

const pilihOpsi = async (teks) => {
  fireEvent.click(await screen.findByRole('button', { name: teks }));
};

const isiAlasan = (teks) =>
  fireEvent.change(screen.getByLabelText(/alasan pengalihan/i), { target: { value: teks } });

const tombolKirim = () => screen.getByRole('button', { name: /alihkan pengaduan/i });

describe('AlihkanComplaintModal', () => {
  it('mengirim PATCH /complaints/:id/alihkan dengan opdId, kategori, dan catatan', async () => {
    const dikirim = jest.fn();
    server.use(
      http.patch(`${API_BASE}/complaints/:id/alihkan`, async ({ request, params }) => {
        dikirim({ id: params.id, body: await request.json() });
        return ok({ id: 77, opdId: 2 }, `/complaints/${params.id}/alihkan`);
      }),
    );
    const onDone = jest.fn();
    render(<AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={onDone} />);

    await bukaDropdown('instansi tujuan');
    await pilihOpsi('Dinas Pendidikan');
    await bukaDropdown('kategori baru');
    await pilihOpsi('Kependudukan & Pencatatan Sipil');
    isiAlasan('Bukan kewenangan kami.');
    fireEvent.click(tombolKirim());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(dikirim).toHaveBeenCalledWith({
      id: '77',
      body: { opdId: 2, kategori: 'kab_kependudukan', catatan: 'Bukan kewenangan kami.' },
    });
  });

  it('tombol kirim mati sampai ketiga isian terisi', async () => {
    render(<AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />);

    expect(tombolKirim()).toBeDisabled();

    await bukaDropdown('instansi tujuan');
    await pilihOpsi('Dinas Pendidikan');
    expect(tombolKirim()).toBeDisabled();

    await bukaDropdown('kategori baru');
    await pilihOpsi('Kependudukan & Pencatatan Sipil');
    expect(tombolKirim()).toBeDisabled();

    isiAlasan('Bukan kewenangan kami.');
    expect(tombolKirim()).toBeEnabled();
  });

  it('alasan berisi spasi saja tidak menghidupkan tombol', () => {
    // Backend memangkas lalu menolaknya 400. Menawarkan tombol hidup berarti
    // petugas menekannya dan baru kemudian diberi tahu.
    render(<AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />);

    isiAlasan('   ');
    expect(tombolKirim()).toBeDisabled();
  });

  it('daftar kategori mengikuti TINGKAT OPD tujuan yang dipilih', async () => {
    render(<AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />);

    await bukaDropdown('instansi tujuan');
    await pilihOpsi('Kecamatan Geger');
    await bukaDropdown('kategori baru');

    expect(await screen.findByRole('button', { name: 'Pelayanan Administrasi Kecamatan' })).toBeInTheDocument();
    expect(opsi('Kependudukan & Pencatatan Sipil')).not.toBeInTheDocument();
  });

  it('mengosongkan kategori saat tingkat OPD tujuan berubah', async () => {
    render(<AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />);

    await bukaDropdown('instansi tujuan');
    await pilihOpsi('Dinas Pendidikan');
    await bukaDropdown('kategori baru');
    await pilihOpsi('Kependudukan & Pencatatan Sipil');
    expect(tombolKirim()).toBeDisabled(); // alasan belum diisi

    // Berpindah ke tingkat lain membuat kategori terpilih tak lagi sah.
    await bukaDropdown('instansi tujuan');
    await pilihOpsi('Kecamatan Geger');
    isiAlasan('Bukan kewenangan kami.');

    expect(tombolKirim()).toBeDisabled();
  });

  it('OPD pemilik saat ini tidak ditawarkan', async () => {
    render(<AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />);

    await bukaDropdown('instansi tujuan');

    expect(await screen.findByRole('button', { name: 'Dinas Pendidikan' })).toBeInTheDocument();
    expect(opsi('Dinas Kesehatan')).not.toBeInTheDocument();
  });

  /**
   * BUG-080 (9 November 2026). Backend memasang `@MaxLength(1000)` pada
   * `AlihkanComplaintDto.catatan`; tanpa batas yang sama di sini, alasan
   * 1.001 karakter baru ditolak sesudah tombol ditekan, dengan pesan umum
   * yang tak menyebut medan mana yang salah.
   */
  it('alasan dibatasi 1.000 karakter, sama dengan batas backend', () => {
    render(<AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />);

    expect(screen.getByLabelText(/alasan pengalihan/i)).toHaveAttribute('maxLength', '1000');
  });

  /**
   * PASANGAN dari uji di atas: `maxLength` menghentikan ketikan tanpa
   * penjelasan apa pun, dan petugas yang menempel alasan panjang mendapati
   * kalimatnya terpotong diam-diam. Penghitung inilah penjelasannya.
   */
  it('menampilkan sisa batas alasan selagi diketik', () => {
    render(<AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />);

    isiAlasan('Bukan kewenangan kami.');

    expect(screen.getByText('22/1.000')).toBeInTheDocument();
  });

  it('menampilkan galat backend tanpa menutup modal', async () => {
    server.use(
      http.patch(`${API_BASE}/complaints/:id/alihkan`, () =>
        ok({ message: 'Instansi sedang nonaktif' }, '/complaints/77/alihkan', 400),
      ),
    );
    const onDone = jest.fn();
    render(<AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={onDone} />);

    await bukaDropdown('instansi tujuan');
    await pilihOpsi('Dinas Pendidikan');
    await bukaDropdown('kategori baru');
    await pilihOpsi('Kependudukan & Pencatatan Sipil');
    isiAlasan('Bukan kewenangan kami.');
    fireEvent.click(tombolKirim());

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  /**
   * DUA SYARAT SEKALIGUS, dan versi pertama fitur ini melanggar yang pertama
   * sambil memenuhi yang kedua (laporan pengguna 5 November 2026: "pilihan
   * pengalihan instansi dan kategori baru tidak ada di dropdownnya").
   *
   * 1. Permintaannya harus DITERIMA backend. `PaginationQueryDto` memasang
   *    `@Max(100)` pada `limit`, jadi `limit=500` dijawab 400 "limit must not
   *    be greater than 100" -- daftarnya tak pernah termuat, dan dropdown
   *    kategori ikut kosong karena tingkatnya tak dapat diketahui.
   * 2. Daftarnya TIDAK boleh terpotong. Pada satu halaman 100 baris, instansi
   *    tujuan akan hilang tanpa galat apa pun begitu Helpdesk melewati 100
   *    OPD (hari ini 63).
   *
   * Keduanya hanya dapat dipenuhi dengan menelusuri halaman.
   *
   * Tiruan di bawah MENEGAKKAN batas itu, tak seperti handler baku. Itulah
   * sebabnya cacat ini lolos: tiruan yang lebih longgar daripada backend
   * membuat uji membandingkan jawaban dengan dirinya sendiri.
   */
  describe('memuat daftar OPD', () => {
    const opdPalsu = (id) => ({
      id,
      kode: `OPD${id}`,
      nama: `Dinas Nomor ${id}`,
      tingkat: 'kabupaten',
      isActive: true,
    });

    /** Meniru `PaginationQueryDto`: `limit` > 100 dijawab 400, seperti backend. */
    const opdBerhalaman = (total, limitDipakai) =>
      http.get(`${API_BASE}/opd`, ({ request }) => {
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get('limit') ?? 20);
        const page = Number(url.searchParams.get('page') ?? 1);
        if (limit > 100) {
          limitDipakai.push(limit);
          return HttpResponse.json(
            { statusCode: 400, message: ['limit must not be greater than 100'], error: true },
            { status: 400 },
          );
        }
        limitDipakai.push(limit);
        const semua = Array.from({ length: total }, (_, i) => opdPalsu(i + 1));
        const mulai = (page - 1) * limit;
        return HttpResponse.json({
          success: true,
          statusCode: 200,
          message: 'OK',
          data: semua.slice(mulai, mulai + limit),
          meta: {
            timestamp: new Date().toISOString(),
            path: '/api/v1/opd',
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
          },
        });
      });

    it('tidak pernah meminta limit yang ditolak backend', async () => {
      const limitDipakai = [];
      server.use(opdBerhalaman(63, limitDipakai));
      render(
        <AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />,
      );

      await bukaDropdown('instansi tujuan');
      expect(await screen.findByRole('button', { name: 'Dinas Nomor 2' })).toBeInTheDocument();
      expect(limitDipakai.every((l) => l <= 100)).toBe(true);
    });

    /**
     * Daftar yang GAGAL DIMUAT tergambar identik dengan daftar yang memang
     * kosong, dan itulah yang membuat cacat `limit: 500` tak terlihat saat
     * dicoba manual: tak ada pesan apa pun, hanya dropdown kosong.
     */
    it('mengatakan daftarnya gagal dimuat, bukan menggambarnya kosong', async () => {
      server.use(
        http.get(`${API_BASE}/opd`, () =>
          HttpResponse.json({ statusCode: 500, message: 'Database down', error: true }, { status: 500 }),
        ),
      );
      render(
        <AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />,
      );

      expect(await screen.findByText(/gagal memuat daftar instansi/i)).toBeInTheDocument();
    });

    it('memuat SELURUH instansi ketika jumlahnya melewati satu halaman', async () => {
      const limitDipakai = [];
      server.use(opdBerhalaman(230, limitDipakai));
      render(
        <AlihkanComplaintModal complaint={pengaduan()} onClose={jest.fn()} onDone={jest.fn()} />,
      );

      await bukaDropdown('instansi tujuan');

      // Baris terakhir ada di halaman KETIGA; tanpa penelusuran halaman ia
      // hilang dari dropdown tanpa galat apa pun.
      expect(await screen.findByRole('button', { name: 'Dinas Nomor 230' })).toBeInTheDocument();
    });
  });
});
