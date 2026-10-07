import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { PenerbitSesi } from '../src/modules/auth/session/penerbit-sesi.service';

/**
 * Laporan pengguna 14 September 2026: akun warga ber-peran banyak yang belum
 * menyetujui PDP tetap dipantulkan dari /persetujuan.
 *
 * Akarnya: saat login, akun ber-peran banyak belum punya `actingRole`, sehingga
 * `consentRequired` bernilai false -- yang berarti "belum dapat ditentukan",
 * BUKAN "sudah menyetujui". Frontend menulis cookie `consent=1` dari nilai itu,
 * lalu `POST /auth/acting-role` mengganti perannya tanpa pernah mengoreksi
 * cookie tadi, sebab responsnya memang tak pernah menyebut persetujuan.
 *
 * Uji ini menuntut respons ganti-peran melaporkan kebutuhan persetujuan UNTUK
 * PERAN YANG BARU DIPILIH, supaya frontend punya kebenaran untuk ditulis.
 *
 * `NODE_ENV='development'` dipaksa supaya SessionAuthProvider yang sungguhan
 * aktif; di NODE_ENV=test, StubAuthProvider memperlakukan setiap permintaan
 * sebagai kabupaten dan tak ada satu pun uji di sini yang membuktikan apa pun.
 *
 * TOKENNYA DITERBITKAN LEWAT `PenerbitSesi`, BUKAN `SessionService.issue()`
 * (7 Oktober 2026). Sejak daftar pencabutan sesi hidup, `issue()` menempelkan
 * klaim `sid` tanpa mendaftarkannya ke penyimpan, dan karena pemeriksaan sesi
 * gagal tertutup setiap token semacam itu dijawab 401. Uji yang mencetak token
 * di belakang pintu penerbitan karena itu menguji jalur yang tak pernah dilalui
 * pengguna sungguhan.
 */
const EMAIL = 'e2e-actingrole-consent@example.go.id';
const SUBJECT = 'e2e-actingrole-consent';

describe('Ganti peran & persetujuan PDP (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let penerbit: PenerbitSesi;
  let userId: number;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    penerbit = app.get(PenerbitSesi);

    await prisma.user.deleteMany({ where: { ssoSubject: SUBJECT } });
    // Meniru persis akun yang dilaporkan: dua peran, persetujuan masih kosong.
    const user = await prisma.user.create({
      data: {
        ssoSubject: SUBJECT,
        nama: 'Warga Merangkap Kabupaten',
        email: EMAIL,
        roles: [Role.responden, Role.kabupaten],
        isActive: true,
        consentAt: null,
      },
    });
    userId = user.id;
  }, 60000);

  afterAll(async () => {
    if (!prisma) {
      await app?.close();
      process.env.NODE_ENV = originalNodeEnv;
      return;
    }
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { ssoSubject: SUBJECT } });
    await app.close();
    process.env.NODE_ENV = originalNodeEnv;
  }, 30000);

  const gantiPeran = (role: Role, token: string) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/acting-role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role });

  const kembalikanBelumSetuju = () =>
    prisma.user.update({ where: { id: userId }, data: { consentAt: null } });

  /**
   * Inti laporannya. Tanpa medan ini, frontend tak punya apa pun untuk
   * mengoreksi cookie `consent` yang terlanjur ditulis saat login.
   */
  it('berpindah ke responden melaporkan persetujuan masih dibutuhkan', async () => {
    await kembalikanBelumSetuju();
    const res = await gantiPeran(Role.responden, await penerbit.terbitkan(userId));

    expect(res.status).toBe(200);
    expect(res.body.data.consentRequired).toBe(true);
  });

  /**
   * Admin tak pernah dimintai persetujuan: mereka bertindak dalam kapasitas
   * jabatan atas data warga, bukan sebagai subjek data atas dirinya sendiri.
   * Akun yang SAMA, hanya perannya yang berbeda -- itulah yang membuktikan
   * nilainya dihitung dari peran baru, bukan sekadar disalin dari akunnya.
   */
  it('berpindah ke kabupaten melaporkan persetujuan tidak dibutuhkan', async () => {
    await kembalikanBelumSetuju();
    const res = await gantiPeran(Role.kabupaten, await penerbit.terbitkan(userId));

    expect(res.status).toBe(200);
    expect(res.body.data.consentRequired).toBe(false);
  });

  it('warga yang sudah menyetujui tidak diminta menyetujui lagi', async () => {
    await prisma.user.update({ where: { id: userId }, data: { consentAt: new Date() } });

    const res = await gantiPeran(Role.responden, await penerbit.terbitkan(userId));

    expect(res.status).toBe(200);
    expect(res.body.data.consentRequired).toBe(false);

    await kembalikanBelumSetuju();
  });

  /** Medan lama tak boleh hilang: frontend memakai ketiganya. */
  it('respons tetap membawa role, expiresAt, dan token seperti sebelumnya', async () => {
    await kembalikanBelumSetuju();
    const res = await gantiPeran(Role.responden, await penerbit.terbitkan(userId));

    expect(res.body.data.role).toBe(Role.responden);
    expect(typeof res.body.data.expiresAt).toBe('number');
    expect(res.body.data.token).toBeDefined();
  });
});
