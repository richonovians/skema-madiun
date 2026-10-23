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
  // BUG-018: admin kabupaten KEDUA, dan ia bukan kemewahan. Perbaikannya
  // mengecualikan pelaku penerusan, jadi dengan satu akun kabupaten saja
  // "pengawas lain tetap diberi tahu" tak dapat dibedakan dari "tak ada
  // yang diberi tahu".
  let kabupatenLainId: number;
  let diteruskanId: number;
  let diteruskanTicketNo: string | undefined;

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
        roles: [Role.opd],
        opdId,
      },
    });
    opdUserId = opdUser.id;

    const responden = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-notif-resp' },
      // consentAt juga di `update` supaya baris SISA dari run sebelumnya
      // (yang dibuat sebelum penegakan PDP ada) ikut diperbaiki.
      update: { consentAt: new Date() },
      create: {
        ssoSubject: 'e2e-notif-resp',
        nama: 'Responden Notifikasi',
        email: 'e2e-notif-resp@example.go.id',
        roles: [Role.responden],
        consentAt: new Date(), // celah 2: warga tanpa persetujuan PDP ditolak 403 saat mengirim data
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
        roles: [Role.kabupaten],
      },
    });
    kabupatenUserId = kabupatenUser.id;

    const kabupatenLain = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-notif-kab2' },
      update: {},
      create: {
        ssoSubject: 'e2e-notif-kab2',
        nama: 'Admin Kabupaten Notifikasi Kedua',
        email: 'e2e-notif-kab2@example.go.id',
        roles: [Role.kabupaten],
      },
    });
    kabupatenLainId = kabupatenLain.id;

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
    const ticketNos = [ticketNo, createdTicketNo, diteruskanTicketNo].filter((t): t is string =>
      Boolean(t),
    );
    await prisma.notification.deleteMany({
      where: { OR: ticketNos.map((t) => ({ link: { contains: t } })) },
    });
    await prisma.complaintReply.deleteMany({ where: { complaintId } });
    await prisma.complaint.deleteMany({ where: { opdId } });
    // Pengaduan BUG-018 lahir tanpa OPD; bila ujinya gagal sebelum
    // diteruskan, `where: { opdId }` di atas tak menjangkaunya.
    await prisma.complaint.deleteMany({ where: { userId: respondenId } });
    // PATCH status pengaduan memicu AuditInterceptor mencatat audit_logs
    // ber-FK RESTRICT ke users -- harus dihapus dulu sebelum user dihapus.
    await prisma.auditLog.deleteMany({
      where: { actorId: { in: [opdUserId, respondenId, kabupatenUserId, kabupatenLainId] } },
    });
    await prisma.user.deleteMany({
      where: {
        ssoSubject: {
          in: ['e2e-notif-opd', 'e2e-notif-resp', 'e2e-notif-kab', 'e2e-notif-kab2'],
        },
      },
    });
    await prisma.opd.deleteMany({ where: { kode: 'E2ENOTIF' } });
    await app.close();
  }, 30000);

  const asOpd = () => devHeaders({ role: Role.opd, userId: opdUserId, opdId });
  const asResponden = () => devHeaders({ role: Role.responden, userId: respondenId });
  const asKabupaten = () => devHeaders({ role: Role.kabupaten, userId: kabupatenUserId });
  const asKabupatenLain = () => devHeaders({ role: Role.kabupaten, userId: kabupatenLainId });

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

  /**
   * `unreadOnly=false` TIDAK menyaring apa pun (TC-BOOL-003, 15 Oktober 2026).
   *
   * Uji-uji di atas hanya mengirim `unreadOnly=true`, dan
   * `NotificationHistoryScreen.jsx:112` menghilangkan medannya alih-alih
   * mengirim `false`, jadi nilai itu tak pernah dilalui siapa pun. Medannya
   * tetap bagian kontrak API (`@ApiPropertyOptional`), dan di sana ia terbalik.
   *
   * Penggunanya SENDIRI, bukan `respondenId` bersama, supaya uji ini tak
   * bergantung pada urutan jalan maupun mengubah hitungan uji `read-all` di
   * bawahnya. Barisnya ditanam langsung lewat Prisma karena yang diuji adalah
   * penyaringnya, bukan jalur yang melahirkan notifikasinya.
   *
   * Terbukti merah oleh cacatnya sendiri: sebelum diperbaiki, `unreadOnly=false`
   * mengembalikan hanya yang belum dibaca, sehingga notifikasi yang sudah
   * dibaca hilang dari daftar yang semestinya memuat keduanya.
   */
  it('GET /notifications?unreadOnly=false memuat yang sudah DAN belum dibaca', async () => {
    const pemilik = await prisma.user.upsert({
      where: { ssoSubject: 'e2e-notif-bool' },
      update: {},
      create: {
        ssoSubject: 'e2e-notif-bool',
        nama: 'Responden Uji unreadOnly',
        email: 'e2e-notif-bool@example.go.id',
        roles: [Role.responden],
      },
    });

    const sebagaiPemilik = () => devHeaders({ role: Role.responden, userId: pemilik.id });

    try {
      await prisma.notification.deleteMany({ where: { userId: pemilik.id } });
      await prisma.notification.createMany({
        data: [
          {
            userId: pemilik.id,
            untukPeran: Role.responden,
            type: 'complaint_status_changed',
            title: 'Sudah dibaca',
            message: 'Notifikasi yang sudah dibaca',
            isRead: true,
          },
          {
            userId: pemilik.id,
            untukPeran: Role.responden,
            type: 'complaint_status_changed',
            title: 'Belum dibaca',
            message: 'Notifikasi yang belum dibaca',
            isRead: false,
          },
        ],
      });

      const judul = (res: { body: { data: { title: string }[] } }) =>
        res.body.data.map((n) => n.title).sort();

      // KONTROL: tanpa penyaring, keduanya memang terbaca. Tanpa ini, hasil
      // yang kurang di bawah tak dapat dibedakan dari fixture yang gagal dibuat.
      const kontrol = await request(app.getHttpServer())
        .get('/api/v1/notifications?limit=50')
        .set(sebagaiPemilik());
      expect(kontrol.status).toBe(200);
      expect(judul(kontrol)).toEqual(['Belum dibaca', 'Sudah dibaca']);

      const semua = await request(app.getHttpServer())
        .get('/api/v1/notifications?unreadOnly=false&limit=50')
        .set(sebagaiPemilik());
      expect(semua.status).toBe(200);
      expect(judul(semua)).toEqual(['Belum dibaca', 'Sudah dibaca']);

      // KENDALI KEDUA: `true` tetap harus menyaring, kalau tidak uji di atas
      // akan tetap hijau walau penyaringnya dibuang seluruhnya.
      const hanyaBelum = await request(app.getHttpServer())
        .get('/api/v1/notifications?unreadOnly=true&limit=50')
        .set(sebagaiPemilik());
      expect(hanyaBelum.status).toBe(200);
      expect(judul(hanyaBelum)).toEqual(['Belum dibaca']);
    } finally {
      await prisma.notification.deleteMany({ where: { userId: pemilik.id } });
      await prisma.user.delete({ where: { id: pemilik.id } });
    }
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

  /**
   * BUG-018 — meneruskan pengaduan menyiarkan ulang "Pengaduan Baru Masuk".
   *
   * `forward()` memakai `notifyComplaintCreated` apa adanya, dan fungsi itu
   * memegang DUA penerima sekaligus: Admin OPD tujuan, lalu Admin Kabupaten.
   * Bagian OPD benar -- bagi OPD tujuan inilah saat tiketnya benar-benar masuk.
   * Bagian Kabupaten salah dua kali: ia sudah dikabari saat pengaduan lahir
   * (pengaduan tanpa tujuan mengabari Kabupaten tanpa syarat), dan
   * `notifyKabupaten(excludeUserId, ...)` dipanggil dengan `complaint.userId`
   * yaitu PELAPOR -- padahal pelaku penerusan adalah admin kabupaten, sehingga
   * ia mengabari dirinya sendiri.
   *
   * Aturan yang benar sudah ada di tempat lain: `notifyComplaintStatusChanged`
   * meneruskan `actorUserId`, dan uji di berkas ini sendiri sudah menuntut
   * "Kabupaten yg JADI PELAKU balasan TIDAK memberi notifikasi ke dirinya".
   *
   * URUTAN KEEMPAT UJI DI BAWAH DISENGAJA dan saling bergantung: yang pertama
   * mengukur keadaan SEBELUM penerusan, yang kedua melakukan penerusannya, dua
   * sisanya hanya membaca hasilnya. Tanpa pengukuran pertama, angka "satu"
   * sesudah penerusan tak membuktikan apa pun -- bisa saja memang tak pernah
   * ada kabar yang terbit.
   */
  describe('BUG-018 — penerusan pengaduan tak menyiarkan ulang kabar yang sama', () => {
    const kabarBaru = (rows: Array<{ type: string; link: string }>, tiket: string) =>
      rows.filter((n) => n.type === 'complaint_created' && n.link.includes(tiket));

    const notifikasi = async (header: Record<string, string>) => {
      const res = await request(app.getHttpServer()).get('/api/v1/notifications').set(header);
      expect(res.status).toBe(200);
      return res.body.data as Array<{ type: string; link: string; message: string }>;
    };

    it('ALAT UKUR: pengaduan tanpa OPD -> Kabupaten dapat TEPAT SATU complaint_created', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set(asResponden())
        .field('kategori', 'lainnya')
        .field('judul', 'Pengaduan tanpa tujuan utk BUG-018')
        .field('uraian', 'Pelapor tak tahu harus ditujukan ke mana');

      expect(res.status).toBe(201);
      diteruskanId = res.body.data.id;
      diteruskanTicketNo = res.body.data.ticketNo;
      expect(res.body.data.opdId).toBeNull();

      expect(kabarBaru(await notifikasi(asKabupaten()), diteruskanTicketNo as string)).toHaveLength(
        1,
      );
    });

    it('PATCH /complaints/:id/opd -> Kabupaten TIDAK dapat complaint_created kedua', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/complaints/${diteruskanId}/opd`)
        .set(asKabupaten())
        .send({ opdId });

      expect(res.status).toBe(200);
      expect(kabarBaru(await notifikasi(asKabupaten()), diteruskanTicketNo as string)).toHaveLength(
        1,
      );
    });

    it('admin yang MENERUSKAN tidak dikabari atas tindakannya sendiri', async () => {
      const miliknya = (await notifikasi(asKabupaten())).filter(
        (n) => n.type === 'complaint_forwarded' && n.link.includes(diteruskanTicketNo as string),
      );

      expect(miliknya).toHaveLength(0);
    });

    it('Admin Kabupaten LAIN tetap dikabari, dengan kalimat yang benar', async () => {
      const kabar = (await notifikasi(asKabupatenLain())).filter(
        (n) => n.type === 'complaint_forwarded' && n.link.includes(diteruskanTicketNo as string),
      );

      expect(kabar).toHaveLength(1);
      // Kalimatnya harus menyebut yang BENAR-BENAR terjadi. "Pengaduan Baru
      // Masuk" itulah separuh cacatnya: yang terjadi bukan tiket baru.
      expect(kabar[0].message).toContain('diteruskan');
      expect(kabar[0].message).toContain('OPD E2E Notifikasi');
      expect(kabar[0].message).not.toContain('baru masuk');
    });

    it('Admin OPD tujuan dapat TEPAT SATU complaint_created -- jalur itu tak boleh ikut mati', async () => {
      expect(kabarBaru(await notifikasi(asOpd()), diteruskanTicketNo as string)).toHaveLength(1);
    });
  });
});
