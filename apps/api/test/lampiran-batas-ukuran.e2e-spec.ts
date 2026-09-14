import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { bersihkanAuditAkunUji } from './helpers/audit.helper';
import { devHeaders } from './helpers/auth.helper';

/**
 * Penolakan lampiran yang terlalu besar (14 September 2026).
 *
 * Multer memakai `memoryStorage()`: berkas dibaca UTUH ke memori sebelum
 * handler mana pun berjalan. Selama langit-langitnya jauh di atas batas bisnis,
 * satu permintaan dapat menahan puluhan megabyte di memori hanya untuk ditolak
 * sesaat kemudian -- dan akun biasa sudah cukup untuk melakukannya berulang.
 *
 * Yang dijaga di sini BUKAN sekadar "ditolak", melainkan ditolak dengan pesan
 * yang dapat dimengerti pengunggahnya. Itu sebabnya langit-langitnya dulu
 * dibuat longgar (lihat komentar di complaints.controller.ts): penolakan
 * multer yang tak dipetakan menghasilkan galat mentah. Berkas ini memaku kedua
 * sifat itu sekaligus, sehingga menurunkan langit-langitnya tak dapat
 * diam-diam menukar pesan yang baik dengan pesan yang tak menjelaskan apa pun.
 */
const SSO_PELAPOR = 'e2e-lampiran-besar';

describe('Batas ukuran lampiran pengaduan (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let pelaporId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.create({
      data: { kode: 'E2ELMP', nama: 'OPD Uji Lampiran', isActive: true },
    });
    opdId = opd.id;

    const pelapor = await prisma.user.create({
      data: {
        ssoSubject: SSO_PELAPOR,
        nama: 'Pelapor Lampiran',
        email: 'lampiran-besar@e2e.test',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    pelaporId = pelapor.id;
  }, 30000);

  afterAll(async () => {
    await prisma.complaintAttachment.deleteMany({ where: { complaint: { userId: pelaporId } } });
    await prisma.complaint.deleteMany({ where: { userId: pelaporId } });
    await bersihkanAuditAkunUji(prisma, [SSO_PELAPOR]);
    await prisma.user.deleteMany({ where: { ssoSubject: SSO_PELAPOR } });
    await prisma.opd.deleteMany({ where: { kode: 'E2ELMP' } });
    await app.close();
  }, 30000);

  const kirimBerkas = (ukuranByte: number) =>
    request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(devHeaders({ role: Role.responden, userId: pelaporId }))
      .field('opdId', opdId)
      .field('kategori', 'aduan')
      .field('judul', 'Pengaduan berlampiran')
      .field('uraian', 'Isi pengaduan yang cukup panjang untuk lolos validasi.')
      .attach('lampiran', Buffer.alloc(ukuranByte, 1), {
        filename: 'besar.jpg',
        contentType: 'image/jpeg',
      });

  /**
   * 413 berkode, BUKAN 400 dari pemeriksaan service. Bedanya yang membuktikan
   * langit-langit multer benar-benar turun: selama ia masih 20MB, berkas 6MB
   * lolos masuk memori lebih dulu lalu ditolak service dengan 400 -- ditolak
   * juga, tetapi sesudah ongkosnya telanjur dibayar.
   */
  it('berkas 6MB ditolak multer, bukan sesudah dibaca utuh ke memori', async () => {
    const res = await kirimBerkas(6 * 1024 * 1024);

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('LAMPIRAN_TERLALU_BESAR');
    expect(String(res.body.message)).toMatch(/5\s*MB/i);
  });

  /**
   * Berkas yang jauh melewati langit-langit multer. Inilah yang memerah sebelum
   * penolakan multer dipetakan: galatnya tak berbentuk amplop galat aplikasi,
   * dan pengunggahnya melihat kegagalan yang tak menyebut sebab apa pun.
   */
  it('berkas 25MB pun dijawab pesan yang sama, bukan galat mentah', async () => {
    const res = await kirimBerkas(25 * 1024 * 1024);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(String(res.body.message)).toMatch(/5\s*MB/i);
  });
});
