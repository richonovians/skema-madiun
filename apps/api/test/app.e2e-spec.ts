import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('App (e2e)', () => {
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

  it('GET /api/v1/health -> 200 dengan envelope sukses (Public)', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.statusCode).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.meta).toHaveProperty('timestamp');
    expect(response.body.meta).toHaveProperty('path', '/api/v1/health');
  });

  it('GET /api/v1/tidak-ada -> 404 dengan envelope error', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/tidak-ada');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('menyertakan header keamanan (helmet) — M5 hardening', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers).not.toHaveProperty('x-powered-by'); // helmet menyembunyikannya
  });

  it('CORS: origin yang diizinkan (CORS_ORIGIN) -> header Access-Control-Allow-Origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});
