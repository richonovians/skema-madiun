import { INestApplication } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { PENYIMPAN_SESI } from '../src/modules/auth/session/penyimpan-sesi.interface';
import type { PenyimpanSesi } from '../src/modules/auth/session/penyimpan-sesi.interface';

/**
 * QA-SECURITY-UAT #7: keutuhan token sesi dan pencabutannya.
 *
 * Yang SUDAH diuji di tempat lain dan tidak diulang di sini: atribut cookie
 * (`session-cookie.service.spec.ts`: HttpOnly, SameSite=Lax, Secure hanya di
 * produksi, Path, Max-Age), cookie dikosongkan saat logout dan jendela/pagu
 * sesi (`sesi-perpanjangan.e2e-spec.ts`), akun dinonaktifkan
 * (`session-auth.e2e-spec.ts`), peran dicabut (`multi-role.e2e-spec.ts`),
 * dan logout-semua lintas akun (`idor-semua-yang-masuk.e2e-spec.ts`).
 *
 * Yang belum: apakah token yang DIUTAK-ATIK ditolak, dan apakah logout benar
 * mencabut TOKENNYA di sisi server -- bukan sekadar menyuruh peramban
 * membuang cookie, yang tak berarti apa-apa bagi pemegang salinan token.
 *
 * Lewat SessionAuthProvider sungguhan; StubAuthProvider tak membaca token.
 * Pengguna fixture di-upsert dan dibiarkan (`audit_logs` menahannya).
 */
describe('Keamanan sesi (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let userId: number;
  const nodeEnvAsli = process.env.NODE_ENV;
  const SSO_SUBJECT = 'e2e-sesi-keamanan';

  const http = () => request(app.getHttpServer());
  const me = (token: string) =>
    http().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
  const masuk = async (): Promise<string> => {
    const res = await http().post('/api/v1/auth/dev-login').send({ identifier: SSO_SUBJECT });
    expect(res.status).toBe(201);
    return res.body.data.token as string;
  };

  const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const bagian = (token: string) => token.split('.');
  const muatan = (token: string) =>
    JSON.parse(Buffer.from(bagian(token)[1], 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    const data = {
      roles: [Role.responden],
      opdId: null,
      email: 'e2e-sesi-keamanan@example.go.id',
      isActive: true,
      deletedAt: null,
      consentAt: new Date(),
    };
    const user = await prisma.user.upsert({
      where: { ssoSubject: SSO_SUBJECT },
      update: data,
      create: { ssoSubject: SSO_SUBJECT, nama: 'Warga Uji Keamanan Sesi', ...data },
    });
    userId = user.id;
  }, 60000);

  afterAll(async () => {
    await prisma.user.update({ where: { id: userId }, data: { deletedAt: null, isActive: true } });
    await app.close();
    process.env.NODE_ENV = nodeEnvAsli;
  }, 30000);

  describe('keutuhan token', () => {
    let asli: string;

    beforeAll(async () => {
      asli = await masuk();
    });

    it('KONTROL: token asli diterima', async () => {
      expect((await me(asli)).status).toBe(200);
    });

    it.each([
      ['peran dinaikkan ke kabupaten', { act: Role.kabupaten }],
      ['sub diganti ke pengguna lain', { sub: 1 }],
      ['pagu dan kedaluwarsa diperpanjang', { exp: 4102444800, abs: 4102444800 }],
    ])('muatan diubah (%s), tanda tangan asli dipertahankan -> 401', async (_n, ubah) => {
      const [kepala, , tanda] = bagian(asli);
      const palsu = `${kepala}.${b64url({ ...muatan(asli), ...ubah })}.${tanda}`;
      expect((await me(palsu)).status).toBe(401);
    });

    it('alg "none" tanpa tanda tangan -> 401', async () => {
      const palsu = `${b64url({ alg: 'none', typ: 'JWT' })}.${bagian(asli)[1]}.`;
      expect((await me(palsu)).status).toBe(401);
    });

    it('ditandatangani kunci lain -> 401', async () => {
      const lain = new JwtService({ secret: 'kunci-penyerang-yang-cukup-panjang-0123456789' });
      const { sub, act, abs, sid } = muatan(asli);
      const palsu = lain.sign({ sub, act, abs, sid }, { expiresIn: 3600 });
      expect((await me(palsu)).status).toBe(401);
    });

    it('kedaluwarsa (exp lewat) walau tanda tangannya sah -> 401', async () => {
      const { sub, act, abs, sid } = muatan(asli);
      const lewat = jwt.sign({ sub, act, abs, sid }, { expiresIn: -10 });
      expect((await me(lewat)).status).toBe(401);
    });
  });

  describe('pencabutan di sisi server', () => {
    it('sesudah logout, salinan token yang SAMA ditolak 401', async () => {
      const token = await masuk();
      expect((await me(token)).status).toBe(200);
      expect(
        (await http().post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`)).status,
      ).toBe(200);
      expect((await me(token)).status).toBe(401);
    });

    it('logout satu perangkat tidak memutus perangkat lain akun yang sama', async () => {
      const ponsel = await masuk();
      const laptop = await masuk();
      await http().post('/api/v1/auth/logout').set('Authorization', `Bearer ${ponsel}`);
      expect((await me(ponsel)).status).toBe(401);
      expect((await me(laptop)).status).toBe(200);
    });

    it('logout-semua mencabut SETIAP sesi akun itu', async () => {
      const satu = await masuk();
      const dua = await masuk();
      const res = await http()
        .post('/api/v1/auth/logout-semua')
        .set('Authorization', `Bearer ${satu}`);
      expect(res.status).toBeLessThan(300);
      expect((await me(satu)).status).toBe(401);
      expect((await me(dua)).status).toBe(401);
    });

    it('akun dihapus lunak SESUDAH token diterbitkan -> token lama 401', async () => {
      const token = await masuk();
      await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
      try {
        expect((await me(token)).status).toBe(401);
      } finally {
        await prisma.user.update({ where: { id: userId }, data: { deletedAt: null } });
      }
    });
  });

  describe('pergantian peran', () => {
    /**
     * Sesi sah yang pagunya tinggal sepuluh menit. Ditandatangani dan
     * didaftarkan sendiri karena `PenerbitSesi` selalu memberi pagu penuh;
     * tanpa pagu yang dekat, "dibawa" dan "dihitung ulang" tak dapat dibedakan.
     */
    const sesiHampirHabis = async (): Promise<{ token: string; abs: number }> => {
      const abs = Math.floor(Date.now() / 1000) + 600;
      const sid = randomBytes(16).toString('hex');
      const token = jwt.sign({ sub: userId, abs, sid }, { expiresIn: 600 });
      await app.get<PenyimpanSesi>(PENYIMPAN_SESI).simpan(sid, { uid: userId, abs });
      return { token, abs };
    };

    /**
     * Audit auth 7 November 2026, `sesi/acting-role-mereset-pagu-abs`. `abs`
     * adalah batas mutlak sejak MASUK. Bila ganti peran menghitungnya ulang,
     * pemegang sesi -- termasuk pemegang salinan token curian -- dapat
     * memperpanjang sesinya tanpa batas dengan berganti peran sebelum pagunya
     * habis, dan pagu dua belas jam itu kehilangan artinya.
     */
    it('token hasil ganti peran membawa abs sesi asalnya, bukan pagu baru', async () => {
      const { token, abs } = await sesiHampirHabis();

      const res = await http()
        .post('/api/v1/auth/acting-role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: Role.responden });

      expect(res.status).toBe(200);
      const baru = muatan(res.body.data.token as string);
      expect(baru.abs).toBe(abs);
      expect(baru.exp as number).toBeLessThanOrEqual(abs);
    });

    /**
     * Audit auth 7 November 2026, `sesi/acting-role-sid-lama-tetap-hidup`;
     * diputuskan pengguna pada hari yang sama. `logout` hanya mencabut sid
     * yang sedang dipakai, jadi sid dari pergantian peran sebelumnya -- dan
     * salinan tokennya di mana pun -- hidup sampai `abs` walau pemiliknya
     * sudah keluar.
     */
    it('token LAMA mati sesudah ganti peran, token baru hidup', async () => {
      const lama = await masuk();

      const res = await http()
        .post('/api/v1/auth/acting-role')
        .set('Authorization', `Bearer ${lama}`)
        .send({ role: Role.responden });
      expect(res.status).toBe(200);

      expect((await me(res.body.data.token as string)).status).toBe(200);
      expect((await me(lama)).status).toBe(401);
    });
  });
});
