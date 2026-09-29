import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { SSO_SOURCE } from '../src/modules/auth/auth.constants';
import { SESSION_COOKIE } from '../src/modules/auth/session/session-cookie.service';
import { ROLE_SELECTION_REQUIRED } from '../src/modules/auth/acting-role.util';
import type { SsoProfile, SsoSource } from '../src/modules/auth/interfaces/sso-source.interface';
import { PrismaService } from '../src/prisma/prisma.service';

const EMAIL = 'sso@e2e.test';
const SUB = 'e2e-sso-sub-001';

/**
 * Satu identitas TERPISAH per bentuk klaim yang diuji, dan itu wajib: peran
 * hanya ditetapkan saat akun LAHIR (lihat SsoService.resolveRolesAndOpd --
 * acceptLogin tak pernah menulis `roles`). Memakai ulang satu akun untuk tiga
 * bentuk klaim berarti dua uji terakhir membaca peran hasil klaim yang pertama
 * dan lulus tanpa menyentuh pemetaan sama sekali.
 */
const PEMETAAN = {
  admin: { sub: 'e2e-sso-sub-admin', email: 'sso-admin@e2e.test' },
  asn: { sub: 'e2e-sso-sub-asn', email: 'sso-asn@e2e.test' },
  masyarakat: { sub: 'e2e-sso-sub-warga', email: 'sso-warga@e2e.test' },
} as const;

/**
 * Alur SSO ujung-ke-ujung (celah 4, 2026-08-27).
 *
 * DUA PENGGANTIAN PROVIDER, dan keduanya WAJIB — tanpa salah satunya berkas ini
 * akan hijau tanpa pernah menyentuh kode yang dimaksud:
 *
 * 1. `NODE_ENV` dipaksa bukan 'test'. AuthModule mengikat AUTH_PROVIDER ke
 *    StubAuthProvider (header `x-dev-*`) khusus di 'test', jadi menguji jalur
 *    COOKIE tanpa ini berarti tak satu pun baris SessionAuthProvider dijalankan.
 * 2. `SSO_SOURCE` diganti stub. Ia satu-satunya bagian yang benar-benar
 *    menghubungi Helpdesk; menggantinya membuat seluruh sisa alur (verifikasi
 *    state, pencocokan akun, cookie sesi, audit) teruji SUNGGUHAN tanpa
 *    kredensial dan tanpa jaringan.
 *
 * Yang TIDAK diuji di sini: percakapan HTTP dengan Helpdesk itu sendiri
 * (HelpdeskSsoClient) — sudah diverifikasi langsung terhadap penyedia nyata,
 * dan memalsukannya di sini hanya akan menguji mock.
 */
class StubSsoSource implements SsoSource {
  profile: SsoProfile = {
    sub: SUB,
    email: EMAIL,
    nama: 'Warga SSO',
    groups: undefined,
    role: undefined,
    // Wajib sejak sinkronisasi OPD (8 September 2026). Kosong = profil warga
    // biasa tanpa klaim OPD, yang memang keadaan yang diuji berkas ini.
    klaim: {},
    // Keadaan normal penyedia identitas. Wajib tersurat sejak T5 (7 September
    // 2026): penautan akun lama lewat email menolak klaim yang hilang.
    emailVerified: true,
  };
  lastCode: string | null = null;
  /** Disetel satu tes untuk meniru Helpdesk yang tak dapat dihubungi. */
  galatAuthorize: Error | null = null;

  buildAuthorizeUrl(state: string): Promise<string> {
    if (this.galatAuthorize) return Promise.reject(this.galatAuthorize);
    return Promise.resolve(`https://helpdesk.example.go.id/authorize?state=${state}`);
  }

  exchangeCodeForProfile(code: string): Promise<SsoProfile> {
    this.lastCode = code;
    return Promise.resolve(this.profile);
  }
}

/**
 * `res.headers['set-cookie']` diberi tipe `string` oleh supertest padahal
 * Node menyajikannya sebagai array. Dinormalkan di satu tempat ini saja supaya
 * tak ada cast berulang di setiap pemeriksaan.
 */
function setCookies(res: { headers: Record<string, unknown> }): string[] {
  const raw = res.headers['set-cookie'];
  if (Array.isArray(raw)) return raw as string[];
  return typeof raw === 'string' ? [raw] : [];
}

/** Header Set-Cookie UTUH (dengan atributnya) untuk cookie bernama `name`. */
function cookieHeader(res: { headers: Record<string, unknown> }, name: string): string | null {
  return setCookies(res).find((h) => h.startsWith(`${name}=`)) ?? null;
}

/** Hanya NILAI cookie-nya, tanpa atribut. */
function cookieValue(res: { headers: Record<string, unknown> }, name: string): string | null {
  const header = cookieHeader(res, name);
  if (!header) return null;
  const value = header.slice(name.length + 1).split(';')[0];
  return value || null;
}

describe('SSO Helpdesk end-to-end (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stub = new StubSsoSource();
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    process.env.NODE_ENV = 'development'; // lihat catatan (1) di atas
    process.env.HELPDESK_SSO_ISSUER = 'https://api.example.go.id/api/oauth';
    process.env.HELPDESK_SSO_CLIENT_ID = 'klien-e2e';
    process.env.HELPDESK_SSO_CLIENT_SECRET = 'rahasia-e2e';
    process.env.HELPDESK_SSO_REDIRECT_URI = 'http://localhost/api/v1/auth/sso/callback';
    process.env.WEB_APP_URL = 'http://localhost:3000';

    // Pemetaan peran & OPD (29 September 2026). HARUS disetel SEBELUM
    // createTestingModule di bawah: SsoService membacanya lewat ConfigService,
    // yang memotret process.env saat modul dikompilasi -- menyetelnya di dalam
    // describe pemetaan tak akan berpengaruh apa pun.
    //
    // Nilainya SAMA PERSIS dengan .env.example, supaya yang diuji di sini
    // adalah konfigurasi yang benar-benar dipakai, bukan konfigurasi karangan
    // yang kebetulan membuat uji ini hijau.
    process.env.HELPDESK_SSO_ROLE_CLAIM = 'role,identity.user_type';
    process.env.HELPDESK_SSO_ROLE_MAP =
      'admin:kabupaten+opd+responden,asn:responden,masyarakat:responden';
    process.env.HELPDESK_SSO_OPD_CLAIM = 'governance.tenant_id';

    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SSO_SOURCE)
      .useValue(stub)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await bersihkan();
  }, 60000);

  afterAll(async () => {
    await bersihkan();
    await app.close();
    process.env = originalEnv;
  }, 30000);

  async function bersihkan() {
    const emails = [EMAIL, ...Object.values(PEMETAAN).map((x) => x.email)];
    const subs = [SUB, ...Object.values(PEMETAAN).map((x) => x.sub)];
    const rows = await prisma.user.findMany({
      where: { OR: [{ email: { in: emails } }, { ssoSubject: { in: subs } }] },
      select: { id: true },
    });
    for (const { id } of rows) {
      // audit_logs.actor_id ber-RESTRICT, jadi jejaknya dibuang lebih dulu.
      await prisma.auditLog.deleteMany({ where: { actorId: id } });
      await prisma.user.delete({ where: { id } });
    }
  }

  /** Jalankan langkah 1 lalu kembalikan `state` + cookie pendampingnya. */
  async function mulaiLogin() {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/sso/login');
    expect(res.status).toBe(302);

    const state = new URL(res.headers.location).searchParams.get('state');
    const cookie = cookieHeader(res, 'sso_state');
    return { state: state as string, cookie: (cookie as string).split(';')[0] };
  }

  /**
   * Profil bawaan stub, disalin sebelum uji pemetaan menggantinya. Tanpa ini,
   * mengubah `stub.profile` di satu uji akan menular ke uji berikutnya.
   */
  const PROFIL_BAKU: SsoProfile = { ...stub.profile };

  /** Login PENUH (login -> callback) memakai profil tertentu; kembalikan nilai cookie sesinya. */
  async function masukDenganProfil(profile: SsoProfile): Promise<string> {
    stub.profile = profile;
    const { state, cookie } = await mulaiLogin();
    const callback = await request(app.getHttpServer())
      .get('/api/v1/auth/sso/callback')
      .set('Cookie', cookie)
      .query({ code: 'kode-sah', state });

    expect(callback.status).toBe(302);
    // Diperiksa DI SINI, bukan dibiarkan meledak nanti: callback yang gagal
    // tetap 302 (ke `#error=`) dan tak memasang cookie sesi, sehingga uji di
    // bawah akan gagal dengan "cookie null" yang tak menyebut sebab aslinya.
    expect(callback.headers.location).not.toContain('#error=');
    return cookieValue(callback, SESSION_COOKIE) as string;
  }

  describe('GET /auth/sso/login', () => {
    it('mengalihkan ke Helpdesk dengan state pada query DAN cookie', async () => {
      const { state, cookie } = await mulaiLogin();

      expect(state).toMatch(/^[0-9a-f]{64}$/);
      // Nilai cookie adalah bentuk BERTANDA-TANGAN, jadi harus BERBEDA dari
      // state di query -- kalau sama, cookie tak menambah pengamanan apa pun.
      expect(cookie.replace('sso_state=', '')).not.toBe(state);
    });

    it('cookie state HttpOnly & path dipersempit ke rute sso', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/sso/login');
      const header = cookieHeader(res, 'sso_state');

      expect(header).toContain('HttpOnly');
      expect(header).toContain('Path=/api/v1/auth/sso');
    });

    it('Helpdesk tak dapat dihubungi -> dialihkan ke halaman galat, bukan 503 mentah', async () => {
      // Kegagalan yang PASTI terjadi suatu saat di produksi: dokumen penemuan
      // OIDC diambil lewat jaringan pada setiap permintaan masuk. Yang membuka
      // alamat ini peramban pengguna, jadi galatnya harus mendarat di halaman
      // yang bisa dibaca — lengkap dengan tombol "Coba masuk lagi".
      stub.galatAuthorize = new Error('getaddrinfo ENOTFOUND api.madiunkab.go.id');
      try {
        const res = await request(app.getHttpServer()).get('/api/v1/auth/sso/login');

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('/sso/callback#error=');
        expect(res.body).not.toHaveProperty('statusCode');
      } finally {
        stub.galatAuthorize = null;
      }
    });
  });

  describe('GET /auth/sso/callback — jalur gagal', () => {
    it('galat dari Helpdesk dialihkan ke frontend, tanpa cookie sesi', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .query({ error: 'access_denied', error_description: 'Pengguna membatalkan' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('#error=');
      expect(res.headers.location).toContain('Pengguna%20membatalkan');
      expect(cookieValue(res, SESSION_COOKIE)).toBeNull();
    });

    it('state palsu ditolak & cookie state dibuang', async () => {
      const { cookie } = await mulaiLogin();

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .set('Cookie', cookie)
        .query({ code: 'kode-apa-pun', state: 'a'.repeat(64) });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('#error=');
      expect(cookieHeader(res, 'sso_state')).toContain('Max-Age=0');
      expect(cookieValue(res, SESSION_COOKIE)).toBeNull();
    });

    it('TANPA cookie state -> ditolak walau state di query benar', async () => {
      const { state } = await mulaiLogin();

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .query({ code: 'kode-apa-pun', state });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('#error=');
    });
  });

  describe('GET /auth/sso/callback — jalur berhasil', () => {
    it('membuat akun baru, memasang cookie sesi HttpOnly, & TIDAK menaruh token di URL', async () => {
      const { state, cookie } = await mulaiLogin();

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .set('Cookie', cookie)
        .query({ code: 'kode-sah', state });

      expect(res.status).toBe(302);
      const sessionHeader = cookieHeader(res, SESSION_COOKIE);

      expect(sessionHeader).toContain('HttpOnly');
      expect(sessionHeader).toContain('Path=/');
      expect(res.headers.location).toContain('#expires=');
      // Inti keputusan penyerahan token: tak ada token di alamat, dalam bentuk apa pun.
      expect(res.headers.location).not.toMatch(/token/i);

      const user = await prisma.user.findFirst({ where: { ssoSubject: SUB } });
      expect(user?.email).toBe(EMAIL);
      expect(user?.roles).toEqual([Role.responden]);
      // consentAt SENGAJA null: persetujuan PDP bukan efek samping login.
      expect(user?.consentAt).toBeNull();
    });

    it('cookie sesi itu benar-benar dapat dipakai memanggil GET /auth/me', async () => {
      const { state, cookie } = await mulaiLogin();
      const callback = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .set('Cookie', cookie)
        .query({ code: 'kode-sah', state });

      const sesi = cookieValue(callback, SESSION_COOKIE);

      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', `${SESSION_COOKIE}=${sesi}`);

      expect(me.status).toBe(200);
      expect(me.body.data.email).toBe(EMAIL);
      // Warga baru dari SSO belum menyetujui apa pun.
      expect(me.body.data.consentRequired).toBe(true);
      // `sub` asli Helpdesk, bukan penampung seed-/pending:.
      expect(me.body.data.ssoLinked).toBe(true);
    });

    it('login mencatat aksi ke audit log', async () => {
      const { state, cookie } = await mulaiLogin();
      await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .set('Cookie', cookie)
        .query({ code: 'kode-sah', state });

      const user = await prisma.user.findFirstOrThrow({ where: { ssoSubject: SUB } });
      const logs = await prisma.auditLog.findMany({ where: { actorId: user.id, aksi: 'login' } });

      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].entitas).toBe('auth');
    });

    it('login kedua MEMAKAI ULANG akun yang sama (tak ada duplikat)', async () => {
      const sebelum = await prisma.user.count({ where: { ssoSubject: SUB } });

      const { state, cookie } = await mulaiLogin();
      await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .set('Cookie', cookie)
        .query({ code: 'kode-sah-2', state });

      expect(await prisma.user.count({ where: { ssoSubject: SUB } })).toBe(Math.max(sebelum, 1));
    });
  });

  describe('penegakan persetujuan PDP lewat sesi SSO', () => {
    it('warga tanpa persetujuan DITOLAK 403 saat mengajukan pengaduan', async () => {
      const { state, cookie } = await mulaiLogin();
      const callback = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .set('Cookie', cookie)
        .query({ code: 'kode-sah', state });
      const sesi = cookieValue(callback, SESSION_COOKIE);

      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set('Cookie', `${SESSION_COOKIE}=${sesi}`)
        .field('opdId', '1')
        .field('kategori', 'aduan')
        .field('judul', 'Uji persetujuan')
        // `uraian`, BUKAN `deskripsi`: ValidationPipe memakai
        // forbidNonWhitelisted, jadi nama field yang salah menghasilkan 400
        // SEBELUM handler jalan -- dan pemeriksaan persetujuan tak akan teruji.
        .field('uraian', 'Seharusnya ditolak karena belum menyetujui PDP');

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(/persetujuan/i);
    });

    it('setelah POST /auth/consent, pengaduan TIDAK lagi ditolak karena persetujuan', async () => {
      const { state, cookie } = await mulaiLogin();
      const callback = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .set('Cookie', cookie)
        .query({ code: 'kode-sah', state });
      const sesi = cookieValue(callback, SESSION_COOKIE);
      const auth = { Cookie: `${SESSION_COOKIE}=${sesi}` };

      const consent = await request(app.getHttpServer()).post('/api/v1/auth/consent').set(auth);
      expect(consent.status).toBe(200);
      expect(consent.body.data.consentAt).toBeTruthy();

      const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set(auth);
      expect(me.body.data.consentRequired).toBe(false);

      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set(auth)
        .field('opdId', '999999') // OPD sengaja tak ada
        .field('kategori', 'aduan')
        .field('judul', 'Uji persetujuan')
        .field('uraian', 'Persetujuan sudah ada, jadi yang menolak bukan lagi PDP');

      // 400 karena OPD tak ada, BUKAN 403 karena persetujuan. Pesannya ikut
      // diperiksa supaya tes ini tak bisa lulus karena 400 sebab lain
      // (mis. payload cacat) -- itu akan membuktikan hal yang berbeda.
      expect(res.status).toBe(400);
      expect(String(res.body.message)).not.toMatch(/persetujuan/i);
      expect(String(res.body.message)).toMatch(/opd/i);
    });

    it('POST /auth/consent idempoten: waktu persetujuan tak bergeser', async () => {
      const { state, cookie } = await mulaiLogin();
      const callback = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .set('Cookie', cookie)
        .query({ code: 'kode-sah', state });
      const sesi = cookieValue(callback, SESSION_COOKIE);
      const auth = { Cookie: `${SESSION_COOKIE}=${sesi}` };

      const pertama = await request(app.getHttpServer()).post('/api/v1/auth/consent').set(auth);
      const kedua = await request(app.getHttpServer()).post('/api/v1/auth/consent').set(auth);

      expect(kedua.body.data.consentAt).toBe(pertama.body.data.consentAt);
    });
  });

  describe('POST /auth/logout', () => {
    it('membuang cookie sesi & mencatat aksi logout', async () => {
      const { state, cookie } = await mulaiLogin();
      const callback = await request(app.getHttpServer())
        .get('/api/v1/auth/sso/callback')
        .set('Cookie', cookie)
        .query({ code: 'kode-sah', state });
      const sesi = cookieValue(callback, SESSION_COOKIE);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `${SESSION_COOKIE}=${sesi}`);

      expect(res.status).toBe(200);
      expect(cookieHeader(res, SESSION_COOKIE)).toContain('Max-Age=0');

      const user = await prisma.user.findFirstOrThrow({ where: { ssoSubject: SUB } });
      const logs = await prisma.auditLog.findMany({ where: { actorId: user.id, aksi: 'logout' } });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  /**
   * PEMETAAN PERAN & PERPINDAHAN PERAN LEWAT SESI SSO (29 September 2026).
   *
   * MENGAPA DI SINI, padahal multi-role.e2e-spec.ts sudah menguji /auth/roles
   * dan /auth/acting-role. Berkas itu menempuh jalur Bearer (dev-login, token
   * dipegang localStorage). Sesi SSO memakai kanal yang BERBEDA: cookie
   * `session` HttpOnly, diterbitkan tanpa klaim `act`. Yang belum dibuktikan di
   * mana pun adalah rangkaian utuhnya -- klaim Helpdesk menjadi peran, lalu
   * peran itu benar-benar dapat dipindah memakai cookie tersebut.
   *
   * TAK SATU PUN akun admin Helpdesk dibutuhkan: StubSsoSource yang menyediakan
   * payloadnya. Yang TETAP tidak dibuktikan berkas ini adalah bahwa Helpdesk
   * sungguh mengirim `role: "admin"` bagi seorang admin -- itu hanya dapat
   * dibuktikan akun admin sungguhan, dan buktinya sudah ada di luar uji ini
   * berupa payload userinfo yang diambil langsung dari akun admin Helpdesk.
   */
  describe('pemetaan peran Helpdesk & perpindahan peran sesudah login SSO', () => {
    let opdId: number;
    let tenantId: string;

    beforeAll(async () => {
      // OPD hasil seed dipakai apa adanya, BUKAN dibuat di sini: membuat baris
      // OPD berarti uji ini meninggalkan data yang harus disapu, dan
      // `external_id` hasil seed memang nilai asli dari Helpdesk.
      const opd = await prisma.opd.findFirst({
        where: { isActive: true, externalId: { not: null } },
        select: { id: true, externalId: true },
      });
      // Bukan skip diam-diam: tanpa OPD ber-external_id, uji tautan OPD di
      // bawah tak membuktikan apa pun, dan itu harus terlihat sebagai gagal.
      expect(opd).not.toBeNull();
      opdId = (opd as { id: number }).id;
      tenantId = (opd as { externalId: string }).externalId;
    });

    afterEach(() => {
      stub.profile = { ...PROFIL_BAKU };
    });

    /** Bentuk klaim userinfo Helpdesk yang sesungguhnya, seperlunya saja. */
    function profil(
      identitas: { sub: string; email: string },
      role: string,
      userType: string,
      tenant: string | null,
    ): SsoProfile {
      return {
        sub: identitas.sub,
        email: identitas.email,
        nama: 'Pengguna Uji',
        emailVerified: true,
        groups: undefined,
        // Helpdesk mengirim `role` di tingkat atas DAN di dalam klaim; keduanya
        // ditiru supaya yang diuji payload yang sebenarnya, bukan bentuk yang
        // kebetulan paling mudah dipetakan.
        role,
        klaim: {
          role,
          identity: { user_type: userType },
          ...(tenant ? { governance: { tenant_id: tenant, tenant_name: 'OPD Uji' } } : {}),
        },
      };
    }

    const profilAdmin = () => profil(PEMETAAN.admin, 'admin', 'asn', tenantId);
    const profilAsn = () => profil(PEMETAAN.asn, 'user', 'asn', tenantId);
    const profilMasyarakat = () => profil(PEMETAAN.masyarakat, 'user', 'masyarakat', null);

    describe('klaim -> peran saat akun lahir', () => {
      it('role "admin" -> kabupaten + opd + responden, dengan OPD tertaut', async () => {
        await masukDenganProfil(profilAdmin());

        const user = await prisma.user.findFirstOrThrow({
          where: { ssoSubject: PEMETAAN.admin.sub },
        });

        expect([...user.roles].sort()).toEqual([Role.kabupaten, Role.opd, Role.responden].sort());
        // Peran `opd` TANPA opdId akan dibuang SsoService, jadi nilai ini
        // sekaligus membuktikan paketnya bertahan utuh.
        expect(user.opdId).toBe(opdId);
      });

      it('tipe user "asn" -> responden SAJA, tetapi opd_id sudah terisi sejak login pertama', async () => {
        await masukDenganProfil(profilAsn());

        const user = await prisma.user.findFirstOrThrow({
          where: { ssoSubject: PEMETAAN.asn.sub },
        });

        // SENGAJA bukan Admin OPD: kenaikan itu keputusan Admin Kabupaten lewat
        // Manajemen User, bukan akibat otomatis dari tipe user di Helpdesk.
        expect(user.roles).toEqual([Role.responden]);
        // Namun instansinya sudah diketahui -- justru keterangan itulah yang
        // dibaca Admin Kabupaten saat memutuskan.
        expect(user.opdId).toBe(opdId);
      });

      it('tipe user "masyarakat" -> responden, tanpa tautan OPD sama sekali', async () => {
        await masukDenganProfil(profilMasyarakat());

        const user = await prisma.user.findFirstOrThrow({
          where: { ssoSubject: PEMETAAN.masyarakat.sub },
        });

        expect(user.roles).toEqual([Role.responden]);
        expect(user.opdId).toBeNull();
      });
    });

    describe('perpindahan peran memakai cookie sesi SSO', () => {
      it('akun ber-peran banyak: /auth/me menolak 401 ROLE_SELECTION_REQUIRED', async () => {
        const sesi = await masukDenganProfil(profilAdmin());

        const me = await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Cookie', `${SESSION_COOKIE}=${sesi}`);

        // Callback SSO menerbitkan sesi TANPA klaim `act`, jadi peran memang
        // belum dipilih. Kodenya khas, bukan 401 generik: frontend memakainya
        // untuk mengarah ke /pilih-peran alih-alih membuang sesi yang sah.
        expect(me.status).toBe(401);
        expect(me.body.error.code).toBe(ROLE_SELECTION_REQUIRED);
      });

      it('akun ber-peran TUNGGAL tak perlu memilih: /auth/me langsung terbaca', async () => {
        // Penjaga premis bagi uji di atas: tanpa ini, 401 itu bisa saja berasal
        // dari cookie sesi SSO yang memang tak pernah diterima /auth/me.
        const sesi = await masukDenganProfil(profilMasyarakat());

        const me = await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Cookie', `${SESSION_COOKIE}=${sesi}`);

        expect(me.status).toBe(200);
        expect(me.body.data.actingRole).toBe(Role.responden);
      });

      it('/auth/roles tetap terbaca sebelum peran dipilih -- itulah isi pemilih peran', async () => {
        const sesi = await masukDenganProfil(profilAdmin());

        const res = await request(app.getHttpServer())
          .get('/api/v1/auth/roles')
          .set('Cookie', `${SESSION_COOKIE}=${sesi}`);

        expect(res.status).toBe(200);
        expect([...res.body.data.roles].sort()).toEqual(
          [Role.kabupaten, Role.opd, Role.responden].sort(),
        );
        expect(res.body.data.opdId).toBe(opdId);
      });

      it('POST /auth/acting-role memindahkan peran, & sesi barunya lewat COOKIE bukan body', async () => {
        const sesi = await masukDenganProfil(profilAdmin());

        const ganti = await request(app.getHttpServer())
          .post('/api/v1/auth/acting-role')
          .set('Cookie', `${SESSION_COOKIE}=${sesi}`)
          .send({ role: Role.kabupaten });

        expect(ganti.status).toBe(200);
        expect(ganti.body.data.role).toBe(Role.kabupaten);
        // Inti pembeda jalur cookie dari jalur Bearer: mengembalikan token di
        // body akan menyerahkannya kepada JavaScript dan meniadakan seluruh
        // guna HttpOnly-nya.
        expect(ganti.body.data.token).toBeUndefined();

        const sesiBaru = cookieValue(ganti, SESSION_COOKIE);
        expect(sesiBaru).toBeTruthy();

        const me = await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Cookie', `${SESSION_COOKIE}=${sesiBaru}`);

        expect(me.status).toBe(200);
        expect(me.body.data.actingRole).toBe(Role.kabupaten);
      });

      it('berpindah ke peran yang TIDAK dimiliki ditolak 403', async () => {
        const sesi = await masukDenganProfil(profilMasyarakat());

        const ganti = await request(app.getHttpServer())
          .post('/api/v1/auth/acting-role')
          .set('Cookie', `${SESSION_COOKIE}=${sesi}`)
          .send({ role: Role.kabupaten });

        expect(ganti.status).toBe(403);
      });
    });
  });
});
