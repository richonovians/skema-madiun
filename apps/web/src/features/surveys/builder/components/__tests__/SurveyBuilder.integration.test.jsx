import React, { Suspense } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';
import SurveyBuilderPage from '@/app/admin-opd/(builder)/surveys/builder/[id]/page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SurveyBuilder Integration Test (Template & Kustom)', () => {
  const renderBuilder = (id = 'new') => {
    const paramsPromise = Promise.resolve({ id });
    return render(
      <Suspense fallback={<div>Menunggu router...</div>}>
        <SurveyBuilderPage params={paramsPromise} />
      </Suspense>
    );
  };

  beforeEach(() => {
    mockPush.mockClear();
    // Supaya fungsi window.confirm tidak muncul (karena tidak dipakai di Builder sih, tapi jaga-jaga)
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Skenario 1: Menekan tombol "Tambah 9 Unsur Baku" memanggil API dan merender unsur', async () => {
    renderBuilder('1'); // ID existing survey
    
    // Pastikan loading awal selesai (MSW membalas GET /questions)
    await screen.findByText('Pertanyaan Kustom 1'); // Dari mock awal
    
    // Cari tombol Tambah 9 Unsur Baku
    const btnBaku = screen.getByText('Tambah 9 Unsur Baku');
    fireEvent.click(btnBaku);
    
    // MSW handler `/template` akan membalas dengan 9 unsur (U1 - U9)
    // Tunggu sampai layar me-render Unsur 1
    await waitFor(() => {
      expect(screen.getByText('Unsur 1')).toBeInTheDocument();
      expect(screen.getByText('Unsur 9')).toBeInTheDocument();
    });
  });

  it('Skenario 2: Menambah pertanyaan kustom "Skala Nilai 1-4" ke kanvas', async () => {
    renderBuilder('1');
    
    await screen.findByText('Pertanyaan Kustom 1');
    
    const btnKustom = screen.getByText('Skala Nilai 1-4');
    fireEvent.click(btnKustom);
    
    // Akan memanggil POST /questions dan merender hasilnya (dengan default text 'Pertanyaan baru')
    await waitFor(() => {
      // Karena title default adalah "Pertanyaan Kustom #N"
      expect(screen.getByText('Pertanyaan baru')).toBeInTheDocument();
      // "Pertanyaan Kustom #2" karena sudah ada "Pertanyaan Kustom 1" dari API GET awal
      expect(screen.getByText('PERTANYAAN KUSTOM #2')).toBeInTheDocument();
    });
  });
});
