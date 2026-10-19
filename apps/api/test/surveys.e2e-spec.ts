import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JenisSurvei, QuestionType, Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Surveys (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let penggunaId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ESVY' },
      update: {},
      create: { kode: 'E2ESVY', nama: 'OPD E2E Surveys', isActive: true },
    });
    opdId = opd.id;

    // PENGGUNA MILIK BERKAS INI. `SurveysService.remove` menulis
    // `surveys.deleted_by_id`, sebuah FK ke `users`. Tanpa baris ini ujinya
    // bergantung pada baku `x-dev-user-id` = 1 di `stub-auth.provider.ts`, dan
    // pengguna ber-id 1 hanya ada di basis data pengembangan karena kebetulan
    // sejarah: ia baris pengguna pertama yang pernah dibuat di sana. Terukur
    // 12 Oktober 2026, saat suite ini pertama kali dijalankan di basis data
    // uji sendiri: DELETE /surveys/:id menjawab 500 dengan
    // "Foreign key constraint violated on the constraint:
    // `surveys_deleted_by_id_fkey`".
    //
    // `opdId` DIBIARKAN null walau perannya `opd`. Penautan OPD-nya datang dari
    // header `x-dev-opd-id`, dan `StubAuthProvider` tak pernah membaca baris
    // ini. Mengisinya justru membuat `opd.deleteMany` di `afterAll` gagal,
    // karena `users.opd_id` menahan OPD-nya.
    //
    // TIDAK dihapus di `afterAll`: permintaan yang teraudit menulis
    // `audit_logs.actor_id` yang menunjuk baris ini, dan baris audit tak boleh
    // dihapus. `upsert` membuatnya cukup satu baris untuk seluruh jalan
    // berikutnya.
    const pengguna = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-surveys-admin-opd' },
      update: {},
      create: {
        ssoSubject: 'e2e-surveys-admin-opd',
        nama: 'E2E Surveys Admin OPD',
        email: 'e2e-surveys-admin-opd@contoh.test',
        roles: [Role.opd],
      },
    });
    penggunaId = pengguna.id;
  }, 60000);

  afterAll(async () => {
    // Jawaban menahan penghapusan pertanyaan (RESTRICT); respons dihapus lebih dulu,
    // jawabannya ikut lewat ON DELETE CASCADE.
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.opd.deleteMany({ where: { kode: 'E2ESVY' } });
    await app.close();
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId, userId: penggunaId });

  it('POST /surveys (Admin OPD) -> 201', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/surveys').set(opdHeaders()).send({
      judul: 'Survei E2E',
      periode: '2026-Q1',
      jenis: 'custom',
      tujuan: 'kepuasan',
      metodeNilai: 'rata_rata',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.opdId).toBe(opdId);
    expect(res.body.data.status).toBe('draft');
  });

  // Kabupaten mencapai rute ini karena TERDAFTAR di @Roles-nya, bukan lewat
  // bypass menyeluruh -- bypass itu dibongkar T6 (7 Sep 2026). Ia wajib kirim
  // opdId sendiri, tidak seperti Admin OPD yang opdId-nya tersirat dari akun.
  it('POST /surveys (Kabupaten) tanpa opdId -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(devHeaders({ role: Role.kabupaten }))
      .send({
        judul: 'X',
        periode: '2026-Q1',
        jenis: 'custom',
        tujuan: 'kepuasan',
        metodeNilai: 'rata_rata',
      });

    expect(res.status).toBe(400);
  });

  it('POST /surveys (Kabupaten) dengan opdId -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(devHeaders({ role: Role.kabupaten }))
      .send({
        judul: 'Survei Kabupaten E2E',
        periode: '2026-Q1',
        jenis: 'custom',
        tujuan: 'kepuasan',
        metodeNilai: 'rata_rata',
        opdId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.opdId).toBe(opdId);
  });

  it('GET /surveys (Admin OPD) -> 200 paginated milik OPD', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/surveys').set(opdHeaders());
    expect(res.status).toBe(200);
    expect(res.body.meta.pagination).toBeDefined();
    expect(res.body.data.every((s: { opdId: number }) => s.opdId === opdId)).toBe(true);
  });

  it('GET /surveys/:id Admin OPD lain -> 403', async () => {
    const created = await prisma.survey.create({
      data: { opdId, judul: 'Milik OPD ini', periode: '2026-Q1' },
    });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/surveys/${created.id}`)
      .set(devHeaders({ role: Role.opd, opdId: opdId + 99999 }));
    expect(res.status).toBe(403);
  });

  it('lifecycle: create → update → status draft→aktif → judul MASIH boleh diubah', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({
        judul: 'Lifecycle',
        periode: '2026-Q1',
        jenis: 'custom',
        tujuan: 'kepuasan',
        metodeNilai: 'rata_rata',
      });
    const id = created.body.data.id;

    const upd = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}`)
      .set(opdHeaders())
      .send({ judul: 'Lifecycle updated' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.judul).toBe('Lifecycle updated');

    const pub = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}/status`)
      .set(opdHeaders())
      .send({ status: 'aktif' });
    expect(pub.status).toBe(200);
    expect(pub.body.data.status).toBe('aktif');

    // ATURAN BERGANTI 11 September 2026: sesudah aktif, judul & izin pengisian
    // TETAP boleh diubah selama belum ada yang menjawab. Yang terkunci begitu
    // jawaban masuk adalah periode & susunan pertanyaan (lihat
    // surveys-trash.e2e-spec.ts dan survey-scope.util.spec.ts).
    const updAfter = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}`)
      .set(opdHeaders())
      .send({ judul: 'Lifecycle setelah terbit' });
    expect(updAfter.status).toBe(200);
    expect(updAfter.body.data.judul).toBe('Lifecycle setelah terbit');

    // Menutupnya mengunci seluruhnya: hasil IKM-nya sudah terbit.
    await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}/status`)
      .set(opdHeaders())
      .send({ status: 'ditutup' });
    const updSesudahTutup = await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}`)
      .set(opdHeaders())
      .send({ judul: 'nope' });
    expect(updSesudahTutup.status).toBe(400);
  });

  it('POST /surveys/:id/duplicate -> 201 status draft', async () => {
    const created = await prisma.survey.create({
      data: { opdId, judul: 'Untuk Duplikasi', periode: '2025-Q1' },
    });
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${created.id}/duplicate`)
      .set(opdHeaders());
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.judul).toContain('Salinan');
  });

  /**
   * BUG-005 (Critical, dilaporkan 2 September 2026, diperbaiki 16 Oktober 2026).
   *
   * `duplicate()` memuat `include: { questions: true }` -- tanpa relasi
   * `options` -- lalu menyalin lima medan skalar saja. Opsinya karena itu tak
   * mungkin ikut: ia tak pernah ada di memori. Penjaga yang seharusnya
   * menangkapnya, `'Pertanyaan pilihan ganda memerlukan minimal 2 opsi'` di
   * `QuestionsService`, tak pernah berjalan di jalur ini sebab salinannya
   * dibuat lewat `prisma.survey.create` dengan nested create dan melewati
   * `CreateQuestionDto` sepenuhnya.
   *
   * Akibatnya bukan satu pertanyaan yang rusak, melainkan survei yang BUNTU:
   * pertanyaan pilihan ganda bersifat wajib sementara tak ada satu pun opsi
   * untuk dipilih, jadi tombol "Pertanyaan Selanjutnya" nonaktif selamanya dan
   * responden tersangkut tanpa jalan maju maupun mengirim.
   *
   * Dua tipe diuji sekaligus karena kerugiannya berbeda berat, dan laporan
   * aslinya menyamakan keduanya:
   *  - `pilihan` kehilangan opsi -> responden buntu. Inilah yang Critical.
   *  - `skala` kehilangan label TERSUAI -> frontend jatuh ke label baku
   *    PermenPANRB. Itu kehilangan penyesuaian, bukan kebuntuan: opsi pada
   *    tipe skala memang opsional menurut rancangan (`buatUnsurAwal()` sengaja
   *    tak membuatnya), jadi yang hilang di sini tulisan OPD, bukan
   *    kemampuannya menjawab.
   *
   * Surveinya `custom` dengan sengaja. Pada `skm_permenpanrb`, `duplicate()`
   * menambahkan unsur yang hilang lewat `unsurPelengkap()`, dan sembilan
   * pertanyaan tambahan itu hanya mengaburkan apa yang sedang diukur di sini.
   */
  it('POST /surveys/:id/duplicate menyalin opsi jawaban, bukan membuangnya (BUG-005)', async () => {
    const asli = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Berpilihan Ganda',
        periode: '2026-Q4',
        jenis: JenisSurvei.custom,
        questions: {
          create: [
            {
              teks: 'Layanan mana yang Anda gunakan?',
              tipe: QuestionType.pilihan,
              urutan: 1,
              options: {
                create: [
                  { label: 'Rawat Jalan', nilai: null, urutan: 1 },
                  { label: 'Rawat Inap', nilai: null, urutan: 2 },
                  { label: 'IGD', nilai: null, urutan: 3 },
                ],
              },
            },
            {
              teks: 'Bagaimana kepuasan Anda?',
              tipe: QuestionType.skala,
              urutan: 2,
              options: {
                create: [
                  { label: 'Sangat Tidak Puas (uji)', nilai: 1, urutan: 1 },
                  { label: 'Tidak Puas (uji)', nilai: 2, urutan: 2 },
                  { label: 'Puas (uji)', nilai: 3, urutan: 3 },
                  { label: 'Sangat Puas (uji)', nilai: 4, urutan: 4 },
                ],
              },
            },
          ],
        },
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${asli.id}/duplicate`)
      .set(opdHeaders());
    expect(res.status).toBe(201);

    const salinan = await prisma.survey.findUniqueOrThrow({
      where: { id: res.body.data.id },
      include: {
        questions: {
          orderBy: { urutan: 'asc' },
          include: { options: { orderBy: { urutan: 'asc' } } },
        },
      },
    });

    // Angka inilah yang 2 September 2026 terbaca `asli=7 salinan=0`.
    const totalOpsi = salinan.questions.reduce((n, q) => n + q.options.length, 0);
    expect(totalOpsi).toBe(7);

    expect(salinan.questions).toHaveLength(2);

    const [pilihan, skala] = salinan.questions;

    expect(pilihan.tipe).toBe(QuestionType.pilihan);
    expect(pilihan.options.map((o) => o.label)).toEqual(['Rawat Jalan', 'Rawat Inap', 'IGD']);
    expect(pilihan.options.map((o) => o.urutan)).toEqual([1, 2, 3]);

    expect(skala.tipe).toBe(QuestionType.skala);
    expect(skala.options.map((o) => o.label)).toEqual([
      'Sangat Tidak Puas (uji)',
      'Tidak Puas (uji)',
      'Puas (uji)',
      'Sangat Puas (uji)',
    ]);
    // Skor skala adalah dasar rumus IKM; menyalin labelnya tanpa skornya akan
    // menggeser bobot tanpa ada yang memerah.
    expect(skala.options.map((o) => o.nilai)).toEqual([1, 2, 3, 4]);

    // Opsi salinan HARUS baris baru, bukan baris yang sama dipakai bersama:
    // menyunting salinan tak boleh mengubah survei aslinya.
    const idAsli = await prisma.questionOption.findMany({
      where: { question: { surveyId: asli.id } },
      select: { id: true },
    });
    const idSalinan = salinan.questions.flatMap((q) => q.options.map((o) => o.id));
    expect(idSalinan).toHaveLength(7);
    expect(idSalinan.some((id) => idAsli.some((a) => a.id === id))).toBe(false);
  });

  it('DELETE /surveys/:id draft -> 200', async () => {
    const created = await prisma.survey.create({
      data: { opdId, judul: 'Untuk Dihapus', periode: '2026-Q1' },
    });
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${created.id}`)
      .set(opdHeaders());
    expect(res.status).toBe(200);
  });

  // 8 Oktober 2026: survei custom menghasilkan "Nilai Survei" menurut tujuan +
  // metode nilai; survei SKM tidak memakainya.
  describe('tujuan, metode nilai, dan nilaiSurvei', () => {
    const buat = (body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post('/api/v1/surveys')
        .set(opdHeaders())
        .send({ judul: 'Nilai Survei E2E', periode: '2026-Q1', ...body });

    it('POST custom tanpa tujuan dan metode -> 400', async () => {
      const res = await buat({ jenis: 'custom' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Tujuan dan metode nilai wajib dipilih/);
    });

    it('POST custom hanya dengan tujuan -> 400', async () => {
      expect((await buat({ jenis: 'custom', tujuan: 'kepuasan' })).status).toBe(400);
    });

    it('POST custom dengan tujuan di luar enum -> 400', async () => {
      const res = await buat({ jenis: 'custom', tujuan: 'lainnya', metodeNilai: 'rata_rata' });
      expect(res.status).toBe(400);
    });

    it('POST SKM dengan tujuan -> 400', async () => {
      const res = await buat({ jenis: 'skm_permenpanrb', tujuan: 'kepuasan' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Survei SKM tidak memakai tujuan dan metode nilai/);
    });

    it('POST custom lengkap -> 201 dan tujuan + metode tersimpan', async () => {
      const res = await buat({ jenis: 'custom', tujuan: 'evaluasi', metodeNilai: 'indeks_persen' });
      expect(res.status).toBe(201);
      expect(res.body.data.tujuan).toBe('evaluasi');
      expect(res.body.data.metodeNilai).toBe('indeks_persen');
    });

    it('POST SKM -> 201 dengan tujuan dan metode null', async () => {
      const res = await buat({ jenis: 'skm_permenpanrb' });
      expect(res.status).toBe(201);
      expect(res.body.data.tujuan).toBeNull();
      expect(res.body.data.metodeNilai).toBeNull();
    });

    it('PATCH SKM dengan metodeNilai -> 400', async () => {
      const skm = await buat({ jenis: 'skm_permenpanrb' });
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${skm.body.data.id}`)
        .set(opdHeaders())
        .send({ metodeNilai: 'rata_rata' });
      expect(res.status).toBe(400);
    });

    it('PATCH custom mengganti metode -> 200 dan GET mencerminkannya', async () => {
      const dibuat = await buat({ jenis: 'custom', tujuan: 'kepuasan', metodeNilai: 'rata_rata' });
      const id = dibuat.body.data.id;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${id}`)
        .set(opdHeaders())
        .send({ metodeNilai: 'indeks_persen' });
      expect(res.status).toBe(200);

      const baca = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${id}`)
        .set(opdHeaders());
      expect(baca.body.data.metodeNilai).toBe('indeks_persen');
      expect(baca.body.data.tujuan).toBe('kepuasan');
    });

    describe('kontrak nilaiSurvei', () => {
      // Dua jawaban skala (4 dan 3) -> rata-rata 3,50.
      const buatSurveiBerjawaban = async (data: Record<string, unknown>) => {
        const survei = await prisma.survey.create({
          data: {
            opdId,
            judul: 'Kontrak nilaiSurvei',
            periode: '2026-Q1',
            status: 'aktif',
            ...data,
            questions: { create: [{ teks: 'Puas?', tipe: 'skala', urutan: 1 }] },
          },
          include: { questions: true },
        });
        for (const nilai of [4, 3]) {
          await prisma.surveyResponse.create({
            data: {
              surveyId: survei.id,
              answers: { create: [{ questionId: survei.questions[0].id, nilai }] },
            },
          });
        }
        return survei.id;
      };

      it('GET /surveys/:id (custom, rata_rata) memuat objek siap tampil', async () => {
        const id = await buatSurveiBerjawaban({ tujuan: 'kepuasan', metodeNilai: 'rata_rata' });
        const res = await request(app.getHttpServer())
          .get(`/api/v1/surveys/${id}`)
          .set(opdHeaders());
        expect(res.status).toBe(200);
        expect(res.body.data.nilaiSurvei).toEqual({
          judul: 'Nilai Survei',
          nilai: 3.5,
          tampilan: '3,50 / 4',
          kategori: 'Sangat Puas',
        });
      });

      it('mengganti metode ke indeks_persen mengubah tampilan tanpa menyentuh jawaban', async () => {
        const id = await buatSurveiBerjawaban({ tujuan: 'kepuasan', metodeNilai: 'rata_rata' });
        await request(app.getHttpServer())
          .patch(`/api/v1/surveys/${id}`)
          .set(opdHeaders())
          .send({ metodeNilai: 'indeks_persen', tujuan: 'penilaian' })
          .expect(200);

        const res = await request(app.getHttpServer())
          .get(`/api/v1/surveys/${id}`)
          .set(opdHeaders());
        expect(res.body.data.nilaiSurvei).toEqual({
          judul: 'Indeks Penilaian',
          nilai: 87.5,
          tampilan: '87,5%',
          kategori: 'Sangat Baik',
        });
        expect(res.body.data.nilaiRataRata).toBe(3.5);
      });

      it('GET /surveys (daftar) memuat nilaiSurvei per survei', async () => {
        const id = await buatSurveiBerjawaban({ tujuan: 'evaluasi', metodeNilai: 'rata_rata' });
        const res = await request(app.getHttpServer())
          .get('/api/v1/surveys?limit=100')
          .set(opdHeaders());
        const baris = res.body.data.find((s: { id: number }) => s.id === id);
        expect(baris.nilaiSurvei).toMatchObject({ judul: 'Nilai Survei', kategori: 'Sangat Baik' });
      });

      it('GET /surveys/:id/results memuat jenis dan nilaiSurvei', async () => {
        const id = await buatSurveiBerjawaban({ tujuan: 'kepuasan', metodeNilai: 'rata_rata' });
        const res = await request(app.getHttpServer())
          .get(`/api/v1/surveys/${id}/results`)
          .set(opdHeaders());
        expect(res.status).toBe(200);
        expect(res.body.data.jenis).toBe('custom');
        expect(res.body.data.nilaiSurvei.tampilan).toBe('3,50 / 4');
        expect(res.body.data.nilaiIkm).toBeNull();
      });

      it('custom tanpa jawaban skala -> nilaiSurvei null, bukan 0', async () => {
        const kosong = await prisma.survey.create({
          data: { opdId, judul: 'Tanpa jawaban', periode: '2026-Q1' },
        });
        const res = await request(app.getHttpServer())
          .get(`/api/v1/surveys/${kosong.id}`)
          .set(opdHeaders());
        expect(res.body.data.nilaiSurvei).toBeNull();
      });

      it('custom dengan tujuan dan metode NULL (fixture lama) memakai bawaan', async () => {
        const id = await buatSurveiBerjawaban({});
        const res = await request(app.getHttpServer())
          .get(`/api/v1/surveys/${id}`)
          .set(opdHeaders());
        expect(res.body.data.nilaiSurvei).toMatchObject({
          judul: 'Nilai Survei',
          tampilan: '3,50 / 4',
        });
      });

      it('survei SKM -> nilaiSurvei null walau ada jawaban skala', async () => {
        const id = await buatSurveiBerjawaban({ jenis: 'skm_permenpanrb' });
        const res = await request(app.getHttpServer())
          .get(`/api/v1/surveys/${id}`)
          .set(opdHeaders());
        expect(res.body.data.nilaiSurvei).toBeNull();
        expect(res.body.data.tujuan).toBeNull();
      });
    });
  });

  // 8 Oktober 2026: ganti jenis SKM -> Custom. Satu-satunya jalan mengganti jenis,
  // hanya selagi draf dan belum dijawab; PATCH /surveys/:id tetap menolak `jenis`.
  describe('PATCH /surveys/:id/jenis (ganti jenis SKM -> Custom)', () => {
    const lengkap = { jenis: 'custom', tujuan: 'evaluasi', metodeNilai: 'rata_rata' };

    const buatSkm = async (tambahan = true) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/surveys')
        .set(opdHeaders())
        .send({ judul: 'Ganti Jenis E2E', periode: '2026-Q1', jenis: 'skm_permenpanrb' });
      expect(res.status).toBe(201);
      const id = res.body.data.id as number;
      if (tambahan) {
        const q = await request(app.getHttpServer())
          .post(`/api/v1/surveys/${id}/questions`)
          .set(opdHeaders())
          .send({ teks: 'Saran Anda untuk kami?', tipe: 'teks' });
        expect(q.status).toBe(201);
      }
      return id;
    };
    const ganti = (id: number, badan: Record<string, unknown> = lengkap, headers = opdHeaders()) =>
      request(app.getHttpServer()).patch(`/api/v1/surveys/${id}/jenis`).set(headers).send(badan);
    const pertanyaan = async (id: number) =>
      (await request(app.getHttpServer()).get(`/api/v1/surveys/${id}/questions`).set(opdHeaders()))
        .body.data as { id: number; kodeUnsur: string | null; urutan: number; teks: string }[];

    it('200: unsur lenyap, pertanyaan tambahan bertahan dengan urutan 1, jenis/tujuan/metode tersimpan', async () => {
      const id = await buatSkm();
      expect(await pertanyaan(id)).toHaveLength(10);

      const res = await ganti(id);

      expect(res.status).toBe(200);
      expect(res.body.data.jenis).toBe('custom');
      expect(res.body.data.tujuan).toBe('evaluasi');
      expect(res.body.data.metodeNilai).toBe('rata_rata');
      const sisa = await pertanyaan(id);
      expect(sisa).toHaveLength(1);
      expect(sisa[0].kodeUnsur).toBeNull();
      expect(sisa[0].teks).toBe('Saran Anda untuk kami?');
      expect(sisa[0].urutan).toBe(1);

      const baca = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${id}`)
        .set(opdHeaders());
      expect(baca.body.data.jenis).toBe('custom');
    });

    it('SKM tanpa pertanyaan tambahan menjadi custom KOSONG yang tetap bisa diisi pertanyaan', async () => {
      const id = await buatSkm(false);

      expect((await ganti(id)).status).toBe(200);
      expect(await pertanyaan(id)).toHaveLength(0);

      const tambah = await request(app.getHttpServer())
        .post(`/api/v1/surveys/${id}/questions`)
        .set(opdHeaders())
        .send({ teks: 'Seberapa puas Anda?', tipe: 'skala' });
      expect(tambah.status).toBe(201);
    });

    it('400: survei aktif ditolak dan sembilan unsur utuh', async () => {
      const id = await buatSkm();
      await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${id}/status`)
        .set(opdHeaders())
        .send({ status: 'aktif' })
        .expect(200);

      const res = await ganti(id);

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/berstatus draf/);
      expect(await pertanyaan(id)).toHaveLength(10);
    });

    it('400: survei yang sudah dijawab ditolak dan pesannya menyebut jumlahnya', async () => {
      const id = await buatSkm();
      await prisma.surveyResponse.create({ data: { surveyId: id } });

      const res = await ganti(id);

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/sudah menerima 1 jawaban/);
      expect(await pertanyaan(id)).toHaveLength(10);
    });

    it('400: survei yang sudah custom', async () => {
      const dibuat = await request(app.getHttpServer())
        .post('/api/v1/surveys')
        .set(opdHeaders())
        .send({
          judul: 'Sudah Custom',
          periode: '2026-Q1',
          jenis: 'custom',
          tujuan: 'kepuasan',
          metodeNilai: 'rata_rata',
        });

      const res = await ganti(dibuat.body.data.id);

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/sudah berjenis Custom/);
    });

    it('400: jenis tujuan skm_permenpanrb, tanpa tujuan, tanpa metode, tujuan di luar enum', async () => {
      const id = await buatSkm();

      expect((await ganti(id, { ...lengkap, jenis: 'skm_permenpanrb' })).status).toBe(400);
      expect((await ganti(id, { jenis: 'custom', metodeNilai: 'rata_rata' })).status).toBe(400);
      expect((await ganti(id, { jenis: 'custom', tujuan: 'evaluasi' })).status).toBe(400);
      expect((await ganti(id, { ...lengkap, tujuan: 'lainnya' })).status).toBe(400);
      expect(await pertanyaan(id)).toHaveLength(10);
    });

    it('403: Admin OPD lain', async () => {
      const id = await buatSkm();

      const res = await ganti(id, lengkap, devHeaders({ role: Role.opd, opdId: opdId + 99999 }));

      expect(res.status).toBe(403);
      expect(await pertanyaan(id)).toHaveLength(10);
    });

    it('regresi: PATCH /surveys/:id dengan jenis TETAP 400', async () => {
      const id = await buatSkm();

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${id}`)
        .set(opdHeaders())
        .send({ jenis: 'custom' });

      expect(res.status).toBe(400);
    });
  });

  // 8 Oktober 2026: kolom `tujuan` / `metode_nilai` hanya bermakna untuk survei
  // custom. CHECK `surveys_nilai_survei_ck` hidup di migrasi (Prisma tak dapat
  // menyatakannya), jadi hanya SQL langsung yang dapat membuktikannya.
  describe('CHECK tujuan / metode nilai', () => {
    it('baris yang dibuat tanpa jenis menjadi custom', async () => {
      const baris = await prisma.survey.create({
        data: { opdId, judul: 'Tanpa jenis', periode: '2026-Q1' },
      });
      expect(baris.jenis).toBe('custom');
    });

    it('survei SKM TIDAK boleh membawa tujuan', async () => {
      const skm = await prisma.survey.create({
        data: { opdId, judul: 'SKM CHECK', periode: '2026-Q1', jenis: 'skm_permenpanrb' },
      });
      await expect(
        prisma.$executeRawUnsafe(`UPDATE surveys SET tujuan = 'kepuasan' WHERE id = ${skm.id}`),
      ).rejects.toThrow(/surveys_nilai_survei_ck/);
      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE surveys SET metode_nilai = 'rata_rata' WHERE id = ${skm.id}`,
        ),
      ).rejects.toThrow(/surveys_nilai_survei_ck/);
    });

    it('survei custom boleh membawa tujuan dan metode', async () => {
      const custom = await prisma.survey.create({
        data: { opdId, judul: 'Custom CHECK', periode: '2026-Q1' },
      });
      await prisma.$executeRawUnsafe(
        `UPDATE surveys SET tujuan = 'evaluasi', metode_nilai = 'indeks_persen' WHERE id = ${custom.id}`,
      );
      const baca = await prisma.$queryRawUnsafe<{ tujuan: string; metode_nilai: string }[]>(
        `SELECT tujuan::text, metode_nilai::text FROM surveys WHERE id = ${custom.id}`,
      );
      expect(baca[0]).toEqual({ tujuan: 'evaluasi', metode_nilai: 'indeks_persen' });
    });
  });
});
