import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';
import AdminSurveysPage from '@/app/admin-opd/surveys/page';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Perekam permintaan keluar. TC-FE-026 menuntut bukti "kedua aksi memanggil
 * endpoint yang benar" -- sebelumnya kedua skenario hanya memastikan tak ada
 * teks error muncul, yang tetap lulus meski TAK ADA permintaan terkirim sama
 * sekali. Dengan rekaman ini, kegagalan pemanggilan endpoint benar-benar
 * membuat tes merah.
 */
const requests = [];
const recordRequest = ({ request }) => {
  requests.push(`${request.method} ${new URL(request.url).pathname}`);
};

const sudahMemanggil = (pola) => requests.some((entry) => pola.test(entry));

describe('SurveyManagement Integration Test (CRUD, Lifecycle, Duplicate)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    requests.length = 0;
    server.events.on('request:start', recordRequest);
  });

  afterEach(() => {
    server.events.removeListener('request:start', recordRequest);
  });

  it('Skenario 1: Merender daftar survei dari API', async () => {
    render(<AdminSurveysPage />);
    
    // Harus menampilkan loading state terlebih dahulu
    expect(screen.getByText(/memuat daftar survei/i)).toBeInTheDocument();
    
    // Menunggu MSW merespons dan me-render list
    expect(await screen.findByText('Survei IKM 2026')).toBeInTheDocument();
    expect(await screen.findByText('Survei IKM 2025')).toBeInTheDocument();
  });

  it('Skenario 2: Menekan tombol "Duplikasi" pada survei memanggil API dan mereload data', async () => {
    render(<AdminSurveysPage />);
    
    // Tunggu daftar muncul
    await screen.findByText('Survei IKM 2026');
    
    // Tombol pemicu duplikasi di AdminSurveyCardActions berlabel 'Salin'
    // (sebelum 2026-08-18 labelnya 'Salin Kode' -- diubah tim UI, dan tes ini
    // sempat merah karenanya).
    const dupButtons = await screen.findAllByRole('button', { name: /^salin$/i });

    fireEvent.click(dupButtons[0]);

    // Bukti utama TC-FE-026: endpoint duplikasi benar-benar dipanggil.
    await waitFor(() => {
      expect(sudahMemanggil(/^POST .*\/surveys\/\d+\/duplicate$/)).toBe(true);
    });
    expect(screen.queryByText(/action error/i)).not.toBeInTheDocument();
  });

  it('Skenario 3: Menekan tombol "Tutup Periode" memanggil API status (Lifecycle)', async () => {
    render(<AdminSurveysPage />);
    
    await screen.findByText('Survei IKM 2026');
    
    const closeButtons = await screen.findAllByRole('switch');

    // Sejak 2026-08-18 konfirmasi TIDAK lagi memakai window.confirm melainkan
    // ConfirmActionModal, sehingga menekan switch saja HANYA membuka modal dan
    // belum memanggil API apa pun. Stub window.confirm yang dulu dipasang di
    // sini jadi tak relevan; tanpa menekan tombol konfirmasi, tes ini akan
    // lulus palsu (tak ada error muncul, tapi juga tak ada permintaan terkirim).
    fireEvent.click(closeButtons[0]);

    const confirmButton = await screen.findByRole('button', { name: /ya, tutup periode/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(sudahMemanggil(/^PATCH .*\/surveys\/\d+\/status$/)).toBe(true);
    });
    expect(screen.queryByText(/action error/i)).not.toBeInTheDocument();
  });
});
