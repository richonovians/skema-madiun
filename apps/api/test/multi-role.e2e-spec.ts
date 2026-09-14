import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { SessionService } from '../src/modules/auth/session/session.service';

/**
 * BUKTI POKOK seluruh fitur multi-role: hak akses mengikuti peran yang SEDANG
 * DIPAKAI, bukan gabungan seluruh role yang dimiliki.
 *
 * `NODE_ENV='development'` dipaksa supaya SessionAuthProvider yang SUNGGUHAN
 * aktif (pola sama session-auth.e2e-spec.ts). Di NODE_ENV=test, StubAuthProvider
 * memperlakukan permintaan tanpa header sebagai `kabupaten` dan seluruh endpoint
 * menjawab 200 -- di lingkungan itu tak ada satu pun uji di berkas ini yang
 * membuktikan apa pun.
 *
 * Endpoint yang dipakai sebagai batu uji adalah `GET /audit-logs`: satu-satunya
 * pembeda `superuser` dari `kabupaten` (bersama manajemen pengguna), dan
 * penjagaannya ada DI DALAM service (`AuditService.assertSuperuser`), bukan di
 * `@Roles` -- karena peran berhak penuh melewati dekorator itu.
 */
describe('Multi-role: hak mengikuti peran yang dipakai (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let opdId: number;
  let userId: number;
  const originalNodeEnv = process.env.NODE_ENV;

  const KODE_OPD = 'E2EMROLE';
  const EMAIL = 'multirole@e2e.test';

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    sessionService = app.get(SessionService);

    const opd = await prisma.opd.upsert({
      where: { kode: KODE_OPD },
      update: {},
      create: { kode: KODE_OPD, nama: 'OPD E2E Multi-Role', isActive: true },
    });
    opdId = opd.id;

    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({
      data: {
        ssoSubject: 'e2e-multirole',
        nama: 'Pak A (Multi-Role)',
        email: EMAIL,
        roles: [Role.superuser, Role.opd],
        opdId,
        isActive: true,
      },
    });
    userId = user.id;
  }, 60000);

  afterAll(async () => {
    // Penjaga: tanpa ini `TypeError` dari pembersihan akan MENUTUPI galat
    // beforeAll yang sebenarnya (mis. basis data tak terjangkau).
    if (!prisma) {
      await app?.close();
      process.env.NODE_ENV = originalNodeEnv;
      return;
    }
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.opd.deleteMany({ where: { kode: KODE_OPD } });
    await app.close();
    process.env.NODE_ENV = originalNodeEnv;
  }, 30000);

  describe('hak ikut turun sesuai peran yang dipakai', () => {
    it('act=superuser -> GET /audit-logs 200', async () => {
      const token = sessionService.issue(userId, Role.superuser);

      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    /**
     * PASANGAN yang membuat uji di atas berarti: akun yang SAMA, hanya peran
     * yang dipakainya berbeda. Tanpa pasangan ini, "200" di atas bisa saja
     * karena endpointnya memang terbuka bagi siapa pun.
     */
    it('act=opd -> GET /audit-logs 403, walau akun MEMILIKI superuser', async () => {
      const token = sessionService.issue(userId, Role.opd);

      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('act=opd -> GET /users 403 (manajemen pengguna khusus superuser)', async () => {
      const token = sessionService.issue(userId, Role.opd);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('KONTROL: act=superuser -> GET /users 200', async () => {
      const token = sessionService.issue(userId, Role.superuser);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('memilih peran', () => {
    it('tanpa klaim act & role banyak -> 401 berkode ROLE_SELECTION_REQUIRED', async () => {
      const token = sessionService.issue(userId);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      // Kode KHAS, bukan 'UNAUTHORIZED': frontend membedakan "sesi mati" dari
      // "peran belum dipilih" lewat nilai ini, dan penanganannya berlawanan.
      expect(res.body.error.code).toBe('ROLE_SELECTION_REQUIRED');
    });

    /**
     * PASANGAN yang membuktikan endpoint /auth/roles memang ada gunanya:
     * /auth/me menolak, /auth/roles lolos. Tanpa yang kedua, halaman pemilih
     * peran tak akan pernah bisa memuat daftar pilihannya -- cacat yang lolos
     * seluruh uji unit dan baru ketangkap di peramban.
     */
    it('GET /auth/roles LOLOS walau peran belum dipilih', async () => {
      const token = sessionService.issue(userId);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/roles')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.roles).toEqual(expect.arrayContaining([Role.superuser, Role.opd]));
      // `actingRole` sengaja TIDAK disertakan: pada jalur ini perannya memang
      // belum ditentukan, dan mengarang nilainya hanya menyesatkan pemanggil.
      expect(res.body.data.actingRole).toBeUndefined();
    });

    it('POST /auth/acting-role BERHASIL walau peran belum dipilih', async () => {
      const token = sessionService.issue(userId);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/acting-role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: Role.opd });

      // Tanpa @AllowUnselectedRole() rute ini pun akan 401 dan akun ber-role
      // banyak terkurung tanpa jalan keluar selain logout.
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe(Role.opd);
      expect(res.body.data.token).toBeDefined();
    });

    it('token hasil ganti peran benar-benar membawa peran itu', async () => {
      const awal = sessionService.issue(userId);
      const ganti = await request(app.getHttpServer())
        .post('/api/v1/auth/acting-role')
        .set('Authorization', `Bearer ${awal}`)
        .send({ role: Role.superuser });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ganti.body.data.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.actingRole).toBe(Role.superuser);
      expect(res.body.data.roles).toEqual(expect.arrayContaining([Role.superuser, Role.opd]));
    });

    it('MENOLAK 403 peran yang tidak dimiliki akun', async () => {
      const token = sessionService.issue(userId, Role.superuser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/acting-role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: Role.responden });

      expect(res.status).toBe(403);
    });

    it('MENOLAK 400 peran di luar enum', async () => {
      const token = sessionService.issue(userId, Role.superuser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/acting-role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'raja' });

      expect(res.status).toBe(400);
    });
  });

  /**
   * Permintaan pengguna 6 September 2026: "ketika login sebagai admin OPD akan
   * langsung redirect ke OPD sesuai dengan dinas akun tersebut, meskipun
   * rolenya superuser. Jadi tetap tidak bisa masuk sebagai admin OPD selain
   * tempat dinas user tersebut."
   *
   * Akun uji di berkas ini memegang `[superuser, opd]` DAN tertaut satu OPD,
   * jadi ia tepat menjadi batu ujinya.
   */
  describe('dashboard OPD terikat dinas akun', () => {
    it('act=opd -> 200, memakai OPD akunnya sendiri tanpa parameter apa pun', async () => {
      const token = sessionService.issue(userId, Role.opd);

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/opd')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    /**
     * PASANGAN yang membuat uji di atas berarti. Tanpa ini, "200" di atas bisa
     * saja karena endpointnya terbuka bagi siapa pun.
     */
    it('act=superuser + ?opdId= -> 403, OPD lain tak dapat dibuka', async () => {
      const token = sessionService.issue(userId, Role.superuser);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/dashboard/opd?opdId=${opdId}`)
        .set('Authorization', `Bearer ${token}`);

      // 403, BUKAN 400: endpoint ini tak mendeklarasikan parameter query sama
      // sekali (DTO-nya dibuang 6 September 2026 bersama cabang superuser),
      // sehingga `?opdId=` diabaikan Nest tanpa kena forbidNonWhitelisted.
      // Yang ditolak perannya.
      expect(res.status).toBe(403);
    });

    it('act=superuser tanpa parameter -> 403 juga', async () => {
      const token = sessionService.issue(userId, Role.superuser);

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/opd')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('pencabutan role', () => {
    /**
     * Sifat yang HARUS bertahan dari sebelum multi-role ada: kepemilikan role
     * dibaca ulang dari basis data setiap permintaan, jadi mencabutnya berlaku
     * seketika -- bukan menunggu token kedaluwarsa.
     */
    it('mencabut role membatalkan pilihan pada permintaan BERIKUTNYA', async () => {
      const token = sessionService.issue(userId, Role.superuser);

      // Kontrol dulu: token ini memang sah SEBELUM pencabutan.
      const sebelum = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(sebelum.status).toBe(200);

      await prisma.user.update({ where: { id: userId }, data: { roles: [Role.opd] } });

      const sesudah = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(sesudah.status).toBe(401);
      expect(sesudah.body.error.code).toBe('ROLE_SELECTION_REQUIRED');

      await prisma.user.update({
        where: { id: userId },
        data: { roles: [Role.superuser, Role.opd] },
      });
    });
  });

  describe('akun ber-role tunggal tidak terpengaruh', () => {
    let tunggalId: number;
    const EMAIL_TUNGGAL = 'tunggal@e2e.test';

    beforeAll(async () => {
      await prisma.user.deleteMany({ where: { email: EMAIL_TUNGGAL } });
      const u = await prisma.user.create({
        data: {
          ssoSubject: 'e2e-tunggal',
          nama: 'Admin Tunggal',
          email: EMAIL_TUNGGAL,
          roles: [Role.kabupaten],
          isActive: true,
        },
      });
      tunggalId = u.id;
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { email: EMAIL_TUNGGAL } });
    });

    it('token TANPA klaim act tetap berfungsi, tanpa langkah memilih', async () => {
      const token = sessionService.issue(tunggalId);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.actingRole).toBe(Role.kabupaten);
    });
  });
});
