import React, { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, created, surveyFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * PEMILIHAN JENIS SURVEI (8 Oktober 2026). Survei baru wajib menyatakan
 * jenisnya SEBELUM kanvas muncul, karena jenis tidak dapat diganti sesudah
 * dibuat:
 *  - "SKM PermenPANRB": survei langsung dibuat dan kesembilan unsur muncul;
 *  - "Survei Umum": tidak ada yang dibuat sampai aksi pertama (perilaku malas
 *    builder yang sudah ada), dan kanvasnya kosong.
 *
 * Survei yang SUDAH ADA tidak melewati pemilih: jenisnya sudah tertentu.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const server = setupServer(...handlers);

let postSurvei = [];

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  postSurvei = [];
  server.use(
    http.post(`${API_BASE}/surveys`, async ({ request }) => {
      const body = await request.json();
      postSurvei.push(body);
      return created(surveyFixture({ id: 31, ...body, status: 'draft' }), '/surveys');
    }),
    http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
      ok(surveyFixture({ id: Number(params.id), status: 'draft' }), `/surveys/${params.id}`),
    ),
  );
});

const renderBuilder = async (id) => {
  const paramsPromise = Promise.resolve({ id });
  await act(async () => {
    render(
      <Suspense fallback={<div>Menunggu router...</div>}>
        <SurveyBuilderPage params={paramsPromise} />
      </Suspense>,
    );
  });
};

const klikJenis = async (el) => {
  await act(async () => {
    fireEvent.click(el);
  });
};
const konfirmasi = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /ya, pilih jenis ini/i }));
  });
};
const batalkan = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^batal$/i }));
  });
};

const pilihSkm = () => screen.getByRole('radio', { name: /skm permenpanrb/i });
const pilihUmum = () => screen.getByRole('radio', { name: /survei umum/i });

describe('Builder survei baru — pemilihan jenis', () => {
  it('menampilkan pemilih jenis lebih dulu; kanvas dan palet belum ada, belum ada survei dibuat', async () => {
    await renderBuilder('new');

    expect(screen.getByRole('radiogroup', { name: /jenis survei/i })).toBeInTheDocument();
    expect(pilihSkm()).not.toBeChecked();
    expect(pilihUmum()).not.toBeChecked();
    expect(screen.queryByPlaceholderText(/tulis pertanyaan di sini/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Skala Nilai 1-4')).not.toBeInTheDocument();
    expect(postSurvei).toHaveLength(0);
  });

  describe('konfirmasi pemilihan jenis', () => {
    it('memilih SKM membuka dialog yang menjelaskan akibatnya, belum ada survei dibuat', async () => {
      await renderBuilder('new');

      await klikJenis(pilihSkm());

      const dialog = screen.getByRole('dialog', { name: /pilih survei skm permenpanrb/i });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/tidak dapat diganti/i);
      expect(dialog).toHaveTextContent(/sembilan unsur baku/i);
      expect(postSurvei).toHaveLength(0);
    });

    it('memilih Survei Umum membuka dialog dengan penjelasan yang sesuai', async () => {
      await renderBuilder('new');

      await klikJenis(pilihUmum());

      const dialog = screen.getByRole('dialog', { name: /pilih survei umum/i });
      expect(dialog).toHaveTextContent(/tanpa nilai ikm/i);
      expect(dialog).not.toHaveTextContent(/sembilan unsur baku/i);
      expect(screen.queryByText('Skala Nilai 1-4')).not.toBeInTheDocument();
    });

    it('Batal menutup dialog: tidak ada survei dibuat dan tak ada jenis yang tampak terpilih', async () => {
      await renderBuilder('new');
      await klikJenis(pilihSkm());

      await batalkan();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: /jenis survei/i })).toBeInTheDocument();
      expect(pilihSkm()).not.toBeChecked();
      expect(pilihUmum()).not.toBeChecked();
      expect(postSurvei).toHaveLength(0);
    });

    it('Escape menutup dialog tanpa membuat apa pun', async () => {
      await renderBuilder('new');
      await klikJenis(pilihSkm());

      await act(async () => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(postSurvei).toHaveLength(0);
    });

    it('sesudah batal, jenis lain tetap dapat dipilih dan dikonfirmasi', async () => {
      await renderBuilder('new');
      await klikJenis(pilihSkm());
      await batalkan();

      await klikJenis(pilihUmum());
      await konfirmasi();

      expect(await screen.findByText('Skala Nilai 1-4')).toBeInTheDocument();
      expect(postSurvei).toHaveLength(0);
    });

    it('Ya, Pilih Jenis Ini pada SKM membuat survei berjenis itu', async () => {
      await renderBuilder('new');
      await klikJenis(pilihSkm());

      await konfirmasi();

      await waitFor(() => expect(postSurvei).toHaveLength(1));
      expect(postSurvei[0].jenis).toBe('skm_permenpanrb');
    });
  });

  it('memilih SKM PermenPANRB langsung membuat survei berjenis itu dan memunculkan 9 unsur', async () => {
    await renderBuilder('new');

    await klikJenis(pilihSkm());
    await konfirmasi();

    await waitFor(() => expect(postSurvei).toHaveLength(1));
    expect(postSurvei[0].jenis).toBe('skm_permenpanrb');
    expect(await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i)).toHaveLength(9);
    expect(screen.queryByRole('radiogroup', { name: /jenis survei/i })).not.toBeInTheDocument();
  });

  it('memilih Survei Umum membuka kanvas kosong tanpa membuat survei dulu', async () => {
    await renderBuilder('new');

    await klikJenis(pilihUmum());
    await konfirmasi();

    expect(await screen.findByText('Skala Nilai 1-4')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/tulis pertanyaan di sini/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kerangka 9 unsur/i)).not.toBeInTheDocument();
    expect(postSurvei).toHaveLength(0);
  });

  it('aksi pertama pada survei umum membuat survei dengan jenis umum', async () => {
    await renderBuilder('new');
    await klikJenis(pilihUmum());
    await konfirmasi();

    await act(async () => {
      fireEvent.click(await screen.findByText('Skala Nilai 1-4'));
    });

    await waitFor(() => expect(postSurvei).toHaveLength(1));
    expect(postSurvei[0].jenis).toBe('umum');
  });

  it('memilih Survei Umum bisa dibatalkan selama belum ada survei yang dibuat', async () => {
    await renderBuilder('new');
    await klikJenis(pilihUmum());
    await konfirmasi();
    await screen.findByText('Skala Nilai 1-4');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ganti jenis/i }));
    });

    expect(screen.getByRole('radiogroup', { name: /jenis survei/i })).toBeInTheDocument();
    expect(pilihUmum()).not.toBeChecked();
    expect(postSurvei).toHaveLength(0);
  });

  it('sesudah survei umum benar-benar dibuat, jenis tidak dapat diganti lagi', async () => {
    await renderBuilder('new');
    await klikJenis(pilihUmum());
    await konfirmasi();
    await act(async () => {
      fireEvent.click(await screen.findByText('Skala Nilai 1-4'));
    });
    await waitFor(() => expect(postSurvei).toHaveLength(1));

    expect(screen.queryByRole('button', { name: /ganti jenis/i })).not.toBeInTheDocument();
  });

  it('galat saat membuat survei SKM ditampilkan dan pemilih tetap bisa dicoba lagi', async () => {
    server.use(
      http.post(`${API_BASE}/surveys`, () =>
        new Response(
          JSON.stringify({ success: false, statusCode: 400, message: 'OPD tidak ditemukan' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    await renderBuilder('new');

    await klikJenis(pilihSkm());
    await konfirmasi();

    expect(await screen.findByText(/opd tidak ditemukan/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /jenis survei/i })).toBeInTheDocument();
    expect(pilihSkm()).not.toBeChecked();
  });

  it('survei yang sudah ada tidak melewati pemilih jenis', async () => {
    await renderBuilder('5');

    expect(screen.queryByRole('radiogroup', { name: /jenis survei/i })).not.toBeInTheDocument();
    expect(await screen.findAllByPlaceholderText(/tulis pertanyaan di sini/i)).toHaveLength(9);
  });
});
