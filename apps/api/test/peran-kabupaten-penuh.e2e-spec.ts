import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * PERAN superuser DILEBUR KE kabupaten (15 September 2026, permintaan pengguna).
 *
 * Sampai hari ini `superuser` bukan sekadar nama: ia satu-satunya peran yang
 * boleh menyentuh manajemen pengguna dan log aktivitas, dan pemisahan itu
 * ditegakkan DUA lapis -- `@Roles` di controller dan pemeriksaan di service.
 * Audit T6 (7 September 2026) sengaja menutup jalan pintas yang dulu membuat
 * `kabupaten` ikut lolos diam-diam, supaya gagalnya fail-CLOSED.
 *
 * Yang dikerjakan di sini karena itu bukan penggantian label, melainkan
 * PEMINDAHAN KUASA. Ujinya menuntut kedua lapis itu ikut berpindah: kalau hanya
 * `@Roles` yang diubah, permintaannya lolos gerbang pertama lalu ditolak
 * service dengan 403 -- dan uji yang cuma memeriksa "bukan 403 dari guard" akan
 * menyatakannya berhasil.
 */
describe('Kabupaten mewarisi kuasa superuser (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

  const sebagai = (role: Role, opdId?: number) => devHeaders({ role, opdId });

  describe('Manajemen pengguna', () => {
    it('kabupaten dapat membuka daftar pengguna', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users?limit=1')
        .set(sebagai(Role.kabupaten))
        .expect(200);
    });

    /**
     * PASANGAN kontrol. Memindahkan kuasa ke `kabupaten` tak boleh berubah
     * menjadi membuka rutenya bagi siapa saja -- bentuk kegagalan yang paling
     * mudah lolos, karena uji di atas tetap hijau sementara seluruh Admin OPD
     * ikut dapat mengangkat dan menurunkan admin lain.
     *
     * PESANnya ikut diperiksa, dan itu bukan kerewelan. Penolakan di sini dapat
     * datang dari DUA lapis -- `@Roles` di controller dan `assertKabupaten` di
     * service -- dan keduanya sengaja berbunyi berbeda. Terbukti lewat mutasi:
     * MELEPAS `@Roles` dari controller sama sekali tak memerahkan uji ini
     * selama ia cuma memeriksa status 403, karena lapis kedua menangkapnya.
     * Lapis pertama pun hilang tanpa satu pun uji yang mengeluh.
     */
    it('KONTROL: admin OPD ditolak di gerbang peran, bukan cuma di service', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users?limit=1')
        .set(sebagai(Role.opd, 1));

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(/hanya untuk peran: kabupaten/i);
    });

    it('KONTROL: responden tetap ditolak', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users?limit=1')
        .set(sebagai(Role.responden))
        .expect(403);
    });
  });

  describe('Log aktivitas', () => {
    it('kabupaten dapat membaca log aktivitas', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs?limit=1')
        .set(sebagai(Role.kabupaten))
        .expect(200);
    });

    it('KONTROL: admin OPD ditolak di gerbang peran, bukan cuma di service', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?limit=1')
        .set(sebagai(Role.opd, 1));

      expect(res.status).toBe(403);
      expect(String(res.body.message)).toMatch(/hanya untuk peran: kabupaten/i);
    });
  });

  /**
   * Peran itu harus benar-benar LENYAP, bukan sekadar tak dipakai. Nilai enum
   * yang tertinggal akan terus dapat ditulis lewat jalur mana pun yang luput
   * disisir -- seed, skrip pemeliharaan, atau kolom `roles` yang disetel
   * langsung -- dan kembali menciptakan akun berperan hantu yang tak satu pun
   * layar tahu cara menampilkannya.
   */
  describe('Peran superuser lenyap', () => {
    it('tipe enum di basis data tak lagi memuat superuser', async () => {
      const nilai = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
        `SELECT e.enumlabel FROM pg_enum e
         JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'user_role'`,
      );

      expect(nilai.map((n) => n.enumlabel).sort()).toEqual(['kabupaten', 'opd', 'responden']);
    });

    it('tak ada akun yang masih memegang peran itu', async () => {
      const semua = await prisma.user.findMany({ select: { id: true, roles: true } });

      const bermasalah = semua.filter((u) => (u.roles as string[]).includes('superuser'));
      expect(bermasalah).toEqual([]);
    });

    /**
     * PASANGAN kontrol untuk migrasi datanya. Membuang `superuser` dari kolom
     * `roles` tanpa memastikan ada penggantinya akan meninggalkan akun berperan
     * KOSONG -- invarian "minimal satu peran" ditegakkan aplikasi, bukan basis
     * data, jadi tak ada yang akan menolaknya saat migrasi berjalan. Akun itu
     * baru ketahuan rusak ketika pemiliknya gagal masuk.
     */
    it('KONTROL: tak ada akun yang kehilangan seluruh perannya', async () => {
      const semua = await prisma.user.findMany({ select: { id: true, roles: true } });

      expect(semua.filter((u) => u.roles.length === 0)).toEqual([]);
    });
  });
});
