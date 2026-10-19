import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, created, surveyFixture, questionFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * GANTI JENIS SKM -> CUSTOM DI BUILDER (8 Oktober 2026, permintaan pengguna:
 * "tambah tombol ganti jenis ketika terlanjur memilih jenis survei SKM").
 *
 * Tombolnya hanya ada pada survei SKM yang masih DRAF dan belum dijawab; begitu
 * survei terbit atau dijawab, aturan backend menolaknya, jadi tombolnya hilang.
 * Survei Custom tak memilikinya (jenis tak pernah kembali ke SKM).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const server = setupServer(...handlers);

let patchJenis = [];

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  patchJenis = [];
});

const muatSurvei = (over = {}) =>
  server.use(
    http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
      ok(
        surveyFixture({ id: Number(params.id), jenis: 'skm_permenpanrb', status: 'draft', ...over }),
        `/surveys/${params.id}`,
      ),
    ),
  );

/** Tanggapan backend untuk ganti jenis: sukses, dan sesudahnya daftar pertanyaan tanpa unsur. */
const sediakanGantiJenis = ({ tambahan = [] } = {}) => {
  let sudahGanti = false;
  server.use(
    http.patch(`${API_BASE}/surveys/:id/jenis`, async ({ request, params }) => {
      const body = await request.json();
      patchJenis.push(body);
      sudahGanti = true;
      return ok(
        surveyFixture({ id: Number(params.id), ...body, jenis: 'custom' }),
        `/surveys/${params.id}/jenis`,
      );
    }),
    http.get(`${API_BASE}/surveys/:id/questions`, ({ params }) => {
      const unsur = Array.from({ length: 9 }, (_, i) =>
        questionFixture({
          id: i + 1,
          surveyId: Number(params.id),
          kodeUnsur: `U${i + 1}`,
          teks: `Kalimat unsur ${i + 1}`,
          urutan: i + 1,
        }),
      );
      return ok(sudahGanti ? tambahan : unsur, `/surveys/${params.id}/questions`);
    }),
  );
};

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

const tombolGanti = () => screen.queryByRole('button', { name: /^ganti jenis$/i });
const kotakPertanyaan = () => screen.queryAllByPlaceholderText(/tulis pertanyaan di sini/i);

const gantiKeCustom = async ({ tujuan = 'evaluasi', metode = 'indeks_persen' } = {}) => {
  await act(async () => {
    fireEvent.click(tombolGanti());
  });
  fireEvent.change(screen.getByLabelText(/tujuan survei/i), { target: { value: tujuan } });
  fireEvent.change(screen.getByLabelText(/metode nilai/i), { target: { value: metode } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /ganti ke custom/i }));
  });
};

describe('Builder — tombol Ganti jenis pada survei SKM', () => {
  it('survei SKM draf tanpa jawaban: tombol ada', async () => {
    sediakanGantiJenis();
    muatSurvei();
    await renderBuilder();

    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);
    expect(tombolGanti()).toBeInTheDocument();
  });

  it.each([
    ['survei aktif', { status: 'aktif' }],
    ['survei yang sudah ditutup', { status: 'ditutup' }],
    ['survei draf yang sudah dijawab', { respondentsCount: 2 }],
  ])('%s: tombol tidak ada', async (_nama, over) => {
    sediakanGantiJenis();
    muatSurvei(over);
    await renderBuilder();

    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);
    expect(tombolGanti()).not.toBeInTheDocument();
  });

  it('survei Custom: tombol tidak ada (jenis tak pernah kembali ke SKM)', async () => {
    muatSurvei({ jenis: 'custom', tujuan: 'kepuasan', metodeNilai: 'rata_rata' });
    server.use(
      http.get(`${API_BASE}/surveys/:id/questions`, ({ params }) =>
        ok([], `/surveys/${params.id}/questions`),
      ),
    );
    await renderBuilder();

    await screen.findByText('Skala Nilai 1-4');
    expect(tombolGanti()).not.toBeInTheDocument();
  });
});

describe('Builder — alur ganti jenis SKM -> Custom', () => {
  it('modal menyebut kalimat unsur yang akan hilang', async () => {
    sediakanGantiJenis();
    muatSurvei();
    await renderBuilder();
    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);

    await act(async () => {
      fireEvent.click(tombolGanti());
    });

    const dialog = screen.getByRole('dialog', { name: /ganti jenis survei/i });
    expect(dialog).toHaveTextContent('U1');
    expect(dialog).toHaveTextContent('Kalimat unsur 1');
    expect(patchJenis).toHaveLength(0);
  });

  it('konfirmasi mengirim jenis + tujuan + metode, lalu kanvas menjadi custom', async () => {
    sediakanGantiJenis();
    muatSurvei();
    await renderBuilder();
    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);
    expect(kotakPertanyaan()).toHaveLength(9);

    await gantiKeCustom({ tujuan: 'evaluasi', metode: 'indeks_persen' });

    await waitFor(() => expect(patchJenis).toHaveLength(1));
    expect(patchJenis[0]).toEqual({
      jenis: 'custom',
      tujuan: 'evaluasi',
      metodeNilai: 'indeks_persen',
    });
    // Unsur lenyap dari kanvas, banner kerangka hilang, modal menutup.
    await waitFor(() => expect(kotakPertanyaan()).toHaveLength(0));
    expect(screen.queryByText(/kerangka 9 unsur/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Panel Nilai Survei muncul berisi pilihan tadi, dan tombol Ganti jenis hilang.
    expect(screen.getByLabelText(/tujuan survei/i)).toHaveValue('evaluasi');
    expect(screen.getByLabelText(/metode nilai/i)).toHaveValue('indeks_persen');
    expect(tombolGanti()).not.toBeInTheDocument();
  });

  it('pertanyaan tambahan milik OPD tetap tampil sesudah penggantian', async () => {
    sediakanGantiJenis({
      tambahan: [
        questionFixture({
          id: 77,
          surveyId: 5,
          teks: 'Saran Anda?',
          tipe: 'teks',
          isIkmUnsur: false,
          kodeUnsur: null,
          namaUnsur: null,
          urutan: 1,
        }),
      ],
    });
    muatSurvei();
    await renderBuilder();
    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);

    await gantiKeCustom();

    await waitFor(() => expect(kotakPertanyaan()).toHaveLength(1));
    expect(kotakPertanyaan()[0]).toHaveValue('Saran Anda?');
  });

  it('galat backend tampil di modal dan survei tetap SKM', async () => {
    muatSurvei();
    server.use(
      http.patch(
        `${API_BASE}/surveys/:id/jenis`,
        () =>
          new Response(
            JSON.stringify({
              success: false,
              statusCode: 400,
              message: 'Jenis survei tidak dapat diganti karena survei ini sudah menerima 3 jawaban.',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
    await renderBuilder();
    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);

    await gantiKeCustom();

    expect(await screen.findByText(/sudah menerima 3 jawaban/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(kotakPertanyaan()).toHaveLength(9);
    expect(screen.getByText(/kerangka 9 unsur/i)).toBeInTheDocument();
  });

  it('survei SKM yang BARU dibuat lewat pemilih juga dapat diganti', async () => {
    sediakanGantiJenis();
    server.use(
      http.post(`${API_BASE}/surveys`, async ({ request }) => {
        const body = await request.json();
        return created(surveyFixture({ id: 31, ...body, status: 'draft' }), '/surveys');
      }),
    );
    await renderBuilder('new');
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /skm permenpanrb/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ya, pilih jenis ini/i }));
    });
    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);

    await gantiKeCustom();

    await waitFor(() => expect(patchJenis).toHaveLength(1));
    await waitFor(() => expect(kotakPertanyaan()).toHaveLength(0));
  });
});
