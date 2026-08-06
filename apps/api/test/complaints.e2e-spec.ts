import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

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
      update: {},
      create: {
        ssoSubject: 'e2e-cmp-resp-1',
        nama: 'Responden CMP 1',
        email: 'e2e-cmp-resp-1@example.go.id',
        role: Role.responden,
      },
    });
    respondenId = r1.id;
    const r2 = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-cmp-resp-2' },
      update: {},
      create: {
        ssoSubject: 'e2e-cmp-resp-2',
        nama: 'Responden CMP 2',
        email: 'e2e-cmp-resp-2@example.go.id',
        role: Role.responden,
      },
    });
    respondenId2 = r2.id;
  }, 60000);

  afterAll(async () => {
    await prisma.complaintReply.deleteMany({ where: { complaint: { opdId } } });
    await prisma.complaintAttachment.deleteMany({ where: { complaint: { opdId } } });
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
      .field('kategori', 'infrastruktur')
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
      .field('kategori', 'kebersihan_lingkungan')
      .field('judul', 'Sampah menumpuk')
      .field('uraian', 'Sampah tidak diangkut selama 2 minggu')
      .attach('lampiran', Buffer.from('fake-png-bytes'), 'foto.png');

    expect(res.status).toBe(201);
    expect(res.body.data.attachments).toHaveLength(1);
    expect(res.body.data.attachments[0].fileUrl).toContain('/uploads/complaints/');
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

  it('POST /complaints (INT-42) dgn subKategori sejalan kategori -> 201, tersimpan', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'kesehatan')
      .field('subKategori', 'bpjs')
      .field('judul', 'Layanan BPJS lambat')
      .field('uraian', 'Antrean BPJS tidak jelas');

    expect(res.status).toBe(201);
    expect(res.body.data.subKategori).toBe('bpjs');
  });

  it('POST /complaints (INT-42) dgn subKategori TIDAK sejalan kategori -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden(respondenId))
      .field('opdId', opdId)
      .field('kategori', 'kesehatan')
      .field('subKategori', 'ktp_kk') // sub-kategori ini milik pelayanan_administrasi
      .field('judul', 'X')
      .field('uraian', 'Y');

    expect(res.status).toBe(400);
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
    expect(res.body.data.every((c: { userId: number }) => c.userId === respondenId)).toBe(true);
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
      .field('kategori', 'kesehatan')
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
      .attach('lampiran', Buffer.from('fake-png-bytes'), 'foto.png');

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
});
