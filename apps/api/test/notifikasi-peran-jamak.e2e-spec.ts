import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * KOTAK MASUK TERPISAH PER PERAN, LEWAT HTTP (16 September 2026, pertanyaan
 * pengguna soal akun berperan jamak).
 *
 * SATU akun, dua peran, dua sesi. Uji unit sudah menjaga bentuk kuerinya;
 * yang dijaga di sini adalah hal yang tak bisa dibuktikan mock: peran yang
 * dipakai sesi benar-benar sampai ke penyaring, dan hitungan belum-dibaca
 * ikut menyempit bersamanya.
 *
 * Sebelum pemisahan ini kedua sesi melihat DAFTAR YANG SAMA PERSIS, sementara
 * navigasinya dikurung per peran -- notifikasi pekerjaan admin tampil di sesi
 * warga lengkap dengan tautan yang dipantulkan proxy kembali ke beranda.
 */
describe('Notifikasi akun berperan jamak (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let userId: number;

  const sebagaiWarga = () => devHeaders({ role: Role.responden, userId });
  const sebagaiOpd = () => devHeaders({ role: Role.opd, userId, opdId });

  const daftar = (headers: Record<string, string>) =>
    request(app.getHttpServer()).get('/api/v1/notifications').set(headers);
  const hitungBelumDibaca = (headers: Record<string, string>) =>
    request(app.getHttpServer()).get('/api/v1/notifications/unread-count').set(headers);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EJAMAK' },
      update: {},
      create: { kode: 'E2EJAMAK', nama: 'OPD E2E Peran Jamak', isActive: true },
    });
    opdId = opd.id;

    const user = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-notif-jamak' },
      update: { roles: [Role.responden, Role.opd], opdId, consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-notif-jamak',
        nama: 'Warga Sekaligus Admin OPD',
        email: 'e2e-notif-jamak@example.go.id',
        roles: [Role.responden, Role.opd],
        opdId,
        consentAt: new Date(),
      },
    });
    userId = user.id;

    // Sisa run sebelumnya dibuang lebih dulu; kalau tidak, hitungan
    // belum-dibaca di bawah menghitung baris yang bukan milik run ini.
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.notification.createMany({
      data: [
        {
          userId,
          untukPeran: Role.responden,
          type: NotificationType.complaint_status_changed,
          title: 'Status Pengaduan Diperbarui',
          message: 'Pengaduan PGD-JAMAK kini berstatus "Selesai"',
          link: '/complaints/PGD-JAMAK',
        },
        {
          userId,
          untukPeran: Role.opd,
          type: NotificationType.complaint_created,
          title: 'Pengaduan Baru Masuk',
          message: 'Pengaduan baru PGD-LAIN masuk ke OPD Anda',
          link: '/admin-opd/complaints/PGD-LAIN',
        },
      ],
    });
  }, 60000);

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { ssoSubject: 'e2e-notif-jamak' } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EJAMAK' } });
    await app.close();
  }, 30000);

  it('sesi peran warga hanya melihat notifikasi warga', async () => {
    const res = await daftar(sebagaiWarga());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].link).toBe('/complaints/PGD-JAMAK');
  });

  it('sesi peran OPD hanya melihat notifikasi OPD, pada akun yang sama', async () => {
    const res = await daftar(sebagaiOpd());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].link).toBe('/admin-opd/complaints/PGD-LAIN');
  });

  it('hitungan belum dibaca menyempit mengikuti peran sesi', async () => {
    const warga = await hitungBelumDibaca(sebagaiWarga());
    const opd = await hitungBelumDibaca(sebagaiOpd());

    // Dua baris pada satu akun, tetapi tiap sesi hanya menghitung miliknya.
    expect(warga.body.data.count).toBe(1);
    expect(opd.body.data.count).toBe(1);
  });

  /**
   * Justru karena peran lain menyembunyikan notifikasinya, sesi ini tak boleh
   * menandainya terbaca: pemiliknya tak pernah punya kesempatan membacanya.
   */
  it('tandai semua dibaca dari sesi warga tidak membungkam notifikasi OPD', async () => {
    const patch = await request(app.getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .set(sebagaiWarga());

    expect(patch.status).toBe(200);
    expect(patch.body.data.updated).toBe(1);

    expect((await hitungBelumDibaca(sebagaiWarga())).body.data.count).toBe(0);
    expect((await hitungBelumDibaca(sebagaiOpd())).body.data.count).toBe(1);
  });
});
