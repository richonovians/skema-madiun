import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { devHeaders } from './helpers/auth.helper';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let opdUserId: number;
  let respondenId: number;
  let kabupatenUserId: number;
  let complaintId: number;
  let ticketNo: string;
  let createdTicketNo: string | undefined;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.upsert({
      where: { kode: 'E2ENOTIF' },
      update: {},
      create: { kode: 'E2ENOTIF', nama: 'OPD E2E Notifikasi', isActive: true },
    });
    opdId = opd.id;

    const opdUser = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-notif-opd' },
      update: {},
      create: {
        ssoSubject: 'e2e-notif-opd',
        nama: 'Admin OPD Notifikasi',
        email: 'e2e-notif-opd@example.go.id',
        role: Role.opd,
        opdId,
      },
    });
    opdUserId = opdUser.id;

    const responden = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-notif-resp' },
      update: {},
      create: {
        ssoSubject: 'e2e-notif-resp',
        nama: 'Responden Notifikasi',
        email: 'e2e-notif-resp@example.go.id',
        role: Role.responden,
      },
    });
    respondenId = responden.id;

    const kabupatenUser = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-notif-kab' },
      update: {},
      create: {
        ssoSubject: 'e2e-notif-kab',
        nama: 'Admin Kabupaten Notifikasi',
        email: 'e2e-notif-kab@example.go.id',
        role: Role.kabupaten,
      },
    });
    kabupatenUserId = kabupatenUser.id;

    const complaint = await prisma.complaint.create({
      data: {
        ticketNo: 'PGDE2ENOTIF01',
        userId: respondenId,
        opdId,
        kategori: 'lainnya',
        judul: 'Pengaduan E2E Notifikasi',
        uraian: 'Uraian pengaduan e2e notifikasi',
      },
    });
    complaintId = complaint.id;
    ticketNo = complaint.ticketNo;
  }, 60000);

  afterAll(async () => {
    // Broadcast kabupaten (2026-08-06) menyasar SEMUA akun kabupaten aktif --
    // termasuk akun seed NYATA di DB dev bersama (bukan cuma kabupatenUserId
    // test ini), bukan hanya [opdUserId, respondenId, kabupatenUserId]. Bersihkan
    // via `link` (memuat ticketNo) supaya penerima manapun ikut terhapus --
    // pola sama dgn pelajaran opd.e2e-spec.ts (cegah polusi DB dev bersama).
    const ticketNos = [ticketNo, createdTicketNo].filter((t): t is string => Boolean(t));
    await prisma.notification.deleteMany({
      where: { OR: ticketNos.map((t) => ({ link: { contains: t } })) },
    });
    await prisma.complaintReply.deleteMany({ where: { complaintId } });
    await prisma.complaint.deleteMany({ where: { opdId } });
    // PATCH status pengaduan memicu AuditInterceptor mencatat audit_logs
    // ber-FK RESTRICT ke users -- harus dihapus dulu sebelum user dihapus.
    await prisma.auditLog.deleteMany({
      where: { actorId: { in: [opdUserId, respondenId, kabupatenUserId] } },
    });
    await prisma.user.deleteMany({
      where: { ssoSubject: { in: ['e2e-notif-opd', 'e2e-notif-resp', 'e2e-notif-kab'] } },
    });
    await prisma.opd.deleteMany({ where: { kode: 'E2ENOTIF' } });
    await app.close();
  }, 30000);

  const asOpd = () => devHeaders({ role: Role.opd, userId: opdUserId, opdId });
  const asResponden = () => devHeaders({ role: Role.responden, userId: respondenId });
  const asKabupaten = () => devHeaders({ role: Role.kabupaten, userId: kabupatenUserId });

  it('Admin OPD ubah status -> Responden dapat notifikasi complaint_status_changed', async () => {
    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/complaints/${complaintId}/status`)
      .set(asOpd())
      .send({ status: 'diproses' });
    expect(patchRes.status).toBe(200);

    const res = await request(app.getHttpServer()).get('/api/v1/notifications').set(asResponden());

    expect(res.status).toBe(200);
    const notif = res.body.data.find(
      (n: { type: string }) => n.type === 'complaint_status_changed',
    );
    expect(notif).toBeDefined();
    expect(notif.message).toContain(ticketNo);
    expect(notif.message).toContain('Diproses');
    expect(notif.link).toBe(`/complaints/${ticketNo}`);
    expect(notif.isRead).toBe(false);
  });

  it('(2026-08-06) Kabupaten JUGA dapat notifikasi complaint_status_changed (oversight, link admin-kab)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/notifications').set(asKabupaten());

    const notif = res.body.data.find(
      (n: { type: string }) => n.type === 'complaint_status_changed',
    );
    expect(notif).toBeDefined();
    expect(notif.link).toBe(`/admin-kab/complaints/${ticketNo}`);
  });

  it('Responden membalas -> Admin OPD dapat notifikasi complaint_reply (link admin-opd)', async () => {
    const replyRes = await request(app.getHttpServer())
      .post(`/api/v1/complaints/${complaintId}/replies`)
      .set(asResponden())
      .send({ pesan: 'Kapan ditindaklanjuti?' });
    expect(replyRes.status).toBe(201);

    const res = await request(app.getHttpServer()).get('/api/v1/notifications').set(asOpd());

    const notif = res.body.data.find((n: { type: string }) => n.type === 'complaint_reply');
    expect(notif).toBeDefined();
    expect(notif.link).toBe(`/admin-opd/complaints/${ticketNo}`);
  });

  it('(2026-08-06) Kabupaten JUGA dapat notifikasi complaint_reply (oversight, link admin-kab)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/notifications').set(asKabupaten());

    const notif = res.body.data.find((n: { type: string }) => n.type === 'complaint_reply');
    expect(notif).toBeDefined();
    expect(notif.link).toBe(`/admin-kab/complaints/${ticketNo}`);
  });

  it('(2026-08-06) Kabupaten yg JADI PELAKU balasan TIDAK memberi notifikasi ke dirinya sendiri', async () => {
    const replyRes = await request(app.getHttpServer())
      .post(`/api/v1/complaints/${complaintId}/replies`)
      .set(asKabupaten())
      .send({ pesan: 'Dipantau langsung oleh Kabupaten.' });
    expect(replyRes.status).toBe(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications?unreadOnly=true')
      .set(asKabupaten());
    const selfNotifs = res.body.data.filter(
      (n: { type: string; message: string }) =>
        n.type === 'complaint_reply' && n.message.includes('Dipantau langsung'),
    );
    expect(selfNotifs).toHaveLength(0);
  });

  it('(2026-08-06) Pengaduan baru via POST /complaints -> Admin OPD & Kabupaten dapat notifikasi complaint_created', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(asResponden())
      .field('opdId', opdId)
      .field('kategori', 'lainnya')
      .field('judul', 'Pengaduan baru utk uji notifikasi')
      .field('uraian', 'Uraian pengaduan baru');
    expect(createRes.status).toBe(201);
    createdTicketNo = createRes.body.data.ticketNo;

    const opdRes = await request(app.getHttpServer()).get('/api/v1/notifications').set(asOpd());
    const opdNotif = opdRes.body.data.find(
      (n: { type: string; link: string }) =>
        n.type === 'complaint_created' && n.link === `/admin-opd/complaints/${createdTicketNo}`,
    );
    expect(opdNotif).toBeDefined();

    const kabRes = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(asKabupaten());
    const kabNotif = kabRes.body.data.find(
      (n: { type: string; link: string }) =>
        n.type === 'complaint_created' && n.link === `/admin-kab/complaints/${createdTicketNo}`,
    );
    expect(kabNotif).toBeDefined();

    const respRes = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(asResponden());
    const selfNotif = respRes.body.data.find(
      (n: { type: string; link: string }) =>
        n.type === 'complaint_created' && n.link.includes(createdTicketNo as string),
    );
    expect(selfNotif).toBeUndefined();
  });

  it('Admin OPD membalas -> Responden dapat notifikasi complaint_reply (link responden)', async () => {
    const replyRes = await request(app.getHttpServer())
      .post(`/api/v1/complaints/${complaintId}/replies`)
      .set(asOpd())
      .send({ pesan: 'Sedang kami proses.' });
    expect(replyRes.status).toBe(201);

    const res = await request(app.getHttpServer()).get('/api/v1/notifications').set(asResponden());

    const replyNotifs = res.body.data.filter((n: { type: string }) => n.type === 'complaint_reply');
    expect(replyNotifs.length).toBeGreaterThan(0);
    expect(replyNotifs[0].link).toBe(`/complaints/${ticketNo}`);
  });

  it('GET /notifications/unread-count mencerminkan jumlah belum dibaca Responden', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set(asResponden());

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBeGreaterThanOrEqual(2); // status berubah + balasan OPD
  });

  it('PATCH /notifications/:id/read menandai satu notifikasi dibaca', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/notifications?unreadOnly=true')
      .set(asResponden());
    const targetId = listRes.body.data[0].id;

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${targetId}/read`)
      .set(asResponden());

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.isRead).toBe(true);
  });

  it('notifikasi milik pengguna lain -> 404 (bukan bisa ditandai siapa saja)', async () => {
    const listRes = await request(app.getHttpServer()).get('/api/v1/notifications').set(asOpd());
    const opdOwnedId = listRes.body.data[0].id;

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${opdOwnedId}/read`)
      .set(asResponden()); // Responden mencoba menandai notifikasi milik Admin OPD

    expect(res.status).toBe(404);
  });

  it('PATCH /notifications/read-all menandai SEMUA notifikasi Responden dibaca', async () => {
    const patchRes = await request(app.getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .set(asResponden());
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.updated).toBeGreaterThan(0);

    const countRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set(asResponden());
    expect(countRes.body.data.count).toBe(0);
  });
});
