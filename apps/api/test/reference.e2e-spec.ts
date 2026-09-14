import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { devHeaders } from './helpers/auth.helper';

describe('Reference (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  it('GET /api/v1/ref/unsur (kabupaten) -> 200 dengan 9 unsur', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/ref/unsur')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(9);
    expect(response.body.data[0]).toEqual({ kode: 'U1', teks: 'Persyaratan' });
  });

  it('GET /api/v1/ref/unsur (opd) -> 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/ref/unsur')
      .set(devHeaders({ role: Role.opd, opdId: 1 }));

    expect(response.status).toBe(200);
  });

  it('GET /api/v1/ref/unsur (responden) -> 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/ref/unsur')
      .set(devHeaders({ role: Role.responden }));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('GET /api/v1/ref/complaint-categories (responden) -> 200 (semua peran)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/ref/complaint-categories')
      .set(devHeaders({ role: Role.responden }));

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({ kode: expect.any(String), nama: expect.any(String) }),
    );
  });

  it('GET /api/v1/ref/complaint-categories (kabupaten) -> 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/ref/complaint-categories')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(response.status).toBe(200);
  });

  it('GET /api/v1/ref/complaint-sub-categories -> 404 (endpoint dihapus)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/ref/complaint-sub-categories')
      .set(devHeaders({ role: Role.responden }));

    expect(response.status).toBe(404);
  });
});
