import { INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * QA-SECURITY-UAT #2: matriks otorisasi SELURUH endpoint, bukan contoh.
 *
 * `peran-matriks-rbac.e2e-spec.ts` dan suite per modul menyentuh sebagian
 * rute; berkas ini menetapkan semuanya sekaligus dalam satu tabel, `MATRIKS`,
 * dan membuktikannya dari dua arah:
 *
 * 1. TABEL = KODE. Rute dibaca dari metadata Nest yang hidup (bukan dari
 *    berkas), lalu dicocokkan baris per baris dengan tabel. Endpoint baru
 *    yang belum masuk tabel, dekorator `@Roles` yang dicabut, dipersempit,
 *    atau dilebarkan -- semuanya memerah di sini. Menambah endpoint karena
 *    itu menuntut keputusan tersurat tentang siapa yang boleh memanggilnya.
 * 2. GERBANG MENEGAKKAN TABEL. Tanpa token setiap rute non-publik menjawab
 *    401, dan setiap peran yang TIDAK tercantum menjawab 403 dengan pesan
 *    `RolesGuard` yang menyebut daftar peran PERSIS. Pesannya ikut diperiksa,
 *    bukan hanya statusnya: lapis service sering menjawab 403 juga, sehingga
 *    uji yang berhenti di status tetap hijau walau gerbangnya hilang (lihat
 *    `peran-matriks-rbac.e2e-spec.ts`). Daftar perannya diperiksa supaya rute
 *    yang tertutup rute lain (`/surveys/active` lawan `/surveys/:id`) tak
 *    diam-diam menguji gerbang tetangganya.
 *
 * Peran yang TERCANTUM sengaja tidak dipanggil: id karangan pada rute tulis
 * dan `POST /opd/sync` (yang memanggil Helpdesk) bukan urusan uji gerbang.
 * Rute "semua yang masuk" diuji isolasi datanya di `idor-semua-yang-masuk`.
 *
 * Lewat SessionAuthProvider SUNGGUHAN (dev-login -> Bearer), karena di bawah
 * StubAuthProvider permintaan tanpa header pun menjadi `kabupaten`, sehingga
 * 401 tak dapat diuji sama sekali. Batas laju tak menghalangi: penghitungnya
 * per handler per pengguna, dan tiap pasangan hanya dipanggil sekali.
 *
 * Pengguna dan OPD fixture di-upsert dan dibiarkan: dev-login menulis
 * `audit_logs` yang menahan penghapusannya, dan baris audit tidak dihapus.
 * Selain itu berkas ini tidak menulis apa pun -- setiap permintaan berhenti
 * di gerbang sebelum handler.
 */

type Akses = 'publik' | 'semua' | Role[];

const { kabupaten: K, opd: O, responden: R } = Role;

const MATRIKS: [string, string, Akses][] = [
  ['GET', '/health', 'publik'],
  ['GET', '/audit-logs', [K]],
  ['GET', '/audit-logs/retensi', [K]],
  ['GET', '/audit-logs/:id', [K]],
  ['POST', '/auth/dev-login', 'publik'],
  ['GET', '/auth/sso/login', 'publik'],
  ['GET', '/auth/sso/callback', 'publik'],
  ['POST', '/auth/logout', 'semua'],
  ['POST', '/auth/logout-semua', 'semua'],
  ['GET', '/auth/sesi', 'semua'],
  ['POST', '/auth/consent', 'semua'],
  ['GET', '/auth/roles', 'semua'],
  ['POST', '/auth/acting-role', 'semua'],
  ['GET', '/auth/me', 'semua'],
  ['PATCH', '/auth/profile', 'semua'],
  ['POST', '/complaints', [R]],
  ['GET', '/complaints', 'semua'],
  ['GET', '/complaints/:ticketNo', 'semua'],
  ['PATCH', '/complaints/:id/status', [K, O]],
  ['PATCH', '/complaints/:id/opd', [K]],
  ['GET', '/complaints/:id/replies', 'semua'],
  ['POST', '/complaints/:id/replies', [K, O, R]],
  ['GET', '/dashboard/opd', [O]],
  ['GET', '/statistics', 'publik'],
  ['GET', '/dokumentasi/openapi', [K]],
  ['GET', '/surveys/:surveyId/results', [K, O]],
  ['GET', '/surveys/:surveyId/results/export', [K, O]],
  ['GET', '/dashboard/ikm', [K]],
  ['GET', '/notifications', 'semua'],
  ['GET', '/notifications/unread-count', 'semua'],
  ['PATCH', '/notifications/:id/read', 'semua'],
  ['PATCH', '/notifications/read-all', 'semua'],
  ['GET', '/opd', 'semua'],
  ['POST', '/opd/sync', [K]],
  ['GET', '/opd/:id', [K, O]],
  ['GET', '/surveys/:surveyId/questions', [K, O]],
  ['POST', '/surveys/:surveyId/questions', [K, O]],
  ['PATCH', '/surveys/:surveyId/questions/reorder', [K, O]],
  ['PATCH', '/questions/:id', [K, O]],
  ['DELETE', '/questions/:id', [K, O]],
  ['GET', '/ref/unsur', [K, O]],
  ['GET', '/ref/complaint-categories', 'semua'],
  ['GET', '/public/surveys/:surveyId/fill', 'publik'],
  ['POST', '/public/surveys/:surveyId/responses', 'publik'],
  ['GET', '/surveys/:surveyId/fill', [R]],
  ['POST', '/surveys/:surveyId/responses', [R]],
  ['GET', '/me/survey-responses', [R]],
  ['GET', '/surveys/:surveyId/responses', [K, O]],
  ['GET', '/surveys', [K, O]],
  ['POST', '/surveys', [K, O]],
  ['GET', '/surveys/active', [R]],
  ['GET', '/surveys/trash', [K, O]],
  ['GET', '/surveys/trash/retensi', [K, O]],
  ['GET', '/surveys/:id', [K, O]],
  ['PATCH', '/surveys/:id', [K, O]],
  ['DELETE', '/surveys/:id', [K, O]],
  ['POST', '/surveys/:id/restore', [K, O]],
  ['DELETE', '/surveys/:id/purge', [K, O]],
  ['PATCH', '/surveys/:id/status', [K, O]],
  ['PATCH', '/surveys/:id/jenis', [K, O]],
  ['POST', '/surveys/:id/duplicate', [K, O]],
  ['GET', '/users', [K]],
  ['POST', '/users', [K]],
  ['GET', '/users/stats', [K]],
  ['GET', '/users/:id', [K]],
  ['PATCH', '/users/:id', [K]],
  ['PATCH', '/users/:id/status', [K]],
  ['DELETE', '/users/:id', [K]],
];

const kunci = (metode: string, jalur: string) => `${metode} ${jalur}`;

const aksesTeks = (akses: Akses) => (Array.isArray(akses) ? [...akses].sort().join(',') : akses);

/** Parameter jalur diganti id karangan; gerbang menolak sebelum id dibaca. */
const jalurNyata = (jalur: string) => `/api/v1${jalur.replace(/:\w+/g, '999999')}`;

const berperan = MATRIKS.filter((baris): baris is [string, string, Role[]] =>
  Array.isArray(baris[2]),
);
const nonPublik = MATRIKS.filter(([, , akses]) => akses !== 'publik');
const salahPeran = berperan.flatMap(([metode, jalur, peran]) =>
  [K, O, R].filter((p) => !peran.includes(p)).map((p) => [metode, jalur, peran, p] as const),
);

describe('Matriks otorisasi seluruh endpoint (e2e)', () => {
  let app: INestApplication;
  const originalNodeEnv = process.env.NODE_ENV;
  const token: Record<Role, string> = { kabupaten: '', opd: '', responden: '' };

  const panggil = (metode: string, jalur: string) => {
    const server = request(app.getHttpServer());
    const url = jalurNyata(jalur);
    switch (metode) {
      case 'GET':
        return server.get(url);
      case 'POST':
        return server.post(url);
      case 'PATCH':
        return server.patch(url);
      case 'DELETE':
        return server.delete(url);
      default:
        throw new Error(`Metode tak dikenal di MATRIKS: ${metode}`);
    }
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    const prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ERBAC' },
      update: {},
      create: { kode: 'E2ERBAC', nama: 'OPD E2E Matriks RBAC', isActive: true },
    });
    for (const peran of [K, O, R]) {
      const ssoSubject = `e2e-rbac-${peran}`;
      const data = {
        roles: [peran],
        opdId: peran === O ? opd.id : null,
        email: `${peran}@rbac.e2e.test`,
        isActive: true,
        deletedAt: null,
        consentAt: new Date(),
      };
      await prisma.user.upsert({
        where: { ssoSubject },
        update: data,
        create: { ssoSubject, nama: `RBAC ${peran}`, ...data },
      });
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .send({ identifier: ssoSubject });
      expect(login.status).toBe(201);
      token[peran] = login.body.data.token as string;
    }
  }, 60000);

  afterAll(async () => {
    await app.close();
    process.env.NODE_ENV = originalNodeEnv;
  }, 30000);

  it('MATRIKS sama persis dengan rute dan dekorator yang hidup di aplikasi', () => {
    const reflector = app.get(Reflector);
    const hidup = new Map<string, string>();

    for (const modul of app.get(ModulesContainer).values()) {
      for (const pembungkus of modul.controllers.values()) {
        const kelas = pembungkus.metatype as (new (...args: never[]) => unknown) | null;
        if (!kelas) continue;
        const dasar = Reflect.getMetadata(PATH_METADATA, kelas) as string;
        for (const nama of Object.getOwnPropertyNames(kelas.prototype)) {
          const handler = (kelas.prototype as Record<string, unknown>)[nama];
          if (nama === 'constructor' || typeof handler !== 'function') continue;
          const sub = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
          if (sub === undefined) continue;
          const metode = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
          const jalur =
            '/' +
            [dasar, sub]
              .map((p) => p.replace(/^\/+|\/+$/g, ''))
              .filter(Boolean)
              .join('/');
          const target = [handler, kelas] as [typeof handler & object, typeof kelas];
          const publik = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, target);
          const peran = reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, target);
          const akses: Akses = publik ? 'publik' : peran && peran.length > 0 ? peran : 'semua';
          hidup.set(kunci(metode, jalur), aksesTeks(akses));
        }
      }
    }

    const tabel = new Map(MATRIKS.map(([m, j, a]) => [kunci(m, j), aksesTeks(a)]));
    expect(tabel.size).toBe(MATRIKS.length);
    expect(Object.fromEntries([...hidup].sort())).toEqual(Object.fromEntries([...tabel].sort()));
  });

  it.each(nonPublik.map(([m, j]) => [m, j]))('%s %s tanpa token -> 401', async (metode, jalur) => {
    const res = await panggil(metode, jalur);
    expect(res.status).toBe(401);
  });

  it.each(salahPeran.map(([m, j, peran, p]) => [m, j, p, peran]))(
    '%s %s sebagai %s -> 403 di gerbang peran',
    async (metode, jalur, sebagai, peran) => {
      const res = await panggil(metode, jalur).set('Authorization', `Bearer ${token[sebagai]}`);
      expect(res.status).toBe(403);
      const cocok = /hanya untuk peran: ([a-z, ]+)$/.exec(String(res.body.message));
      expect(cocok).not.toBeNull();
      expect(cocok![1].split(', ').sort()).toEqual([...peran].sort());
    },
  );
});
