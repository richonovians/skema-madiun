import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { SESSION_COOKIE } from '../src/modules/auth/session/session-cookie.service';
import { HEADER_SESI_BERAKHIR } from '../src/modules/auth/session/session-refresh.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * SESI YANG HIDUP SELAMA DIPAKAI, LEWAT HTTP (17 September 2026, laporan
 * pengguna: "session kemarin masih bisa dipakai hingga hari ini").
 *
 * Uji unit menjaga aturan waktunya; yang dijaga di sini adalah hal yang tak
 * dapat dibuktikan mock: interceptornya benar-benar terpasang pada aplikasi
 * sungguhan, cookienya benar-benar terkirim di header respons, dan `logout`
 * tetap mengakhiri sesi alih-alih diterbitkan ulang oleh interceptor yang sama.
 *
 * Tokennya ditandatangani LANGSUNG dengan umur yang sudah menipis, bukan
 * ditunggu sampai menipis sendiri: menunggu setengah jendela berarti uji yang
 * berjalan setengah jam.
 */
describe('Perpanjangan sesi (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let userId: number;
  const nodeEnvAsli = process.env.NODE_ENV;

  const SATU_JAM = 3600;
  const sekarang = () => Math.floor(Date.now() / 1000);

  /** Token sesi dengan sisa jendela & pagu yang ditentukan sendiri. */
  const token = (sisaDetik: number, sisaPaguDetik: number) =>
    jwt.sign(
      { sub: userId, act: Role.responden, abs: sekarang() + sisaPaguDetik },
      { expiresIn: sisaDetik },
    );

  const kirim = (nilaiToken: string) =>
    request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', `${SESSION_COOKIE}=${nilaiToken}`);

  beforeAll(async () => {
    // Memaksa AUTH_PROVIDER -> SessionAuthProvider, pola yang sama dengan
    // session-auth.e2e-spec.ts. Di bawah NODE_ENV='test' yang aktif adalah
    // StubAuthProvider yang membaca header `x-dev-*` dan TIDAK menyentuh cookie
    // sesi sama sekali -- uji sesi kedaluwarsa akan lulus palsu di sana, sebab
    // permintaannya diloloskan tanpa pernah melihat tokennya.
    process.env.NODE_ENV = 'development';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    const user = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-sesi-perpanjangan' },
      update: { isActive: true, consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-sesi-perpanjangan',
        nama: 'Warga Uji Perpanjangan Sesi',
        email: 'e2e-sesi-perpanjangan@example.go.id',
        roles: [Role.responden],
        isActive: true,
        consentAt: new Date(),
      },
    });
    userId = user.id;
  }, 60000);

  afterAll(async () => {
    // Baris audit dibuang LEBIH DULU: `POST /auth/logout` mencatat aksinya, dan
    // `audit_logs.actor_id` ber-RESTRICT sehingga menghapus penggunanya langsung
    // ditolak basis data. Pola yang sama dipakai session-auth.e2e-spec.ts.
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.user.deleteMany({ where: { ssoSubject: 'e2e-sesi-perpanjangan' } });
    await app.close();
    process.env.NODE_ENV = nodeEnvAsli;
  }, 30000);

  it('sesi yang hampir menganggur habis diperpanjang saat dipakai', async () => {
    const res = await kirim(token(120, 12 * SATU_JAM));

    expect(res.status).toBe(200);
    expect(String(res.headers['set-cookie'])).toContain(`${SESSION_COOKIE}=`);
    expect(Number(res.headers[HEADER_SESI_BERAKHIR.toLowerCase()])).toBeGreaterThan(
      sekarang() + 120,
    );
  });

  it('sesi yang masih segar tidak ditulisi cookie baru pada tiap permintaan', async () => {
    const res = await kirim(token(SATU_JAM, 12 * SATU_JAM));

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(res.headers[HEADER_SESI_BERAKHIR.toLowerCase()]).toBeUndefined();
  });

  /**
   * Inti janji "pagu mutlak": aktivitas memperpanjang, tetapi tak pernah
   * melewati batas yang ditetapkan saat login. Tanpa ini sesi orang yang
   * membuka aplikasi tiap hari tak pernah berakhir sama sekali.
   */
  it('perpanjangan tidak pernah melewati pagu mutlak', async () => {
    const res = await kirim(token(120, 300));

    const berakhir = Number(res.headers[HEADER_SESI_BERAKHIR.toLowerCase()]);
    expect(berakhir).toBeLessThanOrEqual(sekarang() + 300 + 2);
  });

  it('sesi yang jendelanya sudah lewat ditolak 401', async () => {
    const mati = jwt.sign(
      { sub: userId, act: Role.responden, abs: sekarang() + 12 * SATU_JAM },
      { expiresIn: -60 },
    );

    const res = await kirim(mati);

    expect(res.status).toBe(401);
  });

  /**
   * PENJAGA TERPENTING. Interceptor berjalan pada SETIAP respons, termasuk
   * respons logout yang baru saja menyetel cookie kosong. Menimpanya berarti
   * menerbitkan kembali sesi yang baru saja dimatikan.
   */
  it('logout tetap mengakhiri sesi, tidak diterbitkan ulang interceptor', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `${SESSION_COOKIE}=${token(120, 12 * SATU_JAM)}`);

    expect(res.status).toBe(200);
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const sesi = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    expect(sesi).toBeDefined();
    expect(sesi).toContain('Max-Age=0');
  });
});
