import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * KEBIJAKAN YANG BERUBAH, bukan uji yang rusak (dibereskan 7 September 2026).
 *
 * Berkas ini ditulis ketika `kabupaten` masih setara superuser. Sejak keduanya
 * dipisah (20 Agustus 2026), manajemen pengguna menjadi HANYA superuser —
 * ditegakkan `UsersService.assertSuperuser`, di dalam service dan bukan lewat
 * `@Roles`, karena RolesGuard memberi kabupaten & superuser jalan pintas penuh
 * atas dekorator itu. Sepuluh uji di sini lalu merah selama berminggu-minggu
 * sebagai "kegagalan lama yang dimaklumi".
 *
 * Yang dilakukan sekarang: perannya diperbaiki menjadi `superuser`, DAN
 * ditambahkan blok yang menegaskan `kabupaten` kini ditolak. Kebijakan yang
 * berubah harus terbaca sebagai keputusan yang diuji, bukan sebagai uji yang
 * dihapus tanpa jejak.
 *
 * Ada asumsi lama KEDUA yang baru terlihat sesudah perannya dibetulkan:
 * `data.role` (tunggal) sudah tak ada sejak entity beralih ke `roles: Role[]`
 * (5 September 2026). Ia tersembunyi di balik kegagalan peran selama ini —
 * contoh persis mengapa kegagalan yang dimaklumi berbahaya: ia menyembunyikan
 * kegagalan berikutnya.
 *
 * PESANNYA ikut diperiksa pada uji anti-self-lockout, dan itu bukan kerewelan:
 * `assertSuperuser` dan anti-self-lockout keduanya menjawab 403. Tanpa memeriksa
 * pesannya, uji self-lockout akan tetap hijau bahkan bila yang menolak
 * sebenarnya gerbang peran — yaitu lulus karena sebab yang salah, persis
 * keadaan yang membuat dua uji di berkas ini dulu tampak sehat.
 */
/**
 * Cocok untuk KEDUA gerbang, dan itu memang yang diinginkan sejak T6 dibereskan
 * (7 September 2026): `@Roles(Role.superuser)` pada controller kini ditegakkan
 * guard ("Sumber daya ini hanya untuk peran: superuser"), sementara
 * `UsersService.assertSuperuser` tetap ada sebagai lapis kedua ("Manajemen
 * pengguna hanya dapat diakses oleh Superuser"). Yang dijaga di sini: penolakan
 * itu MENYEBUT superuser, sehingga tak tertukar dengan penolakan lain --
 * anti-self-lockout tetap diperiksa dengan pesannya sendiri.
 */
const PESAN_SUPERUSER = /superuser/i;

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;

  /** Semua manajemen pengguna kini menuntut peran-yang-dipakai `superuser`. */
  const asSuper = (userId?: number) => devHeaders({ role: Role.superuser, userId });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EUSR' },
      update: {},
      create: { kode: 'E2EUSR', nama: 'OPD E2E Users', isActive: true },
    });
    opdId = opd.id;
  }, 60000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@users.e2e.test' } } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EUSR' } });
    await app.close();
  }, 30000);

  const buatAkun = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/v1/users').set(asSuper()).send(body);

  describe('Superuser mengelola akun', () => {
    it('Superuser membuat Admin OPD -> 201', async () => {
      const res = await buatAkun({
        nama: 'Admin OPD E2E',
        email: 'opd@users.e2e.test',
        roles: ['opd'],
        opdId,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.roles).toEqual(['opd']);
      expect(res.body.data).not.toHaveProperty('deletedAt'); // field internal disembunyikan
    });

    it('Superuser membuat akun kabupaten -> 201', async () => {
      const res = await buatAkun({
        nama: 'Kab E2E',
        email: 'kab@users.e2e.test',
        roles: ['kabupaten'],
      });

      expect(res.status).toBe(201);
      expect(res.body.data.roles).toEqual(['kabupaten']);
    });

    it('Superuser mengubah role akun lain (opd -> kabupaten) -> 200', async () => {
      const created = await buatAkun({
        nama: 'Ubah Role E2E',
        email: 'ubahrole@users.e2e.test',
        roles: ['opd'],
        opdId,
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${created.body.data.id}`)
        .set(asSuper())
        .send({ roles: ['kabupaten'] });

      expect(res.status).toBe(200);
      expect(res.body.data.roles).toEqual(['kabupaten']);
    });

    it('GET /users (superuser) -> 200 paginated', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users?limit=5').set(asSuper());

      expect(res.status).toBe(200);
      expect(res.body.meta.pagination).toBeDefined();
    });

    it('GET /users/stats (superuser) -> 200', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users/stats').set(asSuper());

      expect(res.status).toBe(200);
      expect(typeof res.body.data.activeUsers).toBe('number');
      expect(typeof res.body.data.totalUsers).toBe('number');
    });

    it('GET /users/:id tidak ada -> 404', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users/99999999').set(asSuper());

      expect(res.status).toBe(404);
    });

    it('Superuser menghapus akun lain (soft delete) -> 200, hilang dari GET /users', async () => {
      const created = await buatAkun({
        nama: 'Hapus E2E',
        email: 'hapus@users.e2e.test',
        roles: ['opd'],
        opdId,
      });
      const targetId: number = created.body.data.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/users/${targetId}`)
        .set(asSuper());

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/users/${targetId}`)
        .set(asSuper());
      expect(detail.status).toBe(404); // findOne memfilter deletedAt: null
    });

    it('DELETE /users/:id tidak ada -> 404', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/users/99999999')
        .set(asSuper());

      expect(res.status).toBe(404);
    });
  });

  describe('anti-self-lockout (dijaga PESANnya, bukan cuma statusnya)', () => {
    it('Superuser DILARANG mengubah role akun sendiri -> 403 "role akun sendiri"', async () => {
      const created = await buatAkun({
        nama: 'Self Lockout E2E',
        email: 'selflockout@users.e2e.test',
        roles: ['superuser'],
      });
      const selfId: number = created.body.data.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${selfId}`)
        .set(asSuper(selfId))
        .send({ roles: ['opd'], opdId });

      expect(res.status).toBe(403);
      // Bukan 403 dari gerbang peran: yang menolak harus anti-self-lockout.
      expect(String(res.body.message)).toMatch(/role akun sendiri/i);
    });

    it('Superuser DILARANG menghapus akun sendiri -> 403 "menghapus akun sendiri"', async () => {
      const created = await buatAkun({
        nama: 'Self Delete E2E',
        email: 'selfdelete@users.e2e.test',
        roles: ['superuser'],
      });
      const selfId: number = created.body.data.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/users/${selfId}`)
        .set(asSuper(selfId));

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(/menghapus akun sendiri/i);
    });
  });

  /**
   * PASANGAN yang membuat blok pertama berarti. Tanpa blok ini, "superuser ->
   * 200" bisa saja karena endpointnya terbuka bagi peran mana pun.
   */
  describe('kabupaten BUKAN superuser (kebijakan 20 Agustus 2026)', () => {
    const asKab = () => devHeaders({ role: Role.kabupaten });

    it('GET /users (kabupaten) -> 403', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users').set(asKab());

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(PESAN_SUPERUSER);
    });

    it('GET /users/stats (kabupaten) -> 403', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users/stats').set(asKab());

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(PESAN_SUPERUSER);
    });

    it('POST /users (kabupaten) -> 403, dan akunnya TIDAK terbuat', async () => {
      const email = 'ditolak-kab@users.e2e.test';

      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(asKab())
        .send({ nama: 'Tak Boleh', email, roles: ['opd'], opdId });

      expect(res.status).toBe(403);
      // Bukan cuma status penolakannya: tak boleh ada baris yang sempat lahir.
      await expect(prisma.user.findFirst({ where: { email } })).resolves.toBeNull();
    });

    it('PATCH /users/:id (kabupaten) -> 403, dan role TIDAK berubah', async () => {
      const created = await buatAkun({
        nama: 'Target Kab E2E',
        email: 'target-kab@users.e2e.test',
        roles: ['opd'],
        opdId,
      });
      const id: number = created.body.data.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${id}`)
        .set(asKab())
        .send({ roles: ['superuser'] });

      expect(res.status).toBe(403);
      const sesudah = await prisma.user.findUnique({ where: { id }, select: { roles: true } });
      expect(sesudah?.roles).toEqual([Role.opd]);
    });

    it('DELETE /users/:id (kabupaten) -> 403, dan akunnya TETAP aktif', async () => {
      const created = await buatAkun({
        nama: 'Hapus Kab E2E',
        email: 'hapus-kab@users.e2e.test',
        roles: ['opd'],
        opdId,
      });
      const id: number = created.body.data.id;

      const res = await request(app.getHttpServer()).delete(`/api/v1/users/${id}`).set(asKab());

      expect(res.status).toBe(403);
      const sesudah = await prisma.user.findUnique({
        where: { id },
        select: { isActive: true, deletedAt: true },
      });
      expect(sesudah?.isActive).toBe(true);
      expect(sesudah?.deletedAt).toBeNull();
    });

    it('GET /users (opd) -> 403 juga (kontrol peran lain)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set(devHeaders({ role: Role.opd, opdId }));

      expect(res.status).toBe(403);
    });
  });
});
