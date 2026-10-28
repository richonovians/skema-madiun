import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * QA-SECURITY-UAT #1: akses silang (IDOR) pada endpoint yang terbuka bagi
 * SEMUA yang sudah masuk (tanpa `@Roles`). `RolesGuard` meloloskan setiap
 * sesi ke endpoint itu, jadi satu-satunya pagar antara warga A dan data warga
 * B, atau antara OPD A dan OPD B, adalah kode service. Peta lengkapnya ada di
 * `docs/TEST_KEAMANAN.md` cabang `tester`.
 *
 * SENGAJA lewat SessionAuthProvider SUNGGUHAN (dev-login -> Bearer), bukan
 * header `x-dev-*`. Di bawah StubAuthProvider identitas pemanggil ditentukan
 * header yang dikirim pemanggil itu sendiri, sehingga "menyamar sebagai orang
 * lain" adalah fitur uji, bukan serangan. Di sini penyerang hanya memegang
 * tokennya sendiri dan mengutak-atik apa yang memang ia kendalikan: jalur,
 * kueri, dan badan permintaan.
 *
 * Pengguna dan OPD fixture di-upsert dan DIBIARKAN: dev-login mencatat baris
 * `audit_logs` yang menahan penghapusan penggunanya, dan baris audit tidak
 * pernah dihapus. Yang dibuang hanya pengaduan dan notifikasi buatan berkas ini.
 */
describe('IDOR pada endpoint "semua yang masuk" (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const originalNodeEnv = process.env.NODE_ENV;

  const PREFIKS_TIKET = 'PGDIDOR';
  let opdA: number;
  let opdB: number;
  const id: Record<'wargaA' | 'wargaB' | 'adminA' | 'adminB', number> = {
    wargaA: 0,
    wargaB: 0,
    adminA: 0,
    adminB: 0,
  };
  const token: Record<keyof typeof id, string> = { wargaA: '', wargaB: '', adminA: '', adminB: '' };

  /** Pengaduan warga A ke OPD A, warga B ke OPD B, dan warga A tanpa tujuan. */
  const aduan = {
    milikA: { id: 0, ticketNo: '' },
    milikB: { id: 0, ticketNo: '' },
    tanpaTujuan: { id: 0, ticketNo: '' },
  };
  let notifA: number;

  const http = () => request(app.getHttpServer());
  const bearer = (siapa: keyof typeof token) => ({ Authorization: `Bearer ${token[siapa]}` });

  async function bersihkan(): Promise<void> {
    await prisma.complaint.deleteMany({ where: { ticketNo: { startsWith: PREFIKS_TIKET } } });
    await prisma.notification.deleteMany({
      where: {
        userId: { in: Object.values(id).filter((n) => n > 0) },
        title: { startsWith: '[IDOR]' },
      },
    });
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const buatOpd = (kode: string) =>
      prisma.opd.upsert({
        where: { kode },
        update: {},
        create: { kode, nama: `OPD E2E IDOR ${kode.slice(-1)}`, isActive: true },
      });
    opdA = (await buatOpd('E2EIDORA')).id;
    opdB = (await buatOpd('E2EIDORB')).id;

    const buatPengguna = async (
      kunci: keyof typeof id,
      roles: Role[],
      opdId: number | null,
    ): Promise<void> => {
      const ssoSubject = `e2e-idor-${kunci}`;
      const data = {
        roles,
        opdId,
        email: `${kunci.toLowerCase()}@idor.e2e.test`,
        isActive: true,
        deletedAt: null,
        consentAt: new Date(),
      };
      const user = await prisma.user.upsert({
        where: { ssoSubject },
        update: data,
        create: { ssoSubject, nama: `IDOR ${kunci}`, ...data },
      });
      id[kunci] = user.id;
    };
    await buatPengguna('wargaA', [Role.responden], null);
    await buatPengguna('wargaB', [Role.responden], null);
    await buatPengguna('adminA', [Role.opd], opdA);
    await buatPengguna('adminB', [Role.opd], opdB);

    await bersihkan();

    const buatAduan = async (sufiks: string, userId: number, opdId: number | null) => {
      const c = await prisma.complaint.create({
        data: {
          ticketNo: `${PREFIKS_TIKET}${sufiks}`,
          userId,
          opdId,
          kategori: 'aduan',
          judul: `[UJI IDOR] ${sufiks}`,
          uraian: `uraian rahasia ${sufiks}`,
        },
      });
      await prisma.complaintReply.create({
        data: {
          complaintId: c.id,
          authorId: userId,
          pesan: `balasan rahasia ${sufiks}`,
          dariPelapor: true,
        },
      });
      return { id: c.id, ticketNo: c.ticketNo };
    };
    aduan.milikA = await buatAduan('A1', id.wargaA, opdA);
    aduan.milikB = await buatAduan('B1', id.wargaB, opdB);
    aduan.tanpaTujuan = await buatAduan('A0', id.wargaA, null);

    notifA = (
      await prisma.notification.create({
        data: {
          userId: id.wargaA,
          untukPeran: Role.responden,
          type: NotificationType.complaint_status_changed,
          title: '[IDOR] milik warga A',
          message: 'notifikasi rahasia warga A',
        },
      })
    ).id;

    for (const kunci of Object.keys(token) as (keyof typeof token)[]) {
      const login = await http()
        .post('/api/v1/auth/dev-login')
        .send({ identifier: `e2e-idor-${kunci}` });
      expect(login.status).toBe(201);
      token[kunci] = login.body.data.token as string;
    }
  }, 60000);

  afterAll(async () => {
    await bersihkan();
    await app.close();
    process.env.NODE_ENV = originalNodeEnv;
  }, 30000);

  describe('GET /complaints', () => {
    const tiketDi = (res: request.Response) =>
      (res.body.data as { ticketNo: string }[]).map((c) => c.ticketNo);

    it('kontrol: warga A melihat pengaduannya sendiri', async () => {
      const res = await http().get('/api/v1/complaints?limit=100').set(bearer('wargaA'));
      expect(res.status).toBe(200);
      expect(tiketDi(res)).toEqual(
        expect.arrayContaining([aduan.milikA.ticketNo, aduan.tanpaTujuan.ticketNo]),
      );
    });

    it('warga B tidak melihat pengaduan warga A, juga dengan ?opdId= OPD A', async () => {
      for (const kueri of ['', `&opdId=${opdA}`, '&tanpaOpd=true']) {
        const res = await http().get(`/api/v1/complaints?limit=100${kueri}`).set(bearer('wargaB'));
        expect(res.status).toBe(200);
        expect(tiketDi(res)).not.toContain(aduan.milikA.ticketNo);
        expect(tiketDi(res)).not.toContain(aduan.tanpaTujuan.ticketNo);
      }
    });

    it('Admin OPD B tidak melihat pengaduan OPD A maupun yang tanpa tujuan, apa pun penyaringnya', async () => {
      for (const kueri of ['', `&opdId=${opdA}`, '&tanpaOpd=true']) {
        const res = await http().get(`/api/v1/complaints?limit=100${kueri}`).set(bearer('adminB'));
        expect(res.status).toBe(200);
        expect(tiketDi(res)).not.toContain(aduan.milikA.ticketNo);
        expect(tiketDi(res)).not.toContain(aduan.tanpaTujuan.ticketNo);
      }
    });
  });

  describe('GET /complaints/:ticketNo', () => {
    it('kontrol: pemilik dan Admin OPD tujuannya dapat membukanya', async () => {
      expect(
        (await http().get(`/api/v1/complaints/${aduan.milikA.ticketNo}`).set(bearer('wargaA')))
          .status,
      ).toBe(200);
      expect(
        (await http().get(`/api/v1/complaints/${aduan.milikA.ticketNo}`).set(bearer('adminA')))
          .status,
      ).toBe(200);
    });

    it.each([
      ['warga B', 'milik warga A', 'wargaB', 'milikA'],
      ['Admin OPD B', 'milik OPD A', 'adminB', 'milikA'],
      ['Admin OPD A', 'tanpa tujuan', 'adminA', 'tanpaTujuan'],
      ['warga A', 'milik warga B', 'wargaA', 'milikB'],
    ] as const)(
      '%s ditolak membuka pengaduan %s, tanpa isi apa pun',
      async (_n, _m, siapa, milik) => {
        const res = await http()
          .get(`/api/v1/complaints/${aduan[milik].ticketNo}`)
          .set(bearer(siapa));
        expect(res.status).toBe(403);
        expect(JSON.stringify(res.body)).not.toContain('rahasia');
      },
    );
  });

  describe('GET /complaints/:id/replies', () => {
    it('kontrol: pemilik membaca balasannya', async () => {
      const res = await http()
        .get(`/api/v1/complaints/${aduan.milikA.id}/replies`)
        .set(bearer('wargaA'));
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).toContain('balasan rahasia A1');
    });

    it.each([
      ['warga B', 'milik warga A', 'wargaB', 'milikA'],
      ['Admin OPD B', 'milik OPD A', 'adminB', 'milikA'],
      ['Admin OPD A', 'tanpa tujuan', 'adminA', 'tanpaTujuan'],
    ] as const)(
      '%s ditolak membaca balasan pengaduan %s lewat id',
      async (_n, _m, siapa, milik) => {
        const res = await http()
          .get(`/api/v1/complaints/${aduan[milik].id}/replies`)
          .set(bearer(siapa));
        expect(res.status).toBe(403);
        expect(JSON.stringify(res.body)).not.toContain('rahasia');
      },
    );
  });

  describe('notifikasi', () => {
    it('kontrol: warga A melihat notifikasinya', async () => {
      const res = await http().get('/api/v1/notifications?limit=100').set(bearer('wargaA'));
      expect(res.status).toBe(200);
      expect((res.body.data as { id: number }[]).map((n) => n.id)).toContain(notifA);
    });

    it('warga B tidak melihat notifikasi warga A, dan hitungannya tak ikut', async () => {
      const daftar = await http().get('/api/v1/notifications?limit=100').set(bearer('wargaB'));
      expect((daftar.body.data as { id: number }[]).map((n) => n.id)).not.toContain(notifA);

      const hitung = await http().get('/api/v1/notifications/unread-count').set(bearer('wargaB'));
      expect(hitung.status).toBe(200);
      expect(hitung.body.data.count).toBe(
        await prisma.notification.count({
          where: { userId: id.wargaB, isRead: false, untukPeran: Role.responden },
        }),
      );
    });

    it('warga B menandai dibaca notifikasi warga A lewat id -> 404, dan barisnya tetap belum dibaca', async () => {
      const res = await http().patch(`/api/v1/notifications/${notifA}/read`).set(bearer('wargaB'));
      expect(res.status).toBe(404);
      expect((await prisma.notification.findUniqueOrThrow({ where: { id: notifA } })).isRead).toBe(
        false,
      );
    });

    it('read-all warga B tidak menyentuh notifikasi warga A', async () => {
      const res = await http().patch('/api/v1/notifications/read-all').set(bearer('wargaB'));
      expect(res.status).toBe(200);
      expect((await prisma.notification.findUniqueOrThrow({ where: { id: notifA } })).isRead).toBe(
        false,
      );
    });
  });

  describe('profil dan peran', () => {
    it.each([
      ['roles', { roles: [Role.kabupaten] }],
      ['opdId', { opdId: 1 }],
      ['email', { email: 'ambil-alih@idor.e2e.test' }],
      ['id', { id: 1 }],
    ])(
      'PATCH /auth/profile menolak medan %s -> 400, dan akunnya tak berubah',
      async (_n, badan) => {
        const res = await http().patch('/api/v1/auth/profile').set(bearer('wargaB')).send(badan);
        expect(res.status).toBe(400);
        const user = await prisma.user.findUniqueOrThrow({ where: { id: id.wargaB } });
        expect(user.roles).toEqual([Role.responden]);
        expect(user.opdId).toBeNull();
        expect(user.email).toBe('wargab@idor.e2e.test');
      },
    );

    it('POST /auth/acting-role ke peran yang tak dimiliki -> 403', async () => {
      const res = await http()
        .post('/api/v1/auth/acting-role')
        .set(bearer('wargaB'))
        .send({ role: Role.kabupaten });
      expect(res.status).toBe(403);
    });

    it('GET /auth/me mengabaikan header x-dev-user-id milik orang lain', async () => {
      const res = await http()
        .get('/api/v1/auth/me')
        .set(bearer('wargaB'))
        .set('x-dev-user-id', String(id.wargaA))
        .set('x-dev-role', Role.kabupaten);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id.wargaB);
      expect(res.body.data.actingRole).toBe(Role.responden);
    });
  });

  // Terakhir, karena `logout-semua` mencabut token yang dipakai blok lain.
  describe('sesi', () => {
    it('GET /auth/sesi warga B tidak memuat sesi warga A', async () => {
      const milikA = await http().get('/api/v1/auth/sesi').set(bearer('wargaA'));
      expect(milikA.status).toBe(200);
      const sidA = (milikA.body.data as { sid: string }[]).map((s) => s.sid);
      expect(sidA.length).toBeGreaterThan(0);

      const milikB = await http().get('/api/v1/auth/sesi').set(bearer('wargaB'));
      expect(milikB.status).toBe(200);
      for (const sid of (milikB.body.data as { sid: string }[]).map((s) => s.sid)) {
        expect(sidA).not.toContain(sid);
      }
    });

    it('POST /auth/logout-semua warga B tidak memutus sesi warga A', async () => {
      expect(
        (await http().post('/api/v1/auth/logout-semua').set(bearer('wargaB'))).status,
      ).toBeLessThan(300);
      expect((await http().get('/api/v1/auth/me').set(bearer('wargaB'))).status).toBe(401);
      expect((await http().get('/api/v1/auth/me').set(bearer('wargaA'))).status).toBe(200);
    });
  });
});
