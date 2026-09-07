import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

/**
 * PNG SUNGGUHAN (8 bita tanda tangan + isi apa saja).
 *
 * Dulu uji-uji di bawah mengirim `Buffer.from('fake-png-bytes')` bernama
 * `foto.png` dan lulus — persis celah yang ditutup temuan audit T2 (7 September
 * 2026): daftar izin memeriksa header `Content-Type` KIRIMAN, bukan isinya,
 * sehingga apa pun yang mengaku PNG diterima. Sejak isinya ikut diperiksa,
 * lampiran uji harus benar-benar PNG — dan uji yang judulnya "lampiran valid
 * (png)" jadi menguji apa yang ia katakan.
 */
const PNG_ASLI = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('isi-gambar-uji'),
]);

describe('Complaints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let respondenId: number;
  let respondenId2: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ECMP' },
      update: {},
      create: { kode: 'E2ECMP', nama: 'OPD E2E Complaints', isActive: true },
    });
    opdId = opd.id;

    const r1 = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-cmp-resp-1' },
      // consentAt juga di `update` supaya baris SISA dari run sebelumnya
      // (yang dibuat sebelum penegakan PDP ada) ikut diperbaiki.
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-cmp-resp-1',
        nama: 'Responden CMP 1',
        email: 'e2e-cmp-resp-1@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(), // celah 2: warga tanpa persetujuan PDP ditolak 403 saat mengirim data
      },
    });
    respondenId = r1.id;
    const r2 = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-cmp-resp-2' },
      // consentAt juga di `update` supaya baris SISA dari run sebelumnya
      // (yang dibuat sebelum penegakan PDP ada) ikut diperbaiki.
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-cmp-resp-2',
        nama: 'Responden CMP 2',
        email: 'e2e-cmp-resp-2@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(), // celah 2: warga tanpa persetujuan PDP ditolak 403 saat mengirim data
      },
    });
    respondenId2 = r2.id;
  }, 60000);

  afterAll(async () => {
    // Disapu lewat PELAPOR, bukan lewat `opdId`: sejak 6 September 2026 ada
    // pengaduan yang `opdId`-nya NULL, dan penyaring lama meninggalkannya di
    // basis data selamanya -- termasuk di basis data pengembangan.
    const pelapor = { in: [respondenId, respondenId2] };
    await prisma.complaintReply.deleteMany({ where: { complaint: { userId: pelapor } } });

    // Berkas di DISK ikut dibersihkan, dan urutannya menentukan: begitu baris
    // lampirannya hilang, jejak menuju berkasnya juga hilang dan berkas itu jadi
    // yatim selamanya. Sebelum ini suite ini hanya menghapus baris DB dan
    // meninggalkan satu berkas setiap kali dijalankan (terhitung 39 yatim pada
    // 7 September 2026).
    const lampiran = await prisma.complaintAttachment.findMany({
      where: { complaint: { userId: pelapor } },
      select: { fileUrl: true },
    });
    const dirUnggahan = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
    for (const { fileUrl } of lampiran) {
      try {
        await fs.unlink(path.join(dirUnggahan, fileUrl.replace(/^\/uploads\//, '')));
      } catch {
        // Berkas sudah tak ada -- bukan kegagalan pembersihan.
      }
    }

    await prisma.complaintAttachment.deleteMany({ where: { complaint: { userId: pelapor } } });
    await prisma.complaint.deleteMany({ where: { userId: pelapor } });
    await prisma.complaint.deleteMany({ where: { opdId } });
    await prisma.user.deleteMany({
      where: { ssoSubject: { in: ['e2e-cmp-resp-1', 'e2e-cmp-resp-2'] } },
    });
    await prisma.opd.deleteMany({ where: { kode: 'E2ECMP' } });
    await app.close();
  }, 30000);

  const asResponden = (userId: number) => devHeaders({ role: Role.responden, userId });
  const asOpd = () => devHeaders({ role: Role.opd, opdId });
  const asKabupaten = () => devHeaders({ role: Role.kabupaten });

  it('POST /complaints (Responden) tanpa lampiran -> 201 dengan ticketNo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'aduan')
      .field('judul', 'Jalan rusak')
      .field('uraian', 'Jalan berlubang parah di depan balai desa');

    expect(res.status).toBe(201);
    expect(res.body.data.ticketNo).toMatch(/^PGD\d{8}[A-Z0-9]{4}$/);
    expect(res.body.data.status).toBe('diterima');
  });

  it('POST /complaints dengan lampiran valid (png) -> 201, attachments tersimpan', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lapor')
      .field('judul', 'Sampah menumpuk')
      .field('uraian', 'Sampah tidak diangkut selama 2 minggu')
      .attach('lampiran', PNG_ASLI, 'foto.png');

    expect(res.status).toBe(201);
    expect(res.body.data.attachments).toHaveLength(1);
    expect(res.body.data.attachments[0].fileUrl).toContain('/uploads/complaints/');
  });

  /**
   * TEMUAN AUDIT T1 (7 September 2026), pendekatan (b).
   *
   * Diuji lewat HTTP karena di situlah persoalannya berada: `/uploads/*` bukan
   * rute controller melainkan aset statis, dan sebelum ini ia disajikan TANPA
   * autentikasi apa pun -- terbukti dengan `curl` tanpa kredensial menjawab 200.
   *
   * Penyajiannya sengaja dipindah ke `configureApp` supaya baris-baris di bawah
   * benar-benar dapat menyentuhnya; selama ia hanya ada di main.ts, tak satu pun
   * e2e dapat mengujinya.
   */
  describe('lampiran hanya dapat diambil dengan URL bertanda tangan (T1)', () => {
    let urlBertandaTangan: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set(asResponden(respondenId))
        .field('opdId', opdId)
        .field('kategori', 'lapor')
        .field('judul', 'Uji tanda tangan lampiran')
        .field('uraian', 'Lampiran hanya boleh diambil lewat URL bertanda tangan')
        .attach('lampiran', PNG_ASLI, 'foto.png');

      expect(res.status).toBe(201);
      urlBertandaTangan = res.body.data.attachments[0].fileUrl;
    });

    it('API mengembalikan fileUrl yang sudah ber-exp & sig', () => {
      // Kalau baris ini merah, penandatanganannya tak terpasang dan seluruh uji
      // di bawah kehilangan makna -- termasuk yang menuntut 403.
      expect(urlBertandaTangan).toMatch(/^\/uploads\/complaints\/.+\?exp=\d+&sig=[A-Za-z0-9_-]+$/);
    });

    it('jalur POLOS tanpa tanda tangan -> 403 (inilah celah yang ditutup)', async () => {
      const polos = urlBertandaTangan.split('?')[0];

      const res = await request(app.getHttpServer()).get(polos);

      expect(res.status).toBe(403);
    });

    it('URL bertanda tangan -> 200 dan mengembalikan bita berkasnya', async () => {
      const res = await request(app.getHttpServer()).get(urlBertandaTangan);

      expect(res.status).toBe(200);
      // Bukan cuma statusnya: isinya harus benar-benar berkas yang diunggah.
      expect(res.body).toEqual(PNG_ASLI);
      // Tanpa header ini peramban memblokir <img> lintas-origin walau 200.
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('sig diutak-atik -> 403', async () => {
      const rusak = urlBertandaTangan.replace(/sig=(.)/, (_m, c) => `sig=${c === 'A' ? 'B' : 'A'}`);

      const res = await request(app.getHttpServer()).get(rusak);

      expect(res.status).toBe(403);
    });

    it('exp diperpanjang sendiri -> 403', async () => {
      const jauh = Math.floor(Date.now() / 1000) + 999_999;
      const rusak = urlBertandaTangan.replace(/exp=\d+/, `exp=${jauh}`);

      const res = await request(app.getHttpServer()).get(rusak);

      expect(res.status).toBe(403);
    });

    it('tanda tangan satu berkas tak dapat dipakai untuk berkas lain', async () => {
      // Pengulangan lintas-berkas: satu URL sah dipakai mengambil lampiran milik
      // pengaduan orang lain.
      const [, kueri] = urlBertandaTangan.split('?');
      const res = await request(app.getHttpServer()).get(
        `/uploads/complaints/berkas-lain.png?${kueri}`,
      );

      expect(res.status).toBe(403);
    });
  });

  it('POST /complaints dengan tipe berkas tidak diizinkan -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'X')
      .field('uraian', 'Y')
      .attach('lampiran', Buffer.from('exe-bytes'), 'virus.exe');

    expect(res.status).toBe(400);
  });

  /**
   * Serangan yang SUDAH TERBUKTI berjalan sebelum T2 ditutup (7 September 2026),
   * dijaga di tingkat HTTP karena di situlah `Content-Type` bagian multipart
   * benar-benar datang dari pengirim — di uji unit ia hanya sebuah field objek.
   *
   * Dulu: lolos daftar izin -> tersimpan `.svg` -> disajikan `image/svg+xml`
   * dari origin API. Yang menahannya hanya CSP.
   */
  it('POST /complaints: SVG yang mengaku image/png -> 400 (T2)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'Uji T2')
      .field('uraian', 'Isi berkas tidak cocok dengan tipe yang dinyatakan')
      .attach('lampiran', Buffer.from('<svg><script>alert(1)</script></svg>'), {
        // `contentType` = header pada BAGIAN multipart, yaitu tepat nilai yang
        // dikendalikan penyerang dan yang dulu dipercaya daftar izin.
        filename: 'probe.svg',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
    // Pesannya harus menyebut KETIDAKCOCOKAN, bukan "tipe tidak diizinkan" --
    // `image/png` memang diizinkan; yang salah isinya.
    expect(String(res.body.message)).toMatch(/tidak cocok/i);
  });

  it('POST /complaints dgn subKategori (field sudah dihapus) -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'aduan')
      .field('subKategori', 'bpjs')
      .field('judul', 'Judul')
      .field('uraian', 'Uraian');

    // forbidNonWhitelisted: properti asing DITOLAK, bukan diabaikan.
    expect(res.status).toBe(400);
  });

  it('pengaduan anonim: respons admin tak memuat userId maupun reporterNama', async () => {
    const dibuat = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'aduan')
      .field('judul', 'Pengaduan anonim (uji e2e)')
      .field('uraian', 'Uraian pengaduan anonim')
      .field('isAnonim', 'true');

    expect(dibuat.status).toBe(201);
    expect(dibuat.body.data.isAnonim).toBe(true);

    const dilihatAdmin = await request(app.getHttpServer())
      .get(`/api/v1/complaints/${dibuat.body.data.ticketNo}`)
      .set(asKabupaten());

    expect(dilihatAdmin.status).toBe(200);
    expect(Object.keys(dilihatAdmin.body.data)).not.toContain('userId');
    expect(Object.keys(dilihatAdmin.body.data)).not.toContain('reporterNama');
  });

  it('pengaduan biasa: admin TETAP menerima userId & reporterNama (kontrol)', async () => {
    const dibuat = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'aduan')
      .field('judul', 'Pengaduan biasa (uji e2e)')
      .field('uraian', 'Uraian pengaduan biasa');

    expect(dibuat.status).toBe(201);

    const dilihatAdmin = await request(app.getHttpServer())
      .get(`/api/v1/complaints/${dibuat.body.data.ticketNo}`)
      .set(asKabupaten());

    // Tanpa kontrol ini, uji di atas tak membuktikan apa pun tentang penyamaran.
    expect(dilihatAdmin.body.data.userId).toBe(respondenId);
    expect(typeof dilihatAdmin.body.data.reporterNama).toBe('string');
  });

  it('POST /complaints oleh Admin OPD -> 403 (hanya Responden)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asOpd())
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'X')
      .field('uraian', 'Y');
    expect(res.status).toBe(403);
  });

  it('POST /complaints ke OPD yang tidak ada -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId + 999999)
      .field('kategori', 'lainnya')
      .field('judul', 'X')
      .field('uraian', 'Y');
    expect(res.status).toBe(400);
  });

  it('GET /complaints (Responden) -> hanya miliknya sendiri', async () => {
    // responden2 mengajukan satu pengaduan agar ada data milik pihak lain
    await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId2))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'Punya responden 2')
      .field('uraian', 'Uraian responden 2');

    const res = await request(app.getHttpServer())
      .get('/api/v1/complaints')
      .set(asResponden(respondenId));
    expect(res.status).toBe(200);
    // DIPERBARUI 4 September 2026: pengaduan anonim milik sendiri SENGAJA tak
    // membawa `userId` -- penyamaran berlaku juga bagi pemiliknya, yang toh tak
    // memerlukan id-nya sendiri. Karena itu yang diperiksa bukan lagi "semua
    // baris ber-userId saya", melainkan dua hal yang benar-benar dijanjikan
    // penyaring kepemilikan: tak ada userId ORANG LAIN, dan pengaduan pihak
    // lain tak muncul sama sekali.
    expect(
      res.body.data.every(
        (c: { userId?: number }) => c.userId === undefined || c.userId === respondenId,
      ),
    ).toBe(true);
    expect(res.body.data.some((c: { judul: string }) => c.judul === 'Punya responden 2')).toBe(
      false,
    );
  });

  it('GET /complaints (Admin OPD) -> semua pengaduan OPD-nya (lintas responden)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/complaints').set(asOpd());
    expect(res.status).toBe(200);
    expect(res.body.data.every((c: { opdId: number }) => c.opdId === opdId)).toBe(true);
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(3);
  });

  it('GET /complaints (Kabupaten) -> read-only semua', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/complaints').set(asKabupaten());
    expect(res.status).toBe(200);
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(3);
  });

  it('lifecycle status: diterima -> diproses -> ditolak dengan catatan tercatat sebagai reply', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'aduan')
      .field('judul', 'Lifecycle')
      .field('uraian', 'Uraian lifecycle');
    const id = created.body.data.id;

    const toDiproses = await request(app.getHttpServer())
      .patch(`/api/v1/complaints/${id}/status`)
      .set(asOpd())
      .send({ status: 'diproses' });
    expect(toDiproses.status).toBe(200);
    expect(toDiproses.body.data.status).toBe('diproses');

    const ditolakTanpaCatatan = await request(app.getHttpServer())
      .patch(`/api/v1/complaints/${id}/status`)
      .set(asOpd())
      .send({ status: 'ditolak' });
    expect(ditolakTanpaCatatan.status).toBe(400);

    const ditolak = await request(app.getHttpServer())
      .patch(`/api/v1/complaints/${id}/status`)
      .set(asOpd())
      .send({ status: 'ditolak', catatan: 'Bukan kewenangan OPD ini' });
    expect(ditolak.status).toBe(200);
    expect(ditolak.body.data.status).toBe('ditolak');

    const replies = await request(app.getHttpServer())
      .get(`/api/v1/complaints/${id}/replies`)
      .set(asResponden(respondenId));
    expect(replies.status).toBe(200);
    expect(replies.body.data).toHaveLength(1);
    expect(replies.body.data[0].pesan).toBe('Bukan kewenangan OPD ini');

    // status terminal → transisi lanjutan ditolak
    const afterTerminal = await request(app.getHttpServer())
      .patch(`/api/v1/complaints/${id}/status`)
      .set(asOpd())
      .send({ status: 'diproses' });
    expect(afterTerminal.status).toBe(400);
  });

  it('PATCH status oleh Responden -> 403 (hanya OPD)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'X')
      .field('uraian', 'Y');
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/complaints/${created.body.data.id}/status`)
      .set(asResponden(respondenId))
      .send({ status: 'diproses' });
    expect(res.status).toBe(403);
  });

  it('PATCH status oleh Admin OPD lain -> 403', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'X')
      .field('uraian', 'Y');
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/complaints/${created.body.data.id}/status`)
      .set(devHeaders({ role: Role.opd, opdId: opdId + 999999 }))
      .send({ status: 'diproses' });
    expect(res.status).toBe(403);
  });

  it('GET /complaints/:ticketNo (pemilik) -> 200; (responden lain) -> 403', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'Lacak')
      .field('uraian', 'Uraian lacak');
    const ticketNo = created.body.data.ticketNo;

    const owner = await request(app.getHttpServer())
      .get(`/api/v1/complaints/${ticketNo}`)
      .set(asResponden(respondenId));
    expect(owner.status).toBe(200);

    const other = await request(app.getHttpServer())
      .get(`/api/v1/complaints/${ticketNo}`)
      .set(asResponden(respondenId2));
    expect(other.status).toBe(403);
  });

  it('GET /complaints/:ticketNo tidak ada -> 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/complaints/PGDTIDAKADA')
      .set(asKabupaten());
    expect(res.status).toBe(404);
  });

  it('POST replies oleh Responden pemilik & Admin OPD -> 201, GET replies terurut', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'Percakapan')
      .field('uraian', 'Uraian percakapan');
    const id = created.body.data.id;

    const reply1 = await request(app.getHttpServer())
      .post(`/api/v1/complaints/${id}/replies`)
      .set(asResponden(respondenId))
      .send({ pesan: 'Mohon segera ditindaklanjuti' });
    expect(reply1.status).toBe(201);

    const reply2 = await request(app.getHttpServer())
      .post(`/api/v1/complaints/${id}/replies`)
      .set(asOpd())
      .send({ pesan: 'Sedang kami proses' });
    expect(reply2.status).toBe(201);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/complaints/${id}/replies`)
      .set(asResponden(respondenId));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[0].pesan).toBe('Mohon segera ditindaklanjuti');
    expect(list.body.data[1].pesan).toBe('Sedang kami proses');
  });

  it('POST replies dengan lampiran TANPA pesan -> 201 (2026-08-06, laporan bug user)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'Kirim foto tanpa teks')
      .field('uraian', 'Uraian');
    const id = created.body.data.id;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/complaints/${id}/replies`)
      .set(asResponden(respondenId))
      .attach('lampiran', PNG_ASLI, 'foto.png');

    expect(res.status).toBe(201);
    expect(res.body.data.pesan).toBe('');
    expect(res.body.data.attachments).toHaveLength(1);
    expect(res.body.data.attachments[0].fileUrl).toContain('/uploads/complaints/');
  });

  it('POST replies tanpa pesan DAN tanpa lampiran -> 400', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'X')
      .field('uraian', 'Y');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/complaints/${created.body.data.id}/replies`)
      .set(asResponden(respondenId))
      .send({});

    expect(res.status).toBe(400);
  });

  // Kabupaten (= superuser, 2026-08-05) py akses penuh ke SEMUA pengaduan
  // (assertAccess bypass, sama seperti sejak modul ini pertama dibuat -- lihat
  // PRD Bab 6 "Kelola & tindak lanjut pengaduan: kabupaten pantau semua").
  // BUKAN dibatasi ke OPD/Responden pemilik tiket saja.
  it('POST replies oleh Admin Kabupaten -> 201 (akses penuh, bukan hanya OPD/Responden)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'X')
      .field('uraian', 'Y');
    const res = await request(app.getHttpServer())
      .post(`/api/v1/complaints/${created.body.data.id}/replies`)
      .set(asKabupaten())
      .send({ pesan: 'Halo' });
    expect(res.status).toBe(201);
    expect(res.body.data.pesan).toBe('Halo');
  });

  /**
   * PENGADUAN TANPA TUJUAN & PENERUSANNYA (permintaan pengguna 6 September
   * 2026). Yang dibuktikan di sini bukan cuma "endpointnya menjawab 200",
   * melainkan ISOLASINYA: tiket yang belum bertujuan tak boleh terlihat oleh
   * Admin OPD mana pun, karena belum menjadi tanggung jawab siapa-siapa.
   */
  describe('pengaduan tanpa OPD tujuan', () => {
    let tiketId: number;
    let tiketNo: string;

    it('POST /complaints TANPA opdId -> 201, opdId null', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set(asResponden(respondenId))
        .field('kategori', 'lainnya')
        .field('judul', 'Tidak tahu harus ke mana')
        .field('uraian', 'Pengirim tidak tahu OPD mana yang berwenang');

      expect(res.status).toBe(201);
      expect(res.body.data.opdId).toBeNull();
      tiketId = res.body.data.id;
      tiketNo = res.body.data.ticketNo;
    });

    it('Admin OPD TIDAK melihatnya di daftar', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/complaints?limit=100')
        .set(asOpd());

      expect(res.status).toBe(200);
      const nomor = res.body.data.map((c: { ticketNo: string }) => c.ticketNo);
      expect(nomor).not.toContain(tiketNo);
    });

    it('Admin OPD tidak dapat membukanya lewat nomor tiket -> 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/complaints/${tiketNo}`)
        .set(asOpd());

      expect(res.status).toBe(403);
    });

    it('Admin Kabupaten melihatnya lewat ?tanpaOpd=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/complaints?tanpaOpd=true&limit=100')
        .set(asKabupaten());

      expect(res.status).toBe(200);
      const nomor = res.body.data.map((c: { ticketNo: string }) => c.ticketNo);
      expect(nomor).toContain(tiketNo);
      // Penyaringnya benar-benar menyaring: tak satu pun baris yang sudah
      // bertujuan ikut terbawa.
      expect(res.body.data.every((c: { opdId: number | null }) => c.opdId === null)).toBe(true);
    });

    it('statusnya tidak dapat diubah sebelum diteruskan -> 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${tiketId}/status`)
        .set(asKabupaten())
        .send({ status: 'diproses' });

      expect(res.status).toBe(400);
    });

    it('Admin OPD tidak dapat meneruskan -> 403', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${tiketId}/opd`)
        .set(asOpd())
        .send({ opdId });

      expect(res.status).toBe(403);
    });

    it('Admin Kabupaten meneruskan -> 200, opdId terisi', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${tiketId}/opd`)
        .set(asKabupaten())
        .send({ opdId });

      expect(res.status).toBe(200);
      expect(res.body.data.opdId).toBe(opdId);
    });

    it('sesudah diteruskan, Admin OPD tujuan MELIHATNYA', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/complaints?limit=100')
        .set(asOpd());

      const nomor = res.body.data.map((c: { ticketNo: string }) => c.ticketNo);
      expect(nomor).toContain(tiketNo);
    });

    it('meneruskan ulang -> 400 (bukan dialihkan diam-diam)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${tiketId}/opd`)
        .set(asKabupaten())
        .send({ opdId });

      expect(res.status).toBe(400);
    });
  });
});
