import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, surveyFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * PANEL NILAI SURVEI DI BUILDER (8 Oktober 2026). Survei custom punya tujuan dan
 * metode nilai yang dipilih saat membuat; Admin OPD dapat menggantinya di sini
 * sampai survei ditutup, karena keduanya hanya mengatur TAMPILAN nilai (aksi
 * 'meta' di backend, boleh juga sesudah jawaban masuk). Survei SKM tidak
 * memakainya, dan backend menolaknya (400) bila dikirim.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const server = setupServer(...handlers);

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

const tujuan = () => screen.getByLabelText(/tujuan survei/i);
const metode = () => screen.getByLabelText(/metode nilai/i);

const surveiCustom = (over = {}) =>
  muatSurvei({ jenis: 'custom', tujuan: 'kepuasan', metodeNilai: 'rata_rata', ...over });

describe('Builder — panel Nilai Survei', () => {
  it('survei custom: dua pilihan terisi dari survei', async () => {
    surveiCustom({ tujuan: 'evaluasi', metodeNilai: 'indeks_persen' });
    await renderBuilder();

    await waitFor(() => expect(tujuan()).toHaveValue('evaluasi'));
    expect(metode()).toHaveValue('indeks_persen');
  });

  it('mengganti metode mengirim tujuan dan metodeNilai ke backend', async () => {
    surveiCustom();
    await renderBuilder();
    await waitFor(() => expect(metode()).toHaveValue('rata_rata'));

    fireEvent.change(metode(), { target: { value: 'indeks_persen' } });

    await waitFor(() => expect(patchSurvei).toHaveLength(1));
    expect(patchSurvei[0]).toMatchObject({ tujuan: 'kepuasan', metodeNilai: 'indeks_persen' });
    expect(metode()).toHaveValue('indeks_persen');
  });

  it('mengganti tujuan mengirim tujuan baru dan mempertahankan metode', async () => {
    surveiCustom({ metodeNilai: 'indeks_persen' });
    await renderBuilder();
    await waitFor(() => expect(tujuan()).toHaveValue('kepuasan'));

    fireEvent.change(tujuan(), { target: { value: 'penilaian' } });

    await waitFor(() => expect(patchSurvei).toHaveLength(1));
    expect(patchSurvei[0]).toMatchObject({ tujuan: 'penilaian', metodeNilai: 'indeks_persen' });
  });

  it('nilai kosong (placeholder) diabaikan: tak ada PATCH dan pilihan tetap utuh', async () => {
    surveiCustom();
    await renderBuilder();
    await waitFor(() => expect(tujuan()).toHaveValue('kepuasan'));

    fireEvent.change(tujuan(), { target: { value: '' } });

    // Memberi waktu seandainya ada PATCH yang keliru terkirim.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(patchSurvei).toHaveLength(0);
    expect(tujuan()).toHaveValue('kepuasan');
  });

  it('galat dari backend mengembalikan pilihan semula dan menampilkan pesannya', async () => {
    surveiCustom();
    server.use(
      http.patch(
        `${API_BASE}/surveys/:id`,
        () =>
          new Response(
            JSON.stringify({ success: false, statusCode: 400, message: 'Survei sudah ditutup' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
    await renderBuilder();
    await waitFor(() => expect(metode()).toHaveValue('rata_rata'));

    fireEvent.change(metode(), { target: { value: 'indeks_persen' } });

    expect(await screen.findByText(/survei sudah ditutup/i)).toBeInTheDocument();
    expect(metode()).toHaveValue('rata_rata');
  });

  it('tetap dapat diubah pada survei terbit yang sudah dijawab (hanya tampilan yang berubah)', async () => {
    surveiCustom({ status: 'aktif', respondentsCount: 12 });
    await renderBuilder();

    await waitFor(() => expect(metode()).toBeEnabled());
    expect(tujuan()).toBeEnabled();
  });

  it('mati pada survei yang sudah ditutup', async () => {
    surveiCustom({ status: 'ditutup', respondentsCount: 12 });
    await renderBuilder();

    await waitFor(() => expect(metode()).toBeDisabled());
    expect(tujuan()).toBeDisabled();
  });

  it('survei SKM tidak punya panel ini', async () => {
    muatSurvei({ jenis: 'skm_permenpanrb' });
    await renderBuilder();

    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);
    expect(screen.queryByLabelText(/tujuan survei/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/metode nilai/i)).not.toBeInTheDocument();
  });

  it('survei SKM: menyimpan judul TIDAK mengirim tujuan atau metodeNilai', async () => {
    muatSurvei({ jenis: 'skm_permenpanrb' });
    await renderBuilder();
    const judul = await screen.findByRole('textbox', { name: /judul survei/i });

    await act(async () => {
      fireEvent.change(judul, { target: { value: 'Judul Baru' } });
      fireEvent.blur(judul);
    });

    await waitFor(() => expect(patchSurvei.length).toBeGreaterThan(0));
    for (const badan of patchSurvei) {
      expect(badan).not.toHaveProperty('tujuan');
      expect(badan).not.toHaveProperty('metodeNilai');
    }
  });

  it('survei custom: menyimpan judul TIDAK menimpa tujuan dan metode dengan kosong', async () => {
    surveiCustom({ tujuan: 'evaluasi', metodeNilai: 'indeks_persen' });
    await renderBuilder();
    const judul = await screen.findByRole('textbox', { name: /judul survei/i });
    await waitFor(() => expect(tujuan()).toHaveValue('evaluasi'));

    await act(async () => {
      fireEvent.change(judul, { target: { value: 'Judul Baru' } });
      fireEvent.blur(judul);
    });

    await waitFor(() => expect(patchSurvei.length).toBeGreaterThan(0));
    for (const badan of patchSurvei) {
      if ('tujuan' in badan) expect(badan.tujuan).toBe('evaluasi');
      if ('metodeNilai' in badan) expect(badan.metodeNilai).toBe('indeks_persen');
    }
  });
});
