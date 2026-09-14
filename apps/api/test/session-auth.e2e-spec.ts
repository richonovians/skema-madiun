import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Menguji jalur SessionAuthProvider SUNGGUHAN aktif (bukan StubAuthProvider) — satu-
 * satunya berkas e2e yang memaksa NODE_ENV selain 'test', karena AuthModule mengikat
 * AUTH_PROVIDER ke SessionAuthProvider untuk semua environment KECUALI 'test' (lihat
 * auth.module.ts). Seluruh e2e lain sengaja TETAP berjalan di bawah StubAuthProvider
 * (header x-dev-*) — berkas ini yang membuktikan jalur sungguhan (dev-login → Bearer
 * token → SessionAuthProvider → endpoint terproteksi) benar-benar berfungsi.
 */
describe('Session Auth end-to-end — SessionAuthProvider aktif (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development'; // paksa binding AUTH_PROVIDER -> SessionAuthProvider

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    // OPD tautan WAJIB sejak multi-role (5 September 2026): bertindak sebagai
    // Admin OPD menuntut `opdId` terisi -- akun ber-role `opd` tanpa tautan OPD
    // kini ditolak di gerbang (resolveActingRole -> OPD_WITHOUT_OPDID), bukan
    // dibiarkan masuk lalu gagal 403 di tengah jalan. Sebelumnya fixture ini
    // ber-`opdId: null`, keadaan yang memang tak lagi sah.
    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ESESS' },
      update: {},
      create: { kode: 'E2ESESS', nama: 'OPD E2E Sesi', isActive: true },
    });
    const user = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-session-auth' },
      update: { isActive: true, roles: [Role.opd], opdId: opd.id },
      create: {
        ssoSubject: 'e2e-session-auth',
        nama: 'Sesi E2E',
        email: 'sesi@auth.e2e.test',
        roles: [Role.opd],
        opdId: opd.id,
        isActive: true,
      },
    });
    userId = user.id;
  }, 60000);

  afterAll(async () => {
    // Sejak `dev-login` mencatat aksi `login` (2026-08-27), baris audit menahan
    // penghapusan penggunanya lewat RESTRICT -- lihat catatan di auth.e2e-spec.ts.
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.user.deleteMany({ where: { ssoSubject: 'e2e-session-auth' } });
    // OPD tautan dibuat berkas ini juga, jadi ia yang membersihkannya --
    // sesudah barisnya pengguna, karena user.opd_id menahannya.
    await prisma.opd.deleteMany({ where: { kode: 'E2ESESS' } });
    await app.close();
    process.env.NODE_ENV = originalNodeEnv;
  }, 30000);

  it('GET /auth/me TANPA Authorization sama sekali -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me dengan token asal-asalan -> 401 (bukan diterima sebagai header dev)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer token-palsu-bukan-jwt');
    expect(res.status).toBe(401);
  });

  it('header x-dev-role TIDAK lagi berpengaruh saat SessionAuthProvider aktif', async () => {
    // Membuktikan binding sungguhan berpindah — StubAuthProvider tak lagi dipakai,
    // jadi header dev diabaikan sepenuhnya (bukan celah keamanan yang tertinggal).
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('x-dev-role', 'kabupaten')
      .set('x-dev-user-id', String(userId));
    expect(res.status).toBe(401);
  });

  it('alur penuh: dev-login -> token -> Bearer -> GET /auth/me mengembalikan profil yang benar', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({ identifier: 'sesi@auth.e2e.test' });
    expect(login.status).toBe(201);
    const token = login.body.data.token as string;

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(me.status).toBe(200);
    expect(me.body.data.id).toBe(userId);
    expect(me.body.data.email).toBe('sesi@auth.e2e.test');
    // Kontrak /auth/me berubah bersama multi-role: `role` (tunggal) diganti
    // `roles` (kepemilikan) + `actingRole` (yang sedang dipakai). Akun ini
    // ber-role tunggal, jadi keduanya menunjuk 'opd' -- dan itu sekaligus
    // membuktikan cabang "tanpa klaim act & role tunggal" bekerja.
    expect(me.body.data.roles).toEqual(['opd']);
    expect(me.body.data.actingRole).toBe('opd');
  });

  it('akun dinonaktifkan SETELAH token diterbitkan -> token lama langsung ditolak (401)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/dev-login')
      .send({ identifier: 'sesi@auth.e2e.test' });
    const token = login.body.data.token as string;

    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(401);

    await prisma.user.update({ where: { id: userId }, data: { isActive: true } }); // pulihkan
  });
});
