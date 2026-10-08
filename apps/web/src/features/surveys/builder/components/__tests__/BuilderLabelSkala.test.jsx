import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, surveyFixture, questionFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * LABEL SKALA 1-4 SESUDAH ADA JAWABAN (8 Oktober 2026, laporan pengguna:
 * "label teks jawaban yang skala 1-4 masih belum bisa diubah").
 *
 * Sebabnya: tombol "Ubah Label Skala 1-4" ikut disembunyikan begitu survei
 * menerima jawaban pertama, karena penggantian opsi dihitung sebagai perubahan
 * SUSUNAN. Padahal jawaban skala menyimpan skor, bukan penunjuk ke baris opsi,
 * jadi label boleh diganti seperti kalimat pertanyaan. Yang tetap terkunci:
 *  - survei DITUTUP (hasil IKM sudah terbit);
 *  - opsi PILIHAN GANDA (jawabannya menunjuk id opsi).
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

const PILIHAN = questionFixture({
  id: 700,
  teks: 'Dari mana Anda tahu layanan ini?',
  tipe: 'pilihan',
  isIkmUnsur: false,
  kodeUnsur: null,
  namaUnsur: null,
  urutan: 10,
  options: [
    { id: 71, label: 'Teman', nilai: null, urutan: 1 },
    { id: 72, label: 'Media sosial', nilai: null, urutan: 2 },
  ],
});

const pasang = (over = {}, { denganPilihan = false } = {}) => {
  patchQuestion = [];
  server.use(
    http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
      ok(surveyFixture({ id: Number(params.id), status: 'draft', ...over }), `/surveys/${params.id}`),
    ),
    http.patch(`${API_BASE}/questions/:id`, async ({ request, params }) => {
      const body = await request.json();
      patchQuestion.push({ id: Number(params.id), body });
      return ok(
        questionFixture({
          id: Number(params.id),
          options: (body.options ?? []).map((o, i) => ({
            id: 900 + i,
            label: o.label,
            nilai: i + 1,
            urutan: i + 1,
          })),
        }),
        `/questions/${params.id}`,
      );
    }),
  );
  if (denganPilihan) {
    server.use(
      http.get(`${API_BASE}/surveys/:id/questions`, ({ params }) =>
        ok(
          [
            questionFixture({ id: 1, surveyId: Number(params.id), urutan: 1 }),
            { ...PILIHAN, surveyId: Number(params.id) },
          ],
          `/surveys/${params.id}/questions`,
        ),
      ),
    );
  }
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

const tombolLabelSkala = () => screen.queryAllByRole('button', { name: /ubah label skala 1-4/i });

describe('Builder — label skala pada survei yang sudah dijawab', () => {
  it('survei AKTIF berjawaban: tombol ubah label skala tetap ada pada setiap unsur', async () => {
    pasang({ status: 'aktif', respondentsCount: 5 });
    await renderBuilder();

    expect(await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i)).toHaveLength(9);
    expect(tombolLabelSkala()).toHaveLength(9);
  });

  it('menyimpan label baru: hanya `options` yang dikirim, dan pratinjau kartu memakainya', async () => {
    pasang({ status: 'aktif', respondentsCount: 5 });
    await renderBuilder();
    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);

    fireEvent.click(tombolLabelSkala()[0]);
    const kolom = await screen.findAllByPlaceholderText(/label untuk skor/i);
    expect(kolom).toHaveLength(4);
    ['Sangat Tidak Puas', 'Tidak Puas', 'Puas', 'Sangat Puas'].forEach((label, i) => {
      fireEvent.change(kolom[i], { target: { value: label } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    });

    await waitFor(() => expect(patchQuestion).toHaveLength(1));
    expect(patchQuestion[0]).toEqual({
      id: 1,
      body: {
        options: [
          { label: 'Sangat Tidak Puas' },
          { label: 'Tidak Puas' },
          { label: 'Puas' },
          { label: 'Sangat Puas' },
        ],
      },
    });
    expect(await screen.findByText('Sangat Tidak Puas')).toBeInTheDocument();
  });

  it('modal menjelaskan akibatnya: sudah N jawaban, skor tidak berubah, label ikut berubah', async () => {
    pasang({ status: 'aktif', respondentsCount: 5 });
    await renderBuilder();
    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);

    fireEvent.click(tombolLabelSkala()[0]);

    expect(await screen.findByText(/^Survei ini sudah menerima 5 jawaban/)).toBeInTheDocument();
    expect(screen.getByText(/skor jawaban lama tidak berubah/i)).toBeInTheDocument();
  });

  it('banner penguncian menyebut bahwa label skala masih dapat diperbaiki', async () => {
    pasang({ status: 'aktif', respondentsCount: 5 });
    await renderBuilder();

    expect(await screen.findByText(/teks pertanyaan dan label skala 1-4 masih dapat diperbaiki/i)).toBeInTheDocument();
    expect(screen.getByText(/susunan pertanyaan sedang terkunci. teks pertanyaan dan label skala masih dapat diperbaiki/i)).toBeInTheDocument();
  });

  it('survei DITUTUP: tombol ubah label skala tidak ditawarkan', async () => {
    pasang({ status: 'ditutup', respondentsCount: 5 });
    await renderBuilder();
    await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i);

    expect(tombolLabelSkala()).toHaveLength(0);
  });

  it('KONTROL: opsi PILIHAN GANDA pada survei berjawaban tetap tidak dapat diubah', async () => {
    pasang({ status: 'aktif', respondentsCount: 5 }, { denganPilihan: true });
    await renderBuilder();
    await screen.findByDisplayValue('Dari mana Anda tahu layanan ini?');

    expect(screen.queryByRole('button', { name: /ubah opsi jawaban/i })).not.toBeInTheDocument();
    // Sedangkan label skala unsur di survei yang sama tetap dapat diubah.
    expect(tombolLabelSkala().length).toBeGreaterThan(0);
  });

  it('KONTROL: survei DRAF, pilihan ganda masih bisa diubah opsinya', async () => {
    pasang({ status: 'draft', respondentsCount: 0 }, { denganPilihan: true });
    await renderBuilder();

    expect(await screen.findByRole('button', { name: /ubah opsi jawaban/i })).toBeInTheDocument();
  });
});
