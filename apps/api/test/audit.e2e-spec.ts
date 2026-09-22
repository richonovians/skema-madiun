import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PENANDA_DISUNTING } from '../src/common/interceptors/audit-redact.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Audit Log (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let opdUserId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EAUD' },
      update: {},
      create: { kode: 'E2EAUD', nama: 'OPD E2E Audit', isActive: true },
    });
    opdId = opd.id;

    const opdUser = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-audit-opd' },
      update: {},
      create: {
        ssoSubject: 'e2e-audit-opd',
        nama: 'Admin OPD Audit',
        email: 'e2e-audit-opd@example.go.id',
        roles: [Role.opd],
        opdId,
      },
    });
    opdUserId = opdUser.id;
  }, 60000);

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: opdUserId } });
    await prisma.survey.deleteMany({ where: { opdId } });
    await prisma.user.deleteMany({ where: { ssoSubject: 'e2e-audit-opd' } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EAUD' } });
    await app.close();
  }, 30000);

  const opdHeaders = () => devHeaders({ role: Role.opd, opdId, userId: opdUserId });
  /**
   * PEMBACA audit log kembali `kabupaten` sejak peleburan 15 September 2026
   * (sempat `superuser` sejak 20 Agustus 2026 -- dibereskan
   * 7 September 2026). Sejak keduanya dipisah (20 Agustus 2026),
   * `AuditService.assertSuperuser` menutup audit log bagi kabupaten -- di dalam
   * service, bukan lewat `@Roles`, karena RolesGuard memberi kedua peran itu
   * jalan pintas penuh atas dekorator tersebut. Tujuh uji di berkas ini merah
   * selama berminggu-minggu sebagai "kegagalan lama yang dimaklumi".
   */
  const kabupatenHeaders = () => devHeaders({ role: Role.kabupaten });

  it('POST /surveys (aksi tercatat) -> GET /audit-logs (Superuser) menampilkannya', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei Audit E2E', periode: '2026-Q2' });
    expect(created.status).toBe(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey' })
      .set(kabupatenHeaders());

    expect(res.status).toBe(200);
    // PEGANGANNYA `periode`, BUKAN `judul` (22 September 2026). Uji ini dulu
    // mencari barisnya lewat judul survei -- yang berarti ia bersandar pada
    // kebocoran yang justru sedang ditutup: sejak `judul` masuk daftar redaksi,
    // nilainya tak lagi ada di `audit_logs.detail`. `periode` bukan data
    // pribadi, tetap terbaca, dan dibuat khas per uji agar tetap menunjuk satu
    // baris.
    const entry = (
      res.body.data as {
        actorId: number;
        actorNama: string;
        aksi: string;
        entitas: string;
        detail: { body?: { judul?: string; periode?: string } };
      }[]
    ).find((e) => e.detail?.body?.periode === '2026-Q2');

    expect(entry).toBeDefined();
    expect(entry?.aksi).toBe('create');
    expect(entry?.actorId).toBe(opdUserId);
    expect(entry?.actorNama).toBe('Admin OPD Audit');
    // Dan judulnya memang TIDAK ada di sana. Tanpa asersi ini, pergantian
    // pegangan di atas hanya memindahkan masalahnya tanpa ada yang menjaga.
    expect(entry?.detail?.body?.judul).toBe(PENANDA_DISUNTING);
  });

  it('PATCH status memakai aksi eksplisit "update_status" (bukan default "update")', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei Status Audit', periode: '2026-Q1' });
    const id = created.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/surveys/${id}/status`)
      .set(opdHeaders())
      .send({ status: 'aktif' });

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey' })
      .set(kabupatenHeaders());

    const entry = (res.body.data as { aksi: string; detail: { params?: { id?: string } } }[]).find(
      (e) => e.aksi === 'update_status' && String(e.detail?.params?.id) === String(id),
    );
    expect(entry).toBeDefined();
  });

  it('DELETE survei tercatat dengan aksi "delete" (disimpulkan dari HTTP method)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei Hapus Audit', periode: '2026-Q1' });
    const id = created.body.data.id;

    await request(app.getHttpServer()).delete(`/api/v1/surveys/${id}`).set(opdHeaders());

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey', actorId: opdUserId })
      .set(kabupatenHeaders());

    const entry = (res.body.data as { aksi: string; detail: { params?: { id?: string } } }[]).find(
      (e) => e.aksi === 'delete' && String(e.detail?.params?.id) === String(id),
    );
    expect(entry).toBeDefined();
  });

  it('GET /audit-logs (Admin OPD) -> 403 (hanya Admin Kabupaten)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/audit-logs').set(opdHeaders());
    expect(res.status).toBe(403);
  });

  it('GET /audit-logs (Responden) -> 403, pesannya menyebut peran yang dibutuhkan', async () => {
    // PASANGAN yang membuat uji "Superuser -> 200" di atas berarti. Tanpa ini,
    // 200 itu bisa saja karena endpointnya terbuka bagi peran mana pun.
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set(devHeaders({ role: Role.responden }));

    expect(res.status).toBe(403);
    expect(String(res.body.message)).toMatch(/kabupaten/i);
  });

  it('GET /audit-logs/:id (Admin OPD) -> 403 juga', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs/1')
      .set(devHeaders({ role: Role.opd, opdId: 1 }));

    expect(res.status).toBe(403);
  });

  it('GET /audit-logs (Responden) -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set(devHeaders({ role: Role.responden, userId: 1 }));
    expect(res.status).toBe(403);
  });

  it('filter actorId membatasi hasil ke satu pelaku', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ actorId: opdUserId })
      .set(kabupatenHeaders());

    expect(res.status).toBe(200);
    expect((res.body.data as { actorId: number }[]).every((e) => e.actorId === opdUserId)).toBe(
      true,
    );
  });

  it('aksi non-mutasi (GET) TIDAK tercatat ke audit log', async () => {
    await request(app.getHttpServer()).get('/api/v1/surveys').set(opdHeaders());

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ actorId: opdUserId })
      .set(kabupatenHeaders());

    const hasGetEntry = (res.body.data as { aksi: string }[]).some((e) => e.aksi === 'get');
    expect(hasGetEntry).toBe(false);
  });

  it('GET /audit-logs/:id (Superuser) mengembalikan satu entri sesuai id', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/surveys')
      .set(opdHeaders())
      .send({ judul: 'Survei Detail Audit', periode: '2026-Q3' });

    const list = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .query({ entitas: 'survey', actorId: opdUserId })
      .set(kabupatenHeaders());
    // Lihat catatan pegangan `periode` pada uji pertama berkas ini.
    const entry = (
      list.body.data as { id: number; detail: { body?: { periode?: string } } }[]
    ).find((e) => e.detail?.body?.periode === '2026-Q3');
    expect(entry).toBeDefined();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/audit-logs/${entry?.id}`)
      .set(kabupatenHeaders());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(entry?.id);
    expect(res.body.data.actorNama).toBe('Admin OPD Audit');
  });

  it('GET /audit-logs/:id tidak ditemukan -> 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs/999999999')
      .set(kabupatenHeaders());
    expect(res.status).toBe(404);
  });

  it('GET /audit-logs/:id (Admin OPD) -> 403 (hanya Admin Kabupaten)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/audit-logs/1').set(opdHeaders());
    expect(res.status).toBe(403);
  });
});
