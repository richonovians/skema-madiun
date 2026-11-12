import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import ForwardComplaintModal from '../ForwardComplaintModal';

/**
 * PENERUSAN LINTAS TINGKAT (BUG-077, keputusan pengguna 12 November 2026).
 *
 * Tiket kecamatan yang diteruskan ke dinas berpindah ke tingkat kabupaten, dan
 * kategori `kec_*`-nya tak lagi sah di sana. Backend kini menolak penerusan
 * lintas tingkat tanpa kategori baru; modal ini menanyakannya HANYA saat
 * tingkatnya berubah, supaya penerusan setingkat tetap satu pilihan.
 *
 * Tingkat OPD dibaca dari `OpdEntity.tingkat` kiriman backend (fixture:
 * "Kecamatan Geger" kecamatan, "Dinas Pendidikan" kabupaten).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const tiketKecamatan = { id: 99, ticketNo: 'PGD1', tingkat: 'kecamatan' };

const bukaDropdown = async (namaLabel) => {
  fireEvent.click(await screen.findByLabelText(new RegExp(namaLabel, 'i')));
};
const pilihOpsi = async (teks) => {
  fireEvent.click(await screen.findByRole('button', { name: teks }));
};
const tombolTeruskan = () => screen.getByRole('button', { name: /^teruskan$/i });

const rekamKiriman = () => {
  const dikirim = jest.fn();
  server.use(
    http.patch(`${API_BASE}/complaints/:id/opd`, async ({ request, params }) => {
      dikirim(await request.json());
      return ok({ id: Number(params.id) }, `/complaints/${params.id}/opd`);
    }),
  );
  return dikirim;
};

describe('ForwardComplaintModal — lintas tingkat (BUG-077)', () => {
  it('OPD beda tingkat menampilkan kategori tingkat tujuan, dan tombol mati sampai dipilih', async () => {
    render(<ForwardComplaintModal complaint={tiketKecamatan} onClose={jest.fn()} onDone={jest.fn()} />);

    await bukaDropdown('opd yang berwenang');
    await pilihOpsi('Dinas Pendidikan');

    expect(await screen.findByLabelText(/kategori tingkat kabupaten/i)).toBeInTheDocument();
    expect(tombolTeruskan()).toBeDisabled();

    await bukaDropdown('kategori tingkat kabupaten');
    // Hanya kategori kabupaten yang ditawarkan.
    expect(screen.queryByRole('button', { name: 'Pelayanan Administrasi Kecamatan' })).toBeNull();
    await pilihOpsi('Kesehatan');

    expect(tombolTeruskan()).toBeEnabled();
  });

  it('mengirim kategori baru bersama opdId', async () => {
    const dikirim = rekamKiriman();
    const onDone = jest.fn();
    render(<ForwardComplaintModal complaint={tiketKecamatan} onClose={jest.fn()} onDone={onDone} />);

    await bukaDropdown('opd yang berwenang');
    await pilihOpsi('Dinas Pendidikan');
    await bukaDropdown('kategori tingkat kabupaten');
    await pilihOpsi('Kesehatan');
    fireEvent.click(tombolTeruskan());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(dikirim).toHaveBeenCalledWith({ opdId: 2, kategori: 'kab_kesehatan' });
  });

  it('OPD setingkat tidak menanyakan kategori dan mengirim opdId saja', async () => {
    const dikirim = rekamKiriman();
    const onDone = jest.fn();
    render(<ForwardComplaintModal complaint={tiketKecamatan} onClose={jest.fn()} onDone={onDone} />);

    await bukaDropdown('opd yang berwenang');
    await pilihOpsi('Kecamatan Geger');

    expect(screen.queryByLabelText(/kategori tingkat/i)).toBeNull();
    fireEvent.click(tombolTeruskan());

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(dikirim).toHaveBeenCalledWith({ opdId: 4 });
  });

  it('berganti OPD mengosongkan kategori yang sudah dipilih', async () => {
    render(<ForwardComplaintModal complaint={tiketKecamatan} onClose={jest.fn()} onDone={jest.fn()} />);

    await bukaDropdown('opd yang berwenang');
    await pilihOpsi('Dinas Pendidikan');
    await bukaDropdown('kategori tingkat kabupaten');
    await pilihOpsi('Kesehatan');
    expect(tombolTeruskan()).toBeEnabled();

    await bukaDropdown('opd yang berwenang');
    await pilihOpsi('Dinas Kesehatan');

    expect(tombolTeruskan()).toBeDisabled();
  });
});
