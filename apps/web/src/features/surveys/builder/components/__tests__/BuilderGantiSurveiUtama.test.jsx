import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, surveyFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * KONFIRMASI SEBELUM MENGGANTI SURVEI UTAMA (4 Oktober 2026, permintaan
 * pengguna).
 *
 * Penggantiannya SELAMA INI SENYAP. `SurveysService.update` menjalankan
 * `updateMany` yang menurunkan survei utama lama menjadi biasa dalam transaksi
 * yang sama, dan tak ada satu pun lapisan yang memberi tahu siapa pun bahwa itu
 * terjadi. Admin yang menyalakan saklar pada survei kedua tidak pernah
 * diberitahu bahwa survei pertamanya baru saja turun.
 *
 * Akibatnya tidak terlihat dari builder, melainkan jauh di tempat lain: tombol
 * "Lanjut Isi Survei" pada halaman sukses pengaduan menuju survei utama OPD.
 * Mengganti yang utama berarti mengalihkan seluruh warga yang baru mengadu ke
 * kuesioner yang berbeda, dan itu keputusan yang pantas ditanyakan dahulu.
 *
 * YANG DIJAGA BERKAS INI: modalnya muncul HANYA ketika memang ada yang akan
 * diturunkan, menyebut NAMA survei itu, dan pembatalan tidak mengirim apa pun.
 * Batas "paling banyak satu" tetap ditegakkan backend lewat indeks unik
 * parsial; modal ini soal persetujuan, bukan penegakan.
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

/** Survei yang sedang dibuka di builder: belum utama. */
const muatSurveiIni = () =>
  server.use(
    http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
      ok(surveyFixture({ id: Number(params.id), isUtama: false }), `/surveys/${params.id}`),
    ),
  );

/** Daftar survei milik OPD ini; `utamaLain` menentukan ada-tidaknya utama lain. */
const muatDaftar = (utamaLain) =>
  server.use(
    http.get(`${API_BASE}/surveys`, () =>
      ok(
        utamaLain
          ? [surveyFixture({ id: 77, judul: 'Survei Mutu Layanan Triwulan I', isUtama: true })]
          : [],
        '/surveys',
      ),
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

describe('Builder — konfirmasi mengganti survei utama', () => {
  it('menanyakan konfirmasi ketika OPD sudah punya survei utama lain', async () => {
    muatSurveiIni();
    muatDaftar(true);
    await renderBuilder();

    await act(async () => {
      fireEvent.click(saklar());
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('menyebut nama survei yang akan diturunkan, bukan sekadar "Anda yakin?"', async () => {
    // Tanpa namanya, admin tak dapat menilai apakah penggantian ini benar.
    muatSurveiIni();
    muatDaftar(true);
    await renderBuilder();

    await act(async () => {
      fireEvent.click(saklar());
    });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/Survei Mutu Layanan Triwulan I/);
  });

  it('tidak mengirim apa pun selagi konfirmasinya belum dijawab', async () => {
    muatSurveiIni();
    muatDaftar(true);
    await renderBuilder();

    await act(async () => {
      fireEvent.click(saklar());
    });
    await screen.findByRole('dialog');

    expect(patchSurvei.filter((b) => b.isUtama === true)).toHaveLength(0);
  });

  it('membatalkan mengembalikan saklarnya dan tetap tidak mengirim', async () => {
    muatSurveiIni();
    muatDaftar(true);
    await renderBuilder();

    await act(async () => {
      fireEvent.click(saklar());
    });
    const dialog = await screen.findByRole('dialog');

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /batal/i }));
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(saklar()).not.toBeChecked();
    expect(patchSurvei.filter((b) => b.isUtama === true)).toHaveLength(0);
  });

  it('menyetujui mengirim isUtama ke backend', async () => {
    muatSurveiIni();
    muatDaftar(true);
    await renderBuilder();

    await act(async () => {
      fireEvent.click(saklar());
    });
    const dialog = await screen.findByRole('dialog');

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /ya|ganti|lanjut/i }));
    });

    await waitFor(() =>
      expect(patchSurvei.filter((b) => b.isUtama === true).length).toBeGreaterThan(0),
    );
  });

  /**
   * PAGAR TERHADAP MODAL YANG MUNCUL DI MANA-MANA. OPD yang belum punya survei
   * utama tidak sedang mengganti apa pun, jadi tak ada yang perlu dikonfirmasi.
   * Modal yang muncul pada kejadian yang tak berbahaya melatih orang menekan
   * "Ya" tanpa membaca, dan itu membuat modal yang sungguh penting ikut
   * diabaikan.
   */
  it('TIDAK menanyakan apa pun bila belum ada survei utama', async () => {
    muatSurveiIni();
    muatDaftar(false);
    await renderBuilder();

    await act(async () => {
      fireEvent.click(saklar());
    });

    await waitFor(() =>
      expect(patchSurvei.filter((b) => b.isUtama === true).length).toBeGreaterThan(0),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('MEMATIKAN saklar tidak pernah menanyakan konfirmasi', async () => {
    // Melepas status utama tidak menurunkan survei milik orang lain; tak ada
    // yang hilang selain status survei ini sendiri.
    server.use(
      http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
        ok(surveyFixture({ id: Number(params.id), isUtama: true }), `/surveys/${params.id}`),
      ),
    );
    muatDaftar(true);
    await renderBuilder();

    await act(async () => {
      fireEvent.click(saklar());
    });

    await waitFor(() =>
      expect(patchSurvei.filter((b) => b.isUtama === false).length).toBeGreaterThan(0),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
