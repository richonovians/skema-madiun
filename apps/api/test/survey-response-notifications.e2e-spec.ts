import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, QuestionType, Role, SurveyStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';
import { bersihkanAuditAkunUji } from './helpers/audit.helper';
import { bersihkanNotifikasiSurvei } from './helpers/notifikasi.helper';

/**
 * Bukti ujung-ke-ujung untuk laporan 13 September 2026: "notifikasi responden
 * saat menjawab survei belum masuk ke admin OPD dan admin kabupaten/superuser".
 *
 * BERKAS TERSENDIRI, bukan tambahan pada responses.e2e-spec.ts, dan sebabnya
 * bukan kerapian: `POST /surveys/:id/responses` dibatasi 10 permintaan per
 * menit per IP, dan berkas itu sudah hampir menghabiskan jatahnya. Menumpang di
 * sana membuat uji yang SUDAH ADA gagal 429. Tiap berkas e2e memakai instans
 * aplikasi sendiri, jadi penghitung throttle-nya pun terpisah.
 */
describe('Notifikasi jawaban survei (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let respondenId: number;
  let adminOpdId: number;
  let surveyId: number;
  let questionId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ENOTIF' },
      update: {},
      create: { kode: 'E2ENOTIF', nama: 'OPD E2E Notifikasi Survei', isActive: true },
    });
    opdId = opd.id;

    const responden = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-notif-responden' },
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-notif-responden',
        nama: 'Responden E2E Notifikasi',
        email: 'e2e-notif-responden@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    respondenId = responden.id;

    // Admin OPD NYATA (baris `users`), bukan sekadar header x-dev-*: penerima
    // notifikasi dicari di basis data, bukan diambil dari permintaan.
    const adminOpd = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-notif-opd' },
      update: { opdId, isActive: true },
      create: {
        ssoSubject: 'e2e-notif-opd',
        nama: 'Admin OPD E2E Notifikasi',
        email: 'e2e-notif-opd@example.go.id',
        roles: [Role.opd],
        opdId,
        isActive: true,
      },
    });
    adminOpdId = adminOpd.id;

    const survey = await prisma.survey.create({
      data: {
        opdId,
        judul: 'Survei Notifikasi E2E',
        periode: '2026-Q1',
        status: SurveyStatus.aktif,
        allowMultipleSubmit: true,
        questions: { create: [{ teks: 'Kepuasan layanan', tipe: QuestionType.skala, urutan: 1 }] },
      },
      include: { questions: true },
    });
    surveyId = survey.id;
    questionId = survey.questions[0].id;
  }, 60000);

  afterAll(async () => {
    // SEBELUM surveinya dihapus: helper mencari id survei lewat opdId, dan
    // sesudah penghapusan idnya tak dapat ditemukan lagi. Juga sebelum akunnya
    // dihapus: `notifications.user_id` menahan penghapusan itu.
    await bersihkanNotifikasiSurvei(prisma, opdId);
    await prisma.surveyResponse.deleteMany({ where: { survey: { opdId } } });
    await prisma.survey.deleteMany({ where: { opdId } });
    // `audit_logs.actor_id` RESTRICT: akun yang pernah beraksi tak dapat
    // dihapus selama baris auditnya masih ada (aksi warga teraudit sejak
    // 13 September 2026).
    await bersihkanAuditAkunUji(prisma, ['e2e-notif-responden', 'e2e-notif-opd']);
    await prisma.user.deleteMany({
      where: { ssoSubject: { in: ['e2e-notif-responden', 'e2e-notif-opd'] } },
    });
    await prisma.opd.deleteMany({ where: { kode: 'E2ENOTIF' } });
    await app.close();
  }, 30000);

  const kirimJawaban = () =>
    request(app.getHttpServer())
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .set(devHeaders({ role: Role.responden, userId: respondenId }))
      .send({ answers: [{ questionId, nilai: 4 }] });

  const kabarUntukSurveiIni = () =>
    prisma.notification.findMany({
      where: { userId: adminOpdId, link: `/admin-opd/surveys/${surveyId}/responses` },
      orderBy: { id: 'asc' },
    });

  it('jawaban pertama -> satu notifikasi masuk ke Admin OPD pemilik survei', async () => {
    const res = await kirimJawaban();
    expect(res.status).toBe(201);

    const kabar = await kabarUntukSurveiIni();
    expect(kabar).toHaveLength(1);
    expect(kabar[0].type).toBe(NotificationType.survey_response_created);
    expect(kabar[0].title).toBe('Survei Mulai Menerima Jawaban');
    expect(kabar[0].message).toBe('Survei "Survei Notifikasi E2E" menerima jawaban pertama');
  });

  /**
   * Inilah yang membedakan keputusan tonggak dari "satu jawaban satu
   * notifikasi": jawaban kedua tersimpan, tapi loncengnya diam.
   */
  it('jawaban kedua tersimpan, tetapi TIDAK menambah notifikasi (bukan tonggak)', async () => {
    const res = await kirimJawaban();
    expect(res.status).toBe(201);

    expect(await prisma.surveyResponse.count({ where: { surveyId } })).toBe(2);
    expect(await kabarUntukSurveiIni()).toHaveLength(1);
  });

  it('notifikasinya tak menyebut identitas pengisi', async () => {
    const kabar = await kabarUntukSurveiIni();
    expect(kabar).toHaveLength(1);
    const teks = `${kabar[0].title} ${kabar[0].message}`;
    expect(teks).not.toContain(String(respondenId));
    expect(teks).not.toContain('Responden E2E Notifikasi');
  });
});
