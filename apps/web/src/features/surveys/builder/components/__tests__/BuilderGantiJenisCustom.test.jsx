import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, surveyFixture, questionFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * GANTI JENIS CUSTOM -> SKM DI BUILDER (26 Oktober 2026, permintaan pengguna:
 * "tambahkan fitur ganti jenis survei untuk jenis survei custom", pilihan "a").
 *
 * Cermin arah SKM -> Custom: tombolnya hanya ada selagi survei DRAF dan belum
 * dijawab. Backend menambahkan U1-U9 di depan dan mempertahankan pertanyaan OPD
 * di belakangnya sebagai pertanyaan tambahan; tujuan dan metode nilai dibuang.
 * Modalnya menyebut ketiga akibat itu sebelum apa pun dikirim.
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

const MILIK_OPD = [
  questionFixture({
    id: 71,
    surveyId: 5,
    teks: 'Saran Anda?',
    tipe: 'teks',
    isIkmUnsur: false,
    kodeUnsur: null,
    namaUnsur: null,
    urutan: 1,
  }),
  questionFixture({
    id: 72,
    surveyId: 5,
    teks: 'Seberapa puas Anda?',
    tipe: 'skala',
    isIkmUnsur: false,
    kodeUnsur: null,
    namaUnsur: null,
    urutan: 2,
  }),
];

const muatSurvei = (over = {}) =>
  server.use(
    http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
      ok(
        surveyFixture({
          id: Number(params.id),
          jenis: 'custom',
          tujuan: 'kepuasan',
          metodeNilai: 'rata_rata',
          status: 'draft',
          ...over,
        }),
        `/surveys/${params.id}`,
      ),
    ),
  );

/** Backend: sesudah ganti, U1-U9 di depan lalu pertanyaan OPD di 10..n+9. */
const sediakanGantiJenis = ({ milikOpd = MILIK_OPD } = {}) => {
  let sudahGanti = false;
  server.use(
    http.patch(`${API_BASE}/surveys/:id/jenis`, async ({ request, params }) => {
      const body = await request.json();
      patchJenis.push(body);
      sudahGanti = true;
      return ok(
        surveyFixture({
          id: Number(params.id),
          jenis: 'skm_permenpanrb',
          tujuan: null,
          metodeNilai: null,
        }),
        `/surveys/${params.id}/jenis`,
      );
    }),
    http.get(`${API_BASE}/surveys/:id/questions`, ({ params }) => {
      if (!sudahGanti) return ok(milikOpd, `/surveys/${params.id}/questions`);
      const unsur = Array.from({ length: 9 }, (_, i) =>
        questionFixture({
          id: i + 1,
          surveyId: Number(params.id),
          kodeUnsur: `U${i + 1}`,
          teks: `Kalimat unsur ${i + 1}`,
          urutan: i + 1,
        }),
      );
      const digeser = milikOpd.map((q, i) => ({ ...q, urutan: 10 + i }));
      return ok([...unsur, ...digeser], `/surveys/${params.id}/questions`);
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
const siap = () => screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);

const bukaModal = async () => {
  await act(async () => {
    fireEvent.click(tombolGanti());
  });
};

describe('Builder — tombol Ganti jenis pada survei Custom', () => {
  it('survei Custom draf tanpa jawaban: tombol ada', async () => {
    sediakanGantiJenis();
    muatSurvei();
    await renderBuilder();

    await siap();
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

    await siap();
    expect(tombolGanti()).not.toBeInTheDocument();
  });
});

describe('Builder — alur ganti jenis Custom -> SKM', () => {
  it('modal menyebut ketiga akibatnya, dan belum mengirim apa pun', async () => {
    sediakanGantiJenis();
    muatSurvei();
    await renderBuilder();
    await siap();

    await bukaModal();

    const dialog = screen.getByRole('dialog', { name: /ganti jenis survei ke skm/i });
    expect(dialog).toHaveTextContent(/U1 sampai U9/);
    expect(dialog).toHaveTextContent(/2 pertanyaan Anda tetap dipertahankan/);
    expect(dialog).toHaveTextContent(/tidak dihitung dalam Nilai IKM/);
    expect(dialog).toHaveTextContent(/tujuan dan metode Nilai Survei/i);
    expect(patchJenis).toHaveLength(0);
  });

  it('Batal menutup modal tanpa mengirim apa pun', async () => {
    sediakanGantiJenis();
    muatSurvei();
    await renderBuilder();
    await siap();

    await bukaModal();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Batal' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(patchJenis).toHaveLength(0);
  });

  it('konfirmasi hanya mengirim jenis, lalu kanvas menjadi SKM dengan unsur di depan', async () => {
    sediakanGantiJenis();
    muatSurvei();
    await renderBuilder();
    await siap();
    expect(kotakPertanyaan()).toHaveLength(2);
    expect(screen.getByLabelText(/tujuan survei/i)).toHaveValue('kepuasan');

    await bukaModal();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ganti ke skm/i }));
    });

    await waitFor(() => expect(patchJenis).toHaveLength(1));
    // Tanpa tujuan & metode: backend menolak 400 bila SKM membawanya.
    expect(patchJenis[0]).toEqual({ jenis: 'skm_permenpanrb' });

    await waitFor(() => expect(kotakPertanyaan()).toHaveLength(11));
    expect(kotakPertanyaan()[0]).toHaveValue('Kalimat unsur 1');
    expect(kotakPertanyaan()[9]).toHaveValue('Saran Anda?');
    expect(kotakPertanyaan()[10]).toHaveValue('Seberapa puas Anda?');
    expect(screen.getByText(/kerangka 9 unsur/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Panel Nilai Survei milik Custom hilang.
    expect(screen.queryByLabelText(/tujuan survei/i)).not.toBeInTheDocument();
  });

  it('galat backend tampil di modal dan survei tetap Custom', async () => {
    muatSurvei();
    server.use(
      http.get(`${API_BASE}/surveys/:id/questions`, ({ params }) =>
        ok(MILIK_OPD, `/surveys/${params.id}/questions`),
      ),
      http.patch(
        `${API_BASE}/surveys/:id/jenis`,
        () =>
          new Response(
            JSON.stringify({
              success: false,
              statusCode: 400,
              message: 'Jenis survei tidak dapat diganti karena survei ini sudah menerima 1 jawaban.',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
    await renderBuilder();
    await siap();

    await bukaModal();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ganti ke skm/i }));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/sudah menerima 1 jawaban/);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(kotakPertanyaan()).toHaveLength(2);
    expect(screen.getByLabelText(/tujuan survei/i)).toHaveValue('kepuasan');
  });
});
