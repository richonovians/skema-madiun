import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Sampah survei (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let opdLainId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ETRASH' },
      update: {},
      create: { kode: 'E2ETRASH', nama: 'OPD E2E Sampah', isActive: true },
    });
    opdId = opd.id;

    // OPD kedua dibuat DI SINI, bukan di dalam uji kurungan, supaya
    // pembersihannya ikut `afterAll` dan tetap berjalan walau ujinya gagal di
    // tengah jalan. Versi sebelumnya membersihkan pada baris terakhir uji, dan
    // satu kegagalan meninggalkan baris yang mengunci `opd.delete` (FK
    // surveys_opd_id_fkey RESTRICT) pada seluruh jalannya berikutnya.
    const opdLain = await prisma.opd.upsert({
      where: { kode: 'E2ETRASH2' },
      update: {},
      create: { kode: 'E2ETRASH2', nama: 'OPD E2E Sampah Lain', isActive: true },
    });
    opdLainId = opdLain.id;
  }, 60000);

  afterAll(async () => {
    // DARI DAUN KE AKAR, urutan yang sama dengan `purge`. `answers.question_id`
    // RESTRICT, jadi `survey.deleteMany` sebagai langkah pertama akan gagal
    // begitu satu uji saja meninggalkan jawaban -- dan uji pemusnahan di bawah
    // memang membuatnya. Versi sebelumnya gagal diam-diam: 11 ujinya tetap
    // hijau sementara suite-nya merah dan barisnya menumpuk di basis data.
    const pemilik = { in: [opdId, opdLainId] };
    await prisma.answer.deleteMany({ where: { response: { survey: { opdId: pemilik } } } });
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId: pemilik } } });
    await prisma.questionOption.deleteMany({
      where: { question: { survey: { opdId: pemilik } } },
    });
    await prisma.question.deleteMany({ where: { survey: { opdId: pemilik } } });
    await prisma.ikmResult.deleteMany({ where: { survey: { opdId: pemilik } } });
    await prisma.survey.deleteMany({ where: { opdId: pemilik } });
    await prisma.opd.deleteMany({ where: { kode: { in: ['E2ETRASH', 'E2ETRASH2'] } } });
    await app.close();
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId });

  /** Survei yang SUDAH di sampah, ditulis langsung ke basis data. */
  const buatSurveiTerbuang = () =>
    prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei di sampah',
        periode: '2026-Q3',
        status: 'aktif',
        izinkanAnonim: true,
        deletedAt: new Date(),
      },
    });

  it('survei di sampah TIDAK muncul pada GET /surveys', async () => {
    const survei = await buatSurveiTerbuang();

    const res = await request(app.getHttpServer())
      .get('/api/v1/surveys?limit=100')
      .set(opdHeaders());

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: { id: number }) => s.id)).not.toContain(survei.id);
  });

  it('survei di sampah menjawab 404 pada GET /surveys/:id', async () => {
    const survei = await buatSurveiTerbuang();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${survei.id}`)
      .set(opdHeaders());

    expect(res.status).toBe(404);
  });

  it('QR yang beredar berhenti bekerja: /public/surveys/:id/fill -> 404', async () => {
    // Ini penjaga terpenting di berkas ini. Tanpa penyaring pada jalur publik,
    // tautan & QR yang sudah tersebar tetap menerima jawaban ke survei yang
    // sudah dibuang -- data masuk ke tempat yang tak seorang pun lihat lagi.
    const survei = await buatSurveiTerbuang();

    const res = await request(app.getHttpServer()).get(`/api/v1/public/surveys/${survei.id}/fill`);

    expect(res.status).toBe(404);
  });

  it('DELETE /surveys/:id membuang survei aktif ke sampah & menutupnya', async () => {
    const survei = await prisma.survey.create({
      data: { opdId, judul: 'Survei aktif', periode: '2026-Q3', status: 'aktif' },
    });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${survei.id}`)
      .set(opdHeaders());

    expect(res.status).toBe(200);
    const sesudah = await prisma.survey.findUnique({ where: { id: survei.id } });
    expect(sesudah?.deletedAt).not.toBeNull();
    expect(sesudah?.status).toBe('ditutup');
  });
  it('GET /surveys/trash hanya berisi yang dibuang, lengkap dengan jumlah jawaban', async () => {
    const hidup = await prisma.survey.create({
      data: { opdId, judul: 'Masih hidup', periode: '2026-Q3', status: 'draft' },
    });
    const terbuang = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Sudah dibuang',
        periode: '2026-Q3',
        status: 'ditutup',
        deletedAt: new Date(),
      },
    });

    const res = await request(app.getHttpServer()).get('/api/v1/surveys/trash').set(opdHeaders());

    expect(res.status).toBe(200);
    const ids = res.body.data.map((s: { id: number }) => s.id);
    expect(ids).toContain(terbuang.id);
    expect(ids).not.toContain(hidup.id);
    const baris = res.body.data.find((s: { id: number }) => s.id === terbuang.id);
    expect(baris).toMatchObject({ judul: 'Sudah dibuang', jumlahJawaban: 0 });
    expect(baris.opdNama).toBe('OPD E2E Sampah');
  });

  it('Admin OPD tidak melihat sampah milik OPD lain', async () => {
    const punyaOrangLain = await prisma.survey.create({
      data: {
        opdId: opdLainId,
        judul: 'Bukan milik saya',
        periode: '2026-Q3',
        status: 'draft',
        deletedAt: new Date(),
      },
    });

    const res = await request(app.getHttpServer()).get('/api/v1/surveys/trash').set(opdHeaders());

    expect(res.body.data.map((s: { id: number }) => s.id)).not.toContain(punyaOrangLain.id);
  });
  it('POST /surveys/:id/restore mengembalikan survei dari sampah tanpa mengubah statusnya', async () => {
    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Akan dipulihkan',
        periode: '2026-Q3',
        status: 'ditutup',
        deletedAt: new Date(),
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${survei.id}/restore`)
      .set(opdHeaders());

    expect(res.status).toBe(201);
    const sesudah = await prisma.survey.findUnique({ where: { id: survei.id } });
    expect(sesudah?.deletedAt).toBeNull();
    expect(sesudah?.deletedById).toBeNull();
    // Statusnya TIDAK dikembalikan ke aktif: survei yang dibuang dalam keadaan
    // aktif memang ditutup saat dibuang, dan membukanya kembali adalah
    // keputusan tersendiri yang punya tombolnya sendiri.
    expect(sesudah?.status).toBe('ditutup');
  });

  it('memulihkan survei yang tidak di sampah -> 400', async () => {
    const survei = await prisma.survey.create({
      data: { opdId, judul: 'Tidak di sampah', periode: '2026-Q3', status: 'draft' },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${survei.id}/restore`)
      .set(opdHeaders());

    expect(res.status).toBe(400);
  });
  it('DELETE /surveys/:id/purge memusnahkan survei beserta jawabannya', async () => {
    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Akan dimusnahkan',
        periode: '2026-Q3',
        status: 'ditutup',
        deletedAt: new Date(),
        questions: {
          create: [
            { teks: 'Persyaratan', tipe: 'skala', isIkmUnsur: true, kodeUnsur: 'U1', urutan: 1 },
          ],
        },
      },
      include: { questions: true },
    });
    const respons = await prisma.surveyResponse.create({
      data: {
        surveyId: survei.id,
        answers: { create: [{ questionId: survei.questions[0].id, nilai: 4 }] },
      },
    });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${survei.id}/purge`)
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);
    expect(await prisma.survey.findUnique({ where: { id: survei.id } })).toBeNull();
    expect(await prisma.surveyResponse.findUnique({ where: { id: respons.id } })).toBeNull();
    expect(await prisma.answer.count({ where: { responseId: respons.id } })).toBe(0);
  });

  it('Admin OPD tidak boleh memusnahkan -> 403', async () => {
    // Pemusnahan tak dapat dibatalkan, jadi ia dipegang satu peran saja.
    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Bukan hak OPD',
        periode: '2026-Q3',
        status: 'draft',
        deletedAt: new Date(),
      },
    });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${survei.id}/purge`)
      .set(opdHeaders());

    expect(res.status).toBe(403);
    expect(await prisma.survey.findUnique({ where: { id: survei.id } })).not.toBeNull();
  });

  it('memusnahkan survei yang belum di sampah -> 400', async () => {
    const survei = await prisma.survey.create({
      data: { opdId, judul: 'Masih di daftar utama', periode: '2026-Q3', status: 'draft' },
    });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${survei.id}/purge`)
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(400);
  });
});
