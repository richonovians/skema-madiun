import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * Survei utama per OPD (15 September 2026).
 *
 * Satu OPD boleh menunjuk paling banyak SATU survei utama, dan tombol "Lanjut
 * Isi Survei" pada halaman sukses pengaduan mengarah ke sana. Batas "paling
 * banyak satu" ditegakkan indeks unik parsial di basis data, bukan hanya oleh
 * logika service -- lihat uji "indeks basis data" di bawah, yang sengaja
 * melewati service dan menulis langsung.
 */
describe('Survei utama per OPD (e2e)', () => {
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
      where: { kode: 'E2EUTAMA' },
      update: {},
      create: { kode: 'E2EUTAMA', nama: 'OPD E2E Survei Utama', isActive: true },
    });
    opdId = opd.id;

    const opdLain = await prisma.opd.upsert({
      where: { kode: 'E2EUTAMA2' },
      update: {},
      create: { kode: 'E2EUTAMA2', nama: 'OPD E2E Survei Utama Lain', isActive: true },
    });
    opdLainId = opdLain.id;
  }, 60000);

  afterEach(async () => {
    // Tiap uji menyisakan surveinya sendiri, dan indeks uniknya membuat sisa
    // itu MENGUBAH hasil uji berikutnya -- survei utama yang tertinggal
    // menolak survei utama baru. Dibersihkan per uji, bukan per suite.
    const pemilik = { in: [opdId, opdLainId] };
    await prisma.survey.deleteMany({ where: { opdId: pemilik } });
  });

  afterAll(async () => {
    // Dari daun ke akar, urutan yang sama dengan `purge`: answers.question_id
    // RESTRICT membuat penghapusan survei lebih dulu gagal begitu ada jawaban.
    const pemilik = { in: [opdId, opdLainId] };
    await prisma.answer.deleteMany({ where: { response: { survey: { opdId: pemilik } } } });
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId: pemilik } } });
    await prisma.questionOption.deleteMany({ where: { question: { survey: { opdId: pemilik } } } });
    await prisma.question.deleteMany({ where: { survey: { opdId: pemilik } } });
    await prisma.ikmResult.deleteMany({ where: { survey: { opdId: pemilik } } });
    await prisma.survey.deleteMany({ where: { opdId: pemilik } });
    await prisma.opd.deleteMany({ where: { kode: { in: ['E2EUTAMA', 'E2EUTAMA2'] } } });
    await app.close();
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId });

  const buatSurvei = (judul: string, ekstra: Record<string, unknown> = {}) =>
    prisma.survey.create({
      data: { opdId, judul, periode: '2026-Q3', status: 'aktif', ...ekstra },
    });

  it('survei baru tidak otomatis menjadi survei utama', async () => {
    const survei = await buatSurvei('Survei biasa');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${survei.id}`)
      .set(opdHeaders())
      .expect(200);

    expect(res.body.data.isUtama).toBe(false);
  });

  it('PATCH /surveys/:id menjadikan survei sebagai survei utama', async () => {
    const survei = await buatSurvei('Calon survei utama');

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${survei.id}`)
      .set(opdHeaders())
      .send({ isUtama: true })
      .expect(200);

    expect(res.body.data.isUtama).toBe(true);
  });

  /**
   * Inti fiturnya. Menunjuk survei utama yang baru harus MELEPAS yang lama
   * dengan sendirinya -- kalau admin dipaksa mematikan yang lama dulu, ada
   * jeda saat OPD itu tak punya survei utama sama sekali, dan tombol "Lanjut
   * Isi Survei" jatuh ke daftar justru di sela itu.
   */
  it('menunjuk survei utama baru melepas survei utama sebelumnya', async () => {
    const lama = await buatSurvei('Survei utama lama');
    const baru = await buatSurvei('Survei utama baru');

    await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${lama.id}`)
      .set(opdHeaders())
      .send({ isUtama: true })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${baru.id}`)
      .set(opdHeaders())
      .send({ isUtama: true })
      .expect(200);

    const sesudah = await prisma.survey.findMany({
      where: { opdId },
      select: { id: true, isUtama: true },
    });
    expect(sesudah.filter((s) => s.isUtama).map((s) => s.id)).toEqual([baru.id]);
  });

  /**
   * INDEKS BASIS DATA, bukan logika service. Ditulis langsung lewat Prisma
   * supaya transaksi di service tak ikut campur: kalau batas itu hanya hidup di
   * service, penulisan apa pun dari luar jalur itu -- skrip pemeliharaan,
   * migrasi data, atau service yang kelak diubah -- bisa menanam dua survei
   * utama tanpa satu pun yang mencegah.
   */
  it('indeks basis data menolak dua survei utama pada satu OPD', async () => {
    await buatSurvei('Utama pertama', { isUtama: true });

    await expect(buatSurvei('Utama kedua', { isUtama: true })).rejects.toThrow();
  });

  /**
   * PASANGAN kontrol untuk indeks di atas. Tanpa `WHERE deleted_at IS NULL`,
   * survei utama yang sudah dibuang ke Sampah akan terus mengunci OPD-nya:
   * membuang survei utama lalu menunjuk yang baru adalah urutan yang paling
   * wajar dilakukan admin, dan justru itu yang akan gagal.
   */
  it('survei utama yang ada di Sampah tidak mengunci penunjukan baru', async () => {
    await buatSurvei('Utama yang dibuang', { isUtama: true, deletedAt: new Date() });

    await expect(buatSurvei('Utama pengganti', { isUtama: true })).resolves.toBeDefined();
  });

  it('dua OPD boleh punya survei utama masing-masing', async () => {
    await buatSurvei('Utama OPD A', { isUtama: true });

    const utamaB = await prisma.survey.create({
      data: {
        opdId: opdLainId,
        judul: 'Utama OPD B',
        periode: '2026-Q3',
        status: 'aktif',
        isUtama: true,
      },
    });

    expect(utamaB.isUtama).toBe(true);
  });

  /**
   * Halaman sukses pengaduan membaca penanda ini dari daftar survei aktif --
   * tanpa endpoint baru. Kalau penandanya tidak ikut terbawa di sini, tombolnya
   * tak punya cara mengenali survei utama dan selamanya jatuh ke daftar.
   */
  it('GET /surveys/active membawa penanda survei utama', async () => {
    const utama = await buatSurvei('Utama yang aktif', { isUtama: true });
    await buatSurvei('Bukan utama');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/active?opdId=${opdId}&limit=100`)
      .set(devHeaders({ role: Role.responden }))
      .expect(200);

    const utamaDiDaftar = res.body.data.filter(
      (s: { isUtama: boolean; id: number }) => s.isUtama === true,
    );
    expect(utamaDiDaftar.map((s: { id: number }) => s.id)).toEqual([utama.id]);
  });
});
