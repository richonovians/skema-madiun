import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * Daftar survei aktif tidak lagi memuat survei yang sudah diisi penggunanya
 * (30 Oktober 2026, permintaan pengguna).
 *
 * Penyaringnya di basis data, bukan di klien: widget dashboard hanya meminta
 * `limit: 2`, jadi saringan di klien akan menyisakan kartu kosong padahal masih
 * ada survei yang belum diisi, dan `meta.pagination.total` ikut salah.
 *
 * Survei yang mengizinkan pengisian berulang TETAP tampil -- ia memang boleh
 * diisi lagi. Respons dibuat langsung lewat Prisma dengan `dedupeUserId` yang
 * sama seperti ResponsesService mengisinya.
 */
describe('GET /surveys/active -- survei yang sudah diisi (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let pengisiId: number;
  let lainId: number;
  let tunggalId: number;
  let berulangId: number;

  const SUBJEK = ['e2e-aktif-diisi-1', 'e2e-aktif-diisi-2'];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EAKDI' },
      update: {},
      create: { kode: 'E2EAKDI', nama: 'OPD E2E Aktif Diisi', isActive: true },
    });
    opdId = opd.id;

    const [u1, u2] = await Promise.all(
      SUBJEK.map((ssoSubject) =>
        prisma.user.upsert({
          where: { ssoSubject },
          update: {},
          create: {
            ssoSubject,
            nama: ssoSubject,
            email: `${ssoSubject}@example.go.id`,
            roles: [Role.responden],
          },
        }),
      ),
    );
    pengisiId = u1.id;
    lainId = u2.id;

    tunggalId = (
      await prisma.survey.create({
        data: { opdId, judul: 'Aktif Sekali Isi', periode: '2026-Q4', status: SurveyStatus.aktif },
      })
    ).id;
    berulangId = (
      await prisma.survey.create({
        data: {
          opdId,
          judul: 'Aktif Boleh Berulang',
          periode: '2026-Q4',
          status: SurveyStatus.aktif,
          allowMultipleSubmit: true,
        },
      })
    ).id;
  }, 60000);

  afterAll(async () => {
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.user.deleteMany({ where: { ssoSubject: { in: SUBJEK } } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EAKDI' } });
    await app.close();
  }, 30000);

  const daftar = async (userId: number) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/active?opdId=${opdId}`)
      .set(devHeaders({ role: Role.responden, userId }));
    expect(res.status).toBe(200);
    return {
      ids: res.body.data.map((s: { id: number }) => s.id).sort(),
      total: res.body.meta.pagination.total,
    };
  };

  it('KONTROL: sebelum diisi, kedua survei tampil', async () => {
    expect(await daftar(pengisiId)).toEqual({ ids: [tunggalId, berulangId].sort(), total: 2 });
  });

  describe('sesudah pengguna mengisi keduanya', () => {
    beforeAll(async () => {
      // Sekali isi: dedupeUserId = userId. Berulang: dedupeUserId null
      // (ResponsesService.submit).
      await prisma.surveyResponse.create({
        data: { surveyId: tunggalId, userId: pengisiId, dedupeUserId: pengisiId },
      });
      await prisma.surveyResponse.create({
        data: { surveyId: berulangId, userId: pengisiId, dedupeUserId: null },
      });
    });

    it('survei sekali isi hilang dari daftarnya, dan total ikut berkurang', async () => {
      expect(await daftar(pengisiId)).toEqual({ ids: [berulangId], total: 1 });
    });

    it('pengguna lain tetap melihat survei sekali isi itu', async () => {
      expect(await daftar(lainId)).toEqual({ ids: [tunggalId, berulangId].sort(), total: 2 });
    });
  });
});
