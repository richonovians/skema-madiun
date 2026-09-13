import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuestionType, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { bersihkanNotifikasiSurvei } from './helpers/notifikasi.helper';

/**
 * Bukti DECISIF untuk `@Public()` pada endpoint pengisian survei anonim.
 *
 * Mengapa berkas terpisah: seluruh e2e lain berjalan di bawah StubAuthProvider
 * (NODE_ENV=test), dan provider itu MEMPERLAKUKAN permintaan tanpa header
 * x-dev-* sebagai `kabupaten` (stub-auth.provider.ts:24). Di lingkungan itu
 * SEMUA endpoint menjawab 200 tanpa kredensial, sehingga uji "endpoint publik
 * bisa diakses tanpa sesi" tak membuktikan apa pun -- yang berpenjaga pun bisa.
 *
 * Berkas ini memaksa NODE_ENV='development' supaya SessionAuthProvider yang
 * SUNGGUHAN aktif (pola sama session-auth.e2e-spec.ts), lalu memeriksa PASANGAN
 * yang benar-benar membedakan: yang publik lolos, yang berpenjaga 401.
 */
describe('Public Surveys dengan SessionAuthProvider aktif (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let surveiAnonimId: number;
  let qSkala: number;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development'; // paksa binding AUTH_PROVIDER -> SessionAuthProvider

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EPUBS' },
      update: {},
      create: { kode: 'E2EPUBS', nama: 'OPD E2E Publik Sesi', isActive: true },
    });
    opdId = opd.id;

    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'SKM Loket (anonim, sesi) E2E',
        periode: '2026-Q3',
        status: SurveyStatus.aktif,
        izinkanAnonim: true,
        questions: {
          create: [
            { teks: 'Kepuasan layanan', tipe: QuestionType.skala, urutan: 1, isIkmUnsur: true },
          ],
        },
      },
      include: { questions: true },
    });
    surveiAnonimId = survei.id;
    qSkala = survei.questions[0].id;
  }, 60000);

  afterAll(async () => {
    // Penjaga sama seperti public-surveys.e2e-spec.ts: jangan menutupi galat
    // beforeAll dengan TypeError dari pembersihan.
    if (!prisma) {
      await app?.close();
      process.env.NODE_ENV = originalNodeEnv;
      return;
    }
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    // Notifikasi jawaban survei menyasar akun kabupaten & superuser SUNGGUHAN
    // di basis data lokal, jadi pembersihannya tak bisa ikut penghapusan akun uji.
    await bersihkanNotifikasiSurvei(prisma, opdId);
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EPUBS' } });
    await app.close();
    process.env.NODE_ENV = originalNodeEnv;
  }, 30000);

  it('GET /public/surveys/:id/fill tanpa kredensial apa pun -> 200', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/public/surveys/${surveiAnonimId}/fill`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(surveiAnonimId);
  });

  it('KONTROL: GET /surveys/:id/fill tanpa kredensial -> 401', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/surveys/${surveiAnonimId}/fill`);

    // Inilah pasangan yang membuat uji di atas berarti: gerbang yang sudah ada
    // TIDAK ikut longgar oleh penambahan jalur publik.
    expect(res.status).toBe(401);
  });

  it('POST /public/surveys/:id/responses tanpa kredensial -> 201, userId null', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      // `setuju` wajib sejak 8 September 2026 (persetujuan UU PDP). Yang diuji
      // berkas ini tetap sama: rute publik tak menuntut KREDENSIAL, dan itu
      // tidak sama dengan tak menuntut persetujuan.
      .send({ answers: [{ questionId: qSkala, nilai: 4 }], setuju: true });

    expect(res.status).toBe(201);
    const tersimpan = await prisma.surveyResponse.findUnique({ where: { id: res.body.data.id } });
    expect(tersimpan?.userId).toBeNull();
    expect(tersimpan?.consentAt).toBeInstanceOf(Date);
  });

  it('KONTROL: POST /surveys/:id/responses tanpa kredensial -> 401', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveiAnonimId}/responses`)
      .send({ answers: [{ questionId: qSkala, nilai: 4 }] });

    expect(res.status).toBe(401);
  });

  it('header x-dev-role TIDAK berpengaruh di sini (provider sungguhan aktif)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveiAnonimId}/fill`)
      .set('x-dev-role', 'kabupaten');

    // Kalau ini 200, berarti berkas ini diam-diam berjalan di bawah
    // StubAuthProvider dan seluruh kontrol di atas kehilangan artinya.
    expect(res.status).toBe(401);
  });
});
