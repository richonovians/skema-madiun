import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JenisKelamin, QuestionType, Role, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PENANDA_DISUNTING } from '../src/common/interceptors/audit-redact.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';
import { bersihkanNotifikasiSurvei } from './helpers/notifikasi.helper';
import { lewatiCaptcha } from './helpers/turnstile.helper';

/**
 * Laporan pengguna 13 September 2026: "log aktivitas dari role masyarakat masih
 * belum tercatat di audit logs".
 *
 * Sebabnya bukan penyaringan peran -- `AuditService.findAll` tak menyaring peran
 * sama sekali. Pencatatan audit bersifat opt-in lewat `@Audit(...)`, dan
 * kesembilan belas pemasangannya ada di handler admin. Terbukti dari basis data
 * lokal: akun murni `responden` hanya punya baris `auth` (login/logout/consent),
 * sementara `POST /complaints` (9 pengaduan) dan `POST /surveys/:id/responses`
 * (3 respons) tak menghasilkan satu baris audit pun -- untuk siapa pun.
 *
 * BERKAS TERSENDIRI: `POST /surveys/:id/responses` dibatasi 10 permintaan per
 * menit per IP, dan tiap berkas e2e memakai instans aplikasi sendiri sehingga
 * penghitung throttle-nya terpisah. Lihat survey-response-notifications.e2e-spec.ts.
 */
describe('Audit log aktivitas warga (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let respondenId: number;
  let surveyId: number;
  let questionId: number;
  let surveyAnonimId: number;
  let questionAnonimId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await lewatiCaptcha(
      Test.createTestingModule({ imports: [AppModule] }),
    ).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EAUDW' },
      update: {},
      create: { kode: 'E2EAUDW', nama: 'OPD E2E Audit Warga', isActive: true },
    });
    opdId = opd.id;

    const warga = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-audit-warga' },
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-audit-warga',
        nama: 'Warga E2E Audit',
        email: 'e2e-audit-warga@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    respondenId = warga.id;

    const survey = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Audit Warga E2E',
        periode: '2026-Q1',
        status: SurveyStatus.aktif,
        allowMultipleSubmit: true,
        questions: { create: [{ teks: 'Kepuasan layanan', tipe: QuestionType.skala, urutan: 1 }] },
      },
      include: { questions: true },
    });
    surveyId = survey.id;
    questionId = survey.questions[0].id;

    const anonim = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Anonim Audit E2E',
        periode: '2026-Q1',
        status: SurveyStatus.aktif,
        izinkanAnonim: true,
        allowMultipleSubmit: true,
        questions: { create: [{ teks: 'Kepuasan layanan', tipe: QuestionType.skala, urutan: 1 }] },
      },
      include: { questions: true },
    });
    surveyAnonimId = anonim.id;
    questionAnonimId = anonim.questions[0].id;
  }, 60000);

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: respondenId } });
    await prisma.complaintReply.deleteMany({ where: { complaint: { opdId } } });
    await prisma.complaintAttachment.deleteMany({ where: { complaint: { opdId } } });
    await prisma.complaint.deleteMany({ where: { opdId } });
    await bersihkanNotifikasiSurvei(prisma, opdId);
    await prisma.notification.deleteMany({ where: { userId: respondenId } });
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.respondentProfile.deleteMany({ where: { userId: respondenId } });
    await prisma.user.deleteMany({ where: { ssoSubject: 'e2e-audit-warga' } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EAUDW' } });
    await app.close();
  }, 30000);

  const asWarga = () => devHeaders({ role: Role.responden, userId: respondenId });

  const auditWarga = (entitas: string) =>
    prisma.auditLog.findMany({ where: { actorId: respondenId, entitas }, orderBy: { id: 'asc' } });

  it('POST /complaints -> tercatat sebagai create pengaduan oleh warga', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asWarga())
      .field('opdId', opdId)
      .field('kategori', 'aduan')
      .field('judul', 'Jalan rusak')
      .field('uraian', 'Jalan berlubang parah di depan balai desa');
    expect(res.status).toBe(201);

    const baris = await auditWarga('complaint');
    expect(baris).toHaveLength(1);
    expect(baris[0].aksi).toBe('create');
    // Isi keluhan adalah bagian paling pribadi dari sebuah pengaduan; yang
    // tercatat cukup "field mana yang disentuh".
    expect((baris[0].detail as { body: { uraian: string } }).body.uraian).toBe(PENANDA_DISUNTING);
  });

  it('POST /complaints/:id/replies -> tercatat sebagai create complaint_reply', async () => {
    const pengaduan = await prisma.complaint.findFirst({
      where: { opdId, userId: respondenId },
      orderBy: { id: 'desc' },
    });
    if (!pengaduan) throw new Error('Pengaduan dari uji sebelumnya tak ditemukan');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/complaints/${pengaduan.id}/replies`)
      .set(asWarga())
      .field('pesan', 'Sudah dua minggu belum ada tindakan');
    expect(res.status).toBe(201);

    const baris = await auditWarga('complaint_reply');
    expect(baris).toHaveLength(1);
    expect(baris[0].aksi).toBe('create');
    expect((baris[0].detail as { body: { pesan: string } }).body.pesan).toBe(PENANDA_DISUNTING);
  });

  /**
   * Cakupan yang disetujui pengguna: auditnya berbunyi "warga mengirim jawaban
   * survei ini", TANPA isinya. Kunci `answers` tetap terbaca supaya kalimat itu
   * masih dapat disusun; nilainya disunting.
   */
  it('POST /surveys/:id/responses -> tercatat, tanpa membocorkan jawabannya', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .set(asWarga())
      .send({ answers: [{ questionId, nilai: 4 }] });
    expect(res.status).toBe(201);

    const baris = await auditWarga('response');
    expect(baris).toHaveLength(1);
    expect(baris[0].aksi).toBe('create');

    const detail = baris[0].detail as { params: { surveyId: string }; body: { answers: unknown } };
    // Survei mana: terbaca. Dijawab apa: tidak.
    expect(String(detail.params.surveyId)).toBe(String(surveyId));
    expect(detail.body.answers).toBe(PENANDA_DISUNTING);
  });

  it('PATCH /auth/profile -> tercatat sebagai update_profile, tanpa isi datanya', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/auth/profile')
      .set(asWarga())
      // Keempat medan demografis dikirim sekaligus: profil demografis BARU
      // memang ditolak 400 kalau tak lengkap (aturan AuthService.updateProfile),
      // dan akun uji ini belum punya baris respondent_profiles.
      .send({
        nama: 'Warga E2E Audit',
        jenisKelamin: JenisKelamin.perempuan,
        kelompokUmur: '26-35',
        pendidikan: 'S1',
        pekerjaan: 'Wiraswasta',
      });
    expect(res.status).toBe(200);

    const baris = await auditWarga('user');
    expect(baris).toHaveLength(1);
    expect(baris[0].aksi).toBe('update_profile');
    expect((baris[0].detail as { body: { nama: string } }).body.nama).toBe(PENANDA_DISUNTING);
  });

  /**
   * Kondisi yang SENGAJA dibiarkan tak teraudit (disetujui pengguna 13 September
   * 2026): pengisi tanpa sesi tak punya baris `users`, sedangkan
   * `audit_logs.actor_id` non-null dengan foreign key ke tabel itu. Merekamnya
   * menuntut perubahan skema.
   *
   * Uji ini menjaga keputusan itu tetap disengaja: kalau suatu saat jalur publik
   * ikut diaudit, ia harus gagal di sini lebih dulu -- bukan meledak di produksi
   * karena pelanggaran foreign key.
   */
  it('pengisian survei TANPA SESI tidak menambah baris audit mana pun', async () => {
    const sebelum = await prisma.auditLog.count();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/surveys/${surveyAnonimId}/responses`)
      .send({ answers: [{ questionId: questionAnonimId, nilai: 4 }], setuju: true });
    expect(res.status).toBe(201);

    expect(await prisma.auditLog.count()).toBe(sebelum);
  });
});
