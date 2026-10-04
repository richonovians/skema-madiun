import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, fail, surveyFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * MENGHAPUS SELURUH 9 UNSUR BAKU SEKALIGUS (4 Oktober 2026, permintaan
 * pengguna: "1 pertanyaan akan menghapus semua pertanyaan 9 unsur baku").
 *
 * Unsur baku selama ini terkunci dari penghapusan di layar -- teksnya
 * read-only, dan kartunya tak punya tombol hapus sama sekali -- padahal
 * backend tak pernah melarangnya: `DELETE /questions/:id` tidak membedakan
 * baku dan kustom, ia hanya menuntut surveinya masih dapat disunting.
 *
 * SATU-SATU BUKAN SERENTAK. `Promise.all` menggoda, tetapi bila satu panggilan
 * gagal di tengah, sebagian sudah terhapus di server sementara layar
 * menampilkan keadaan yang lain -- dan tak ada yang dapat memberitahu mana yang
 * mana. Berurutan membuat kegagalan berhenti di tempat, dan daftar di layar
 * hanya kehilangan yang benar-benar terhapus.
 *
 * YANG DITANYAKAN LEBIH DAHULU bukan basa-basi: menghapus kesembilannya
 * membuat Nilai IKM tak dapat dihitung sama sekali, karena rumus PermenPANRB
 * 14/2017 berdiri di atas unsur-unsur itu.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const server = setupServer(...handlers);

let dihapus = [];

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  dihapus = [];
  server.use(
    http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
      ok(surveyFixture({ id: Number(params.id), status: 'draft' }), `/surveys/${params.id}`),
    ),
    http.delete(`${API_BASE}/questions/:id`, ({ params }) => {
      dihapus.push(Number(params.id));
      return ok(null, `/questions/${params.id}`);
    }),
  );
});

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

const tombolHapusBaku = () => screen.getAllByRole('button', { name: /hapus 9 unsur baku/i });

describe('Builder — hapus seluruh 9 unsur baku', () => {
  it('memasang tombol hapus pada kartu unsur baku', async () => {
    await renderBuilder();

    expect(tombolHapusBaku()).toHaveLength(9);
  });

  it('menanyakan konfirmasi dulu, tidak langsung menghapus', async () => {
    await renderBuilder();

    await act(async () => {
      fireEvent.click(tombolHapusBaku()[0]);
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(dihapus).toEqual([]);
  });

  it('menyebutkan akibatnya pada Nilai IKM, bukan sekadar "Anda yakin?"', async () => {
    await renderBuilder();

    await act(async () => {
      fireEvent.click(tombolHapusBaku()[0]);
    });

    expect(await screen.findByRole('dialog')).toHaveTextContent(/IKM/i);
  });

  it('menghapus kesembilannya setelah dikonfirmasi, ditekan dari kartu mana pun', async () => {
    await renderBuilder();

    await act(async () => {
      fireEvent.click(tombolHapusBaku()[4]); // kartu ke-5, bukan yang pertama
    });
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /ya, hapus/i }));
    });

    await waitFor(() => expect(dihapus).toHaveLength(9));
    expect([...dihapus].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await waitFor(() =>
      expect(screen.queryAllByRole('button', { name: /hapus 9 unsur baku/i })).toHaveLength(0),
    );
  });

  it('pembatalan tidak mengirim apa pun', async () => {
    await renderBuilder();

    await act(async () => {
      fireEvent.click(tombolHapusBaku()[0]);
    });
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /batal/i }));
    });

    expect(dihapus).toEqual([]);
    expect(tombolHapusBaku()).toHaveLength(9);
  });

  /**
   * PAGAR UTAMA. Kegagalan di tengah jalan adalah satu-satunya alasan
   * penghapusannya dibuat berurutan; tanpa uji ini, `Promise.all` akan lolos
   * diam-diam dan meninggalkan layar yang berbohong tentang isi basis data.
   */
  it('berhenti di tempat ketika satu penghapusan gagal, sisanya tetap di layar', async () => {
    server.use(
      http.delete(`${API_BASE}/questions/:id`, ({ params }) => {
        const id = Number(params.id);
        if (id === 3) return fail(409, 'Survei sudah dijawab');
        dihapus.push(id);
        return ok(null, `/questions/${id}`);
      }),
    );
    await renderBuilder();

    await act(async () => {
      fireEvent.click(tombolHapusBaku()[0]);
    });
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /ya, hapus/i }));
    });

    // Dua yang pertama sungguh terhapus; yang ketiga ditolak, jadi ia dan
    // enam sesudahnya tak pernah diminta.
    await waitFor(() => expect(dihapus).toEqual([1, 2]));
    expect(screen.queryAllByRole('button', { name: /hapus 9 unsur baku/i })).toHaveLength(7);
  });
});
