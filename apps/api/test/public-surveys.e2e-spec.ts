import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuestionType, Role, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';
import { bersihkanAuditAkunUji } from './helpers/audit.helper';
import { bersihkanNotifikasiSurvei } from './helpers/notifikasi.helper';

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
    // Notifikasi jawaban survei menyasar akun kabupaten & superuser SUNGGUHAN
    // di basis data lokal, jadi pembersihannya tak bisa ikut penghapusan akun uji.
    await bersihkanNotifikasiSurvei(prisma, opdId);
    await prisma.survey.deleteMany({ where: { opdId } });
    // `audit_logs.actor_id` RESTRICT: akun yang pernah beraksi tak dapat
    // dihapus selama baris auditnya masih ada (aksi warga teraudit sejak
    // 13 September 2026).
    await bersihkanAuditAkunUji(prisma, ['e2e-pub-resp-1']);
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
        setuju: true,
      });

    expect(res.status).toBe(201);
    // Entity respons memang tak pernah memuat identitas pengisi.
    expect(Object.keys(res.body.data)).not.toContain('userId');

    const tersimpan = await prisma.surveyResponse.findUnique({
      where: { id: res.body.data.id },
    });
    expect(tersimpan?.userId).toBeNull();
    expect(tersimpan?.dedupeUserId).toBeNull();
    // Persetujuan UU PDP BERLAKU sejak 8 September 2026 (tim mengonfirmasi
    // keharusannya). Kolom yang dahulu disiapkan tanpa pernah diisi sekarang
    // memuat waktu server pada setiap pengiriman publik.
    expect(tersimpan?.consentAt).toBeInstanceOf(Date);
    // Tanpa demografis yang dikirim, kolomnya NULL tersurat, bukan nilai baku.
    expect(tersimpan?.jenisKelamin).toBeNull();
    expect(tersimpan?.kelompokUmur).toBeNull();
  });

  it('POST /public/surveys/:id/responses pada survei TANPA izinkanAnonim -> 404', async () => {
    const res = await request(app.getHttpServer())
      // `setuju` DIBAWA supaya penolakannya benar-benar datang dari gerbang
      // survei (404), bukan dari ValidationPipe (400) yang berjalan lebih
      // dahulu. Tanpa ini ujinya lulus karena sebab yang salah.
      .post(`/api/v1/public/surveys/${surveiBiasaId}/responses`)
      .send({ answers: [{ questionId: qSkala, nilai: 4 }], setuju: true });

    expect(res.status).toBe(404);
  });

  it('POST /public/surveys/:id/responses dengan jawaban tak lengkap -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      // `setuju` DIBAWA supaya 400-nya datang dari validasi JAWABAN, bukan dari
      // persetujuan yang kebetulan tak dikirim.
      .send({ answers: [{ questionId: qTeks, teks: 'tanpa skala' }], setuju: true });

    // Membuka jalur publik tidak melonggarkan validasi isi jawaban.
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain('Persetujuan');
  });

  /**
   * PERSETUJUAN UU PDP PADA JALUR PUBLIK (8 September 2026).
   *
   * Tim pengguna mengonfirmasi bahwa aplikasi SKEMA memang memerlukan
   * persetujuan PDP. Yang dijaga blok ini: penegakannya ada di BACKEND, bukan
   * di layar. Gerbang di frontend dapat dilewati dengan satu permintaan
   * langsung seperti yang dilakukan uji-uji di bawah, jadi tanpa penjaga di
   * DTO gerbang PDP-nya hanya hiasan.
   */
  it('POST tanpa medan `setuju` -> 400, dan pesannya menyebut persetujuan', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'x' },
        ],
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Persetujuan');
  });

  it('POST dengan `setuju: false` juga ditolak 400', async () => {
    // Bukan cuma medan yang HILANG. Tanpa `@Equals(true)`, `@IsBoolean()` saja
    // akan meloloskan `false` dan persetujuannya jadi formalitas kosong.
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'x' },
        ],
        setuju: false,
      });

    expect(res.status).toBe(400);
  });

  it('POST dengan persetujuan & demografis -> 201, ketiganya tersimpan', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 3 },
          { questionId: qTeks, teks: 'Cukup' },
        ],
        setuju: true,
        jenisKelamin: 'perempuan',
        kelompokUmur: '26-35',
      });

    expect(res.status).toBe(201);

    const tersimpan = await prisma.surveyResponse.findUnique({ where: { id: res.body.data.id } });
    expect(tersimpan?.consentAt).toBeInstanceOf(Date);
    expect(tersimpan?.jenisKelamin).toBe('perempuan');
    expect(tersimpan?.kelompokUmur).toBe('26-35');
    // Demografis TIDAK boleh diam-diam menautkan responsnya ke sebuah akun.
    expect(tersimpan?.userId).toBeNull();
  });

  it('kelompok umur di luar daftar -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'x' },
        ],
        setuju: true,
        kelompokUmur: '99-120',
      });

    expect(res.status).toBe(400);
  });

  it('jenis kelamin di luar enum -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'x' },
        ],
        setuju: true,
        jenisKelamin: 'lainnya',
      });

    expect(res.status).toBe(400);
  });

  /**
   * NAMA & NOMOR HP (permintaan pengguna 8 September 2026, membalik keputusan
   * hari yang sama untuk membuangnya).
   *
   * Diuji di sini, bukan cukup di unit test, karena yang dibuktikan justru dua
   * hal yang hanya ada di luar unit: `@Matches` yang dijalankan ValidationPipe
   * sungguhan, dan kolom VARCHAR yang benar-benar menerima nilainya.
   */
  it('POST dengan nama & nomor HP -> 201, keduanya tersimpan', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'Baik' },
        ],
        setuju: true,
        nama: 'Siti Aminah',
        nomorHp: '081234567890',
        jenisKelamin: 'perempuan',
        kelompokUmur: '26-35',
      });

    expect(res.status).toBe(201);

    const tersimpan = await prisma.surveyResponse.findUnique({ where: { id: res.body.data.id } });
    expect(tersimpan?.nama).toBe('Siti Aminah');
    expect(tersimpan?.nomorHp).toBe('081234567890');
    // Data diri TIDAK boleh diam-diam menautkan responsnya ke sebuah akun.
    expect(tersimpan?.userId).toBeNull();
  });

  it('nomor HP yang bentuknya tak dikenali -> 400, dan pesannya menyebut nomor HP', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'x' },
        ],
        setuju: true,
        nama: 'Siti Aminah',
        nomorHp: '12345',
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/nomor hp/i);
  });

  it('KONTROL: bentuk +62 DITERIMA', async () => {
    // Tanpa kontrol ini, uji di atas dapat lulus dengan cara menolak semua
    // nomor, dan pengisi yang menulis +62 akan tertahan tanpa sebab.
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'x' },
        ],
        setuju: true,
        nama: 'Siti Aminah',
        nomorHp: '+6281234567890',
      });

    expect(res.status).toBe(201);
    const tersimpan = await prisma.surveyResponse.findUnique({ where: { id: res.body.data.id } });
    expect(tersimpan?.nomorHp).toBe('+6281234567890');
  });

  it('nama satu huruf -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'x' },
        ],
        setuju: true,
        nama: 'A',
      });

    expect(res.status).toBe(400);
  });

  it('tanpaDataDiri: keempat kolom null walau payloadnya membawa isinya', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiAnonimId}/responses`)
      .send({
        answers: [
          { questionId: qSkala, nilai: 4 },
          { questionId: qTeks, teks: 'x' },
        ],
        setuju: true,
        tanpaDataDiri: true,
        nama: 'Siti Aminah',
        nomorHp: '081234567890',
        jenisKelamin: 'perempuan',
        kelompokUmur: '26-35',
      });

    expect(res.status).toBe(201);

    const tersimpan = await prisma.surveyResponse.findUnique({ where: { id: res.body.data.id } });
    expect(tersimpan?.nama).toBeNull();
    expect(tersimpan?.nomorHp).toBeNull();
    expect(tersimpan?.jenisKelamin).toBeNull();
    expect(tersimpan?.kelompokUmur).toBeNull();
    // Persetujuannya TETAP tercatat: yang dilewati hanya data dirinya, bukan
    // pemrosesan jawabannya.
    expect(tersimpan?.consentAt).toBeInstanceOf(Date);
  });

  /**
   * KONTROL. Perubahan ini tak boleh membuka survei yang pemiliknya TIDAK
   * mengizinkan pengisian tanpa login, sebanyak apa pun persetujuan yang
   * dikirim. Sudah ada uji 404-nya di atas; yang ini menegaskan bahwa
   * persetujuan bukan kunci yang membukanya.
   */
  it('KONTROL: survei tanpa izinkanAnonim tetap 404 walau persetujuan lengkap', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveiBiasaId}/responses`)
      .send({
        answers: [{ questionId: qSkala, nilai: 4 }],
        setuju: true,
        jenisKelamin: 'laki_laki',
        kelompokUmur: '17-25',
      });

    expect(res.status).toBe(404);
  });

  /**
   * CATATAN LINGKUNGAN, bukan kelonggaran.
   *
   * Versi pertama berkas ini memasang kontrol "endpoint berpenjaga -> 401 tanpa
   * sesi" dan kontrol itu GAGAL: menerima 200. Sebabnya bukan lubang keamanan,
   * melainkan StubAuthProvider yang dipakai seluruh e2e (NODE_ENV=test)
   * MEMPERLAKUKAN permintaan tanpa header x-dev-* sebagai `kabupaten`
   * (stub-auth.provider.ts:24). Jadi di lingkungan ini "tanpa sesi" tak punya
   * arti, dan tak ada gerbang 401 yang bisa dibuktikan tertutup. Sejak T6
   * (7 September 2026) `@Roles` ditegakkan apa adanya, sehingga permintaan
   * tanpa header itu kini DITOLAK 403 pada rute yang tak mengizinkan kabupaten
   * -- perbedaan 401 vs 403 itulah yang membuktikan ia terautentikasi sebagai
   * sesuatu, bukan sebagai tak-ada-siapa-pun.
   *
   * Fakta itu direkam sebagai uji supaya tak ada yang menambahkan kembali
   * kontrol 401 yang mustahil lulus di sini lalu menyangka menemukan lubang.
   * Bukti sesungguhnya bahwa `@Public()` bekerja DAN gerbang lama tetap 401 ada
   * di public-surveys-session.e2e-spec.ts, yang memaksa SessionAuthProvider
   * aktif. Di produksi hanya provider itu yang dipakai (auth.module.ts).
   */
  it('lingkungan: mode test memperlakukan permintaan tanpa header sebagai kabupaten', async () => {
    // TANDANYA berubah 7 September 2026, FAKTANYA tidak.
    //
    // Dulu buktinya: permintaan tanpa header menembus `/surveys/:id/fill`
    // (@Roles responden) dan menjawab 200 -- yang lolos lewat bypass menyeluruh
    // kabupaten atas @Roles, dan bypass itu dibongkar T6. Fakta yang direkam
    // uji ini tetap sama: tanpa header BUKAN "tanpa sesi", melainkan kabupaten.
    //
    // Sekarang dipatok dua sisi sekaligus, dan itu justru lebih tepat daripada
    // satu angka 200:
    const rutePerandaResponden = await request(app.getHttpServer()).get(
      `/api/v1/surveys/${surveiAnonimId}/fill`,
    );
    // 403, BUKAN 401: ia terautentikasi sebagai SESUATU -- cuma bukan responden.
    expect(rutePerandaResponden.status).toBe(403);
    expect(String(rutePerandaResponden.body.message)).toMatch(/responden/i);

    // Dan pada rute yang memang mengizinkan kabupaten, ia langsung dilayani
    // tanpa satu pun header -- itulah bagian yang berbahaya bila dilupakan.
    const ruteKabupaten = await request(app.getHttpServer()).get('/api/v1/surveys');
    expect(ruteKabupaten.status).toBe(200);
  });

  /**
   * JALUR BERPENJAGA: data diri DISALIN dari akun, tidak diterima dari payload.
   *
   * Gerbang bagi pengguna bersesi hanya menampilkan kotak anonim (permintaan
   * tersurat pengguna 8 September 2026), jadi isinya harus datang dari sumber
   * yang tak dapat dikarang pemanggil. Kedua uji di bawah memakai surveinya
   * sendiri dengan `allowMultipleSubmit`, supaya tak saling terganjal
   * anti-duplikat maupun mengganggu uji lain di berkas ini.
   */
  const surveiBersesi = async () => {
    const survei = await prisma.survey.create({
      data: {
        opdId,
        judul: 'SKM Data Diri Bersesi E2E',
        periode: '2026-Q3',
        status: SurveyStatus.aktif,
        allowMultipleSubmit: true,
        questions: {
          create: [{ teks: 'Kepuasan layanan', tipe: QuestionType.skala, urutan: 1 }],
        },
      },
      include: { questions: true },
    });
    return { id: survei.id, questionId: survei.questions[0].id };
  };

  it('bersesi: nama disalin dari akun, dan nomor HP tak pernah terisi', async () => {
    const { id, questionId } = await surveiBersesi();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${id}/responses`)
      .set(devHeaders({ role: Role.responden, userId: respondenId }))
      .send({ answers: [{ questionId, nilai: 4 }] });

    expect(res.status).toBe(201);

    const tersimpan = await prisma.surveyResponse.findUnique({ where: { id: res.body.data.id } });
    expect(tersimpan?.nama).toBe('Responden E2E Publik');
    expect(tersimpan?.userId).toBe(respondenId);
    // Tak ada sumbernya: Helpdesk tak mengirim nomor telepon dan `users` tak
    // punya kolomnya. Akun ini juga tak punya baris `respondent_profiles`,
    // yang merupakan keadaan paling sering terjadi.
    expect(tersimpan?.nomorHp).toBeNull();
    expect(tersimpan?.jenisKelamin).toBeNull();
    // Persetujuannya ada di `users.consentAt`, bukan di baris respons.
    expect(tersimpan?.consentAt).toBeNull();
  });

  it('bersesi + tanpaDataDiri: nama TIDAK tercatat walau akunnya punya nama', async () => {
    // KONTROL bagi uji di atas: tanpa ini, penyalinan nama dapat lulus dengan
    // cara mengabaikan pilihan anonim pengisi sama sekali.
    const { id, questionId } = await surveiBersesi();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${id}/responses`)
      .set(devHeaders({ role: Role.responden, userId: respondenId }))
      .send({ answers: [{ questionId, nilai: 4 }], tanpaDataDiri: true });

    expect(res.status).toBe(201);

    const tersimpan = await prisma.surveyResponse.findUnique({ where: { id: res.body.data.id } });
    expect(tersimpan?.nama).toBeNull();
    // Responsnya TETAP tertaut akun: anti-duplikat & riwayat survei pemiliknya
    // bergantung pada `userId`, dan pilihan anonim tak melepasnya (keputusan
    // pengguna 8 September 2026).
    expect(tersimpan?.userId).toBe(respondenId);
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
      .send({ answers: [{ questionId: qSkala, nilai: 4 }], setuju: true });
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
