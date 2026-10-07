import { http } from 'msw';
import { setupServer } from 'msw/node';
import { complaintFixture, handlers, paginated } from '@/mocks/handlers';
import { getAllComplaints } from '../complaints.api';

/**
 * `getAllComplaints` (7 Oktober 2026) mengambil SEMUA halaman pengaduan untuk
 * layar yang menyaring per periode di klien. `GET /complaints` paling banyak 100
 * baris terbaru, jadi menyaring irisan itu membuat triwulan lama tampak kosong.
 *
 * Yang dijaga di sini batas-batasnya: berhenti di halaman terakhir, berhenti di
 * batas pengaman, dan JUJUR soal hasil yang belum utuh (`truncated`).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const baris = (jumlah) =>
  Array.from({ length: jumlah }, (_, i) => complaintFixture({ id: i + 1, ticketNo: `T${i}` }));

/** Menyajikan `total` pengaduan, 100 per halaman, dan mencatat halaman yang diminta. */
const pasangTotal = (total) => {
  const diminta = [];
  server.use(
    http.get(`${API_BASE}/complaints`, ({ request }) => {
      const halaman = Number(new URL(request.url).searchParams.get('page') ?? 1);
      diminta.push(halaman);
      const sisa = Math.max(0, Math.min(100, total - (halaman - 1) * 100));
      return paginated(baris(sisa), '/complaints', { page: halaman, limit: 100, total });
    }),
  );
  return diminta;
};

describe('getAllComplaints', () => {
  it('satu halaman cukup: satu permintaan, tidak terpotong', async () => {
    const diminta = pasangTotal(40);

    const hasil = await getAllComplaints();

    expect(diminta).toEqual([1]);
    expect(hasil.data).toHaveLength(40);
    expect(hasil.total).toBe(40);
    expect(hasil.truncated).toBe(false);
  });

  it('beberapa halaman: diambil berurutan sampai habis, dan digabung', async () => {
    const diminta = pasangTotal(250);

    const hasil = await getAllComplaints();

    expect(diminta).toEqual([1, 2, 3]);
    expect(hasil.data).toHaveLength(250);
    expect(hasil.truncated).toBe(false);
  });

  it('tanpa pengaduan: satu permintaan, hasil kosong, bukan galat', async () => {
    const diminta = pasangTotal(0);

    const hasil = await getAllComplaints();

    expect(diminta).toEqual([1]);
    expect(hasil).toEqual({ data: [], total: 0, truncated: false });
  });

  it('berhenti di batas pengaman dan MENGAKU belum utuh', async () => {
    // Akun dengan data tak terduga banyaknya tak boleh melahirkan puluhan
    // permintaan beruntun; hasil yang terpotong wajib diberi tanda.
    const diminta = pasangTotal(1000);

    const hasil = await getAllComplaints({ maksHalaman: 3 });

    expect(diminta).toEqual([1, 2, 3]);
    expect(hasil.data).toHaveLength(300);
    expect(hasil.total).toBe(1000);
    expect(hasil.truncated).toBe(true);
  });

  it('tepat di batas pengaman TIDAK dianggap terpotong bila memang sudah semuanya', async () => {
    pasangTotal(300);

    const hasil = await getAllComplaints({ maksHalaman: 3 });

    expect(hasil.data).toHaveLength(300);
    expect(hasil.truncated).toBe(false);
  });
});
