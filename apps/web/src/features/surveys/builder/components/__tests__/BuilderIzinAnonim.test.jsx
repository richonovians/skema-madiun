import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, surveyFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * IZIN PENGISIAN TANPA LOGIN DI BUILDER (laporan pengguna 11 September 2026).
 *
 * Saklarnya dahulu hanya ada di SurveyFormModal -- formulir milik Admin
 * Kabupaten. Setiap jalur Admin OPD, membuat maupun mengubah survei, bermuara
 * ke builder ini, sehingga peran itu tak punya cara apa pun menyalakannya:
 * surveinya selamanya lahir tertutup.
 *
 * Berkas ini juga mengunci TINGKATAN aturannya. Judul dan izin pengisian
 * termasuk 'meta' -- backend mengizinkannya sepanjang survei belum ditutup,
 * sekalipun jawaban sudah masuk (lihat assertSurveyEditable). Yang mengunci
 * begitu ada jawaban hanyalah periode dan susunan pertanyaan.
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

const saklar = () => screen.getByRole('checkbox', { name: /tanpa login/i });
const judul = () => screen.getByRole('textbox', { name: /judul survei/i });

describe('Builder — izin pengisian tanpa login', () => {
  it('saklarnya ada, sehingga Admin OPD dapat mengaturnya sendiri', async () => {
    await renderBuilder();

    expect(saklar()).toBeInTheDocument();
    expect(saklar()).not.toBeChecked();
  });

  it('menyalakannya mengirim izinkanAnonim ke backend, bukan sekadar berubah di layar', async () => {
    await renderBuilder();

    fireEvent.click(saklar());

    await waitFor(() => expect(patchSurvei).toHaveLength(1));
    expect(patchSurvei[0].izinkanAnonim).toBe(true);
    expect(saklar()).toBeChecked();
  });

  it('keadaan tersimpan ikut terbaca saat builder dibuka', async () => {
    muatSurvei({ izinkanAnonim: true });
    await renderBuilder();

    expect(saklar()).toBeChecked();
  });

  it('tetap dapat diubah pada survei terbit yang sudah dijawab', async () => {
    // Justru di sinilah gunanya: survei sudah berjalan, lalu ketahuan perlu
    // dibuka lewat QR di loket. Backend mengizinkannya ('meta'); yang terkunci
    // karena jawaban sudah masuk hanya periode dan susunan pertanyaan.
    muatSurvei({ status: 'aktif', respondentsCount: 12 });
    await renderBuilder();

    expect(saklar()).toBeEnabled();
    expect(judul()).toBeEnabled();
  });

  it('mati pada survei yang sudah ditutup, karena hasil IKM-nya sudah terbit', async () => {
    muatSurvei({ status: 'ditutup', respondentsCount: 12 });
    await renderBuilder();

    expect(saklar()).toBeDisabled();
  });
});
