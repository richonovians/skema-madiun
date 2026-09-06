import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { useRouter } from 'next/navigation';
import { handlers, ok } from '@/mocks/handlers';
import CreateComplaintForm from '../CreateComplaintForm';

/**
 * Taksonomi kategori pengaduan disederhanakan menjadi Aduan/Lapor/Lainnya
 * (4 September 2026) dan sub-kategori dibuang seluruhnya.
 *
 * Pilihan Dropdown.jsx TIDAK ada di DOM sebelum pemicunya diklik, jadi setiap
 * pemeriksaan di sini membuka dropdownnya lebih dulu -- pola sama
 * SurveyForm.test.jsx. Versi pertama berkas ini memeriksa ketiadaan teks
 * "Sub-Kategori" tanpa memilih kategori dulu, dan itu LULUS bahkan sebelum
 * fiturnya dibuang (dropdown sub-kategori memang hanya dirender setelah ada
 * kategori terpilih) -- lulus palsu yang baru terlihat karena uji ini
 * dijalankan lebih dulu dan diamati.
 */
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  useRouter.mockReturnValue({ push: jest.fn() });
});

const kategoriDropdown = () => screen.getByLabelText(/kategori pengaduan/i);

describe('CreateComplaintForm — kategori umum', () => {
  it('menawarkan tepat tiga kategori dari API, tanpa kategori topik lama', async () => {
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    fireEvent.click(kategoriDropdown());

    expect(await screen.findByText('Aduan')).toBeInTheDocument();
    expect(screen.getByText('Lapor')).toBeInTheDocument();
    expect(screen.getByText('Lainnya')).toBeInTheDocument();
    expect(screen.queryByText('Infrastruktur')).not.toBeInTheDocument();
    expect(screen.queryByText('Kesehatan')).not.toBeInTheDocument();
  });

  it('setelah kategori dipilih, tak ada lagi pilihan sub-kategori', async () => {
    // Handler sub-kategori SENGAJA dipasang kembali BERISI: tanpa ini uji lulus
    // hanya karena mocknya sudah dibuang (dropdown lama memang cuma muncul bila
    // daftarnya tak kosong) -- bukan karena fiturnya benar-benar hilang. Probe
    // yang tak dapat membedakan dua keadaan tidak membuktikan apa pun.
    server.use(
      http.get(`${API_BASE}/ref/complaint-sub-categories`, () =>
        ok(
          [{ kode: 'bpjs', nama: 'Layanan BPJS', kategoriKode: 'aduan' }],
          '/ref/complaint-sub-categories',
        ),
      ),
    );

    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    fireEvent.click(kategoriDropdown());
    fireEvent.click(await screen.findByText('Aduan'));

    // Inilah keadaan tempat dropdown sub-kategori DULU muncul.
    await waitFor(() => expect(kategoriDropdown()).toHaveTextContent('Aduan'));
    expect(screen.queryByText(/sub-kategori/i)).not.toBeInTheDocument();
  });

  it('tidak memanggil endpoint sub-kategori yang sudah dihapus', async () => {
    const dipanggil = jest.fn();
    server.use(
      http.get(`${API_BASE}/ref/complaint-sub-categories`, () => {
        dipanggil();
        return ok([], '/ref/complaint-sub-categories');
      }),
    );

    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    expect(dipanggil).not.toHaveBeenCalled();
  });
  it('menyediakan centang kirim sebagai anonim, baku tidak tercentang', async () => {
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    const centang = screen.getByRole('checkbox', { name: /anonim/i });
    expect(centang).not.toBeChecked();
  });
});

/**
 * Pengaduan yang pengirimnya tak tahu tujuannya (permintaan pengguna
 * 6 September 2026). Labelnya "Belum tahu tujuannya", BUKAN "Lainnya" walau itu
 * kata pengguna: formulir yang sama sudah punya KATEGORI bernama "Lainnya", dan
 * dua "Lainnya" yang artinya berbeda pada satu formulir adalah sumber kesalahan
 * pengisian. Penyimpangan ini disetujui pengguna.
 */
describe('CreateComplaintForm — tujuan belum diketahui', () => {
  const opdDropdown = () => screen.getByLabelText(/opd \/ instansi tujuan/i);

  it('menawarkan pilihan "Belum tahu tujuannya"', async () => {
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(opdDropdown());

    expect(await screen.findByText('Belum tahu tujuannya')).toBeInTheDocument();
  });

  it('mengirim TANPA memilih OPD tidak menyertakan opdId sama sekali', async () => {
    let terkirim = null;
    server.use(
      http.post(`${API_BASE}/complaints`, async ({ request }) => {
        const form = await request.formData();
        terkirim = Object.fromEntries(form.entries());
        return ok({ id: 99, ticketNo: 'PGD20260906AAAA', opdId: null }, '/complaints');
      }),
    );

    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    fireEvent.click(kategoriDropdown());
    fireEvent.click(await screen.findByText('Lainnya'));
    fireEvent.change(screen.getByLabelText(/judul laporan/i), {
      target: { value: 'Tidak tahu ke mana' },
    });
    fireEvent.change(screen.getByLabelText(/uraian/i), {
      target: { value: 'Uraian pengaduan yang cukup panjang' },
    });
    fireEvent.click(screen.getByRole('button', { name: /kirim/i }));

    await waitFor(() => expect(terkirim).not.toBeNull());
    // INTI ujinya. Mengirim `opdId` kosong atau "NaN" akan ditolak backend 400
    // oleh @IsInt, jadi tak cukup "tidak memilih" -- medannya harus benar-benar
    // tidak ikut dalam FormData.
    expect('opdId' in terkirim).toBe(false);
    expect(terkirim.kategori).toBe('lainnya');
  });

  it('KONTROL: memilih OPD tetap mengirim opdId', async () => {
    let terkirim = null;
    server.use(
      http.post(`${API_BASE}/complaints`, async ({ request }) => {
        const form = await request.formData();
        terkirim = Object.fromEntries(form.entries());
        return ok({ id: 99, ticketNo: 'PGD20260906BBBB', opdId: 1 }, '/complaints');
      }),
    );

    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(opdDropdown());
    // Pilihan Dropdown.jsx dirender sebagai <li><button>, BUKAN role="option",
    // jadi ia dipilih lewat namanya. 'Dinas Kesehatan' adalah OPD pertama pada
    // fixture mocks/handlers.ts.
    fireEvent.click(await screen.findByRole('button', { name: 'Dinas Kesehatan' }));

    fireEvent.click(kategoriDropdown());
    fireEvent.click(await screen.findByText('Aduan'));
    fireEvent.change(screen.getByLabelText(/judul laporan/i), { target: { value: 'Judul' } });
    fireEvent.change(screen.getByLabelText(/uraian/i), {
      target: { value: 'Uraian pengaduan yang cukup panjang' },
    });
    fireEvent.click(screen.getByRole('button', { name: /kirim/i }));

    await waitFor(() => expect(terkirim).not.toBeNull());
    expect('opdId' in terkirim).toBe(true);
  });
});
