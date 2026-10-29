import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { promises as fs } from 'node:fs';
import { get as httpGet } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as path from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { signAttachmentPath } from '../src/modules/complaints/attachment-url.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * QA-SECURITY-UAT #10: unggahan yang belum diuji di jalur HTTP sungguhan.
 *
 * Sudah diuji di tempat lain dan tidak diulang: daftar izin dan pencocokan isi
 * (`attachment.util.spec.ts`), nama berkas aman, tanda tangan URL termasuk
 * `sub` ditukar (`attachment-url.util.spec.ts`), penolakan traversal oleh
 * `resolveLampiran` (`jalur-lampiran.spec.ts`), batas ukuran
 * (`lampiran-batas-ukuran.e2e-spec.ts`), dan di `complaints.e2e-spec.ts`:
 * jalur polos, `sig`/`exp` diutak-atik, tanda tangan lintas berkas, enam
 * lampiran, `.exe`, dan SVG yang mengaku PNG pada POST /complaints.
 *
 * Yang belum: pencocokan isi pada jalur BALASAN, HTML yang mengaku JPEG,
 * tautan kedaluwarsa yang tanda tangannya sah, pencabutan lewat
 * `logout-semua`, traversal yang ditandatangani sah sampai ke penyaji, dan
 * header jawaban berkas yang disajikan.
 */
describe('Unggahan lampiran: jalur HTTP sungguhan (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let rahasia: string;
  let opdId: number;
  let pelaporId: number;
  let ticketNo: string;
  let complaintId: number;
  let urlAwal: string;

  const PNG_ASLI = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('isi-gambar-uji-unggahan'),
  ]);
  const http = () => request(app.getHttpServer());
  const sebagaiPelapor = () => devHeaders({ role: Role.responden, userId: pelaporId });
  const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeAll(async () => {
    process.env.COMPLAINT_DAILY_LIMIT = '1000';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // Penolakan di bawah sengaja; log galatnya hanya derau.
    app = moduleFixture.createNestApplication({ logger: false });
    configureApp(app);
    // Mendengarkan porta sungguhan: uji traversal mengirim jalur mentah.
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    rahasia = app.get(ConfigService).get<string>('session.jwtSecret') ?? '';

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2EUNG' },
      update: {},
      create: { kode: 'E2EUNG', nama: 'OPD E2E Unggahan', isActive: true },
    });
    opdId = opd.id;
    // Di-upsert dan dibiarkan: audit_logs menahannya, dan baris audit tak dihapus.
    const pelapor = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-ung-pelapor' },
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-ung-pelapor',
        nama: 'Pelapor E2E Unggahan',
        email: 'e2e-ung-pelapor@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    pelaporId = pelapor.id;

    const res = await http()
      .post('/api/v1/complaints')
      .set(sebagaiPelapor())
      .field('opdId', opdId)
      .field('kategori', 'lapor')
      .field('judul', '[UJI unggahan] berlampiran')
      .field('uraian', 'Pengaduan uji untuk jalur unggahan')
      .attach('lampiran', PNG_ASLI, 'foto.png');
    expect(res.status).toBe(201);
    ticketNo = res.body.data.ticketNo;
    complaintId = res.body.data.id;
    urlAwal = res.body.data.attachments[0].fileUrl;
  }, 60000);

  afterAll(async () => {
    const milik = { userId: pelaporId };
    const lampiran = await prisma.complaintAttachment.findMany({
      where: { complaint: milik },
      select: { fileUrl: true },
    });
    const dirUnggahan = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
    for (const { fileUrl } of lampiran) {
      await fs
        .unlink(path.join(dirUnggahan, fileUrl.replace(/^\/uploads\//, '')))
        .catch(() => undefined);
    }
    await prisma.complaintAttachment.deleteMany({ where: { complaint: milik } });
    await prisma.complaintReply.deleteMany({ where: { complaint: milik } });
    await prisma.complaint.deleteMany({ where: milik });
    await app.close();
  }, 30000);

  it('KONTROL: tautan terbitan membuka berkasnya', async () => {
    const res = await http().get(urlAwal);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(PNG_ASLI);
  });

  it('berkas yang disajikan membawa tipe dari ekstensinya dan nosniff', async () => {
    const res = await http().get(urlAwal);

    expect(res.headers['content-type']).toMatch(/^image\/png/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('balasan: SVG yang mengaku image/png ditolak 400 dan tak ada balasan tercipta', async () => {
    const sebelum = await prisma.complaintReply.count({ where: { complaintId } });

    const res = await http()
      .post(`/api/v1/complaints/${complaintId}/replies`)
      .set(sebagaiPelapor())
      .field('pesan', '[UJI unggahan] balasan berlampiran palsu')
      .attach('lampiran', Buffer.from('<svg><script>alert(1)</script></svg>'), {
        filename: 'foto.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
    expect(String(res.body.message)).toMatch(/tidak cocok/i);
    expect(await prisma.complaintReply.count({ where: { complaintId } })).toBe(sebelum);
  });

  it('pengaduan: HTML yang mengaku image/jpeg ditolak 400 dan tak ada pengaduan tercipta', async () => {
    const judul = '[UJI unggahan] html menyamar jpeg';

    const res = await http()
      .post('/api/v1/complaints')
      .set(sebagaiPelapor())
      .field('opdId', opdId)
      .field('kategori', 'lapor')
      .field('judul', judul)
      .field('uraian', 'Isi berkas tidak cocok dengan tipe yang dinyatakan')
      .attach('lampiran', Buffer.from('<!doctype html><script>alert(1)</script>'), {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(await prisma.complaint.count({ where: { judul } })).toBe(0);
  });

  it('tautan bertanda tangan sah tetapi sudah lewat masa berlakunya -> 403 kedaluwarsa', async () => {
    const jalur = urlAwal.split('?')[0];
    const duaJamLalu = Date.now() - 2 * 3600 * 1000;
    const usang = signAttachmentPath(jalur, rahasia, 60, pelaporId, duaJamLalu);

    const res = await http().get(usang);

    expect(res.status).toBe(403);
    expect(String(res.body.message)).toMatch(/kedaluwarsa/i);
  });

  /**
   * Dikirim MENTAH lewat node:http, bukan supertest. superagent menormalkan
   * segmen `..` sebelum permintaan berangkat, sehingga dua bentuk pertama tak
   * pernah sampai ke penyaji -- terukur: dengan penolakan traversal dibuang,
   * hanya bentuk `%2F` yang memerah. Penyerang dengan `curl --path-as-is`
   * tidak dinormalkan siapa pun.
   */
  const ambilMentah = (jalurDanKueri: string) =>
    new Promise<{ status: number; isi: string }>((selesai, gagal) => {
      const alamat = app.getHttpServer().address() as AddressInfo;
      const req = httpGet({ host: '127.0.0.1', port: alamat.port, path: jalurDanKueri }, (res) => {
        let isi = '';
        res.on('data', (k) => (isi += k));
        res.on('end', () => selesai({ status: res.statusCode ?? 0, isi }));
      });
      req.on('error', gagal);
    });

  it.each([
    '/uploads/../package.json',
    '/uploads/complaints/../../package.json',
    '/uploads/complaints/..%2F..%2Fpackage.json',
  ])('traversal yang ditandatangani sah tetap tak menyajikan berkas: %s', async (jalur) => {
    const url = signAttachmentPath(jalur, rahasia, 3600, pelaporId);

    const res = await ambilMentah(url);

    expect(res.status).not.toBe(200);
    expect(res.isi).not.toContain('"name"');
  });

  it('logout-semua mencabut tautan terbitan sebelumnya; tautan sesudahnya tetap terbuka', async () => {
    // Pencabutan dibandingkan per detik dengan waktu terbit tautan, jadi
    // tautan yang terbit pada detik yang SAMA dengan pencabutan tetap sah.
    // Jeda ini memastikan tautan di bawah terbit pada detik sebelumnya.
    const sebelumCabut = (await http().get(`/api/v1/complaints/${ticketNo}`).set(sebagaiPelapor()))
      .body.data.attachments[0].fileUrl;
    await jeda(1100);

    const keluar = await http().post('/api/v1/auth/logout-semua').set(sebagaiPelapor());
    expect(keluar.status).toBe(200);

    const dicabut = await http().get(sebelumCabut);
    expect(dicabut.status).toBe(403);
    expect(String(dicabut.body.message)).toMatch(/dicabut/i);

    await jeda(1100);
    const sesudahCabut = (await http().get(`/api/v1/complaints/${ticketNo}`).set(sebagaiPelapor()))
      .body.data.attachments[0].fileUrl;
    const terbuka = await http().get(sesudahCabut);
    expect(terbuka.status).toBe(200);
    expect(terbuka.body).toEqual(PNG_ASLI);
  });
});
