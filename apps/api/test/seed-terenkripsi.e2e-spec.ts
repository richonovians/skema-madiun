import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { dekripsiKolom, kolomTerenkripsi } from '../src/common/crypto/kolom';
import { kunciData } from '../src/common/crypto/kunci';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Pengaduan contoh dari seed tersimpan TERENKRIPSI (26 Oktober 2026).
 *
 * Uji pemulihan cadangan hari itu menemukan satu-satunya `complaints.uraian`
 * yang polos di `skm_db`: pengaduan contoh `PGD20260811KT4E`, yang ditulis
 * `prisma/seed.ts` langsung lewat Prisma tanpa `enkripsiKolom`. Setiap basis data
 * yang di-seed -- `skm_uji`, CI, server baru -- karena itu lahir dengan satu isi
 * pengaduan polos, dan pernyataan "isi pengaduan terenkripsi" tidak berlaku di
 * sana.
 *
 * Yang dibaca di sini baris yang SUDAH ada di `skm_uji`: `scripts/uji-e2e.ts`
 * menjalankan seed sebelum jest. Basis data itu sudah memuat baris polos dari
 * jalan-jalan sebelumnya, dan seed melewati baris yang nomor tiketnya sudah ada
 * -- jadi uji ini sekaligus menuntut seed MEMBETULKAN baris lama, bukan hanya
 * menulis yang baru dengan benar.
 *
 * Hanya membaca; tak ada baris yang ditulis.
 */
const TIKET_CONTOH = 'PGD20260811KT4E';

describe('Seed: pengaduan contoh terenkripsi (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    prisma = moduleRef.get(PrismaService);
  }, 60000);

  afterAll(async () => {
    await moduleRef.close();
  }, 30000);

  it('uraian pengaduan contoh tersimpan sebagai enc:v1:, bukan teks polos', async () => {
    const pengaduan = await prisma.complaint.findFirst({ where: { ticketNo: TIKET_CONTOH } });

    expect(pengaduan).not.toBeNull();
    expect(kolomTerenkripsi(pengaduan!.uraian)).toBe(true);
  });

  it('uraian itu terbuka kembali menjadi kalimat contohnya dengan kunci data', async () => {
    const pengaduan = await prisma.complaint.findFirst({ where: { ticketNo: TIKET_CONTOH } });
    const kunci = kunciData(moduleRef.get(ConfigService));

    expect(dekripsiKolom(pengaduan!.uraian, kunci)).toBe(
      'Pengurusan KTP elektronik di Disdukcapil sudah lebih dari dua minggu belum selesai dan belum ada informasi lanjutan.',
    );
  });
});
