import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuestionType, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { TurnstileService } from '../src/modules/turnstile/turnstile.service';
import { bersihkanNotifikasiSurvei } from './helpers/notifikasi.helper';

/**
 * Gerbang captcha pada pengisian survei TANPA sesi (14 September 2026).
 *
 * Jalur inilah satu-satunya yang terbuka tanpa akun, dan satu-satunya yang
 * dapat menggeser nilai IKM: `submitPublic` menulis `dedupeUserId: null`,
 * sedangkan Postgres memperlakukan NULL sebagai selalu berbeda -- jadi
 * `@@unique([surveyId, dedupeUserId])` tak membatasi apa pun di sini.
 *
 * TurnstileService DIGANTI tiruan, bukan dipanggil sungguhan: uji yang
 * menghubungi Cloudflare akan gagal di mesin tanpa internet dan lambat di mesin
 * yang punya. Yang diuji di sini adalah GERBANGNYA -- apakah jawaban "tidak
 * sah" benar-benar menahan penyimpanan. Perilaku verifikasinya sendiri diuji
 * terpisah di turnstile.service.spec.ts.
 */
describe('Captcha pada survei jalur publik (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let surveiId: number;
  let qSkala: number;

  // Dapat diubah tiap uji: satu aplikasi, dua perilaku.
  let tokenDianggapSah = true;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TurnstileService)
      .useValue({ verifikasi: () => Promise.resolve(tokenDianggapSah) })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ECAP' },
      update: {},
      create: { kode: 'E2ECAP', nama: 'OPD E2E Captcha', isActive: true },
    });
    opdId = opd.id;

    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'SKM Captcha E2E',
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
    surveiId = survei.id;
    qSkala = survei.questions[0].id;
  }, 30000);

  afterAll(async () => {
    await bersihkanNotifikasiSurvei(prisma, opdId);
    await prisma.answer.deleteMany({ where: { response: { surveyId: surveiId } } });
    await prisma.surveyResponse.deleteMany({ where: { surveyId: surveiId } });
    await prisma.question.deleteMany({ where: { surveyId: surveiId } });
    await prisma.survey.deleteMany({ where: { id: surveiId } });
    await prisma.opd.deleteMany({ where: { kode: 'E2ECAP' } });
    await app.close();
  }, 30000);

  const kirim = (captchaToken?: string) =>
    request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiId}/responses`)
      .send({
        setuju: true,
        tanpaDataDiri: true,
        ...(captchaToken === undefined ? {} : { captchaToken }),
        answers: [{ questionId: qSkala, nilai: 4 }],
      });

  const jumlahRespons = () => prisma.surveyResponse.count({ where: { surveyId: surveiId } });

  it('token yang dinilai tidak sah ditolak, dan TIDAK ada respons tersimpan', async () => {
    tokenDianggapSah = false;
    const sebelum = await jumlahRespons();

    const res = await kirim('token-karangan');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CAPTCHA_TIDAK_SAH');
    // Inti ujinya. Penolakan yang tetap menulis barisnya bukan gerbang sama
    // sekali -- ia hanya pesan galat di atas data yang telanjur masuk.
    expect(await jumlahRespons()).toBe(sebelum);
  });

  it('tanpa token sama sekali juga ditolak', async () => {
    tokenDianggapSah = false;

    const res = await kirim(undefined);

    expect(res.status).toBe(403);
  });

  /**
   * PASANGAN yang membuat kedua uji di atas berarti. Gerbang yang menolak
   * SEMUANYA juga akan meluluskan keduanya, sekaligus menutup survei bagi
   * seluruh warga.
   */
  it('token yang dinilai sah tetap diterima dan tersimpan', async () => {
    tokenDianggapSah = true;
    const sebelum = await jumlahRespons();

    const res = await kirim('token-sah');

    expect(res.status).toBe(201);
    expect(await jumlahRespons()).toBe(sebelum + 1);
  });
});
