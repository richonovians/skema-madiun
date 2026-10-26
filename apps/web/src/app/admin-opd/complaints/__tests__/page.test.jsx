import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { handlers, complaintFixture, paginated, ok } from '@/mocks/handlers';
import AdminOPDComplaintsPage from '../page';

jest.mock('@/utils/pdf', () => ({
  downloadTablePdf: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

/**
 * DUA SUITE DILEBUR DI SINI, 15 Oktober 2026, dan peleburannya sendirilah yang
 * perlu diterangkan.
 *
 * Jalur berkas ini pernah berisi DUA berkas yang lahir sendiri-sendiri: versi
 * 2 September di cabang `tester` (TC-FE-041, enam kasus, `e3c5a0b`, tak pernah
 * ikut ke `main`) dan versi 15 Oktober di `main` (tujuh kasus, catatan
 * pemotongan). Keduanya tercatat sebagai penambahan, bukan suntingan, sehingga
 * tarikan `main` ke `tester` berikutnya akan berbenturan — dan tak ada satu pun
 * uji yang muncul di kedua berkas, jadi menyelesaikannya dengan memilih salah
 * satu akan MEMBUANG cakupan. Berkas ini gabungan keduanya, supaya pilihan itu
 * tak pernah perlu diambil. Lihat BUG-021 di `docs/BUG_REPORTS.md`.
 *
 * GAYANYA MSW, BUKAN `jest.mock` ATAS SERVICE, dan itu bukan selera. Keduanya
 * tak dapat hidup bersama: memalsukan `complaints.api` membuat MSW tak pernah
 * terpanggil. Dengan MSW ujinya menembus `getComplaints` dan `adaptComplaint`
 * sungguhan, sehingga ia ikut membuktikan pemetaan adapternya — `ticketNo`
 * menjadi `id`, `reporterNama` menjadi `reporter.name`, `diterima` menjadi
 * `Diterima`. Versi `jest.mock` membuang bukti itu.
 *
 * Yang dijaga ada tiga kelompok:
 *
 *  1. Daftar & penyaring (asal TC-FE-041). Kerusakan yang ditangkap: penyaring
 *     status tak lagi mencocokkan label dropdown-nya sehingga menyaring habis
 *     atau tak menyaring apa pun; pencarian berhenti mencakup nomor tiket atau
 *     nama pelapor, padahal itulah dua cara admin biasanya mencari; dan **Reset
 *     Filter mengisi status dengan `''` alih-alih `'Semua Status'`** — nilai
 *     netral penyaring ini bukan string kosong, jadi kekeliruan itu menyaring
 *     habis seluruh tabel, sebuah tombol "reset" yang justru mengosongkan layar.
 *  2. Catatan pemotongan (asal BUG-021). Halaman mengambil `FETCH_LIMIT = 100`
 *     baris lalu menyaring dan memaginasi di klien; di atas seratus, sisanya tak
 *     pernah terlihat dan kendali paginasinya menghitung halaman dari baris yang
 *     TERAMBIL. Halaman harus MENGATAKANNYA, termasuk bahwa penyaring di atas
 *     pun hanya bekerja atas irisan itu — dan harus diam ketika totalnya belum
 *     diketahui.
 *  3. `?opdId=` tidak boleh dikirim dari klien. Penyaring itu dibuang
 *     5 September 2026 ketika hak akses mulai mengikuti peran yang DIPAKAI dan
 *     backend menurunkan instansinya sendiri dari `users.opd_id`.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Tujuh pengaduan: cukup untuk menguji paginasi 5-baris sekaligus penyaringan. */
const DAFTAR = [
  complaintFixture({
    id: 1,
    ticketNo: 'PGD20260901AAAA',
    judul: 'Rambu lalu lintas rusak',
    status: 'diterima',
    reporterNama: 'Budi Santoso',
  }),
  complaintFixture({
    id: 2,
    ticketNo: 'PGD20260901BBBB',
    judul: 'Jalan berlubang',
    status: 'diproses',
    reporterNama: 'Siti Aminah',
  }),
  complaintFixture({
    id: 3,
    ticketNo: 'PGD20260901CCCC',
    judul: 'Lampu jalan padam',
    status: 'selesai',
    reporterNama: 'Budi Santoso',
  }),
  complaintFixture({
    id: 4,
    ticketNo: 'PGD20260901DDDD',
    judul: 'Sampah menumpuk',
    status: 'ditolak',
    reporterNama: 'Andi Wijaya',
  }),
  complaintFixture({
    id: 5,
    ticketNo: 'PGD20260901EEEE',
    judul: 'Saluran air mampet',
    status: 'diterima',
    reporterNama: 'Rina Dewi',
  }),
  complaintFixture({
    id: 6,
    ticketNo: 'PGD20260901FFFF',
    judul: 'Trotoar rusak',
    status: 'diproses',
    reporterNama: 'Joko Susilo',
  }),
  complaintFixture({
    id: 7,
    ticketNo: 'PGD20260901GGGG',
    judul: 'Pohon tumbang',
    status: 'selesai',
    reporterNama: 'Maya Sari',
  }),
];

/**
 * Baris sebanyak apa pun, judul dan pelapornya dapat ditebak. Baris pertama
 * diberi judul khas supaya pencarian punya satu sasaran yang pasti tunggal.
 */
const banyakBaris = (n) =>
  Array.from({ length: n }, (_, i) =>
    complaintFixture({
      id: i + 1,
      ticketNo: `PGD20261001${String(i + 1).padStart(4, '0')}`,
      judul: i === 0 ? 'Lampu jalan mati' : `Pengaduan ke-${i + 1}`,
      status: 'diterima',
      reporterNama: i === 0 ? 'Budi Santoso' : `Pelapor ${i + 1}`,
    }),
  );

/** Jawab `GET /complaints` dengan `meta.pagination.total` yang ditentukan. */
const sajikan = (items, total = items.length) =>
  server.use(
    http.get(`${API_BASE}/complaints`, () => paginated(items, '/complaints', { total })),
  );

/**
 * Jawab TANPA `meta.pagination` sama sekali — bentuk respons yang membuat
 * `totalSeluruhnya` jatuh ke 0, yaitu "belum diketahui".
 */
const sajikanTanpaTotal = (items) =>
  server.use(http.get(`${API_BASE}/complaints`, () => ok(items, '/complaints')));

const barisTabel = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const judulBaris = () =>
  barisTabel().map((r) => within(r).getAllByRole('cell')[2].textContent.trim());
const dropdownStatus = () =>
  screen.getByRole('button', { name: /semua status|diterima|diproses|selesai|ditolak/i });
const kolomCari = () => screen.getByPlaceholderText(/cari nomor tiket, judul, atau nama pelapor/i);

const pilihStatus = async (status) => {
  fireEvent.click(dropdownStatus());
  fireEvent.click(await screen.findByRole('button', { name: status }));
};

describe('Daftar pengaduan Admin OPD (TC-FE-041)', () => {
  beforeEach(() => sajikan(DAFTAR));

  it('menampilkan lima baris pertama dan mengumumkan jumlah seluruhnya', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    // ITEMS_PER_PAGE = 5, jadi dua pengaduan terakhir ada di halaman berikutnya.
    expect(barisTabel()).toHaveLength(5);
    expect(screen.getByText('Menampilkan 7 pengaduan.')).toBeInTheDocument();
  });

  it('menyaring menurut status yang dipilih', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    await pilihStatus('Selesai');

    expect(judulBaris()).toEqual(['Lampu jalan padam', 'Pohon tumbang']);
  });

  it('mencari berdasarkan nomor tiket, bukan hanya judul', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    fireEvent.change(kolomCari(), { target: { value: 'PGD20260901DDDD' } });

    expect(judulBaris()).toEqual(['Sampah menumpuk']);
  });

  it('mencari berdasarkan nama pelapor', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    fireEvent.change(kolomCari(), { target: { value: 'budi' } });

    expect(judulBaris()).toEqual(['Rambu lalu lintas rusak', 'Lampu jalan padam']);
  });

  it('menampilkan keadaan kosong yang jujur saat tak ada yang cocok', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    fireEvent.change(kolomCari(), { target: { value: 'tidak ada yang begini' } });

    expect(screen.getByText('Tidak ada data pengaduan yang ditemukan.')).toBeInTheDocument();
  });

  it('mengembalikan seluruh daftar setelah Reset Filter ditekan', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    fireEvent.change(kolomCari(), { target: { value: 'budi' } });
    await pilihStatus('Selesai');
    expect(judulBaris()).toEqual(['Lampu jalan padam']);

    fireEvent.click(screen.getByRole('button', { name: 'Reset Filter' }));

    // Nilai netral penyaring status adalah 'Semua Status', BUKAN string kosong.
    // Menyetelnya ke '' membuat tombol reset justru mengosongkan tabel.
    expect(barisTabel()).toHaveLength(5);
    expect(kolomCari()).toHaveValue('');
    expect(screen.getByText('Menampilkan 7 pengaduan.')).toBeInTheDocument();
  });
});

/**
 * KALIMAT JUDUL MENGIKUTI PENYARING STATUS (26 Oktober 2026, permintaan
 * pengguna). Sebelumnya kalimatnya tetap "N tiket pengaduan aktif yang
 * membutuhkan tindak lanjut segera" walau yang tersaring pengaduan Selesai
 * atau Ditolak -- dua keadaan yang justru TIDAK membutuhkan tindak lanjut.
 * Angkanya jumlah sesudah pencarian dan penyaring, sama seperti tabelnya.
 */
describe('Daftar pengaduan Admin OPD — kalimat judul mengikuti penyaring status', () => {
  beforeEach(() => sajikan(DAFTAR));

  it.each([
    ['Diterima', 'Menampilkan 2 pengaduan baru yang belum ditindaklanjuti.'],
    ['Diproses', 'Menampilkan 2 pengaduan yang sedang diproses.'],
    ['Selesai', 'Menampilkan 2 pengaduan yang sudah selesai ditangani.'],
    ['Ditolak', 'Menampilkan 1 pengaduan yang ditolak.'],
  ])('penyaring %s', async (status, kalimat) => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    await pilihStatus(status);

    expect(screen.getByText(kalimat)).toBeInTheDocument();
    expect(screen.queryByText(/tindak lanjut segera/)).not.toBeInTheDocument();
  });

  it('Semua Status tidak menyebut keadaan apa pun', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    expect(screen.getByText('Menampilkan 7 pengaduan.')).toBeInTheDocument();
  });

  it('angkanya mengikuti pencarian di dalam penyaring', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    await pilihStatus('Selesai');
    fireEvent.change(kolomCari(), { target: { value: 'budi' } });

    expect(screen.getByText('Menampilkan 1 pengaduan yang sudah selesai ditangani.')).toBeInTheDocument();
  });

  it('kembali ke kalimat netral sesudah Reset Filter', async () => {
    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    await pilihStatus('Ditolak');
    fireEvent.click(screen.getByRole('button', { name: 'Reset Filter' }));

    expect(screen.getByText('Menampilkan 7 pengaduan.')).toBeInTheDocument();
  });
});

describe('Daftar pengaduan Admin OPD — catatan pemotongan (BUG-021)', () => {
  it('mengatakan daftarnya terpotong ketika total backend melebihi yang terambil', async () => {
    sajikan(banyakBaris(100), 318);

    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    const catatan = await screen.findByRole('status');
    expect(catatan).toHaveTextContent('100');
    expect(catatan).toHaveTextContent('318');
  });

  it('menyebut bahwa pencarian dan penyaring pun hanya bekerja atas irisan itu', async () => {
    sajikan(banyakBaris(100), 318);

    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    expect(await screen.findByRole('status')).toHaveTextContent(
      /termasuk oleh pencarian dan penyaring di atas/i,
    );
  });

  it('TIDAK memasang catatan ketika seluruh baris memang terambil (kendali)', async () => {
    sajikan(banyakBaris(12), 12);

    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('TIDAK memasang catatan ketika total belum diketahui', async () => {
    // Respons tanpa `meta.pagination`: ketiadaan data tak boleh menjadi
    // peringatan palsu.
    sajikanTanpaTotal(banyakBaris(12));

    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Daftar pengaduan Admin OPD — paginasi dan permintaan yang dikirim', () => {
  it('memotong satu halaman menjadi lima baris dan menyebut angka yang benar', async () => {
    sajikan(banyakBaris(12), 12);

    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    expect(screen.getByText(/Menampilkan 1-5 dari 12 pengaduan/i)).toBeInTheDocument();
    expect(screen.queryByText('Pengaduan ke-6')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));

    expect(await screen.findByText('Pengaduan ke-6')).toBeInTheDocument();
    expect(screen.getByText(/Menampilkan 6-10 dari 12 pengaduan/i)).toBeInTheDocument();
  });

  it('pencarian menyaring daftarnya dan mengembalikan ke halaman pertama', async () => {
    sajikan(banyakBaris(12), 12);

    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    fireEvent.click(screen.getByLabelText('Halaman berikutnya'));
    await screen.findByText('Pengaduan ke-6');

    fireEvent.change(kolomCari(), { target: { value: 'lampu' } });

    expect(judulBaris()).toEqual(['Lampu jalan mati']);
    expect(screen.getByText(/Menampilkan 1-1 dari 1 pengaduan/i)).toBeInTheDocument();
  });

  it('TIDAK mengirim `opdId`; cakupan OPD diturunkan backend dari `users.opd_id`', async () => {
    // Diperiksa pada URL permintaan yang BENAR-BENAR terkirim, bukan pada
    // panggilan service: yang dipersoalkan keputusan 5 September 2026 adalah apa
    // yang sampai ke backend.
    let kueri = null;
    server.use(
      http.get(`${API_BASE}/complaints`, ({ request }) => {
        kueri = new URL(request.url).searchParams;
        return paginated(DAFTAR, '/complaints', { total: DAFTAR.length });
      }),
    );

    render(<AdminOPDComplaintsPage />);
    await screen.findByRole('table');

    expect(kueri.has('opdId')).toBe(false);
    expect(kueri.get('limit')).toBe('100');
  });
});
