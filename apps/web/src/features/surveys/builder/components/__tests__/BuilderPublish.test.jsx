import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, questionFixture, surveyFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * KONFIRMASI PUBLIKASI & PENGUNCIAN SUSUNAN DI BUILDER (permintaan pengguna 11
 * September 2026).
 *
 * Dua hal yang dijaga berkas ini, dan keduanya soal akibat yang tak dapat
 * dibatalkan diam-diam:
 *   1. "Publikasikan" tidak lagi langsung menerbitkan. Sesudah terbit dan
 *      jawaban pertama masuk, susunan pertanyaan terkunci.
 *   2. Builder kini melayani survei AKTIF, bukan draf saja -- sebab tombol
 *      "Ubah"/"Pertanyaan" kedua peran menuju ke sini. Yang terkunci
 *      ditampilkan MATI beserta sebabnya, bukan dilenyapkan.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const server = setupServer(...handlers);

/** Permintaan PATCH status yang benar-benar terkirim selama satu uji. */
let patchStatus = [];

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  jest.restoreAllMocks();
});
afterAll(() => server.close());

beforeEach(() => {
  mockPush.mockClear();
  patchStatus = [];
  server.use(
    http.patch(`${API_BASE}/surveys/:id/status`, async ({ request, params }) => {
      const body = await request.json();
      patchStatus.push({ id: params.id, status: body.status });
      return ok(surveyFixture({ id: Number(params.id), status: body.status }), '/status');
    }),
  );
});

/**
 * Ganti isi kanvas dengan SATU pertanyaan kustom. Diperlukan bagi uji yang
 * menyentuh kendali per-pertanyaan: 9 unsur baku bawaan tak punya tombol hapus
 * sama sekali (teksnya kalimat resmi PermenPANRB), jadi mengujinya di sana
 * tidak membuktikan apa pun tentang penguncian.
 */
const muatPertanyaanKustom = () =>
  server.use(
    http.get(`${API_BASE}/surveys/:id/questions`, ({ params }) =>
      ok(
        [
          questionFixture({
            id: 500,
            surveyId: Number(params.id),
            teks: 'Apakah petugas ramah?',
            isIkmUnsur: false,
            kodeUnsur: null,
          }),
        ],
        `/surveys/${params.id}/questions`,
      ),
    ),
  );

/** Muat builder dengan survei berbentuk tertentu (status & jumlah jawaban). */
const muatSurvei = (over = {}) =>
  server.use(
    http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
      ok(surveyFixture({ id: Number(params.id), ...over }), `/surveys/${params.id}`),
    ),
  );

/**
 * `params` adalah Promise (App Router) dan komponen membacanya lewat `use()`,
 * jadi ia SUSPEND pada render pertama. React 19 hanya melepas suspense itu di
 * dalam `act` yang di-await.
 */
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

describe('Builder — konfirmasi publikasi', () => {
  it('Publikasikan TIDAK langsung menerbitkan, ada konfirmasinya dulu', async () => {
    await renderBuilder();
    fireEvent.click(await screen.findByRole('button', { name: /publikasikan/i }));

    expect(await screen.findByText(/setelah terbit/i)).toBeInTheDocument();
    expect(patchStatus).toHaveLength(0);
  });

  it('konfirmasinya menyebut jumlah pertanyaan & bahwa survei ini boleh diisi tanpa login', async () => {
    // Dua hal yang paling sering luput diperiksa sebelum menekan terbit, dan
    // keduanya sudah diketahui layar ini tanpa perlu membuka halaman lain.
    muatSurvei({ izinkanAnonim: true });
    await renderBuilder();
    fireEvent.click(await screen.findByRole('button', { name: /publikasikan/i }));

    expect(await screen.findByText(/9 pertanyaan/i)).toBeInTheDocument();
    expect(screen.getByText(/dapat diisi tanpa login/i)).toBeInTheDocument();
  });

  it('KONTROL: survei yang menuntut login disebut demikian, bukan sebaliknya', async () => {
    // Tanpa kontrol ini, naskah yang selalu berbunyi "tanpa login" akan lolos --
    // dan justru pada survei yang izinnya paling perlu dipastikan sebelum
    // tautannya disebar.
    muatSurvei({ izinkanAnonim: false });
    await renderBuilder();
    fireEvent.click(await screen.findByRole('button', { name: /publikasikan/i }));

    expect(await screen.findByText(/hanya dapat diisi setelah login/i)).toBeInTheDocument();
  });

  it('sesudah dikonfirmasi, baru terbit', async () => {
    await renderBuilder();
    fireEvent.click(await screen.findByRole('button', { name: /publikasikan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /ya, publikasikan/i }));

    await waitFor(() => expect(patchStatus).toEqual([{ id: '5', status: 'aktif' }]));
  });

  it('Batal menutup dialog tanpa menerbitkan apa pun', async () => {
    await renderBuilder();
    fireEvent.click(await screen.findByRole('button', { name: /publikasikan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^batal$/i }));

    expect(patchStatus).toHaveLength(0);
    expect(screen.queryByText(/setelah terbit/i)).not.toBeInTheDocument();
  });
});

describe('Builder — survei yang sudah terbit', () => {
  it('survei AKTIF yang sudah dijawab: susunan terkunci, teks tetap dapat diperbaiki', async () => {
    muatSurvei({ status: 'aktif', respondentsCount: 142 });
    await renderBuilder();

    // Teks pertanyaan tetap hidup: salah ketik terbaca setiap responden
    // berikutnya, sementara nilai jawaban yang sudah masuk tak bergeser.
    expect(await screen.findByDisplayValue(/Persyaratan/i)).toBeEnabled();
    expect(screen.getByRole('button', { name: /tambah 9 unsur baku/i })).toBeDisabled();
  });

  it('kendali yang terkunci TETAP TERLIHAT beserta sebabnya', async () => {
    // Kendali yang lenyap membuat pengguna mengira fiturnya hilang; kendali
    // mati yang menyebut alasannya mengajari aturannya.
    muatSurvei({ status: 'aktif', respondentsCount: 142 });
    await renderBuilder();

    expect(await screen.findByText(/sudah menerima 142 jawaban/i)).toBeInTheDocument();
  });

  it('tombol hapus pertanyaan ikut mati saat susunan terkunci', async () => {
    // Ditemukan saat verifikasi visual 11 September 2026: tombol ini tak pernah
    // ikut dikunci, sehingga pada survei berjawaban ia tetap hidup dan
    // penekanannya pasti ditolak backend 400 -- persis jenis tombol yang
    // penguncian di layar ini ada untuk mencegahnya.
    muatSurvei({ status: 'aktif', respondentsCount: 142 });
    muatPertanyaanKustom();
    await renderBuilder();
    await screen.findByText(/sudah menerima 142 jawaban/i);

    const hapus = screen.getAllByRole('button', { name: /hapus pertanyaan/i });
    expect(hapus.length).toBeGreaterThan(0);
    hapus.forEach((tombol) => expect(tombol).toBeDisabled());
  });

  it('KONTROL: survei AKTIF tanpa jawaban, susunannya masih bebas diubah', async () => {
    // Tanpa uji ini, penguncian yang terlanjur berlaku bagi SEMUA survei terbit
    // tak akan memerahkan apa pun -- padahal itulah keadaan tersering sesudah
    // publikasi tak sengaja.
    muatSurvei({ status: 'aktif', respondentsCount: 0 });
    muatPertanyaanKustom();
    await renderBuilder();

    expect(await screen.findByDisplayValue(/petugas ramah/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tambah 9 unsur baku/i })).toBeEnabled();
    expect(screen.queryByText(/sudah menerima/i)).not.toBeInTheDocument();
    screen
      .getAllByRole('button', { name: /hapus pertanyaan/i })
      .forEach((tombol) => expect(tombol).toBeEnabled());
  });
});
