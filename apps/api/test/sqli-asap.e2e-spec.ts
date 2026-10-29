import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * QA-SECURITY-UAT #5: uji asap injeksi SQL.
 *
 * "Asap", bukan pembuktian menyeluruh, dan itu sengaja: `apps/api` tak memuat
 * satu pun `$queryRaw`, `$executeRaw`, `Prisma.sql`, atau `Prisma.raw`
 * (diperiksa 28 Oktober 2026), sehingga setiap nilai sampai ke Postgres lewat
 * parameter Prisma. Berkas ini memastikan dua hal yang TIDAK dijamin oleh
 * fakta itu: masukan berbentuk SQL tidak pernah menjawab 5xx (galat yang
 * bocor ke klien), dan tidak pernah MELEBARKAN hasil (`' OR 1=1--` yang
 * mengembalikan seluruh baris).
 *
 * Sasarannya setiap masukan teks bebas yang sampai ke `where`: `search` di
 * `/opd` dan `/audit-logs`, `aksi`/`entitas`/`startDate`/`endDate` di
 * `/audit-logs`, `periode`/`jenisLayanan` di `/dashboard/ikm`, dan
 * `:ticketNo`. Parameter angka dan enum ikut sekali sebagai kendali bahwa
 * pipa validasi menolaknya 400.
 */

const MUATAN = [
  "' OR 1=1--",
  "' OR 'a'='a",
  '" OR ""="',
  "'; DROP TABLE users;--",
  '1 UNION SELECT NULL,NULL--',
  "admin'--",
  // Karakter pengganti LIKE. Bukan injeksi SQL, tetapi bila `contains` tak
  // meloloskannya, `search=%` mengembalikan seluruh baris -- pelebaran yang
  // sama bentuknya dengan `' OR 1=1`.
  '%',
  '_',
];

describe('Injeksi SQL: uji asap (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const kabupaten = () => devHeaders({ role: Role.kabupaten });
  const http = () => request(app.getHttpServer());
  const q = (s: string) => encodeURIComponent(s);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe.each(MUATAN)('muatan %j', (muatan) => {
    // Jumlah yang BENAR dihitung di JavaScript, bukan lewat Prisma: `contains`
    // dan `equals` + `insensitive` milik Prisma sendiri menjadi ILIKE tanpa
    // meloloskan `%` dan `_`, sehingga pembandingnya akan ikut melebar.
    const memuat = (teks: string | null | undefined) =>
      (teks ?? '').toLowerCase().includes(muatan.toLowerCase());

    it('GET /opd?search= tidak melebar dan tidak 5xx', async () => {
      const res = await http()
        .get(`/api/v1/opd?search=${q(muatan)}`)
        .set(kabupaten());
      expect(res.status).toBe(200);
      const semua = await prisma.opd.findMany({ select: { nama: true, kode: true } });
      const harfiah = semua.filter((o) => memuat(o.nama) || memuat(o.kode)).length;
      expect(res.body.meta.pagination.total).toBe(harfiah);
    });

    it.each(['search', 'aksi', 'entitas'])(
      'GET /audit-logs?%s= tidak melebar dan tidak 5xx',
      async (medan) => {
        const res = await http()
          .get(`/api/v1/audit-logs?${medan}=${q(muatan)}&limit=100`)
          .set(kabupaten());
        expect(res.status).toBe(200);
        const semua = await prisma.auditLog.findMany({
          select: { aksi: true, entitas: true, actor: { select: { nama: true } } },
        });
        const sama = (teks: string) => teks.toLowerCase() === muatan.toLowerCase();
        const harfiah = semua.filter((a) =>
          medan === 'search'
            ? memuat(a.aksi) || memuat(a.entitas) || memuat(a.actor?.nama)
            : medan === 'aksi'
              ? sama(a.aksi)
              : a.entitas === muatan,
        ).length;
        expect(res.body.meta.pagination.total).toBe(harfiah);
      },
    );

    it.each(['startDate', 'endDate'])(
      'GET /audit-logs?%s= dijawab 400, bukan 5xx',
      async (medan) => {
        const res = await http()
          .get(`/api/v1/audit-logs?${medan}=${q(muatan)}`)
          .set(kabupaten());
        expect(res.status).toBe(400);
      },
    );

    it.each(['periode', 'jenisLayanan'])('GET /dashboard/ikm?%s= tidak 5xx', async (medan) => {
      const res = await http()
        .get(`/api/v1/dashboard/ikm?${medan}=${q(muatan)}`)
        .set(kabupaten());
      expect(res.status).toBeLessThan(500);
    });

    it('GET /complaints/:ticketNo dijawab 404, bukan 5xx', async () => {
      const res = await http()
        .get(`/api/v1/complaints/${q(muatan)}`)
        .set(kabupaten());
      expect(res.status).toBe(404);
    });

    it('parameter angka dan enum ditolak 400 di pipa validasi', async () => {
      for (const jalur of [
        `/api/v1/surveys/${q(muatan)}`,
        `/api/v1/users?opdId=${q(muatan)}`,
        `/api/v1/complaints?status=${q(muatan)}`,
      ]) {
        const res = await http().get(jalur).set(kabupaten());
        expect([jalur, res.status]).toEqual([jalur, 400]);
      }
    });
  });

  it('tabel users masih ada sesudah muatan DROP TABLE', async () => {
    await expect(prisma.user.count()).resolves.toBeGreaterThan(0);
  });
});
