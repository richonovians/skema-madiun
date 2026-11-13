import { PrismaClient } from '@prisma/client';

/**
 * BUG-069 (12 November 2026): halaman pertama `GET /complaints` milik Admin
 * Kabupaten tidak menyaring apa pun, hanya `ORDER BY created_at DESC LIMIT 20`.
 * Tanpa indeks yang diawali `created_at`, Postgres memindai SELURUH tabel lalu
 * mengurutkannya di setiap permintaan. Di `skm_beban` itu 28,6 ms pada 62.000
 * pengaduan dan 692 ms p50 pada 310.000 lewat endpoint, dan tumbuh bersama
 * jumlah pengaduan.
 *
 * Yang diuji RENCANA KUERINYA, bukan sekadar keberadaan sebuah indeks: indeks
 * yang ada tetapi tak dapat dipakai untuk urutan ini (mis. `(status,
 * created_at)`) akan lolos uji keberadaan dan tetap memindai seluruh tabel.
 *
 * `enable_seqscan = off` perlu karena basis data uji nyaris kosong. Pada
 * beberapa baris, pemindaian urut memang lebih murah dan dipilih walau
 * indeksnya ada; mematikannya membuat planner memakai indeks BILA ADA. Tanpa
 * indeks, ia tetap terpaksa memindai, dan itulah yang membuat uji ini merah.
 */
describe('Indeks urutan daftar pengaduan (BUG-069)', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function rencana(sql: string): Promise<string> {
    const [, baris] = await prisma.$transaction([
      prisma.$executeRawUnsafe('SET LOCAL enable_seqscan = off'),
      prisma.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${sql}`),
    ]);
    return baris.map((b) => b['QUERY PLAN']).join('\n');
  }

  it('halaman pertama tanpa penyaring tidak memindai seluruh tabel', async () => {
    const plan = await rencana('SELECT id FROM complaints ORDER BY created_at DESC LIMIT 20');

    // Tanpa langkah Sort: indeks lain (mis. `status`) dapat dipindai penuh
    // lalu diurutkan, dan itu sama mahalnya dengan pemindaian urut.
    expect(plan).not.toMatch(/Seq Scan on complaints/);
    expect(plan).not.toMatch(/Sort/);
    expect(plan).toMatch(/Index (Only )?Scan( Backward)? using \S+ on complaints/);
  });
});
