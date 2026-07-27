import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { OPD_SOURCE } from '../src/modules/opd/opd.constants';
import { devHeaders } from './helpers/auth.helper';

describe('OPD sync error (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // OPD-6: simulasikan Helpdesk tidak tersedia dengan meng-override OpdSource.
      .overrideProvider(OPD_SOURCE)
      .useValue({ fetchOpdList: () => Promise.reject(new Error('Helpdesk tidak tersedia')) })
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  it('POST /opd/sync -> 503 saat sumber Helpdesk gagal', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/opd/sync')
      .set(devHeaders({ role: Role.kabupaten }));

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
