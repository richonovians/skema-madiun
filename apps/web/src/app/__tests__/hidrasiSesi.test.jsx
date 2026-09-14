import React from 'react';
import { setupServer } from 'msw/node';
import { useRouter } from 'next/navigation';
import { handlers } from '@/mocks/handlers';
import { keluhanHidrasi } from '@/mocks/hidrasi';
import { isAuthenticated } from '@/features/authentication/services/authStorage';
import CreateComplaintForm from '@/features/complaints/components/CreateComplaintForm';
import SurveyForm from '@/features/surveys/components/SurveyForm';

/**
 * Beranda merender kedua formulir ini, dan keduanya memutuskan tampilannya dari
 * ada-tidaknya sesi. Sesi hanya terbaca di peramban, sehingga HTML server selalu
 * versi "belum masuk" sedangkan render pertama di klien bisa versi "sudah
 * masuk". Selisih itulah yang dilaporkan React sebagai hydration failed.
 *
 * Yang diuji bukan tampilannya, melainkan syaratnya: render PERTAMA di klien
 * harus sama dengan HTML server, apa pun isi localStorage. Perpindahan ke versi
 * bersesi boleh terjadi sesudahnya.
 */
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/features/authentication/services/authStorage', () => ({
  ...jest.requireActual('@/features/authentication/services/authStorage'),
  isAuthenticated: jest.fn(),
}));

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  useRouter.mockReturnValue({ push: jest.fn() });
});

const hidrasiSebagaiPenggunaMasuk = (elemen) =>
  keluhanHidrasi(elemen, {
    diServer: () => isAuthenticated.mockReturnValue(false),
    diKlien: () => isAuthenticated.mockReturnValue(true),
  });

describe('hidrasi beranda bagi pengunjung yang sudah masuk', () => {
  it('CreateComplaintForm terhidrasi tanpa selisih server-klien', async () => {
    expect(await hidrasiSebagaiPenggunaMasuk(<CreateComplaintForm />)).toEqual([]);
  });

  it('SurveyForm terhidrasi tanpa selisih server-klien', async () => {
    expect(await hidrasiSebagaiPenggunaMasuk(<SurveyForm />)).toEqual([]);
  });
});
