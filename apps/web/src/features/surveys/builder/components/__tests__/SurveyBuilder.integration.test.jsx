import React, { Suspense } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, questionFixture } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

/**
 * Uji integrasi builder survei — template 9 unsur baku & pertanyaan kustom.
 *
 * DITULIS ULANG 10 Agustus 2026. Versi sebelumnya tidak pernah bisa lulus:
 *   1. Menunggu `findByText('Pertanyaan Kustom 1')`, padahal judul yang
 *      dirender adalah `Pertanyaan Kustom #1` (lihat `adaptBuilderQuestion`)
 *      dan teks pertanyaan tampil sebagai `value` input, bukan simpul teks.
 *   2. Mengharapkan `'Pertanyaan baru'` — itu nilai cadangan mock lama yang
 *      muncul justru ketika mock gagal membaca body (`body.text`, padahal
 *      payloadnya `teks`). Ekspektasi itu mengunci bug mock sebagai perilaku
 *      yang "benar", jadi dibuang sama sekali.
 *
 * Handler bawaan sengaja dibiarkan realistis (survei berisi 9 unsur baku).
 * Skenario yang butuh keadaan awal berbeda memakai `server.use()` — pola
 * MSW yang dianjurkan: handler global = jalur bahagia, override = per skenario.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SurveyBuilder Integration (Template & Pertanyaan Kustom)', () => {
  /**
   * `params` adalah Promise (App Router). Komponen membacanya lewat `use()`,
   * sehingga ia SUSPEND pada render pertama. React 19 hanya melepas suspense
   * itu di dalam `act` yang di-await — tanpa ini layar terhenti selamanya di
   * fallback "Menunggu router..." (penyebab test versi lama tak pernah lulus).
   */
  const renderBuilder = async (id = '1') => {
    const paramsPromise = Promise.resolve({ id });
    await act(async () => {
      render(
        <Suspense fallback={<div>Menunggu router...</div>}>
          <SurveyBuilderPage params={paramsPromise} />
        </Suspense>,
      );
    });
  };

  beforeEach(() => {
    mockPush.mockClear();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    // Kanvas dimulai dengan SATU pertanyaan kustom, supaya efek "Tambah 9 Unsur
    // Baku" (yang mengganti seluruh isi kanvas) benar-benar terlihat berubah.
    server.use(
      http.get(`${API_BASE}/surveys/:id/questions`, ({ params }) =>
        ok(
          [
            questionFixture({
              id: 500,
              surveyId: Number(params.id),
              teks: 'Seberapa mudah prosedur layanan?',
              tipe: 'skala',
              isIkmUnsur: false,
              kodeUnsur: null,
              urutan: 1,
            }),
          ],
          `/surveys/${params.id}/questions`,
        ),
      ),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('memuat pertanyaan yang sudah ada dari API ke kanvas', async () => {
    await renderBuilder('1');

    // Judul kustom diregenerasi client-side per posisi (murni kosmetik).
    expect(await screen.findByText('Pertanyaan Kustom #1')).toBeInTheDocument();
    // Teks pertanyaan tampil sebagai nilai input yang bisa disunting.
    expect(screen.getByDisplayValue('Seberapa mudah prosedur layanan?')).toBeInTheDocument();
  });

  it('Skenario 1: "Tambah 9 Unsur Baku" memanggil API template dan merender 9 unsur', async () => {
    await renderBuilder('1');
    await screen.findByText('Pertanyaan Kustom #1');

    fireEvent.click(screen.getByText('Tambah 9 Unsur Baku'));

    // POST /questions/template membalas SELURUH pertanyaan survei, dan
    // kanvas diganti sepenuhnya oleh hasil itu.
    expect(await screen.findByText('U1: Persyaratan')).toBeInTheDocument();
    expect(screen.getByText('U9: Sarana dan Prasarana')).toBeInTheDocument();

    // Pertanyaan kustom sebelumnya tidak lagi ada di kanvas.
    expect(screen.queryByText('Pertanyaan Kustom #1')).not.toBeInTheDocument();
  });

  it('Skenario 2: menambah pertanyaan kustom baru lewat POST /questions', async () => {
    await renderBuilder('1');
    await screen.findByText('Pertanyaan Kustom #1');

    fireEvent.click(screen.getByText('Skala Nilai 1-4'));

    // Bertambah setelah yang sudah ada — penomoran mengikuti jumlah kustom.
    expect(await screen.findByText('Pertanyaan Kustom #2')).toBeInTheDocument();
    expect(screen.getByText('Pertanyaan Kustom #1')).toBeInTheDocument();
  });
});
