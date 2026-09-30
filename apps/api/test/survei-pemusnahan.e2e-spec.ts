import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { SurveiPemusnahanService } from '../src/modules/surveys/survei-pemusnahan.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * PEMUSNAHAN OTOMATIS SAMPAH SURVEI terhadap basis data sungguhan
 * (30 September 2026).
 *
 * BERKAS TERPISAH dari surveys-trash.e2e-spec.ts, dan itu perlu: ConfigModule
 * memotret `process.env` sekali lalu memakai `cache: true`, jadi umur Sampah
 * harus disetel SEBELUM modulnya dirakit. Menyetelnya di berkas itu akan
 * mengubah jawaban `GET /surveys/trash/retensi` yang di sana diuji bernilai
 * baku 365.
 */
const PEMUSNAHAN_UJI_HARI = 3650;

/**
 * Jauh lebih tua daripada seluruh data yang mungkin ada di basis data ini.
 *
 * ANGKA JANGGAL INI JUSTRU INTINYA, dan ia ditulis dari pengalaman yang mahal.
 * `pangkas()` bekerja pada SELURUH tabel -- ia tak punya, dan tak boleh punya,
 * saringan "hanya survei milik uji ini". Dengan umur wajar seperti 365 hari,
 * uji ini akan memusnahkan setiap survei di Sampah basis data pengembangan yang
 * lebih tua dari setahun, tanpa satu pun cara memulihkannya. Kesalahan persis
 * seperti itu sudah pernah terjadi sekali di repo ini pada retensi log audit,
 * dan menghapus 5.857 baris.
 *
 * Dengan batas sepuluh tahun dan tanggal 2015, satu-satunya survei yang
 * memenuhi syarat adalah yang dibuat uji ini sendiri: proyek ini tak punya data
 * sebelum 2026. Yang diuji tetap utuh -- kueri sungguhan, batas `lt`, saringan
 * "tanpa respons", dan pemusnahan berantainya.
 */
const TANGGAL_PURBA = new Date('2015-01-01T00:00:00.000Z');

describe('Pemusnahan otomatis Sampah survei (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pemusnahan: SurveiPemusnahanService;
  let opdId: number;
  const envAsli = { ...process.env };

  beforeAll(async () => {
    // WAJIB sebelum compile: lihat alasannya pada komentar berkas di atas.
    process.env.SURVEY_PURGE_DAYS = String(PEMUSNAHAN_UJI_HARI);
    process.env.SURVEY_PURGE_ENABLED = 'true';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    pemusnahan = app.get(SurveiPemusnahanService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EPURGE' },
      update: {},
      create: { kode: 'E2EPURGE', nama: 'OPD E2E Pemusnahan', isActive: true },
    });
    opdId = opd.id;
  }, 60000);

  afterAll(async () => {
    // DARI DAUN KE AKAR, urutan yang sama dengan pemusnahannya sendiri.
    await prisma.answer.deleteMany({ where: { response: { survey: { opdId } } } });
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.questionOption.deleteMany({ where: { question: { survey: { opdId } } } });
    await prisma.question.deleteMany({ where: { survey: { opdId } } });
    await prisma.ikmResult.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EPURGE' } });
    process.env = envAsli;
    await app.close();
  }, 30000);

  const buatSurveiPurba = (judul: string) =>
    prisma.survey.create({
      data: {
        opdId,
        judul,
        periode: '2015-Q1',
        status: 'ditutup',
        deletedAt: TANGGAL_PURBA,
      },
    });

  it('memusnahkan survei TANPA respons yang sudah lewat umur', async () => {
    const survei = await buatSurveiPurba('Purba tanpa respons');

    const hasil = await pemusnahan.pangkas();

    expect(hasil).toMatchObject({
      dijalankan: true,
      kering: false,
      hari: PEMUSNAHAN_UJI_HARI,
    });
    expect(await prisma.survey.findUnique({ where: { id: survei.id } })).toBeNull();
  });

  it('TIDAK menyentuh survei berespons, betapapun tuanya', async () => {
    // Sifat terpenting fitur ini, dan satu-satunya yang melindungi hasil
    // pengukuran IKM dari lenyap tanpa ada manusia yang memutuskannya.
    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Purba TAPI sudah dijawab warga',
        periode: '2015-Q1',
        status: 'ditutup',
        deletedAt: TANGGAL_PURBA,
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

    await pemusnahan.pangkas();

    expect(await prisma.survey.findUnique({ where: { id: survei.id } })).not.toBeNull();
    expect(await prisma.surveyResponse.findUnique({ where: { id: respons.id } })).not.toBeNull();
  });

  it('TIDAK menyentuh survei yang baru dibuang ke Sampah', async () => {
    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Baru dibuang kemarin',
        periode: '2026-Q3',
        status: 'draft',
        deletedAt: new Date(),
      },
    });

    await pemusnahan.pangkas();

    expect(await prisma.survey.findUnique({ where: { id: survei.id } })).not.toBeNull();
  });

  it('TIDAK menyentuh survei yang masih hidup di daftar utama', async () => {
    // `deletedAt` null berarti bukan penghuni Sampah sama sekali. Saringan umur
    // saja tak cukup menjaganya: `null < batas` bukan true, tapi mengandalkan
    // sifat SQL yang tak ditulis tersurat adalah ketergantungan yang diam.
    const survei = await prisma.survey.create({
      data: { opdId, judul: 'Masih hidup', periode: '2026-Q3', status: 'aktif' },
    });

    await pemusnahan.pangkas();

    expect(await prisma.survey.findUnique({ where: { id: survei.id } })).not.toBeNull();
  });

  it('mode kering MENGHITUNG tanpa memusnahkan', async () => {
    const survei = await buatSurveiPurba('Purba untuk mode kering');

    const hasil = await pemusnahan.pangkas({ kering: true });

    expect(hasil).toMatchObject({ dijalankan: true, kering: true });
    expect((hasil as { jumlah: number }).jumlah).toBeGreaterThanOrEqual(1);
    expect(await prisma.survey.findUnique({ where: { id: survei.id } })).not.toBeNull();
  });

  it('GET /surveys/trash/retensi memantulkan nilai env, bukan angka tertulis mati', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/surveys/trash/retensi')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ hari: PEMUSNAHAN_UJI_HARI });
  });
});
