import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { BATAS_HARIAN_PENGADUAN_BAKU } from '../src/modules/complaints/complaints.constants';
import { bersihkanAuditAkunUji } from './helpers/audit.helper';
import { devHeaders } from './helpers/auth.helper';

/**
 * Batas harian pengaduan per AKUN (14 September 2026).
 *
 * Batas laju per menit tak cukup: ia menahan ledakan, bukan ketekunan. Satu
 * akun yang mengirim sepuluh pengaduan tiap menit sepanjang hari tak pernah
 * menyentuh batas 100/menit, tetapi membanjiri antrean triase dan --
 * karena tiap pengaduan menyebar notifikasi ke seluruh Admin OPD tujuan dan
 * seluruh Admin Kabupaten -- mengalikan ongkosnya di sisi penerima.
 *
 * Dihitung dari BASIS DATA, bukan dari penghitung throttle: penghitung itu
 * disimpan di memori dan hilang setiap kali proses dimulai ulang, sehingga
 * "batas harian" yang bersandar padanya dapat disetel ulang dengan menunggu
 * deploy berikutnya.
 */
const SSO_PELAPOR = 'e2e-batas-harian-1';
const SSO_PELAPOR_LAIN = 'e2e-batas-harian-2';
const SSO_PELAPOR_SERENTAK = 'e2e-batas-harian-3';
const SEMUA_SSO = [SSO_PELAPOR, SSO_PELAPOR_LAIN, SSO_PELAPOR_SERENTAK];

describe('Batas harian pengaduan per akun (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opdId: number;
  let pelaporId: number;
  let pelaporLainId: number;
  // Diisi oleh ujinya sendiri; -1 supaya penyapu di afterAll tak menyentuh
  // siapa pun bila uji itu gagal sebelum akunnya dibuat.
  let pelaporSerentakId = -1;

  const buatPengaduanLangsung = (userId: number, kapan: Date, urutan: number) =>
    prisma.complaint.create({
      data: {
        // Ditulis lewat Prisma, bukan lewat HTTP: yang diuji adalah
        // penghitungnya, dan sepuluh permintaan HTTP hanya menambah waktu
        // beserta sepuluh baris audit yang kemudian harus dibersihkan.
        ticketNo: `E2EBH${urutan}${Date.now().toString().slice(-6)}`,
        userId,
        opdId,
        kategori: 'kab_infrastruktur',
        judul: `Pengaduan lama ${urutan}`,
        uraian: 'Disemai langsung untuk menguji batas harian.',
        createdAt: kapan,
      },
    });

  beforeAll(async () => {
    // Dipaksa ke nilai baku: berkas ini menguji BATASNYA, jadi ia tak boleh
    // ikut berubah mengikuti `.env` milik siapa pun yang menjalankannya.
    process.env.COMPLAINT_DAILY_LIMIT = String(BATAS_HARIAN_PENGADUAN_BAKU);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    // LISTEN SEKALI DI SINI, bukan membiarkan supertest yang melakukannya
    // (23 November 2026, CI merah `read ECONNRESET` pada uji BUG-096). Supertest
    // 7 memanggil `listen(0)` pada server yang belum mendengarkan lalu MENUTUPNYA
    // begitu permintaan pemiliknya selesai -- dan dalam gelombang serentak,
    // pemilik itu sering yang pertama selesai karena 429 kalah kunci dijawab
    // seketika. Di Linux + Node 22 penutupan itu memutus kiriman lain yang masih
    // berjalan: terukur 17 dari 20 ECONNRESET di node:22-alpine, nol di Windows,
    // dan nol di kedua platform bila server sudah mendengarkan lebih dulu.
    await app.listen(0, '127.0.0.1');

    prisma = app.get(PrismaService);

    const opd = await prisma.opd.create({
      data: { kode: 'E2EBH', nama: 'OPD Uji Batas Harian', isActive: true },
    });
    opdId = opd.id;

    const pelapor = await prisma.user.create({
      data: {
        ssoSubject: SSO_PELAPOR,
        nama: 'Pelapor Batas Harian',
        email: 'batas-harian@e2e.test',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    pelaporId = pelapor.id;

    const lain = await prisma.user.create({
      data: {
        ssoSubject: SSO_PELAPOR_LAIN,
        nama: 'Pelapor Lain',
        email: 'batas-harian-lain@e2e.test',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    pelaporLainId = lain.id;
  }, 30000);

  afterAll(async () => {
    await prisma.complaint.deleteMany({
      where: { userId: { in: [pelaporId, pelaporLainId, pelaporSerentakId] } },
    });
    await bersihkanAuditAkunUji(prisma, SEMUA_SSO);
    await prisma.user.deleteMany({ where: { ssoSubject: { in: SEMUA_SSO } } });
    await prisma.opd.deleteMany({ where: { kode: 'E2EBH' } });
    await app.close();
  }, 30000);

  const kirim = (userId: number) =>
    request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(devHeaders({ role: Role.responden, userId }))
      .field('opdId', opdId)
      .field('kategori', 'kab_infrastruktur')
      .field('tingkat', 'kabupaten')
      .field('tanggalKejadian', '2026-11-01')
      .field('lokasiKejadian', 'Balai Desa Bangunsari')
      .field('judul', 'Pengaduan baru')
      .field('uraian', 'Isi pengaduan yang cukup panjang untuk lolos validasi.');

  it(`menolak pengaduan ke-${BATAS_HARIAN_PENGADUAN_BAKU + 1} pada hari yang sama`, async () => {
    for (let i = 0; i < BATAS_HARIAN_PENGADUAN_BAKU; i++) {
      await buatPengaduanLangsung(pelaporId, new Date(), i);
    }

    const res = await kirim(pelaporId);

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('BATAS_HARIAN_PENGADUAN');
    // Pesannya harus dapat dimengerti pelapornya: menyebut angkanya, bukan
    // sekadar "terlalu banyak permintaan".
    expect(res.body.message).toMatch(new RegExp(String(BATAS_HARIAN_PENGADUAN_BAKU)));
  });

  /**
   * Kendali. Batas yang keliru dihitung lintas-akun akan menghukum warga yang
   * tak melakukan apa pun, dan itu tak terlihat dari uji di atas.
   */
  it('akun lain pada hari yang sama tetap dilayani', async () => {
    const res = await kirim(pelaporLainId);

    expect(res.status).toBe(201);
  });

  /**
   * Kendali kedua. Tanpa ini, penghitung yang lupa menyaring tanggal akan
   * mengunci akun SELAMANYA sesudah sepuluh pengaduan pertamanya seumur hidup.
   */
  it('pengaduan kemarin tidak ikut dihitung', async () => {
    const kemarin = new Date(Date.now() - 26 * 60 * 60 * 1000);
    for (let i = 0; i < BATAS_HARIAN_PENGADUAN_BAKU; i++) {
      await buatPengaduanLangsung(pelaporLainId, kemarin, 100 + i);
    }

    const res = await kirim(pelaporLainId);

    expect(res.status).toBe(201);
  });

  /**
   * BUG-096 (19 November 2026): kiriman SERENTAK menembus batasnya.
   *
   * Penghitungnya membaca jumlah lalu menulis tanpa kunci, jadi kiriman yang
   * sama-sama membaca angka lama keduanya lolos. Uji beban `batas-harian-
   * serentak` mengukurnya 50 dari 50 diterima pada tiga jalan; uji di atas tak
   * pernah menangkapnya karena kirimannya berurutan.
   *
   * Sesudah perbaikan, kiriman yang kalah berebut kunci ditolak SEKETIKA (429
   * `PENGIRIMAN_SEDANG_DIPROSES`), sehingga satu gelombang hanya meloloskan
   * sedikit. Yang diuji karena itu bukan "gelombang pertama tepat sepuluh",
   * melainkan JUMLAH AKHIRNYA: beberapa gelombang serentak, lalu kiriman
   * berurutan sampai batasnya menolak. Tak pernah melewati batas, dan batasnya
   * tetap dapat dicapai penuh.
   *
   * JUMLAH PERMINTAAN DIJAGA DI BAWAH 100. Batas laju global 100/menit per akun
   * ikut menjawab 429 (`TOO_MANY_REQUESTS`), dan jawaban itu tak boleh
   * menyamar sebagai batas harian. Versi pertama uji ini mengulang gelombang
   * sampai lima belas kali, menabrak batas laju itu, dan menyimpulkan "batas
   * tercapai" dari penolakan yang salah.
   */
  it('kiriman serentak tak pernah meloloskan lebih dari batasnya (BUG-096)', async () => {
    const serentak = await prisma.user.create({
      data: {
        ssoSubject: SSO_PELAPOR_SERENTAK,
        nama: 'Pelapor Serentak',
        email: 'batas-harian-serentak@e2e.test',
        roles: [Role.responden],
        consentAt: new Date(),
      },
    });
    pelaporSerentakId = serentak.id;

    const SEGELOMBANG = 20;
    const GELOMBANG = 3;
    let diterima = 0;
    const kodeDitolak = new Set<string>();
    const catat = (r: request.Response) => {
      // Hanya dua jawaban yang sah. 500 dari transaksi yang patah, atau 400
      // dari validasi, berarti ujinya mengukur hal lain.
      expect([201, 429]).toContain(r.status);
      if (r.status === 201) {
        diterima += 1;
      } else {
        kodeDitolak.add(r.body.error.code);
      }
    };

    for (let g = 0; g < GELOMBANG; g++) {
      const hasil = await Promise.all(
        Array.from({ length: SEGELOMBANG }, () => kirim(pelaporSerentakId)),
      );
      hasil.forEach(catat);
    }

    // Berurutan sampai ditolak. Paling banyak batas + 1 kiriman; lebih dari
    // itu berarti penolakannya tak pernah datang.
    let terakhir: request.Response | undefined;
    for (let i = 0; i <= BATAS_HARIAN_PENGADUAN_BAKU; i++) {
      terakhir = await kirim(pelaporSerentakId);
      catat(terakhir);
      if (terakhir.status === 429) {
        break;
      }
    }

    expect(diterima).toBe(BATAS_HARIAN_PENGADUAN_BAKU);
    // Jawaban 201 dan baris yang tertulis harus sepadan: 201 tanpa baris
    // berarti tulisan hilang, baris tanpa 201 berarti tulisan berganda.
    expect(await prisma.complaint.count({ where: { userId: pelaporSerentakId } })).toBe(
      BATAS_HARIAN_PENGADUAN_BAKU,
    );
    expect(terakhir?.body.error.code).toBe('BATAS_HARIAN_PENGADUAN');
    expect(kodeDitolak).not.toContain('TOO_MANY_REQUESTS');
  }, 60000);
});
