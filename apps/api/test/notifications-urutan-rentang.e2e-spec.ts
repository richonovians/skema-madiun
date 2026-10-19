import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * Urutan & rentang waktu pada GET /notifications (permintaan pengguna
 * 13 September 2026: "tambahkan fitur sorting/filter pada riwayat notifikasi").
 *
 * SPEC TERPISAH, bukan tambahan di notifications.e2e-spec.ts: berkas itu
 * bergantung urutan dan DIAKHIRI dengan read-all yang menandai seluruh
 * notifikasi respondennya dibaca. Menyisipkan uji di sana berarti hasilnya
 * bergantung pada uji mana yang kebetulan jalan lebih dulu.
 *
 * Barisnya ditulis LANGSUNG lewat prisma dengan `createdAt` yang ditentukan
 * sendiri, bukan dipicu lewat pengaduan sungguhan. Yang diuji di sini adalah
 * pengurutan dan penyaringan waktu, dan keduanya butuh tanggal yang pasti --
 * notifikasi hasil pemicu nyata semuanya lahir "sekarang".
 */
const SUBJECT = 'e2e-notif-urutan';

describe('Notifications: urutan & rentang waktu (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;

  const hariLalu = (n: number) => new Date(Date.now() - n * 86_400_000);

  const BARIS = [
    { judul: 'Notif hari ini', hari: 0 },
    { judul: 'Notif lima hari lalu', hari: 5 },
    { judul: 'Notif empat puluh lima hari lalu', hari: 45 },
    { judul: 'Notif dua ratus hari lalu', hari: 200 },
  ];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const user = await prisma.user.upsert({
      where: { ssoSubject: SUBJECT },
      update: { consentAt: new Date() },
      create: {
        ssoSubject: SUBJECT,
        nama: 'Responden Urutan Notifikasi',
        email: 'e2e-notif-urutan@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    userId = user.id;

    // Sisa run sebelumnya dibersihkan lebih dulu: kalau tidak, jumlah barisnya
    // menumpuk dan uji rentang jadi menghitung baris yang bukan miliknya.
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.notification.createMany({
      data: BARIS.map((b) => ({
        userId,
        // Akunnya berperan warga saja, dan sejak kotak masuk dipisah per peran
        // (16 September 2026) baris yang bertanda peran lain memang tak akan
        // terlihat oleh sesi ini.
        untukPeran: Role.responden,
        type: NotificationType.complaint_created,
        title: b.judul,
        message: `Pesan untuk ${b.judul}`,
        link: null,
        createdAt: hariLalu(b.hari),
      })),
    });
  }, 60000);

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { actorId: userId } });
    await prisma.user.deleteMany({ where: { ssoSubject: SUBJECT } });
    await app.close();
  }, 30000);

  const asResponden = () => devHeaders({ role: Role.responden, userId });
  const judul = (body: { data: { title: string }[] }) => body.data.map((n) => n.title);

  const ambil = async (query = '') =>
    request(app.getHttpServer()).get(`/api/v1/notifications${query}`).set(asResponden());

  it('tanpa parameter, urutannya tetap terbaru dulu', async () => {
    const res = await ambil();

    expect(res.status).toBe(200);
    expect(judul(res.body)).toEqual([
      'Notif hari ini',
      'Notif lima hari lalu',
      'Notif empat puluh lima hari lalu',
      'Notif dua ratus hari lalu',
    ]);
  });

  it('sort=asc membalik urutannya jadi terlama dulu', async () => {
    const res = await ambil('?sort=asc');

    expect(res.status).toBe(200);
    expect(judul(res.body)).toEqual([
      'Notif dua ratus hari lalu',
      'Notif empat puluh lima hari lalu',
      'Notif lima hari lalu',
      'Notif hari ini',
    ]);
  });

  it('sort=desc sama dengan bawaan, bukan galat', async () => {
    const res = await ambil('?sort=desc');

    expect(res.status).toBe(200);
    expect(judul(res.body)[0]).toBe('Notif hari ini');
  });

  it('from menyembunyikan yang lebih tua dari batas', async () => {
    const res = await ambil(`?from=${hariLalu(30).toISOString()}`);

    expect(res.status).toBe(200);
    expect(judul(res.body)).toEqual(['Notif hari ini', 'Notif lima hari lalu']);
  });

  it('to menyembunyikan yang lebih baru dari batas', async () => {
    const res = await ambil(`?to=${hariLalu(30).toISOString()}`);

    expect(res.status).toBe(200);
    expect(judul(res.body)).toEqual([
      'Notif empat puluh lima hari lalu',
      'Notif dua ratus hari lalu',
    ]);
  });

  it('from dan to bersama membatasi dari dua sisi', async () => {
    const res = await ambil(`?from=${hariLalu(100).toISOString()}&to=${hariLalu(1).toISOString()}`);

    expect(res.status).toBe(200);
    expect(judul(res.body)).toEqual(['Notif lima hari lalu', 'Notif empat puluh lima hari lalu']);
  });

  /**
   * Angka pada pil "Semua"/"Belum dibaca" di halaman riwayat dibaca dari
   * `meta.pagination.total`. Kalau total tak ikut menyaring, pilnya akan
   * menyebut angka yang tak ada hubungannya dengan daftar di bawahnya.
   */
  it('total pada meta ikut menyaring, bukan jumlah seluruhnya', async () => {
    const semua = await ambil();
    const disaring = await ambil(`?from=${hariLalu(30).toISOString()}`);

    expect(semua.body.meta.pagination.total).toBe(4);
    expect(disaring.body.meta.pagination.total).toBe(2);
  });

  it('rentang yang tak memuat apa pun menghasilkan daftar kosong, bukan galat', async () => {
    const res = await ambil(
      `?from=${hariLalu(400).toISOString()}&to=${hariLalu(300).toISOString()}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.pagination.total).toBe(0);
  });

  /**
   * `forbidNonWhitelisted: true` sudah membuat parameter ASING ditolak 400,
   * jadi memeriksa status saja akan hijau bahkan sebelum `sort` ada -- uji yang
   * lolos tanpa fiturnya tak menjaga apa pun. Karena itu pesannya ikut
   * diperiksa: yang dituntut adalah penolakan karena NILAINYA salah, bukan
   * karena parameternya tak dikenal.
   */
  it('sort di luar asc/desc ditolak karena nilainya, bukan karena tak dikenal', async () => {
    const res = await ambil('?sort=terserah');
    const pesan = JSON.stringify(res.body);

    expect(res.status).toBe(400);
    expect(pesan).not.toMatch(/should not exist/i);
    expect(pesan).toMatch(/asc/);
    expect(pesan).toMatch(/desc/);
  });

  it('from yang bukan tanggal ditolak karena bukan tanggal', async () => {
    const res = await ambil('?from=kemarin-sore');
    const pesan = JSON.stringify(res.body);

    expect(res.status).toBe(400);
    expect(pesan).not.toMatch(/should not exist/i);
    expect(pesan).toMatch(/ISO 8601|date/i);
  });

  it('unreadOnly tetap bekerja bersama rentang waktu', async () => {
    const target = await prisma.notification.findFirst({
      where: { userId, title: 'Notif hari ini' },
    });
    await prisma.notification.update({
      where: { id: target!.id },
      data: { isRead: true },
    });

    const res = await ambil(`?unreadOnly=true&from=${hariLalu(30).toISOString()}`);

    expect(res.status).toBe(200);
    expect(judul(res.body)).toEqual(['Notif lima hari lalu']);

    await prisma.notification.update({
      where: { id: target!.id },
      data: { isRead: false },
    });
  });
});
