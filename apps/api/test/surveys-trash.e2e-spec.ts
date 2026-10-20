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
  let penggunaId: number;
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
      where: { ssoSubject: 'e2e-sampah-admin-opd' },
      update: {},
      create: {
        ssoSubject: 'e2e-sampah-admin-opd',
        nama: 'E2E Sampah Admin OPD',
        email: 'e2e-sampah-admin-opd@contoh.test',
        roles: [Role.opd],
      },
    });
    penggunaId = pengguna.id;

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

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId, userId: penggunaId });

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

  /**
   * Pagar BUG-014 — memusnahkan survei meninggalkan notifikasi tanpa induk.
   *
   * `operasiPemusnahanSurvei` menghapus lima tabel (`answers`,
   * `survey_responses`, `question_options`, `questions`, `ikm_results`) lalu
   * surveinya sendiri. `notifications` TIDAK termasuk, dan tautannya menunjuk
   * `/admin-opd/surveys/<id>/responses` (juga `/admin-kab/...`) — halaman yang sejak itu menjawab 404.
   *
   * Notifikasinya diterbitkan lewat JALUR APLIKASI (mengirim jawaban), bukan
   * ditanam langsung dengan `prisma.notification.create`. Itu disengaja: yang
   * diuji rantai penuhnya, sebab notifikasi yang ditanam tangan bisa saja
   * hijau karena ia kebetulan membawa medan yang benar, sementara jalur
   * sungguhan tidak.
   */
  it('BUG-014 — memusnahkan survei tidak meninggalkan notifikasi yang menautnya', async () => {
    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Pengunci notifikasi tanpa induk',
        periode: '2026-Q4',
        status: 'aktif',
        questions: {
          create: [
            { teks: 'Persyaratan', tipe: 'skala', isIkmUnsur: true, kodeUnsur: 'U1', urutan: 1 },
          ],
        },
      },
      include: { questions: true },
    });

    // Gerbang persetujuan PDP membaca `users.consent_at`, dan tanpa ini jalur
    // pengiriman dijawab 403 sebelum satu notifikasi pun terbit -- merah
    // karena sebab yang salah.
    await prisma.user.update({
      where: { id: penggunaId },
      data: { consentAt: new Date() },
    });

    const kirim = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${survei.id}/responses`)
      .set(devHeaders({ role: Role.responden, userId: penggunaId }))
      .send({
        answers: [{ questionId: survei.questions[0].id, nilai: 4 }],
        tanpaDataDiri: true,
      });
    expect(kirim.status).toBe(201);

    const menaut = { link: { contains: `/surveys/${survei.id}/` } };

    // KENDALI. Tanpa baris ini, pernyataan di bawah bisa hijau semata karena
    // tak ada notifikasi yang pernah terbit.
    expect(await prisma.notification.count({ where: menaut })).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${survei.id}`)
      .set(devHeaders({ role: Role.kabupaten, userId: penggunaId }))
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${survei.id}/purge`)
      .set(devHeaders({ role: Role.kabupaten, userId: penggunaId }))
      .expect(200);

    expect(await prisma.survey.findUnique({ where: { id: survei.id } })).toBeNull();
    expect(await prisma.notification.count({ where: menaut })).toBe(0);
  });

  it('Admin OPD memusnahkan survei OPD-NYA SENDIRI', async () => {
    // 30 September 2026: pemusnahan dibuka untuk Admin OPD atas permintaan
    // pengguna. Sebelumnya uji ini menuntut 403 bagi peran yang sama.
    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Dimusnahkan oleh OPD sendiri',
        periode: '2026-Q3',
        status: 'draft',
        deletedAt: new Date(),
      },
    });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${survei.id}/purge`)
      .set(opdHeaders());

    expect(res.status).toBe(200);
    expect(await prisma.survey.findUnique({ where: { id: survei.id } })).toBeNull();
  });

  it('Admin OPD TETAP ditolak memusnahkan survei OPD LAIN -> 403', async () => {
    // Uji terpenting dari pelebaran peran ini. Menambahkan Role.opd pada
    // `@Roles` melonggarkan SIAPA yang boleh; kurungan per-OPD di
    // `assertOpdAccess` yang menentukan APA yang boleh disentuhnya. Bila
    // kurungan itu ikut longgar tanpa ada yang memerah, satu OPD dapat
    // memusnahkan hasil pengukuran OPD lain.
    const punyaOrangLain = await prisma.survey.create({
      data: {
        opdId: opdLainId,
        judul: 'Milik OPD lain',
        periode: '2026-Q3',
        status: 'draft',
        deletedAt: new Date(),
      },
    });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/surveys/${punyaOrangLain.id}/purge`)
      .set(opdHeaders());

    expect(res.status).toBe(403);
    expect(await prisma.survey.findUnique({ where: { id: punyaOrangLain.id } })).not.toBeNull();
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

  /**
   * Kebijakan umur Sampah, dipajang di halaman Sampah kedua peran.
   *
   * Angkanya WAJIB dari server. Keterangan di layar yang berbeda dari kebijakan
   * yang sebenarnya berlaku justru merusak kepercayaan yang hendak
   * dibangunnya -- dan menulis "365" mati di antarmuka membuat perbedaan itu
   * tinggal menunggu seseorang mengubah env.
   */
  it('GET /surveys/trash/retensi memberi umur Sampah yang berlaku', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/surveys/trash/retensi')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ hari: 365 });
  });

  it('Admin OPD juga boleh membacanya -- halaman Sampah-nya memajangnya', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/surveys/trash/retensi')
      .set(opdHeaders());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ hari: 365 });
  });

  it('TIDAK ditelan rute :id — jawabannya 200, bukan 400 dari ParseIntPipe', async () => {
    // Pola yang sudah menggigit repo ini sebelumnya: rute literal yang
    // dideklarasikan sesudah rute berparameter dicocokkan sebagai `:id`, lalu
    // ParseIntPipe menolaknya. Uji controller tak dapat menangkapnya sebab
    // urutan pendaftaran baru ada saat aplikasi sungguhan dirakit.
    const res = await request(app.getHttpServer())
      .get('/api/v1/surveys/trash/retensi')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).not.toBe(400);
  });
});
