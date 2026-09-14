import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * Permintaan pengguna 14 September 2026: kalimat "Buka halaman Persetujuan
 * terlebih dahulu" pada penolakan 403 jadi TOMBOL di layar.
 *
 * Frontend mengenali penolakan itu lewat `error.code`, bukan bunyi pesan.
 * Filter galat sudah punya ujinya sendiri bahwa `code` diteruskan; yang
 * dibuktikan DI SINI adalah rantai lengkapnya lewat HTTP sungguhan -- kode itu
 * benar-benar sampai ke klien pada endpoint yang memang dipakai warga.
 */
const SUBJECT = 'e2e-consent-code';
const KODE_OPD = 'E2ECONSENT';

describe('Kode CONSENT_REQUIRED sampai ke klien (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  let opdId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: KODE_OPD },
      update: {},
      create: { kode: KODE_OPD, nama: 'OPD E2E Persetujuan', isActive: true },
    });
    opdId = opd.id;

    // `consentAt: null` juga di `update`, supaya baris sisa run sebelumnya tak
    // membuat uji ini lolos karena akunnya terlanjur menyetujui.
    const user = await prisma.user.upsert({
      where: { ssoSubject: SUBJECT },
      update: { consentAt: null },
      create: {
        ssoSubject: SUBJECT,
        nama: 'Warga Belum Menyetujui',
        email: 'e2e-consent-code@example.go.id',
        roles: [Role.responden],
        consentAt: null,
      },
    });
    userId = user.id;
  }, 60000);

  afterAll(async () => {
    if (!prisma) {
      await app?.close();
      return;
    }
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.complaint.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { ssoSubject: SUBJECT } });
    await prisma.opd.deleteMany({ where: { kode: KODE_OPD } });
    await app.close();
  }, 30000);

  const kirimPengaduan = () =>
    request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(devHeaders({ role: Role.responden, userId }))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'Pengaduan tanpa persetujuan PDP')
      .field('uraian', 'Uraian pengaduan untuk menguji penolakan persetujuan');

  it('POST /complaints tanpa persetujuan ditolak 403 dengan kode CONSENT_REQUIRED', async () => {
    const res = await kirimPengaduan();

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CONSENT_REQUIRED');
  });

  /**
   * Pesannya tetap menjelaskan APA YANG SALAH, tetapi berhenti menyuruh membuka
   * halaman -- tombol di layar yang melakukannya. Menyisakan keduanya berarti
   * menyuruh hal yang sama dua kali.
   */
  it('pesannya menjelaskan sebabnya tanpa menyuruh membuka halaman', async () => {
    const res = await kirimPengaduan();

    expect(res.body.message).toMatch(/persetujuan pemrosesan data pribadi/i);
    expect(res.body.message).not.toMatch(/buka halaman/i);
  });

  /**
   * Pasangan yang membuat kedua uji di atas berarti: akun yang SAMA, hanya
   * persetujuannya yang berbeda. Tanpa ini, "403" di atas bisa saja karena
   * sebab lain sama sekali.
   */
  it('akun yang sama LOLOS begitu persetujuannya ada', async () => {
    await prisma.user.update({ where: { id: userId }, data: { consentAt: new Date() } });

    const res = await kirimPengaduan();

    expect(res.status).toBe(201);

    await prisma.user.update({ where: { id: userId }, data: { consentAt: null } });
  });
});
