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
 *  - "Survei Custom": wajib memilih TUJUAN dan METODE NILAI (8 Oktober 2026)
 *    sebelum lanjut; tidak ada yang dibuat sampai aksi pertama (perilaku malas
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

const lanjutkan = () => screen.getByRole('button', { name: /^lanjutkan$/i });
const klikRadio = async (nama) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: nama }));
  });
};
// Custom butuh tujuan + metode, lalu "Lanjutkan" baru membuka dialog konfirmasi.
const pilihCustomLengkap = async ({ tujuan = 'Kepuasan', metode = 'Nilai rata-rata' } = {}) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: /survei custom/i }));
  });
  await klikRadio(tujuan);
  await klikRadio(metode);
  await act(async () => {
    fireEvent.click(lanjutkan());
  });
};

const pilihSkm = () => screen.getByRole('radio', { name: /skm permenpanrb/i });
const pilihCustom = () => screen.getByRole('radio', { name: /survei custom/i });

describe('Builder survei baru — pemilihan jenis', () => {
  it('menampilkan pemilih jenis lebih dulu; kanvas dan palet belum ada, belum ada survei dibuat', async () => {
    await renderBuilder('new');

    expect(screen.getByRole('radiogroup', { name: /jenis survei/i })).toBeInTheDocument();
    expect(pilihSkm()).not.toBeChecked();
    expect(pilihCustom()).not.toBeChecked();
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

    it('Survei Custom: dialog terbuka sesudah tujuan dan metode dipilih, dengan penjelasan yang sesuai', async () => {
      await renderBuilder('new');

      await pilihCustomLengkap();

      const dialog = screen.getByRole('dialog', { name: /pilih survei custom/i });
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
      expect(pilihCustom()).not.toBeChecked();
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

      await pilihCustomLengkap();
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

  it('memilih Survei Custom membuka kanvas kosong tanpa membuat survei dulu', async () => {
    await renderBuilder('new');

    await pilihCustomLengkap();
    await konfirmasi();

    expect(await screen.findByText('Skala Nilai 1-4')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/tulis pertanyaan di sini/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kerangka 9 unsur/i)).not.toBeInTheDocument();
    expect(postSurvei).toHaveLength(0);
  });

  it('aksi pertama pada survei custom membuat survei dengan jenis custom', async () => {
    await renderBuilder('new');
    await pilihCustomLengkap();
    await konfirmasi();

    await act(async () => {
      fireEvent.click(await screen.findByText('Skala Nilai 1-4'));
    });

    await waitFor(() => expect(postSurvei).toHaveLength(1));
    expect(postSurvei[0].jenis).toBe('custom');
    expect(postSurvei[0].tujuan).toBe('kepuasan');
    expect(postSurvei[0].metodeNilai).toBe('rata_rata');
  });

  it('memilih Survei Custom bisa dibatalkan selama belum ada survei yang dibuat', async () => {
    await renderBuilder('new');
    await pilihCustomLengkap();
    await konfirmasi();
    await screen.findByText('Skala Nilai 1-4');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ganti jenis/i }));
    });

    expect(screen.getByRole('radiogroup', { name: /jenis survei/i })).toBeInTheDocument();
    expect(pilihCustom()).not.toBeChecked();
    expect(postSurvei).toHaveLength(0);
  });

  it('sesudah survei custom benar-benar dibuat, jenis tidak dapat diganti lagi', async () => {
    await renderBuilder('new');
    await pilihCustomLengkap();
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

  describe('tujuan dan metode nilai survei custom', () => {
    it('memilih Custom menampilkan dua isian TANPA membuka dialog, belum ada yang terpilih', async () => {
      await renderBuilder('new');

      await klikJenis(pilihCustom());

      expect(screen.getByRole('radiogroup', { name: /tujuan survei/i })).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: /metode nilai/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Kepuasan' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'Nilai rata-rata' })).not.toBeChecked();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(postSurvei).toHaveLength(0);
    });

    it('"Lanjutkan" nonaktif sampai tujuan DAN metode dipilih', async () => {
      await renderBuilder('new');
      await klikJenis(pilihCustom());
      expect(lanjutkan()).toBeDisabled();

      await klikRadio('Evaluasi');
      expect(lanjutkan()).toBeDisabled();

      await klikRadio('Indeks persen');
      expect(lanjutkan()).toBeEnabled();
    });

    it('isian tidak muncul untuk SKM', async () => {
      await renderBuilder('new');

      await klikJenis(pilihSkm());
      await batalkan();

      expect(screen.queryByRole('radiogroup', { name: /tujuan survei/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^lanjutkan$/i })).not.toBeInTheDocument();
    });

    it('dialog merangkum tujuan dan metode terpilih', async () => {
      await renderBuilder('new');

      await pilihCustomLengkap({ tujuan: 'Penilaian', metode: 'Indeks persen' });

      const dialog = screen.getByRole('dialog', { name: /pilih survei custom/i });
      expect(dialog).toHaveTextContent(/penilaian/i);
      expect(dialog).toHaveTextContent(/indeks persen/i);
    });

    it('Batal di dialog Custom mempertahankan isian, dan tidak membuat apa pun', async () => {
      await renderBuilder('new');
      await pilihCustomLengkap({ tujuan: 'Evaluasi', metode: 'Indeks persen' });

      await batalkan();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Evaluasi' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Indeks persen' })).toBeChecked();
      expect(postSurvei).toHaveLength(0);
    });

    it('survei custom pertama dibuat dengan tujuan dan metode PILIHAN, bukan bawaan', async () => {
      await renderBuilder('new');
      await pilihCustomLengkap({ tujuan: 'Penilaian', metode: 'Indeks persen' });
      await konfirmasi();

      await act(async () => {
        fireEvent.click(await screen.findByText('Skala Nilai 1-4'));
      });

      await waitFor(() => expect(postSurvei).toHaveLength(1));
      expect(postSurvei[0]).toMatchObject({
        jenis: 'custom',
        tujuan: 'penilaian',
        metodeNilai: 'indeks_persen',
      });
    });

    it('survei SKM dibuat TANPA kunci tujuan dan metodeNilai', async () => {
      await renderBuilder('new');
      await klikJenis(pilihSkm());
      await konfirmasi();

      await waitFor(() => expect(postSurvei).toHaveLength(1));
      expect('tujuan' in postSurvei[0]).toBe(false);
      expect('metodeNilai' in postSurvei[0]).toBe(false);
    });

    it('"Ganti jenis" mempertahankan tujuan dan metode yang sudah dipilih', async () => {
      await renderBuilder('new');
      await pilihCustomLengkap({ tujuan: 'Evaluasi', metode: 'Indeks persen' });
      await konfirmasi();
      await screen.findByText('Skala Nilai 1-4');

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /ganti jenis/i }));
      });
      await klikJenis(pilihCustom());

      expect(screen.getByRole('radio', { name: 'Evaluasi' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Indeks persen' })).toBeChecked();
    });
  });
});
