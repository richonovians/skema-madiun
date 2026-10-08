import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, surveyFixture, questionFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * KERANGKA 9 UNSUR (8 Oktober 2026, permintaan pengguna: "yang customizable
 * adalah pertanyaannya, bukan standar pengukurannya").
 *
 * Pada survei SKM PermenPANRB kesembilan kartu unsur:
 *  - kalimat pertanyaannya DAPAT disunting OPD (dulu terkunci `readOnly`);
 *  - kode dan nama resmi unsurnya terkunci (badge, bukan kotak isian);
 *  - TIDAK dapat dihapus, satu per satu maupun sekaligus -- dulu ada tombol
 *    "Hapus 9 unsur baku" dan "Tambah 9 Unsur Baku", keduanya dibuang karena
 *    kerangka kini lahir bersama survei.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const server = setupServer(...handlers);

let patchQuestion = [];

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const pasangSurvei = (over = {}) => {
  patchQuestion = [];
  server.use(
    http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
      ok(surveyFixture({ id: Number(params.id), status: 'draft', ...over }), `/surveys/${params.id}`),
    ),
    http.patch(`${API_BASE}/questions/:id`, async ({ request, params }) => {
      const body = await request.json();
      patchQuestion.push({ id: Number(params.id), body });
      return ok(questionFixture({ id: Number(params.id), ...body }), `/questions/${params.id}`);
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

const kotakPertanyaan = () => screen.getAllByPlaceholderText(/tulis pertanyaan di sini/i);

describe('Builder — kerangka 9 unsur survei SKM', () => {
  it('menampilkan kesembilan unsur dengan kode dan nama resmi pada badge terkunci', async () => {
    pasangSurvei();
    await renderBuilder();

    expect(kotakPertanyaan()).toHaveLength(9);
    expect(screen.getByText('U1 · Persyaratan')).toBeInTheDocument();
    expect(screen.getByText('U3 · Waktu Penyelesaian')).toBeInTheDocument();
  });

  it('kalimat pertanyaan unsur dapat disunting dan tersimpan persis saat blur', async () => {
    pasangSurvei();
    await renderBuilder();

    const kotak = kotakPertanyaan()[0];
    expect(kotak).not.toHaveAttribute('readonly');

    fireEvent.change(kotak, { target: { value: 'Seberapa mudah persyaratan layanan kami?' } });
    await act(async () => {
      fireEvent.blur(kotak);
    });

    await waitFor(() => expect(patchQuestion).toHaveLength(1));
    expect(patchQuestion[0]).toEqual({
      id: 1,
      body: { teks: 'Seberapa mudah persyaratan layanan kami?' },
    });
    // Badge tetap menyebut nama resmi unsur, bukan kalimat yang baru diketik.
    expect(screen.getByText('U1 · Persyaratan')).toBeInTheDocument();
  });

  it('tidak menawarkan tombol hapus unsur maupun tombol tambah/hapus 9 unsur', async () => {
    pasangSurvei();
    await renderBuilder();

    expect(screen.queryByRole('button', { name: /hapus 9 unsur baku/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tambah 9 unsur baku/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hapus pertanyaan/i })).not.toBeInTheDocument();
  });

  it('menjelaskan bahwa kerangka terkunci dan hanya kalimat yang dapat diubah', async () => {
    pasangSurvei();
    await renderBuilder();

    expect(screen.getByText(/kerangka 9 unsur permenpanrb terkunci/i)).toBeInTheDocument();
  });

  it('label skala 1-4 tiap unsur masih dapat diubah', async () => {
    pasangSurvei();
    await renderBuilder();

    expect(screen.getAllByRole('button', { name: /ubah label skala 1-4/i })).toHaveLength(9);
  });

  it('pada survei terbit yang sudah dijawab kalimat unsur tetap dapat diperbaiki, urutan terkunci', async () => {
    pasangSurvei({ status: 'aktif', respondentsCount: 5 });
    await renderBuilder();

    const kotak = kotakPertanyaan()[1];
    expect(kotak).not.toHaveAttribute('readonly');
    fireEvent.change(kotak, { target: { value: 'Kalimat perbaikan' } });
    await act(async () => {
      fireEvent.blur(kotak);
    });

    await waitFor(() => expect(patchQuestion).toHaveLength(1));
    expect(patchQuestion[0].body).toEqual({ teks: 'Kalimat perbaikan' });
    expect(screen.queryByRole('button', { name: /pindahkan pertanyaan ke atas/i })).toBeNull();
  });

  it('pada survei DITUTUP kotak pertanyaan unsur hanya-baca dan blur tidak menyimpan', async () => {
    pasangSurvei({ status: 'ditutup', respondentsCount: 5 });
    await renderBuilder();

    const kotak = kotakPertanyaan()[0];
    expect(kotak).toHaveAttribute('readonly');
    await act(async () => {
      fireEvent.blur(kotak);
    });
    expect(patchQuestion).toHaveLength(0);
  });
});
