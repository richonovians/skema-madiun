import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;

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

  it('Kabupaten membuat Admin OPD -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(devHeaders({ role: Role.kabupaten }))
      .send({ nama: 'Admin OPD E2E', email: 'opd@users.e2e.test', role: 'opd', opdId });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('opd');
    expect(res.body.data).not.toHaveProperty('deletedAt'); // field internal disembunyikan
  });

  it('Kabupaten (= superuser) membuat akun kabupaten lain -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(devHeaders({ role: Role.kabupaten }))
      .send({ nama: 'Kab E2E', email: 'kab@users.e2e.test', role: 'kabupaten' });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('kabupaten');
  });

  it('Kabupaten mengubah role akun lain (opd -> kabupaten) -> 200', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(devHeaders({ role: Role.kabupaten }))
      .send({ nama: 'Ubah Role E2E', email: 'ubahrole@users.e2e.test', role: 'opd', opdId });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${created.body.data.id}`)
      .set(devHeaders({ role: Role.kabupaten }))
      .send({ role: 'kabupaten' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('kabupaten');
  });

  it('Kabupaten DILARANG mengubah role akun sendiri (cegah self-lockout) -> 403', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(devHeaders({ role: Role.kabupaten }))
      .send({ nama: 'Self Lockout E2E', email: 'selflockout@users.e2e.test', role: 'kabupaten' });
    const selfId: number = created.body.data.id;

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${selfId}`)
      .set(devHeaders({ role: Role.kabupaten, userId: selfId }))
      .send({ role: 'opd', opdId });

    expect(res.status).toBe(403);
  });

  it('GET /users (kabupaten) -> 200 paginated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users?limit=5')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(200);
    expect(res.body.meta.pagination).toBeDefined();
  });

  it('GET /users (opd) -> 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set(devHeaders({ role: Role.opd, opdId }));

    expect(res.status).toBe(403);
  });

  it('GET /users/:id tidak ada -> 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/99999999')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(404);
  });
});
