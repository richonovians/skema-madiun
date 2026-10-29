import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManajemenOPDPage from '../page';
import { getOpdList, syncOpd } from '@/features/opd/services/opd.api';

// Mock API
jest.mock('@/features/opd/services/opd.api', () => ({
  getOpdList: jest.fn(),
  syncOpd: jest.fn(),
}));

const generateMockData = (count) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i + 1,
    code: `OPD-${i + 1}`,
    name: i === 0 ? 'Dinas Kesehatan' : `Instansi Ke-${i + 1}`,
    serviceType: i === 0 ? 'Kesehatan' : 'Layanan Umum',
    activeSurveys: 2,
    openComplaints: 0,
    status: 'ACTIVE',
    syncedAt: '2026-08-01T00:00:00Z',
  }));
};

describe('ManajemenOPDPage (TC-FE-013 & TC-FE-014)', () => {
  beforeEach(() => {
    // Memberikan 15 data dummy agar paginasi muncul (karena ITEMS_PER_PAGE = 10)
    getOpdList.mockResolvedValue({
      data: generateMockData(15),
      meta: { total: 15 },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('TC-FE-013: Fungsi paginasi merender data baru', async () => {
    render(<ManajemenOPDPage />);

    // Tunggu sampai loading selesai dan data muncul
    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
    });

    // Karena per halaman 10 item, item ke-11 seharusnya BELUM ada
    expect(screen.queryByText('Instansi Ke-11')).not.toBeInTheDocument();

    // Pastikan teks indikator paginasi benar (Menampilkan 1-10 dari 15 OPD)
    expect(screen.getByText(/Menampilkan 1-10 dari 15 OPD/i)).toBeInTheDocument();

    // BUG-010 (23 Oktober 2026). Baris ini dahulu menebak tombolnya lewat
    // POSISI -- `paginationContainer.querySelectorAll('button')[1]` -- sebab
    // kedua tombol paginasi tak punya nama yang dapat dibacakan sama sekali.
    // Namanya sudah ada sejak `7bc0b83`, jadi ujinya memakai nama itu dan
    // dengan begitu ikut menjaganya. Ini perapian uji, bukan bukti perbaikan:
    // ia hijau pada jalan pertama karena `aria-label`-nya sudah terpasang.
    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));

    // Ekspektasi: Setelah di klik, item ke-11 muncul
    expect(await screen.findByText('Instansi Ke-11')).toBeInTheDocument();
    
    // Indikator teks berubah
    expect(screen.getByText(/Menampilkan 11-15 dari 15 OPD/i)).toBeInTheDocument();
    
    // Item 1 tidak ada lagi
    expect(screen.queryByText('Dinas Kesehatan')).not.toBeInTheDocument();
  });

  it('TC-FE-014: Filter bar memicu rerender pada tabel', async () => {
    render(<ManajemenOPDPage />);

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
      expect(screen.getByText('Instansi Ke-2')).toBeInTheDocument();
    });

    // Cari input pencarian
    const searchInput = screen.getByPlaceholderText(/Cari berdasarkan nama OPD atau kode/i);
    
    // Ketik "kesehatan"
    fireEvent.change(searchInput, { target: { value: 'kesehatan' } });

    // Ekspektasi: Hanya 'Dinas Kesehatan' yang tersisa
    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
      expect(screen.queryByText('Instansi Ke-2')).not.toBeInTheDocument();
    });
    
    // Indikator paginasi seharusnya berubah (karena hasil filter cuma 1)
    expect(screen.getByText(/Menampilkan 1-1 dari 1 OPD/i)).toBeInTheDocument();
  });
});

/**
 * CATATAN PEMOTONGAN (15 Oktober 2026).
 *
 * Halaman ini mengambil FETCH_LIMIT = 100 baris sekali lalu menyaring dan
 * memaginasinya di klien. Di atas seratus, sisanya tak pernah terlihat dan
 * kendali paginasinya justru menghitung halaman dari baris yang TERAMBIL --
 * jadi ia tampak lengkap padahal bukan, dan pencarian di atas hanya mencari di
 * dalam irisan itu.
 *
 * Yang dijaga di sini: halaman MENGATAKANNYA. Bukan memperbaiki pemotongannya,
 * sebab paginasi sisi server menuntut backend menerima `search`, dan itu
 * pekerjaan tersendiri.
 */
describe('ManajemenOPDPage — catatan pemotongan', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('mengatakan daftarnya terpotong ketika total backend melebihi yang terambil', async () => {
    getOpdList.mockResolvedValue({
      data: generateMockData(15),
      meta: { pagination: { total: 250 } },
    });

    render(<ManajemenOPDPage />);
    await screen.findByText('Dinas Kesehatan');

    const catatan = await screen.findByRole('status');
    expect(catatan).toHaveTextContent('15');
    expect(catatan).toHaveTextContent('250');
  });

  it('TIDAK memasang catatan ketika seluruh baris memang terambil (kendali)', async () => {
    getOpdList.mockResolvedValue({
      data: generateMockData(15),
      meta: { pagination: { total: 15 } },
    });

    render(<ManajemenOPDPage />);
    await screen.findByText('Dinas Kesehatan');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

/**
 * BUG-011 dan BUG-012, keduanya di halaman ini, dijaga 23 Oktober 2026.
 *
 * Laporan sinkron dijadikan `role="status"` sekaligus: sampai hari ini banner
 * itu tak punya `role` apa pun, sehingga menekan "Sinkronkan dari Helpdesk"
 * lalu menunggu menghasilkan KESUNYIAN bagi pembaca layar -- berhasil maupun
 * melewatkan. `role="alert"` sengaja tidak dipakai; di basis kode ini ia
 * khusus untuk galat (lihat `ConsentGate.jsx`).
 */
describe('ManajemenOPDPage — pencarian berspasi & laporan sinkron', () => {
  beforeEach(() => {
    getOpdList.mockResolvedValue({
      data: generateMockData(15),
      // `total` dibuat sama dengan jumlah baris supaya `CatatanPemotongan`
      // mengembalikan null -- kalau tidak, ada DUA `role="status"` di layar dan
      // asersi di bawah menjadi ambigu.
      meta: { pagination: { total: 15 } },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('BUG-011: kata kunci berspasi depan dan belakang tetap menemukan OPD', async () => {
    render(<ManajemenOPDPage />);
    await screen.findByText('Dinas Kesehatan');

    const searchInput = screen.getByPlaceholderText(/Cari berdasarkan nama OPD atau kode/i);
    // Menempel nama OPD dari dokumen atau sel spreadsheet hampir selalu
    // membawa spasi ikut serta. Yang dilihat pengguna sebelum perbaikan ini
    // adalah "Tidak ada data OPD yang ditemukan." -- kalimat yang terdengar
    // pasti dan justru menyesatkan.
    fireEvent.change(searchInput, { target: { value: '  DINAS  ' } });

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
    });
    expect(screen.queryByText('Instansi Ke-2')).not.toBeInTheDocument();
  });

  it('BUG-012: angka yang DILEWATI disebut, dan bannernya berubah kuning', async () => {
    syncOpd.mockResolvedValue({
      fetched: 64,
      created: 2,
      updated: 60,
      deactivated: 1,
      skipped: 3,
    });

    render(<ManajemenOPDPage />);
    await screen.findByText('Dinas Kesehatan');

    fireEvent.click(screen.getByRole('button', { name: /Sinkronkan dari Helpdesk/i }));

    // Satu-satunya angka yang menuntut tindak lanjut: OPD yang TIDAK ikut
    // tersinkron, biasanya karena datanya cacat di sisi Helpdesk.
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('3 dilewati');
    expect(banner).toHaveClass('bg-amber-50');
    expect(banner).not.toHaveClass('bg-emerald-50');
  });

  it('BUG-012 kendali: nol yang dilewati tetap disebut, bannernya tetap hijau', async () => {
    syncOpd.mockResolvedValue({
      fetched: 64,
      created: 2,
      updated: 60,
      deactivated: 1,
      skipped: 0,
    });

    render(<ManajemenOPDPage />);
    await screen.findByText('Dinas Kesehatan');

    fireEvent.click(screen.getByRole('button', { name: /Sinkronkan dari Helpdesk/i }));

    // Nol disebut tersurat, bukan dihilangkan: ia bukti POSITIF bahwa tak ada
    // yang terlewat. Kalimat berempat angka tak dapat dibedakan dari laporan
    // yang sekadar tidak melaporkannya.
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('0 dilewati');
    expect(banner).toHaveClass('bg-emerald-50');
  });
});
