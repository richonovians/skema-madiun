import type { PrismaService } from './prisma/prisma.service';
import type { PenyimpanSesi } from './modules/auth/session/penyimpan-sesi.interface';
import { BATAS_PERIKSA_MS, KesiapanService } from './kesiapan.service';

/**
 * BUG-072 (4 November 2026): `/health` menjawab 200 selama basis data mati.
 * `/health` sengaja tetap statis (liveness); yang memeriksa ketergantungan
 * adalah `/health/siap`, dan aturannya di sini.
 */
describe('KesiapanService', () => {
  const jalan = () => Promise.resolve();
  const gagal = () => Promise.reject(new Error('mati'));
  const macet = () => new Promise<never>(() => undefined);

  const buat = (db: () => Promise<unknown>, redis: () => Promise<void>) =>
    new KesiapanService(
      { $queryRaw: jest.fn(db) } as unknown as PrismaService,
      { periksa: jest.fn(redis) } as unknown as PenyimpanSesi,
    );

  afterEach(() => jest.useRealTimers());

  it('keduanya menjawab -> siap', async () => {
    await expect(buat(jalan, jalan).periksa()).resolves.toEqual({
      siap: true,
      db: 'ok',
      redis: 'ok',
    });
  });

  it('basis data mati -> tidak siap, dan hanya db yang gagal', async () => {
    await expect(buat(gagal, jalan).periksa()).resolves.toEqual({
      siap: false,
      db: 'gagal',
      redis: 'ok',
    });
  });

  it('penyimpan sesi tak menjawab -> tidak siap, dan hanya redis yang gagal', async () => {
    await expect(buat(jalan, gagal).periksa()).resolves.toEqual({
      siap: false,
      db: 'ok',
      redis: 'gagal',
    });
  });

  /**
   * Basis data yang MACET tidak melempar: kueri menunggu sampai kolam koneksi
   * Prisma menyerah, sekitar 10 detik. Tanpa batas sendiri, pemantau yang
   * bertanya lebih dulu menyerah daripada jawabannya tiba.
   */
  it('pemeriksaan yang macet dinyatakan gagal sesudah batas waktunya', async () => {
    jest.useFakeTimers();
    const hasil = buat(macet, macet).periksa();

    await jest.advanceTimersByTimeAsync(BATAS_PERIKSA_MS);

    await expect(hasil).resolves.toEqual({ siap: false, db: 'gagal', redis: 'gagal' });
  });

  it('kedua pemeriksaan berjalan bersamaan: jawaban tiba tepat pada satu batas, bukan dua', async () => {
    jest.useFakeTimers();
    let selesai = false;
    void buat(macet, macet)
      .periksa()
      .then(() => (selesai = true));

    await jest.advanceTimersByTimeAsync(BATAS_PERIKSA_MS - 1);
    expect(selesai).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    expect(selesai).toBe(true);
  });
});
