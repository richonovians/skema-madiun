import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Questions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let surveyId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EQ' },
      update: {},
      create: { kode: 'E2EQ', nama: 'OPD E2E Questions', isActive: true },
    });
    opdId = opd.id;
    const survey = await prisma.survey.create({
      data: { opdId, judul: 'Survei Pertanyaan', periode: '2026-Q1' },
    });
    surveyId = survey.id;
  }, 60000);

  afterAll(async () => {
    // DARI DAUN KE AKAR. `answers.question_id` RESTRICT, jadi menghapus survei
    // lebih dulu gagal begitu satu uji meninggalkan jawaban -- dan uji aturan
    // ubah di bawah memang membuatnya.
    await prisma.answer.deleteMany({ where: { response: { survey: { opdId } } } });
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.questionOption.deleteMany({ where: { question: { survey: { opdId } } } });
    await prisma.question.deleteMany({ where: { survey: { opdId } } });
    await prisma.ikmResult.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EQ' } });
    await app.close();
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId });

  it('POST question skala -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({ teks: 'Bagaimana pelayanannya?', tipe: 'skala' });
    expect(res.status).toBe(201);
    expect(res.body.data.tipe).toBe('skala');
    expect(res.body.data.urutan).toBeGreaterThan(0);
  });

  it('POST question pilihan tanpa opsi -> 400 (minimal 2 opsi)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({ teks: 'Pilih salah satu', tipe: 'pilihan' });
    expect(res.status).toBe(400);
  });

  it('POST question pilihan dengan opsi -> 201, opsi tersimpan terurut', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({
        teks: 'Bagaimana kepuasan Anda?',
        tipe: 'pilihan',
        options: [
          { label: 'Puas', nilai: 1 },
          { label: 'Tidak puas', nilai: 0 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.options).toHaveLength(2);
    expect(res.body.data.options[0].label).toBe('Puas');
    expect(res.body.data.options[0].urutan).toBe(1);
  });

  it('POST question pilihan dengan isIkmUnsur=true -> 400 (unsur IKM hanya skala)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({
        teks: 'X',
        tipe: 'pilihan',
        isIkmUnsur: true,
        options: [{ label: 'A' }, { label: 'B' }],
      });
    expect(res.status).toBe(400);
  });

  it('POST question skala dengan options terisi -> 400 (options hanya untuk pilihan)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({ teks: 'X', tipe: 'skala', options: [{ label: 'A' }, { label: 'B' }] });
    expect(res.status).toBe(400);
  });

  it('POST questions/template -> 404 (rute dihapus: kerangka lahir bersama survei SKM)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions/template`)
      .set(opdHeaders());
    expect(res.status).toBe(404);
  });

  it('POST question ber-kodeUnsur pada survei umum -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders())
      .send({ teks: 'X', tipe: 'skala', kodeUnsur: 'U1', isIkmUnsur: true });
    expect(res.status).toBe(400);
  });

  it('GET questions -> 200 terurut', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders());
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('PATCH reorder -> 200', async () => {
    const list = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/questions`)
      .set(opdHeaders());
    const ids = list.body.data.map((q: { id: number }) => q.id).reverse();
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${surveyId}/questions/reorder`)
      .set(opdHeaders())
      .send({ orderedIds: ids });
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe(ids[0]);
  });

  it('GET questions Admin OPD lain -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${surveyId}/questions`)
      .set(devHeaders({ role: Role.opd, opdId: opdId + 99999 }));
    expect(res.status).toBe(403);
  });

  it('PATCH & DELETE question (draft) -> 200', async () => {
    const created = await prisma.question.create({
      data: { surveyId, teks: 'Sementara', tipe: 'teks', urutan: 99 },
    });
    const upd = await request(app.getHttpServer())
      .patch(`/api/v1/questions/${created.id}`)
      .set(opdHeaders())
      .send({ teks: 'Diubah' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.teks).toBe('Diubah');

    const del = await request(app.getHttpServer())
      .delete(`/api/v1/questions/${created.id}`)
      .set(opdHeaders());
    expect(del.status).toBe(200);
  });

  /**
   * ATURAN BERGANTI 11 September 2026. Yang mengunci susunan pertanyaan bukan
   * lagi STATUS, melainkan JAWABAN yang sudah masuk: survei terbit yang belum
   * dijawab siapa pun masih boleh dibenahi, dan itulah keadaan tersering
   * sesudah publikasi tak sengaja.
   */
  it('POST question pada survei aktif yang SUDAH dijawab -> 400', async () => {
    const aktif = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Aktif Terjawab',
        periode: '2026-Q1',
        status: 'aktif',
        questions: { create: [{ teks: 'Pelayanan', tipe: 'skala', urutan: 1 }] },
      },
      include: { questions: true },
    });
    await prisma.surveyResponse.create({
      data: {
        surveyId: aktif.id,
        answers: { create: [{ questionId: aktif.questions[0].id, nilai: 4 }] },
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${aktif.id}/questions`)
      .set(opdHeaders())
      .send({ teks: 'X', tipe: 'skala' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/1 jawaban/);
  });

  it('POST question pada survei aktif TANPA jawaban -> 201', async () => {
    const aktif = await prisma.survey.create({
      data: { opdId, judul: 'Survei Aktif Kosong', periode: '2026-Q1', status: 'aktif' },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${aktif.id}/questions`)
      .set(opdHeaders())
      .send({ teks: 'X', tipe: 'skala' });

    expect(res.status).toBe(201);
  });

  it('PATCH label skala pada survei aktif yang SUDAH dijawab -> 200, jawaban lama tetap utuh', async () => {
    const aktif = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Label Skala Terjawab',
        periode: '2026-Q1',
        status: 'aktif',
        questions: { create: [{ teks: 'Pelayanan', tipe: 'skala', urutan: 1 }] },
      },
      include: { questions: true },
    });
    const pertanyaanId = aktif.questions[0].id;
    const respons = await prisma.surveyResponse.create({
      data: { surveyId: aktif.id, answers: { create: [{ questionId: pertanyaanId, nilai: 3 }] } },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/questions/${pertanyaanId}`)
      .set(opdHeaders())
      .send({
        options: [
          { label: 'Sangat Tidak Puas' },
          { label: 'Tidak Puas' },
          { label: 'Puas' },
          { label: 'Sangat Puas' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.options.map((o: { label: string }) => o.label)).toEqual([
      'Sangat Tidak Puas',
      'Tidak Puas',
      'Puas',
      'Sangat Puas',
    ]);
    // Skor 1..4 dipaksa dari posisi, bukan dari input.
    expect(res.body.data.options.map((o: { nilai: number }) => o.nilai)).toEqual([1, 2, 3, 4]);
    // Jawaban yang sudah masuk menyimpan SKOR dan tidak tersentuh.
    const jawaban = await prisma.answer.findMany({ where: { responseId: respons.id } });
    expect(jawaban).toHaveLength(1);
    expect(jawaban[0].nilai).toBe(3);
  });

  it('PATCH opsi PILIHAN GANDA pada survei aktif yang sudah dijawab tetap -> 400', async () => {
    const aktif = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Pilihan Terjawab',
        periode: '2026-Q1',
        status: 'aktif',
        questions: {
          create: [
            {
              teks: 'Pilih',
              tipe: 'pilihan',
              urutan: 1,
              options: {
                create: [
                  { label: 'Ya', urutan: 1 },
                  { label: 'Tidak', urutan: 2 },
                ],
              },
            },
          ],
        },
      },
      include: { questions: { include: { options: true } } },
    });
    await prisma.surveyResponse.create({
      data: {
        surveyId: aktif.id,
        answers: {
          create: [
            {
              questionId: aktif.questions[0].id,
              selectedOptionId: aktif.questions[0].options[0].id,
            },
          ],
        },
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/questions/${aktif.questions[0].id}`)
      .set(opdHeaders())
      .send({ options: [{ label: 'Setuju' }, { label: 'Tidak setuju' }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/1 jawaban/);
  });

  /**
   * KERANGKA 9 UNSUR (8 Oktober 2026). Survei SKM PermenPANRB lahir bersama
   * sembilan pertanyaan unsurnya; OPD hanya boleh mengubah KALIMATNYA.
   */
  describe('kerangka unsur survei SKM', () => {
    let skmId: number;
    let unsur: { id: number; kodeUnsur: string | null; teks: string; namaUnsur: string | null }[];

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/surveys')
        .set(opdHeaders())
        .send({ judul: 'Survei SKM Kerangka', periode: '2026-Q2', jenis: 'skm_permenpanrb' });
      expect(created.status).toBe(201);
      skmId = created.body.data.id;
      expect(created.body.data.jenis).toBe('skm_permenpanrb');

      const list = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${skmId}/questions`)
        .set(opdHeaders());
      unsur = list.body.data;
    });

    it('lahir bersama U1..U9, masing-masing bernama unsur resmi', () => {
      expect(unsur.map((q) => q.kodeUnsur)).toEqual([
        'U1',
        'U2',
        'U3',
        'U4',
        'U5',
        'U6',
        'U7',
        'U8',
        'U9',
      ]);
      expect(unsur[0].namaUnsur).toBe('Persyaratan');
      expect(unsur[8].namaUnsur).toBe('Penanganan Pengaduan, Saran, dan Masukan');
    });

    it('DELETE pertanyaan unsur -> 400 dan barisnya tetap ada', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/questions/${unsur[2].id}`)
        .set(opdHeaders());
      expect(res.status).toBe(400);
      expect(await prisma.question.count({ where: { id: unsur[2].id } })).toBe(1);
    });

    it('PATCH kalimat pertanyaan unsur -> 200, namaUnsur resmi tidak ikut berubah', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/questions/${unsur[0].id}`)
        .set(opdHeaders())
        .send({ teks: 'Seberapa mudah persyaratan layanan kami?' });
      expect(res.status).toBe(200);
      expect(res.body.data.teks).toBe('Seberapa mudah persyaratan layanan kami?');
      expect(res.body.data.namaUnsur).toBe('Persyaratan');
      expect(res.body.data.kodeUnsur).toBe('U1');
    });

    it('PATCH kalimat dikosongkan -> 400 dan kalimat lama tersimpan', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/questions/${unsur[1].id}`)
        .set(opdHeaders())
        .send({ teks: '' });
      expect(res.status).toBe(400);
      const baris = await prisma.question.findUnique({ where: { id: unsur[1].id } });
      expect(baris?.teks).toBe(unsur[1].teks);
    });

    it('PATCH kodeUnsur atau isIkmUnsur -> 400', async () => {
      const kode = await request(app.getHttpServer())
        .patch(`/api/v1/questions/${unsur[3].id}`)
        .set(opdHeaders())
        .send({ kodeUnsur: 'U1' });
      const tanda = await request(app.getHttpServer())
        .patch(`/api/v1/questions/${unsur[3].id}`)
        .set(opdHeaders())
        .send({ isIkmUnsur: false });
      expect(kode.status).toBe(400);
      expect(tanda.status).toBe(400);
    });

    it('POST pertanyaan ber-kodeUnsur -> 400; pertanyaan tambahan biasa -> 201 dan boleh dihapus', async () => {
      const dobel = await request(app.getHttpServer())
        .post(`/api/v1/surveys/${skmId}/questions`)
        .set(opdHeaders())
        .send({ teks: 'U1 lagi', tipe: 'skala', kodeUnsur: 'U1', isIkmUnsur: true });
      expect(dobel.status).toBe(400);

      const tambahan = await request(app.getHttpServer())
        .post(`/api/v1/surveys/${skmId}/questions`)
        .set(opdHeaders())
        .send({ teks: 'Saran Anda?', tipe: 'teks' });
      expect(tambahan.status).toBe(201);
      expect(tambahan.body.data.namaUnsur).toBeNull();

      const hapus = await request(app.getHttpServer())
        .delete(`/api/v1/questions/${tambahan.body.data.id}`)
        .set(opdHeaders());
      expect(hapus.status).toBe(200);
    });

    it('PATCH urutan -> 200 (urutan unsur boleh dipindah)', async () => {
      const ids = unsur.map((q) => q.id).reverse();
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${skmId}/questions/reorder`)
        .set(opdHeaders())
        .send({ orderedIds: ids });
      expect(res.status).toBe(200);
    });

    it('PATCH jenis pada survei -> 400 (jenis tidak dapat diganti)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${skmId}`)
        .set(opdHeaders())
        .send({ jenis: 'umum' });
      expect(res.status).toBe(400);
    });

    it('POST /surveys tanpa jenis -> 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/surveys')
        .set(opdHeaders())
        .send({ judul: 'Tanpa jenis', periode: '2026-Q2' });
      expect(res.status).toBe(400);
    });

    it('aktivasi survei SKM lengkap -> 200; hasil IKM menyebut nama unsur resmi, bukan kalimat OPD', async () => {
      const aktif = await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${skmId}/status`)
        .set(opdHeaders())
        .send({ status: 'aktif' });
      expect(aktif.status).toBe(200);

      const respons = await prisma.surveyResponse.create({ data: { surveyId: skmId } });
      await prisma.answer.createMany({
        data: unsur.map((q) => ({ responseId: respons.id, questionId: q.id, nilai: 4 })),
      });

      const hasil = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${skmId}/results`)
        .set(opdHeaders());
      expect(hasil.status).toBe(200);
      const u1 = hasil.body.data.nrrPerUnsur.find(
        (u: { kodeUnsur: string }) => u.kodeUnsur === 'U1',
      );
      expect(u1.teks).toBe('Persyaratan');
      expect(hasil.body.data.nilaiIkm).toBe(100);
    });

    it('survei SKM yang unsurnya hilang dari DB tidak bisa diaktifkan; pesan menyebut kodenya', async () => {
      const rusak = await request(app.getHttpServer())
        .post('/api/v1/surveys')
        .set(opdHeaders())
        .send({ judul: 'SKM Rusak', periode: '2026-Q3', jenis: 'skm_permenpanrb' });
      await prisma.question.deleteMany({
        where: { surveyId: rusak.body.data.id, kodeUnsur: 'U9' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${rusak.body.data.id}/status`)
        .set(opdHeaders())
        .send({ status: 'aktif' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/U9/);
    });

    it('menggandakan survei SKM menyalin jenis dan kalimat hasil ubahan', async () => {
      const dup = await request(app.getHttpServer())
        .post(`/api/v1/surveys/${skmId}/duplicate`)
        .set(opdHeaders());
      expect(dup.status).toBe(201);
      expect(dup.body.data.jenis).toBe('skm_permenpanrb');

      const list = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${dup.body.data.id}/questions`)
        .set(opdHeaders());
      const u1 = list.body.data.find((q: { kodeUnsur: string }) => q.kodeUnsur === 'U1');
      expect(u1.teks).toBe('Seberapa mudah persyaratan layanan kami?');
    });
  });
});
