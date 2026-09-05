import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuestionType, Role, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * Pengisian survei TANPA sesi lewat `/public/surveys/*`.
 *
 * Yang dibuktikan DI SINI adalah GERBANG ISI-nya: kedua endpoint menolak 404
 * kecuali survei berstatus aktif DAN `izinkanAnonim`, dan validasi jawaban tak
 * ikut longgar. Setiap penolakan dipasangkan dengan kasus yang benar-benar
 * lolos -- gerbang yang tak pernah terbukti terbuka tak membuktikan apa pun.
 *
 * Yang TIDAK dapat dibuktikan di sini adalah `@Public()` itu sendiri: seluruh
 * e2e berjalan di bawah StubAuthProvider, yang memperlakukan permintaan tanpa
 * header sebagai `kabupaten`, sehingga di lingkungan ini semua endpoint terbuka.
 * Buktinya ada di public-surveys-session.e2e-spec.ts -- lihat catatan panjang
 * pada uji terakhir berkas ini.
 */
describe('Public Surveys (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let respondenId: number;
  let surveiAnonimId: number; // aktif + izinkanAnonim
  let surveiBiasaId: number; // aktif, TANPA izinkanAnonim
  let surveiDraftAnonimId: number; // izinkanAnonim tapi masih draft
  let qSkala: number;
  let qTeks: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EPUB' },
      update: {},
      create: { kode: 'E2EPUB', nama: 'OPD E2E Publik', isActive: true },
    });
    opdId = opd.id;

    const responden = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-pub-resp-1' },
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-pub-resp-1',
        nama: 'Responden E2E Publik',
        email: 'e2e-pub-resp-1@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    respondenId = responden.id;

    const surveiAnonim = await prisma.survey.create({
      data: {
        opdId,
        judul: 'SKM Loket (anonim) E2E',
        periode: '2026-Q3',
        status: SurveyStatus.aktif,
        izinkanAnonim: true,
        questions: {
          create: [
            { teks: 'Kepuasan layanan', tipe: QuestionType.skala, urutan: 1, isIkmUnsur: true },
            { teks: 'Saran', tipe: QuestionType.teks, urutan: 2 },
          ],
        },
      },
      include: { questions: { orderBy: { urutan: 'asc' } } },
    });
    surveiAnonimId = surveiAnonim.id;
    qSkala = surveiAnonim.questions[0].id;
    qTeks = surveiAnonim.questions[1].id;

    const surveiBiasa = await prisma.survey.create({
      data: {
        opdId,
        judul: 'SKM Berpenjaga E2E',
        periode: '2026-Q3',
        status: SurveyStatus.aktif,
        questions: {
          create: [{ teks: 'Kepuasan layanan', tipe: QuestionType.skala, urutan: 1 }],
        },
      },
    });
    surveiBiasaId = surveiBiasa.id;

    const surveiDraft = await prisma.survey.create({
      data: {
        opdId,
        judul: 'SKM Anonim Masih Draft E2E',
        periode: '2026-Q3',
        status: SurveyStatus.draft,
        izinkanAnonim: true,
        questions: {
          create: [{ teks: 'Kepuasan layanan', tipe: QuestionType.skala, urutan: 1 }],
        },
      },
    });
    surveiDraftAnonimId = surveiDraft.id;
    // 60s, bukan 30s (pola sama session-auth.e2e-spec.ts): kompilasi AppModule
    // dapat melewati 30 detik bila server dev ikut berjalan di mesin yang sama,
    // dan hook yang kehabisan waktu menggagalkan SELURUH suite tanpa sebab yang
    // berhubungan dengan yang diuji.
  }, 60000);

  afterAll(async () => {
    // Penjaga: bila beforeAll gagal (mis. kehabisan waktu), `prisma` masih
    // undefined dan pembersihan ini akan melempar TypeError yang MENUTUPI
    // pesan galat aslinya -- itu sempat terjadi dan memakan waktu diagnosis.
    if (!prisma) {
      await app?.close();
      return;
    }
    // Respons dulu (cascade ke answers); tanpa itu penghapusan survey terganjal
    // RESTRICT answers_question_id_fkey — pola sama responses.e2e-spec.ts.
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.user.deleteMany({ where: { ssoSubject: 'e2e-pub-resp-1' } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EPUB' } });
    await app.close();
  }, 30000);

  it('GET /public/surveys/:id/fill TANPA autentikasi apa pun -> 200', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/public/surveys/${surveiAnonimId}/fill`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(surveiAnonimId);
    expect(res.body.data.questions).toHaveLength(2);
    // Tanpa sesi tak ada pegangan anti-duplikat.
    expect(res.body.data.sudahMengisi).toBe(false);
  });

  it('GET /public/surveys/:id/fill pada survei TANPA izinkanAnonim -> 404 (bukan 403)', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/public/surveys/${surveiBiasaId}/fill`,
    );

    // 404, bukan 403: keberadaan survei yang tak boleh diisi tak dibocorkan.
    expect(res.status).toBe(404);
  });

  it('GET /public/surveys/:id/fill pada survei anonim yang masih draft -> 404', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/public/surveys/${surveiDraftAnonimId}/fill`,
    );

    expect(res.status).toBe(404);
  });

  it('POST /public/surveys/:id/responses tanpa sesi -> 201, tersimpan userId null', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'Bagus' },
        ],
      });

    expect(res.status).toBe(201);
    // Entity respons memang tak pernah memuat identitas pengisi.
    expect(Object.keys(res.body.data)).not.toContain('userId');

    const tersimpan = await prisma.surveyResponse.findUnique({
      where: { id: res.body.data.id },
    });
    expect(tersimpan?.userId).toBeNull();
    expect(tersimpan?.dedupeUserId).toBeNull();
    // Bagian 6 (persetujuan UU PDP) belum diaktifkan — kolomnya disiapkan, tak diisi.
    expect(tersimpan?.consentAt).toBeNull();
  });

  it('POST /public/surveys/:id/responses pada survei TANPA izinkanAnonim -> 404', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiBiasaId}/responses`)
      .send({ answers: [{ questionId: qSkala, nilai: 4 }] });

    expect(res.status).toBe(404);
  });

  it('POST /public/surveys/:id/responses dengan jawaban tak lengkap -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({ answers: [{ questionId: qTeks, teks: 'tanpa skala' }] });

    // Membuka jalur publik tidak melonggarkan validasi isi jawaban.
    expect(res.status).toBe(400);
  });

  /**
   * CATATAN LINGKUNGAN, bukan kelonggaran.
   *
   * Versi pertama berkas ini memasang kontrol "endpoint berpenjaga -> 401 tanpa
   * sesi" dan kontrol itu GAGAL: menerima 200. Sebabnya bukan lubang keamanan,
   * melainkan StubAuthProvider yang dipakai seluruh e2e (NODE_ENV=test)
   * MEMPERLAKUKAN permintaan tanpa header x-dev-* sebagai `kabupaten`
   * (stub-auth.provider.ts:24). Jadi di lingkungan ini "tanpa sesi" tak punya
   * arti, dan tak ada gerbang yang bisa dibuktikan tertutup.
   *
   * Fakta itu direkam sebagai uji supaya tak ada yang menambahkan kembali
   * kontrol 401 yang mustahil lulus di sini lalu menyangka menemukan lubang.
   * Bukti sesungguhnya bahwa `@Public()` bekerja DAN gerbang lama tetap 401 ada
   * di public-surveys-session.e2e-spec.ts, yang memaksa SessionAuthProvider
   * aktif. Di produksi hanya provider itu yang dipakai (auth.module.ts).
   */
  it('lingkungan: mode test memperlakukan permintaan tanpa header sebagai kabupaten', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/surveys/${surveiAnonimId}/fill`);

    expect(res.status).toBe(200); // BUKAN 401 -- lihat catatan di atas
  });

  it('KONTROL: endpoint berpenjaga tetap berfungsi bagi responden bersesi', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveiAnonimId}/fill`)
      .set(devHeaders({ role: Role.responden, userId: respondenId }));

    expect(res.status).toBe(200);
  });

  it('respons anonim IKUT terhitung dalam IKM survei', async () => {
    const sebelum = await prisma.surveyResponse.count({ where: { surveyId: surveiAnonimId } });

    const kirim = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({ answers: [{ questionId: qSkala, nilai: 4 }] });
    expect(kirim.status).toBe(201);

    const sesudah = await prisma.surveyResponse.count({ where: { surveyId: surveiAnonimId } });
    expect(sesudah).toBe(sebelum + 1);

    const dilihatAdmin = await request(app.getHttpServer())
      .get(`/api/v1/surveys?limit=100`)
      .set(devHeaders({ role: Role.kabupaten }));

    expect(dilihatAdmin.status).toBe(200);
    const baris = (
      dilihatAdmin.body.data as {
        id: number;
        izinkanAnonim: boolean;
        respondentsCount: number;
        nilaiIkm: number | null;
      }[]
    ).find((sv) => sv.id === surveiAnonimId);

    expect(baris?.izinkanAnonim).toBe(true);
    // Kriteria terima spec: respons anonim IKUT dalam perhitungan IKM, bukan
    // hanya tersimpan. `respondentsCount` & `nilaiIkm` dihitung IkmService dari
    // jawaban tanpa menyaring userId -- inilah yang membuktikannya.
    expect(baris?.respondentsCount).toBe(sesudah);
    expect(typeof baris?.nilaiIkm).toBe('number');
  });
});
