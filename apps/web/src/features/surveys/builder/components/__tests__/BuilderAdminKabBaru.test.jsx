import React, { Suspense } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, created, surveyFixture } from '@/mocks/handlers';
import AdminKabSurveyBuilderPage from '@/app/admin-kab/surveys/builder/[id]/page';

/**
 * HALAMAN JENIS SURVEI UNTUK ADMIN KABUPATEN (30 Oktober 2026, permintaan
 * pengguna). Modal Buat Paket Survei mengantar ke
 * `/admin-kab/surveys/builder/new?opd=&judul=&periode=&anonim=`; halaman jenis
 * di sana sama dengan milik Admin OPD, dan survei baru dibuat sesudah jenisnya
 * dikonfirmasi, membawa isian modal. Admin Kabupaten tak punya OPD sendiri, jadi
 * tanpa `opd` di URL backend akan menolak pembuatannya -- halaman itu kembali ke
 * daftar survei alih-alih menawarkan pilihan yang pasti gagal.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace }),
}));

const server = setupServer(...handlers);
let postSurvei = [];

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  replace.mockClear();
  postSurvei = [];
  server.use(
    http.post(`${API_BASE}/surveys`, async ({ request }) => {
      const body = await request.json();
      postSurvei.push(body);
      return created(surveyFixture({ id: 31, ...body, status: 'draft' }), '/surveys');
    }),
  );
});

const ISIAN = { opd: '7', judul: 'Survei Layanan Puskesmas', periode: '2026-Q4', anonim: '1' };

const renderBaru = async (searchParams) => {
  await act(async () => {
    render(
      <Suspense fallback={<div>Menunggu router...</div>}>
        <AdminKabSurveyBuilderPage
          params={Promise.resolve({ id: 'new' })}
          searchParams={Promise.resolve(searchParams)}
        />
      </Suspense>,
    );
  });
};

const klik = async (el) => {
  await act(async () => {
    fireEvent.click(el);
  });
};

describe('Builder Admin Kabupaten — survei baru dari modal', () => {
  it('menampilkan halaman jenis survei yang sama dengan Admin OPD', async () => {
    await renderBaru(ISIAN);

    expect(await screen.findByRole('radiogroup', { name: /jenis survei/i })).toBeInTheDocument();
    expect(postSurvei).toHaveLength(0);
  });

  it('SKM dibuat dengan OPD, judul, periode, dan izin anonim dari modal', async () => {
    await renderBaru(ISIAN);

    await klik(await screen.findByRole('radio', { name: /skm permenpanrb/i }));
    await klik(screen.getByRole('button', { name: /^lanjutkan$/i }));
    await klik(screen.getByRole('button', { name: /ya, pilih jenis ini/i }));

    await waitFor(() => expect(postSurvei).toHaveLength(1));
    expect(postSurvei[0]).toMatchObject({
      opdId: 7,
      judul: 'Survei Layanan Puskesmas',
      periode: '2026-Q4',
      izinkanAnonim: true,
      jenis: 'skm_permenpanrb',
    });
  });

  it('Custom dibuat pada aksi pertama, juga membawa isian modal', async () => {
    await renderBaru({ ...ISIAN, anonim: '0' });

    await klik(await screen.findByRole('radio', { name: /survei custom/i }));
    await klik(screen.getByRole('radio', { name: 'Evaluasi' }));
    await klik(screen.getByRole('radio', { name: 'Indeks persen' }));
    await klik(screen.getByRole('button', { name: /^lanjutkan$/i }));
    await klik(screen.getByRole('button', { name: /ya, pilih jenis ini/i }));
    await klik(await screen.findByText('Skala Nilai 1-4'));

    await waitFor(() => expect(postSurvei).toHaveLength(1));
    expect(postSurvei[0]).toMatchObject({
      opdId: 7,
      judul: 'Survei Layanan Puskesmas',
      periode: '2026-Q4',
      izinkanAnonim: false,
      jenis: 'custom',
      tujuan: 'evaluasi',
      metodeNilai: 'indeks_persen',
    });
  });

  it('tanpa OPD di URL, kembali ke daftar survei', async () => {
    await renderBaru({});

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin-kab/surveys'));
    expect(screen.queryByRole('radiogroup', { name: /jenis survei/i })).not.toBeInTheDocument();
  });
});
