import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, surveyFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * SURVEI UTAMA PER OPD (15 September 2026, permintaan pengguna).
 *
 * Tiap OPD boleh menunjuk satu survei utama, dan tombol "Lanjut Isi Survei" di
 * halaman sukses pengaduan menuju ke sana. Tempatnya di builder, karena itulah
 * tujuan tombol "Ubah" pada kartu daftar survei.
 *
 * Batas "paling banyak satu" ditegakkan backend (indeks unik parsial), bukan di
 * sini. Yang dijaga berkas ini hanyalah bahwa saklarnya ADA, terkirim, dan
 * kembali ke keadaan semula saat backend menolak.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const server = setupServer(...handlers);

/** Badan PATCH /surveys/:id yang benar-benar terkirim selama satu uji. */
let patchSurvei = [];

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  patchSurvei = [];
  server.use(
    http.patch(`${API_BASE}/surveys/:id`, async ({ request, params }) => {
      const body = await request.json();
      patchSurvei.push(body);
      return ok(surveyFixture({ id: Number(params.id), ...body }), `/surveys/${params.id}`);
    }),
  );
});

const muatSurvei = (over = {}) =>
  server.use(
    http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
      ok(surveyFixture({ id: Number(params.id), ...over }), `/surveys/${params.id}`),
    ),
  );

const renderBuilder = async (id = '5') => {
  const paramsPromise = Promise.resolve({ id });
  await act(async () => {
    render(
      <Suspense fallback={<div>Menunggu router...</div>}>
        <SurveyBuilderPage params={paramsPromise} />
      </Suspense>,
    );
  });
};

const saklar = () => screen.getByRole('checkbox', { name: /survei utama/i });

describe('Builder — survei utama OPD', () => {
  it('saklarnya ada di halaman ubah survei', async () => {
    await renderBuilder();

    expect(saklar()).toBeInTheDocument();
  });

  it('keadaan survei yang sedang dibuka ikut terbaca', async () => {
    muatSurvei({ isUtama: true });

    await renderBuilder();

    await waitFor(() => expect(saklar()).toBeChecked());
  });

  it('KONTROL: survei biasa saklarnya mati', async () => {
    muatSurvei({ isUtama: false });

    await renderBuilder();

    await waitFor(() => expect(saklar()).not.toBeChecked());
  });

  it('menyalakannya mengirim isUtama ke backend', async () => {
    muatSurvei({ isUtama: false });
    await renderBuilder();

    await act(async () => {
      fireEvent.click(saklar());
    });

    await waitFor(() => expect(patchSurvei.some((b) => b.isUtama === true)).toBe(true));
  });

  /**
   * Backend menolak -- misalnya indeks uniknya menahan tabrakan yang tak
   * terduga. Saklar yang tetap menyala membuat admin mengira OPD-nya sudah
   * punya survei utama, dan ia baru tahu keliru ketika warga mengadu lalu
   * mendarat di daftar.
   */
  it('penolakan backend mengembalikan saklarnya ke keadaan semula', async () => {
    muatSurvei({ isUtama: false });
    server.use(
      http.patch(`${API_BASE}/surveys/:id`, () =>
        Response.json({ message: 'Gagal' }, { status: 500 }),
      ),
    );
    await renderBuilder();

    await act(async () => {
      fireEvent.click(saklar());
    });

    await waitFor(() => expect(saklar()).not.toBeChecked());
  });
});
