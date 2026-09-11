import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import ComplaintTable from '../ComplaintTable';
import ForwardComplaintModal from '../ForwardComplaintModal';

/**
 * TRIASE PENGADUAN (permintaan pengguna 6 September 2026): pengaduan yang
 * pengirimnya tak tahu tujuannya masuk tanpa OPD, lalu Superuser/Admin
 * Kabupaten meneruskannya ke OPD yang berwenang.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const baris = (over = {}) => ({
  id: 'PGD20260906AAAA',
  opdId: null,
  target: null,
  kategori: 'lainnya',
  title: 'Tidak tahu harus ke mana',
  reporter: { name: 'Warga Contoh' },
  dateStr: '6 Sep 2026',
  ageDays: 0,
  status: 'Diterima',
  ...over,
});

describe('ComplaintTable — pengaduan belum bertujuan', () => {
  it('menandai barisnya "Belum bertujuan", bukan tanda hubung kosong', () => {
    render(<ComplaintTable complaints={[baris()]} />);

    // '-' tak memberi tahu apa pun; petugas triase harus dapat membedakan
    // "tak ada tujuan" dari "nama OPD-nya gagal dimuat".
    expect(screen.getByText('Belum bertujuan')).toBeInTheDocument();
  });

  it('menampilkan tombol Teruskan', () => {
    const onForward = jest.fn();
    render(<ComplaintTable complaints={[baris()]} onForward={onForward} />);

    fireEvent.click(screen.getByRole('button', { name: /teruskan/i }));

    expect(onForward).toHaveBeenCalledWith(expect.objectContaining({ opdId: null }));
  });

  /**
   * KONTROL, dan inilah yang membuat dua uji di atas berarti: kalau tombolnya
   * dirender tanpa syarat, keduanya juga lulus -- dan Admin Kabupaten akan bisa
   * "meneruskan" tiket yang sudah ditangani OPD lain, yang backend tolak 400.
   */
  it('KONTROL: baris yang SUDAH bertujuan tak punya tombol Teruskan', () => {
    render(
      <ComplaintTable
        complaints={[baris({ opdId: 1, target: 'Dinas Kesehatan' })]}
        onForward={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /teruskan/i })).not.toBeInTheDocument();
    expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
    expect(screen.queryByText('Belum bertujuan')).not.toBeInTheDocument();
  });
});

describe('ForwardComplaintModal', () => {
  it('mengirim PATCH /complaints/:id/opd dengan OPD pilihan', async () => {
    let terkirim = null;
    server.use(
      http.patch(`${API_BASE}/complaints/:id/opd`, async ({ request, params }) => {
        terkirim = { id: params.id, body: await request.json() };
        return ok({ id: 99, opdId: 1 }, `/complaints/${params.id}/opd`);
      }),
    );
    const onDone = jest.fn();

    render(
      <ForwardComplaintModal complaint={{ id: 99, ticketNo: 'PGD1' }} onClose={jest.fn()} onDone={onDone} />,
    );

    // Daftar OPD dimuat dari API, jadi pilihannya baru ada sesudah itu.
    fireEvent.click(await screen.findByLabelText(/opd yang berwenang/i));
    fireEvent.click(await screen.findByRole('button', { name: 'Dinas Kesehatan' }));
    fireEvent.click(screen.getByRole('button', { name: /^teruskan$/i }));

    await waitFor(() => expect(terkirim).not.toBeNull());
    expect(terkirim.body).toEqual({ opdId: 1 });
    expect(onDone).toHaveBeenCalled();
  });

  it('tanpa memilih OPD, tombolnya tidak dapat ditekan', async () => {
    render(
      <ForwardComplaintModal complaint={{ id: 99, ticketNo: 'PGD1' }} onClose={jest.fn()} onDone={jest.fn()} />,
    );
    await screen.findByLabelText(/opd yang berwenang/i);

    // Bukan sekadar kerapian: mengirim tanpa opdId ditolak backend 400, dan
    // pesannya tak akan menjelaskan apa pun kepada petugas triase.
    expect(screen.getByRole('button', { name: /^teruskan$/i })).toBeDisabled();
  });

  it('menampilkan galat dari server, tanpa menutup modal', async () => {
    server.use(
      http.patch(`${API_BASE}/complaints/:id/opd`, () =>
        new Response(
          JSON.stringify({
            success: false,
            statusCode: 400,
            message: 'Pengaduan ini sudah memiliki OPD tujuan',
            error: { code: 'BAD_REQUEST', details: null },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const onDone = jest.fn();

    render(
      <ForwardComplaintModal complaint={{ id: 99, ticketNo: 'PGD1' }} onClose={jest.fn()} onDone={onDone} />,
    );

    fireEvent.click(await screen.findByLabelText(/opd yang berwenang/i));
    fireEvent.click(await screen.findByRole('button', { name: 'Dinas Kesehatan' }));
    fireEvent.click(screen.getByRole('button', { name: /^teruskan$/i }));

    expect(await screen.findByText(/sudah memiliki OPD tujuan/i)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});

/**
 * PENCARIAN OPD pada modal Teruskan (11 September 2026). Daftarnya SELURUH OPD
 * aktif -- 62 di basis data nyata -- dan petugas triase membukanya berkali-kali
 * dalam satu sesi kerja, sekali per pengaduan yang belum bertujuan.
 */
describe('ForwardComplaintModal — pencarian OPD', () => {
  const medanCari = () => screen.queryByRole('textbox', { name: /cari opd yang berwenang/i });

  it('menyaring daftar OPD menurut namanya', async () => {
    render(
      <ForwardComplaintModal complaint={{ id: 99, ticketNo: 'PGD1' }} onClose={jest.fn()} onDone={jest.fn()} />,
    );

    fireEvent.click(await screen.findByLabelText(/opd yang berwenang/i));
    fireEvent.change(await screen.findByRole('textbox', { name: /cari opd yang berwenang/i }), {
      target: { value: 'pendidikan' },
    });

    expect(screen.getByRole('button', { name: 'Dinas Pendidikan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dinas Kesehatan' })).not.toBeInTheDocument();
  });

  it('hasil pencarian tetap dapat dipilih dan mengaktifkan tombol Teruskan', async () => {
    render(
      <ForwardComplaintModal complaint={{ id: 99, ticketNo: 'PGD1' }} onClose={jest.fn()} onDone={jest.fn()} />,
    );

    fireEvent.click(await screen.findByLabelText(/opd yang berwenang/i));
    fireEvent.change(await screen.findByRole('textbox', { name: /cari opd yang berwenang/i }), {
      target: { value: 'kependudukan' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Dinas Kependudukan dan Pencatatan Sipil' }),
    );

    expect(screen.getByRole('button', { name: /^teruskan$/i })).toBeEnabled();
    // Panel tertutup sesudah memilih, jadi medan carinya ikut hilang.
    expect(medanCari()).not.toBeInTheDocument();
  });
});
