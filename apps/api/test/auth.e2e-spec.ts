import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Auth me/profile (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const user = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-responden' },
      update: {},
      create: {
        ssoSubject: 'e2e-responden',
        nama: 'Responden E2E',
        email: 'responden@auth.e2e.test',
        role: Role.responden,
        isActive: true,
      },
    });
    userId = user.id;
  }, 60000);

  afterAll(async () => {
    await prisma.respondentProfile.deleteMany({ where: { userId } });
    // WAJIB sebelum menghapus penggunanya (2026-08-27): sejak `dev-login` &
    // callback SSO mencatat aksi `login` ke audit log, baris itu ada dan
    // `audit_logs.actor_id` ber-RESTRICT. Itu bukan cacat melainkan justru
    // gunanya jejak audit -- ia harus bertahan lebih lama daripada penggunanya.
    // Produksi memakai SOFT delete sehingga tak pernah menabrak ini; hanya
    // pembersihan e2e yang benar-benar menghapus baris.
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.user.deleteMany({ where: { ssoSubject: 'e2e-responden' } });
    await app.close();
  }, 30000);

  it('GET /auth/me -> 200 profil pengguna aktif (tanpa field internal)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(devHeaders({ role: Role.responden, userId }));

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('responden@auth.e2e.test');
    expect(res.body.data.respondentProfile).toBeNull();
    expect(res.body.data).not.toHaveProperty('deletedAt');
  });

  it('PATCH /auth/profile (responden) -> 200 mengisi demografis', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/auth/profile')
      .set(devHeaders({ role: Role.responden, userId }))
      .send({
        nama: 'Responden Updated',
        jenisKelamin: 'perempuan',
        kelompokUmur: '30-39',
        pendidikan: 'S1',
        pekerjaan: 'Wiraswasta',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.nama).toBe('Responden Updated');
    expect(res.body.data.respondentProfile.pekerjaan).toBe('Wiraswasta');
  });

  it('PATCH /auth/profile (responden) profil baru tak lengkap -> 400', async () => {
    // Hapus profil dulu agar dianggap pembuatan baru.
    await prisma.respondentProfile.deleteMany({ where: { userId } });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/auth/profile')
      .set(devHeaders({ role: Role.responden, userId }))
      .send({ jenisKelamin: 'laki_laki' });

    expect(res.status).toBe(400);
  });

  describe('POST /auth/dev-login (INT-2)', () => {
    it('identifier = email -> 200, token + profil, lastLoginAt terisi', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .send({ identifier: 'responden@auth.e2e.test' });

      expect(res.status).toBe(201);
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.token.split('.')).toHaveLength(3); // format JWT
      expect(res.body.data.user.email).toBe('responden@auth.e2e.test');

      const updated = await prisma.user.findUnique({ where: { id: userId } });
      expect(updated?.lastLoginAt).not.toBeNull();
    });

    it('identifier = ssoSubject -> 200 (bukan hanya email)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .send({ identifier: 'e2e-responden' });
      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('responden@auth.e2e.test');
    });

    it('identifier tidak dikenal -> 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .send({ identifier: 'tidak-ada-di-manapun' });
      expect(res.status).toBe(404);
    });

    it('pengguna nonaktif -> 403', async () => {
      const inactive = await prisma.user.upsert({
        where: { ssoSubject: 'e2e-devlogin-inactive' },
        update: { isActive: false },
        create: {
          ssoSubject: 'e2e-devlogin-inactive',
          nama: 'Nonaktif E2E',
          email: 'nonaktif@auth.e2e.test',
          role: Role.responden,
          isActive: false,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .send({ identifier: 'nonaktif@auth.e2e.test' });
      expect(res.status).toBe(403);

      // Akun nonaktif ditolak SEBELUM audit dicatat, jadi tak ada baris audit
      // untuk dibersihkan di sini -- dan itu memang yang diuji di unit test
      // ("akun nonaktif ditolak tanpa dicatat sebagai login").
      await prisma.user.delete({ where: { id: inactive.id } });
    });

    it('tanpa identifier -> 400 (validasi DTO)', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/dev-login').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('dengan header dev valid -> 200 { success: true }', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set(devHeaders({ role: Role.responden, userId }));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ success: true });
    });
  });
});
