import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * Alur end-to-end lintas peran (INT-29) -- BEDA dari spec per-modul lain
 * (surveys/complaints/users/dst e2e-spec.ts) yang menguji tiap endpoint
 * terisolasi dengan kasus tepi (403/404/validasi). Di sini satu narasi
 * berurutan yang benar-benar dijalani ketiga peran (Kabupaten, Admin OPD,
 * Responden) saling berinteraksi lewat API sungguhan -- Kabupaten membuat
 * akun Admin OPD, Admin OPD membuat & mempublikasikan survei, dua Responden
 * mengisi jawaban BERBEDA, Admin OPD melihat hasil & menangani pengaduan,
 * Responden melacak balasannya, Kabupaten memantau lintas-OPD & audit log --
 * meniru pola verifikasi Playwright+DB yang dipakai manual di tiap tiket
 * Fase 4, tapi sebagai test permanen yang bisa dijalankan CI berulang kali.
 */
describe('Alur End-to-End per Peran (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let opdId: number;
  let kabupatenUserId: number;
  let opdAdminUserId: number;
  let responden1Id: number;
  let responden2Id: number;

  let surveyId: number;
  let complaintId: number;
  let complaintTicketNo: string;

  /**
   * Akun admin pada perjalanan ini memegang DUA peran, dan itu diperbaiki
   * 7 September 2026 -- bukan sekadar tambalan agar hijau.
   *
   * Dulu ia ber-role `kabupaten` saja dan memakai satu helper untuk segalanya.
   * Sejak `kabupaten` & `superuser` dipisah (20 Agustus 2026), manajemen
   * pengguna dan audit log menjadi superuser-saja, sehingga langkah 1 dan 7
   * merah -- lalu langkah 4 & 5 ikut merah SEBAGAI RANTAI, karena
   * `opdAdminUserId` tak pernah terisi. Empat kegagalan, dua akar.
   *
   * Sekarang perjalanannya memodelkan rancangan multi-role yang sesungguhnya:
   * SATU akun (`e2e-jrn-kab`) memegang `[superuser, kabupaten]`, dan yang
   * menentukan hak adalah PERAN YANG SEDANG DIPAKAI. Itu pula bentuk akun nyata
   * di basis data pengguna. Jadi perjalanan ini kini ikut membuktikan mekanisme
   * peran-yang-dipakai, bukan cuma alur bisnisnya.
   */
  const superuserHeaders = () =>
    devHeaders({ role: Role.superuser, userId: kabupatenUserId, ssoSubject: 'e2e-jrn-kab' });
  const kabupatenHeaders = () =>
    devHeaders({ role: Role.kabupaten, userId: kabupatenUserId, ssoSubject: 'e2e-jrn-kab' });
  const opdHeaders = () =>
    devHeaders({ role: Role.opd, userId: opdAdminUserId, opdId, ssoSubject: 'e2e-jrn-opd' });
  const responden1Headers = () =>
    devHeaders({ role: Role.responden, userId: responden1Id, ssoSubject: 'e2e-jrn-r1' });
  const responden2Headers = () =>
    devHeaders({ role: Role.responden, userId: responden2Id, ssoSubject: 'e2e-jrn-r2' });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EJRN' },
      update: {},
      create: { kode: 'E2EJRN', nama: 'OPD E2E Journey', isActive: true },
    });
    opdId = opd.id;

    const kabupatenUser = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-jrn-kab' },
      // `roles` juga di `update`: baris SISA dari run sebelumnya hanya ber-role
      // kabupaten, dan tanpa ini perjalanan gagal pada mesin yang pernah
      // menjalankan versi lama berkas ini (pola sama seperti consentAt di bawah).
      update: { roles: [Role.superuser, Role.kabupaten] },
      create: {
        ssoSubject: 'e2e-jrn-kab',
        nama: 'Admin E2E Journey (superuser + kabupaten)',
        email: 'e2e-jrn-kab@example.go.id',
        roles: [Role.superuser, Role.kabupaten],
      },
    });
    kabupatenUserId = kabupatenUser.id;

    const r1 = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-jrn-r1' },
      // consentAt juga di `update` supaya baris SISA dari run sebelumnya
      // (yang dibuat sebelum penegakan PDP ada) ikut diperbaiki.
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-jrn-r1',
        nama: 'Responden Satu E2E',
        email: 'e2e-jrn-r1@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(), // celah 2: warga tanpa persetujuan PDP ditolak 403 saat mengirim data
      },
    });
    responden1Id = r1.id;

    const r2 = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-jrn-r2' },
      // consentAt juga di `update` supaya baris SISA dari run sebelumnya
      // (yang dibuat sebelum penegakan PDP ada) ikut diperbaiki.
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-jrn-r2',
        nama: 'Responden Dua E2E',
        email: 'e2e-jrn-r2@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(), // celah 2: warga tanpa persetujuan PDP ditolak 403 saat mengirim data
      },
    });
    responden2Id = r2.id;
  }, 60000);

  afterAll(async () => {
    if (surveyId) {
      await prisma.answer.deleteMany({ where: { response: { surveyId } } });
      await prisma.surveyResponse.deleteMany({ where: { surveyId } });
      await prisma.question.deleteMany({ where: { surveyId } });
      await prisma.ikmResult.deleteMany({ where: { surveyId } });
    }
    await prisma.survey.deleteMany({ where: { opdId } });
    if (complaintId) {
      await prisma.complaintReply.deleteMany({ where: { complaintId } });
      await prisma.complaint.deleteMany({ where: { id: complaintId } });
    }
    const userIds = [kabupatenUserId, opdAdminUserId, responden1Id, responden2Id].filter(Boolean);
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.user.deleteMany({
      where: { ssoSubject: { in: ['e2e-jrn-kab', 'e2e-jrn-opd', 'e2e-jrn-r1', 'e2e-jrn-r2'] } },
    });
    await prisma.opd.deleteMany({ where: { kode: 'E2EJRN' } });
    await app.close();
  }, 30000);

  describe('1. Superuser: siapkan akun Admin OPD', () => {
    it('POST /users (peran superuser) -> buat akun Admin OPD baru', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(superuserHeaders())
        .send({
          nama: 'Admin OPD E2E Journey',
          email: 'e2e-jrn-opd@example.go.id',
          roles: ['opd'],
          opdId,
          ssoSubject: 'e2e-jrn-opd',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.opdId).toBe(opdId);
      expect(res.body.data.isActive).toBe(true);
      opdAdminUserId = res.body.data.id;
    });
  });

  describe('2. Admin OPD: buat & publikasikan survei', () => {
    it('POST /surveys -> draft', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/surveys')
        .set(opdHeaders())
        .send({ judul: 'Survei Journey E2E', periode: '2026-Q1' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('draft');
      surveyId = res.body.data.id;
    });

    it('POST /surveys/:id/questions/template -> 9 unsur baku terpasang', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/surveys/${surveyId}/questions/template`)
        .set(opdHeaders());

      expect(res.status).toBe(200); // @HttpCode(OK) eksplisit -- terapkan ke resource yg sudah ada
      expect(res.body.data).toHaveLength(9);
      expect(res.body.data[0].kodeUnsur).toBe('U1');
    });

    it('PATCH /surveys/:id/status -> aktif', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${surveyId}/status`)
        .set(opdHeaders())
        .send({ status: 'aktif' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('aktif');
    });
  });

  describe('3. Responden: temukan survei, isi jawaban berbeda, ajukan pengaduan', () => {
    it('GET /surveys/active (Responden) -> survei baru terlihat', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/surveys/active')
        .set(responden1Headers());

      expect(res.status).toBe(200);
      expect((res.body.data as { id: number }[]).some((s) => s.id === surveyId)).toBe(true);
    });

    it('Responden 1: GET fill -> POST responses (semua nilai 4)', async () => {
      const fill = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/fill`)
        .set(responden1Headers());
      expect(fill.status).toBe(200);
      expect(fill.body.data.sudahMengisi).toBe(false);

      const answers = (fill.body.data.questions as { id: number }[]).map((q) => ({
        questionId: q.id,
        nilai: 4,
      }));
      const submit = await request(app.getHttpServer())
        .post(`/api/v1/surveys/${surveyId}/responses`)
        .set(responden1Headers())
        .send({ answers });

      expect(submit.status).toBe(201);
    });

    it('Responden 2: GET fill -> POST responses (semua nilai 2)', async () => {
      const fill = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/fill`)
        .set(responden2Headers());
      const answers = (fill.body.data.questions as { id: number }[]).map((q) => ({
        questionId: q.id,
        nilai: 2,
      }));
      const submit = await request(app.getHttpServer())
        .post(`/api/v1/surveys/${surveyId}/responses`)
        .set(responden2Headers())
        .send({ answers });

      expect(submit.status).toBe(201);
    });

    it('Responden 1: submit ulang -> 409 anti-duplikat', async () => {
      // Payload lengkap & valid (bukan kosong) -- validasi kelengkapan jawaban
      // jalan SEBELUM pengecekan anti-duplikat di service, jadi payload kosong
      // akan gagal 400 duluan, bukan 409 (baru ketahuan lewat test ini sendiri).
      const fill = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/fill`)
        .set(responden1Headers());
      expect(fill.body.data.sudahMengisi).toBe(true);

      const answers = (fill.body.data.questions as { id: number }[]).map((q) => ({
        questionId: q.id,
        nilai: 4,
      }));
      const res = await request(app.getHttpServer())
        .post(`/api/v1/surveys/${surveyId}/responses`)
        .set(responden1Headers())
        .send({ answers });

      expect(res.status).toBe(409);
    });

    it('POST /complaints (Responden 1) -> dapat nomor tiket', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set(responden1Headers())
        .field('opdId', String(opdId))
        .field('kategori', 'aduan')
        .field('judul', 'Pengaduan Journey E2E')
        .field('uraian', 'Uraian pengaduan test alur end-to-end lintas peran.');

      expect(res.status).toBe(201);
      expect(res.body.data.ticketNo).toMatch(/^PGD\d{8}[A-Z0-9]{4}$/);
      complaintId = res.body.data.id;
      complaintTicketNo = res.body.data.ticketNo;
    });
  });

  describe('4. Admin OPD: tinjau hasil survei & tangani pengaduan', () => {
    it('GET /surveys/:id/results -> NRR & IKM sesuai 2 respons (nilai 4 & 2)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/results`)
        .set(opdHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data.jumlahResponden).toBe(2);
      // NRR per unsur = rata-rata (4+2)/2 = 3 utk semua unsur (jawaban seragam per responden)
      expect(res.body.data.nrrPerUnsur.every((u: { nrr: number }) => u.nrr === 3)).toBe(true);
      // Nilai IKM = NRR rata2 tertimbang (3) x 25 = 75
      expect(res.body.data.nilaiIkm).toBe(75);
    });

    it('GET /surveys/:id/responses -> 2 respons, TANPA identitas pengisi', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/surveys/${surveyId}/responses`)
        .set(opdHeaders());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      for (const r of res.body.data) {
        expect(r.userId).toBeUndefined();
        expect(r.dedupeUserId).toBeUndefined();
        expect(r.answers.length).toBe(9);
      }
    });

    it('PATCH /complaints/:id/status -> diproses', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${complaintId}/status`)
        .set(opdHeaders())
        .send({ status: 'diproses' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('diproses');
    });

    it('POST /complaints/:id/replies (Admin OPD) -> balasan tersimpan', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/complaints/${complaintId}/replies`)
        .set(opdHeaders())
        .send({ pesan: 'Sedang kami tindaklanjuti (balasan e2e journey).' });

      expect(res.status).toBe(201);
      expect(res.body.data.authorId).toBe(opdAdminUserId);
    });
  });

  describe('5. Responden: lacak status & lihat balasan', () => {
    it('GET /complaints/:ticketNo (Responden 1) -> status diproses, opdNama terisi', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/complaints/${complaintTicketNo}`)
        .set(responden1Headers());

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('diproses');
      expect(res.body.data.opdNama).toBe('OPD E2E Journey');
    });

    it('GET /complaints/:id/replies (Responden 1) -> balasan Admin OPD terlihat', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/complaints/${complaintId}/replies`)
        .set(responden1Headers());

      expect(res.status).toBe(200);
      expect(res.body.data.some((r: { authorId: number }) => r.authorId === opdAdminUserId)).toBe(
        true,
      );
    });

    it('GET /complaints/:ticketNo (Responden 2, bukan pemilik) -> 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/complaints/${complaintTicketNo}`)
        .set(responden2Headers());

      expect(res.status).toBe(403);
    });
  });

  describe('6. Admin OPD: tutup periode survei -> snapshot IKM', () => {
    it('PATCH /surveys/:id/status -> ditutup, snapshot ikm_results tercatat', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/surveys/${surveyId}/status`)
        .set(opdHeaders())
        .send({ status: 'ditutup' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ditutup');

      const snapshot = await prisma.ikmResult.findUnique({
        where: { surveyId_periode: { surveyId, periode: '2026-Q1' } },
      });
      expect(snapshot).not.toBeNull();
      expect(Number(snapshot?.nilaiIkm)).toBe(75);
      expect(snapshot?.jumlahResponden).toBe(2);
    });
  });

  describe('7. Kabupaten: pantau lintas OPD, agregat IKM & audit log', () => {
    it('GET /complaints (Kabupaten) -> tiket OPD ini ikut terlihat (bukan cuma miliknya)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/complaints')
        .query({ status: 'diproses' })
        .set(kabupatenHeaders());

      expect(res.status).toBe(200);
      expect((res.body.data as { id: number }[]).some((c) => c.id === complaintId)).toBe(true);
    });

    it('GET /dashboard/ikm -> survei yang baru ditutup masuk peringkat', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/ikm')
        .set(kabupatenHeaders());

      expect(res.status).toBe(200);
      const item = (res.body.data.items as { surveyId: number; nilaiIkm: number }[]).find(
        (i) => i.surveyId === surveyId,
      );
      expect(item).toBeDefined();
      expect(item?.nilaiIkm).toBe(75);
    });

    it('GET /audit-logs (peran superuser) -> seluruh aksi Admin OPD di atas tercatat', async () => {
      // Audit log superuser-saja; pemantauan lintas OPD di dua uji sebelumnya
      // TETAP dengan peran kabupaten. Akun yang sama, hak yang berbeda --
      // itulah yang membuat pasangan ini berarti.
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .query({ actorId: opdAdminUserId, limit: 50 })
        .set(superuserHeaders());

      expect(res.status).toBe(200);
      const aksiTercatat = (res.body.data as { aksi: string; entitas: string }[]).map(
        (l) => `${l.entitas}.${l.aksi}`,
      );
      expect(aksiTercatat).toEqual(
        expect.arrayContaining([
          'survey.create',
          'survey.update_status',
          'complaint.update_status',
        ]),
      );
    });

    it('GET /audit-logs dengan peran KABUPATEN -> 403, walau akunnya sama', async () => {
      // Bukti bahwa yang menentukan hak adalah peran yang DIPAKAI, bukan daftar
      // role yang dimiliki akun. Tanpa uji ini, "superuser -> 200" di atas bisa
      // saja karena akunnya kebetulan istimewa.
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set(kabupatenHeaders());

      expect(res.status).toBe(403);
    });
  });
});
