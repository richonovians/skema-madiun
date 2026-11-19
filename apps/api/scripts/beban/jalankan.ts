/**
 * PELARI UJI BEBAN.
 *
 * Menyalakan API-nya SENDIRI di porta lain terhadap `skm_beban`, menjalankan
 * skenario, lalu mematikannya kembali. Server dev milik pengguna tidak disentuh
 * -- dan itu bukan kesopanan melainkan keharusan: server itu membaca
 * `apps/api/.env`, jadi setiap baris yang ditulisnya masuk `skm_db`.
 *
 * MENGAPA DIKOMPILASI LEBIH DULU, bukan dijalankan `tsx`. esbuild di dalam
 * `tsx` TIDAK memancarkan `emitDecoratorMetadata`, sehingga DI NestJS kehilangan
 * `design:paramtypes` dan boot-nya gagal -- sudah terukur, dan tercatat juga di
 * docblock `scripts/pangkas-audit.ts`.
 *
 * MENGAPA `--outDir dist-beban`, bukan `dist`. `nest start --watch` milik
 * pengguna menulis ke `dist`; menimpanya selagi server dev hidup adalah cacat
 * yang sudah dikenal di repo ini. Direktori terpisah menghapus benturannya.
 *
 * Yang diukur adalah jalur kode PRODUKSI, yaitu `main.ts` yang sama dengan yang
 * digelar. Itu sebabnya jalan ini dipilih alih-alih membangun aplikasi lewat
 * harness ts-jest: mengukur jalur yang tidak digelar menghasilkan angka yang
 * tak dapat dipakai siapa pun.
 *
 * BATAS YANG HARUS DISEBUT BERSAMA ANGKANYA: ini laptop ber-Docker Desktop,
 * bukan server. Angkanya sah sebagai PEMBANDING -- endpoint mana yang patah
 * lebih dulu, dan apakah satu perubahan memperburuknya -- bukan sebagai ramalan
 * kapasitas produksi.
 *
 *   pnpm --filter @skm-spm/api beban -- --skenario=statistik
 *   pnpm --filter @skm-spm/api beban -- --semua --durasi=20 --koneksi=20
 *
 * `--dingin` mengosongkan singgahannya sebelum setiap jalan, supaya yang
 * terukur jalur DINGIN. Lihat `buatPenyapu`.
 *
 *   pnpm --filter @skm-spm/api beban -- --skenario=statistik --dingin
 *
 * JALUR TULIS (§11 `docs/TEST_BEBAN.md`, 19 November 2026) memakai daftarnya
 * sendiri, `SKENARIO_TULIS`, dan TIDAK ikut `--semua`. Pemeriksaannya juga lain:
 * bukan "dataset tetap" melainkan "selisih baris = jawaban 2xx". Lihat
 * `jalankanTulis`.
 *
 *   pnpm --filter @skm-spm/api beban -- --skenario=kirim-pengaduan
 *   pnpm --filter @skm-spm/api beban -- --semua-tulis
 *   pnpm --filter @skm-spm/api beban -- --skenario=batas-harian-serentak --beruntun
 */
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';
import autocannon from 'autocannon';
import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import { AWALAN_SINGGAHAN } from '../../src/common/cache/penyimpan-singgahan.redis';
import { INFO_LAMPIRAN, dekripsi, terenkripsi } from '../../src/common/crypto/envelope';
import { bacaKunci } from '../../src/common/crypto/kunci';
import { BATAS_HARIAN_PENGADUAN_BAKU } from '../../src/modules/complaints/complaints.constants';
import { jalankanCli } from '../lib/jalankan-cli';
import {
  IDENTITAS_ADMIN,
  IDENTITAS_BATAS_HARIAN,
  JUMLAH_RESPONDEN_BEBAN,
  PERAN_BEBAN,
  identitasResponden,
  type PeranBeban,
} from './lib/akun-beban';
import {
  bacaTungguUlang,
  buatPemutar,
  nilaiKetepatan,
  puncakSerentak,
  ringkasKode,
  type Ketepatan,
} from './lib/ketepatan-tulis';
import { susunMultipart, type BerkasMultipart } from './lib/multipart';
import { buatPng } from './lib/png-beban';
import { HITUNGAN_DATASET, ringkasDataset, type HitunganDataset } from './lib/opsi-dataset';
import {
  NAMA_DB_BEBAN,
  pastikanRedisBeban,
  pastikanSasaranBeban,
  redisBeban,
  sasaranDbBeban,
} from './lib/sasaran-beban';
import { sapuAwalan } from './lib/sapu-singgahan';
import { SKENARIO, SKENARIO_TULIS, type Skenario, type SkenarioTulis } from './skenario';

const AKAR_API = path.resolve(__dirname, '..', '..');
const PORTA = 3002;
const ASAL = `http://127.0.0.1:${PORTA}`;
const KELUARAN = 'dist-beban';
/**
 * `UPLOAD_DIR` server beban. Relatif terhadap `apps/api`, seperti bakunya
 * `uploads` milik server dev -- dan justru karena itu harus berbeda: lampiran
 * beban di `uploads/` bercampur dengan lampiran pengembangan pengguna dan tak
 * dapat dipilah lagi. Dihapus sesudah jalan (`hapusUnggahanBeban`).
 */
const UNGGAHAN_BEBAN = 'uploads-beban';
/** Ukuran lampiran skenario `kirim-pengaduan-lampiran` (§11.3). */
const UKURAN_LAMPIRAN = 1024 * 1024;
/** Jumlah permintaan serentak skenario `batas-harian-serentak` (§11.3). */
const JUMLAH_SERENTAK = 50;
/** Batas per pengguna `@Throttle` pada `POST /surveys/:id/responses`. */
const BATAS_JAWABAN_PER_MENIT = 10;

function angkaArgumen(nama: string, baku: number): number {
  const awalan = `--${nama}=`;
  const cocok = process.argv.find((a) => a.startsWith(awalan));
  if (cocok === undefined) {
    return baku;
  }
  const nilai = Number(cocok.slice(awalan.length));
  if (!Number.isFinite(nilai) || nilai <= 0) {
    throw new Error(`${awalan} menuntut bilangan positif, bukan '${cocok}'`);
  }
  return nilai;
}

async function utama(): Promise<void> {
  dotenv.config({ path: path.join(AKAR_API, '.env') });

  const url = sasaranDbBeban(process.env.DATABASE_URL ?? '');
  const durasi = angkaArgumen('durasi', 10);
  const koneksi = angkaArgumen('koneksi', 10);
  const dingin = process.argv.includes('--dingin');

  const diminta = process.argv.find((a) => a.startsWith('--skenario='))?.slice(11);
  const tulis = process.argv.includes('--semua-tulis')
    ? SKENARIO_TULIS
    : SKENARIO_TULIS.filter((s) => s.nama === diminta);
  if (tulis.length > 0) {
    await jalankanTulis(url, tulis, { durasi, koneksi });
    return;
  }

  const dipilih = process.argv.includes('--semua')
    ? SKENARIO
    : SKENARIO.filter((s) => s.nama === diminta);
  if (dipilih.length === 0) {
    throw new Error(
      `Skenario '${diminta ?? ''}' tak dikenal. Yang ada: ` +
        `${[...SKENARIO, ...SKENARIO_TULIS].map((s) => s.nama).join(', ')}. ` +
        'Atau pakai --semua (baca) / --semua-tulis.',
    );
  }

  const { idSurvei, baris } = await periksaDataset(url);

  console.log(`Basis data : ${NAMA_DB_BEBAN}`);
  console.log(`Dataset    : ${ringkasDataset(baris)}`);
  console.log(`Beban      : ${koneksi} koneksi, ${durasi}s per skenario\n`);

  console.log(
    dingin
      ? 'Mode       : DINGIN, singgahan dikosongkan sebelum penyelidik DAN sebelum beban'
      : 'Mode       : hangat, penyelidik mengisi singgahan sebelum beban',
  );

  const penyapu = dingin ? await buatPenyapu(process.env.REDIS_URL ?? '') : undefined;
  const server = await nyalakanServer(url);
  try {
    const bearer: Record<string, string> = {};
    for (const peran of PERAN_BEBAN) {
      bearer[peran] = await masuk(peran);
    }
    for (const skenario of dipilih) {
      await ukur(skenario, idSurvei, { durasi, koneksi, bearer, sapu: penyapu?.sapu });
    }
  } finally {
    server.kill();
    await penyapu?.tutup();
  }

  // DIHITUNG ULANG SESUDAH BEBAN, dan selisihnya dilaporkan. Skenario di atas
  // semuanya baca, jadi selisih nol adalah satu-satunya hasil yang boleh
  // diterima -- dan tanpa pemeriksaan ini satu set angka sempat disajikan di
  // atas dataset yang berubah di tengah pengukuran (13 Oktober 2026). Ia juga
  // yang akan memerah lebih dulu begitu skenario tulis ditambahkan, dan itu
  // disengaja: angka beban hanya berarti bila ukuran datasetnya diketahui.
  const sesudah = await periksaDataset(url);
  const berubah = HITUNGAN_DATASET.filter((t) => sesudah.baris[t] !== baris[t]);
  console.log(
    berubah.length === 0
      ? `Dataset tetap: ${ringkasDataset(baris)}.`
      : 'PERINGATAN: dataset BERUBAH selama pengukuran — angka di atas tak dapat ' +
          `dipertanggungjawabkan. ${berubah
            .map((t) => `${t} ${baris[t]} -> ${sesudah.baris[t]}`)
            .join('; ')}`,
  );
}

/**
 * Menerbitkan SATU sesi PER PERAN, lalu Bearer tokennya dipakai ulang seluruh
 * pengukuran. Satu per peran, bukan satu saja, karena `@Roles` tak mengenal
 * lintas peran: `GET /surveys/:id/fill` menjawab 403 "Sumber daya ini hanya
 * untuk peran: responden" bagi sesi `kabupaten`, dan `GET /dashboard/opd` hanya
 * menerima `opd`. Satu akun memegang semuanya; `dev-login` menerima `role` dan
 * menolaknya bila akunnya tak memilikinya.
 *
 * YANG DIKEMBALIKAN `dev-login` ADALAH TOKEN DI BADAN JAWABAN, bukan cookie.
 * Versi pertama mencari `Set-Cookie: session=...` dan gagal dengan "tak
 * menyetel cookie 'session'. Set-Cookie: " -- kosong, karena memang tak ada.
 * Docblock `AuthController.devLogin` menyatakannya tersurat: endpoint itu
 * publik justru karena tugasnya MENERBITKAN Bearer token. Cookie `session`
 * milik jalur SSO, bukan jalur ini.
 *
 * `dev-login` juga ber-`@Throttle(DEV_LOGIN_PER_MINUTE)`, jadi memanggilnya per
 * permintaan akan menabrak batasnya selain mengukur hal yang salah.
 *
 * Lewat `POST /api/v1/auth/dev-login`, bukan lewat header `x-dev-*`:
 * `AUTH_PROVIDER` hanya mengikat `StubAuthProvider` ketika
 * `NODE_ENV === 'test'`, sedangkan pelari ini sengaja berjalan sebagai
 * `development` supaya yang diukur jalur produksi. Terukur pada jalan pertama,
 * dengan header dev yang lengkap: `GET /api/v1/dashboard/ikm` menjawab 401
 * "Autentikasi diperlukan".
 *
 * Diterbitkan sekali saja. Kalau tiap permintaan masuk lebih dulu, yang terukur
 * adalah penerbitan sesinya, bukan endpoint yang dituju.
 */
async function masuk(peran: PeranBeban, identitas: string = IDENTITAS_ADMIN): Promise<string> {
  let jawab: Response;
  for (;;) {
    jawab = await fetch(`${ASAL}/api/v1/auth/dev-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: identitas, role: peran }),
    });
    // `dev-login` ber-`@Throttle` 30/menit per IP, tak ikut dilonggarkan
    // `THROTTLE_LIMIT`. Seratus sesi responden pasti menabraknya, jadi 429
    // DITUNGGU, bukan dilempar. Hitungannya tersimpan di Redis logis 1, sehingga
    // jalan yang menyusul dalam semenit ikut kena.
    if (jawab.status !== 429) {
      break;
    }
    const tunggu = bacaTungguUlang(jawab.headers.get('retry-after'));
    process.stdout.write(`
  dev-login 429, menunggu ${Math.round(tunggu / 1000)} s ...`);
    await tidur(tunggu);
  }
  if (!jawab.ok) {
    throw new Error(
      `dev-login sebagai '${identitas}' peran '${peran}' menjawab ${jawab.status}. ` +
        'Bangun dulu datasetnya: pnpm --filter @skm-spm/api beban:data. ' +
        `Jawabannya: ${(await jawab.text()).slice(0, 300)}`,
    );
  }

  const isi = (await jawab.json()) as { data?: { token?: string } };
  const token = isi.data?.token;
  if (typeof token !== 'string' || token === '') {
    throw new Error(
      `dev-login berhasil tetapi jawabannya tanpa token. Badan: ${JSON.stringify(isi).slice(0, 300)}`,
    );
  }
  return `Bearer ${token}`;
}

/**
 * Menolak jalan terhadap dataset kosong. Mengukur basis data tanpa baris akan
 * menghasilkan angka yang tampak sangat bagus dan tak berarti apa pun -- jenis
 * kegagalan yang paling mudah dipercaya.
 */
async function periksaDataset(url: string): Promise<{ idSurvei: number; baris: HitunganDataset }> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [tersambung] = await prisma.$queryRaw<{ db: string }[]>`
      SELECT current_database() AS db
    `;
    pastikanSasaranBeban(tersambung.db);

    const [baris] = await prisma.$queryRaw<Record<string, bigint>[]>`
      SELECT (SELECT count(*) FROM survey_responses) AS survey_responses,
             (SELECT count(*) FROM answers)          AS answers,
             (SELECT count(*) FROM answers WHERE teks IS NOT NULL) AS jawaban_teks,
             (SELECT count(*) FROM complaints)       AS complaints
    `;
    const hitung = Object.fromEntries(
      Object.entries(baris).map(([k, v]) => [k, Number(v)]),
    ) as HitunganDataset;
    if (hitung.answers === 0) {
      throw new Error('Dataset beban kosong. Bangun dulu: pnpm --filter @skm-spm/api beban:data');
    }

    // Survei dengan respons TERBANYAK, bukan sembarang survei: ia yang paling
    // mahal dihitung, dan titik patahnya yang dicari.
    const [survei] = await prisma.$queryRaw<{ id: number }[]>`
      SELECT s.id::int AS id
      FROM surveys s JOIN survey_responses r ON r.survey_id = s.id
      GROUP BY s.id ORDER BY count(*) DESC LIMIT 1
    `;
    return { idSurvei: survei.id, baris: hitung };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PENGOSONG SINGGAHAN untuk pengukuran DINGIN.
 *
 * MENGAPA ADA. Tanpa ini pelari ini tak dapat mengukur jalur dingin sama
 * sekali: permintaan penyelidik di `ukur` mengisi singgahannya, sehingga setiap
 * angka autocannon adalah angka jalur HANGAT. Yang disembunyikannya justru hal
 * yang paling mahal, dan hal itu terukur 13 Oktober 2026: sepuluh koneksi yang
 * tiba bersamaan ke singgahan kosong menghasilkan 0 permintaan tuntas dan
 * 10 galat.
 *
 * MENYAPU AWALAN `singgahan:`, BUKAN `FLUSHDB`. Versi pertama memakai `FLUSHDB`
 * dan itu salah secara terukur: basis data logis 1 ikut memuat kunci `sesi:`
 * milik Bearer token yang baru diterbitkan pelari ini sendiri, jadi
 * `GET /api/v1/dashboard/ikm` menjawab 401 dan bebannya tak pernah jalan.
 * Alasannya ada di `sapuAwalan`.
 *
 * Palang `pastikanRedisBeban` tetap berjalan lebih dulu, atas jawaban
 * `CLIENT INFO` dari sambungan yang benar-benar terbuka. Sapuan berawalan sudah
 * jauh lebih sempit daripada `FLUSHDB`, tetapi pada basis data 0 ia tetap akan
 * menghapus singgahan aplikasi pengembangan pengguna.
 */
async function buatPenyapu(
  urlPengembangan: string,
): Promise<{ sapu: () => Promise<void>; tutup: () => Promise<void> }> {
  const redis = new Redis(redisBeban(urlPengembangan), { maxRetriesPerRequest: 2 });
  pastikanRedisBeban(String(await redis.call('CLIENT', 'INFO')));
  return {
    sapu: async () => {
      await sapuAwalan(redis, AWALAN_SINGGAHAN);
    },
    tutup: async () => {
      await redis.quit();
    },
  };
}

async function nyalakanServer(
  url: string,
  envTambahan: Record<string, string> = {},
): Promise<ChildProcess> {
  console.log(`Mengompilasi ke ${KELUARAN}/ ...`);
  const kode = jalankanCli('typescript', ['-p', 'tsconfig.build.json', '--outDir', KELUARAN], {
    cwd: AKAR_API,
    databaseUrl: url,
    namaBin: 'tsc',
  });
  if (kode !== 0) {
    throw new Error('Kompilasi gagal; server tidak dinyalakan.');
  }

  const server = spawn(process.execPath, [path.join(KELUARAN, 'main.js')], {
    cwd: AKAR_API,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: {
      ...process.env,
      DATABASE_URL: url,
      // REDIS TERSENDIRI, basis data logis 1. Alasannya terukur dan ada di
      // docblock `redisBeban`: jalan pertama sempat mencemari singgahan IKM
      // aplikasi dev, karena kunci singgahan tak membawa pembeda basis data.
      REDIS_URL: redisBeban(process.env.REDIS_URL ?? ''),
      API_PORT: String(PORTA),
      // GERBANG PENAHAN LAJU DILONGGARKAN SECARA TERSURAT. Tanpa ini yang
      // terukur adalah ThrottlerModule, bukan aplikasinya: bebannya menabrak
      // 429 dalam hitungan detik. `complaints.e2e-spec.ts` menaikkan batas
      // harian pengaduan dengan alasan yang sama persis.
      THROTTLE_LIMIT: '1000000',
      COMPLAINT_DAILY_LIMIT: '1000000',
      ...envTambahan,
    },
  });

  process.stdout.write('Menunggu server siap');
  for (let percobaan = 0; percobaan < 60; percobaan += 1) {
    await tidur(500);
    try {
      const jawab = await fetch(`${ASAL}/api/v1/health`);
      if (jawab.ok) {
        console.log(` siap di ${ASAL}\n`);
        return server;
      }
    } catch {
      // Belum mendengarkan porta; itu wajar pada detik-detik pertama.
    }
    process.stdout.write('.');
  }
  server.kill();
  throw new Error(`Server tak pernah menjawab /api/v1/health di ${ASAL}`);
}

async function ukur(
  skenario: Skenario,
  idSurvei: number,
  opsi: {
    durasi: number;
    koneksi: number;
    bearer: Record<string, string>;
    sapu?: () => Promise<void>;
  },
): Promise<void> {
  const jalur = skenario.jalur.replace(':survei', String(idSurvei));
  const headers: Record<string, string> = { ...skenario.headers };
  if (skenario.publik !== true) {
    headers.authorization = opsi.bearer[skenario.peran ?? 'kabupaten'];
  }

  // SATU PERMINTAAN PENYELIDIK LEBIH DULU, dan ia bukan kemewahan. Tanpa itu,
  // endpoint yang menolak atau yang lebih lambat dari batas waktu autocannon
  // menghasilkan laporan "0 permintaan, N galat" yang tak menyebutkan sebab
  // apa pun -- terukur pada jalan pertama. Permintaan tunggal ini memberi
  // status HTTP-nya dan waktu DINGIN-nya, yang juga angka yang pantas dilihat.
  // DIKOSONGKAN LEBIH DULU pada mode dingin, supaya waktu dingin yang dilaporkan
  // di bawah memang waktu dingin -- bukan sisa jalan sebelumnya.
  await opsi.sapu?.();

  const mulai = Date.now();
  const jawab = await fetch(`${ASAL}${jalur}`, {
    method: skenario.method,
    headers,
    body: skenario.body,
  });
  const msDingin = Date.now() - mulai;
  if (!jawab.ok) {
    const cuplikan = (await jawab.text()).slice(0, 300);
    throw new Error(
      `${skenario.nama}: ${skenario.method} ${jalur} menjawab ${jawab.status}, bukan 2xx. ` +
        `Beban tidak dijalankan. Jawabannya: ${cuplikan}`,
    );
  }

  // DIKOSONGKAN LAGI, dan inilah inti mode dingin: penyelidik di atas baru saja
  // mengisi singgahannya, jadi tanpa pengosongan kedua autocannon mengukur
  // jalur hangat. Penyelidiknya TIDAK dilewatkan -- ia yang memberi status HTTP
  // dan pesan galatnya, dan laporan autocannon tak dapat memberikan keduanya.
  await opsi.sapu?.();

  const hasil = await autocannon({
    url: `${ASAL}${jalur}`,
    method: skenario.method,
    headers,
    body: skenario.body,
    connections: opsi.koneksi,
    duration: opsi.durasi,
    // Batas waktu per permintaan, dinaikkan jauh di atas bawaan 10 detik.
    // Endpoint yang lebih lambat dari batasnya membuat SETIAP koneksi tercatat
    // sebagai galat dan angkanya nol -- yang terbaca seperti endpoint rusak,
    // padahal ia hanya lambat. Lambat itu justru temuannya.
    timeout: 120,
  });

  const nonDuaRatus = hasil.non2xx + hasil.errors;
  console.log(`${skenario.nama}  ${skenario.method} ${jalur}`);
  console.log(`  ${skenario.alasan}`);
  console.log(`  dingin ${msDingin} ms (permintaan pertama, singgahan belum terisi)`);
  console.log(
    `  p50 ${hasil.latency.p50} ms | p95 ${hasil.latency.p97_5} ms | p99 ${hasil.latency.p99} ms | ` +
      `maks ${hasil.latency.max} ms | ${Math.round(hasil.requests.average)} req/s`,
  );
  // Jawaban bukan-2xx dilaporkan tersurat. Beban yang seluruhnya dijawab 401
  // atau 429 terlihat SANGAT cepat, dan itu kegagalan yang paling mudah
  // dipercaya sebagai keberhasilan.
  console.log(
    nonDuaRatus === 0
      ? `  semua jawaban 2xx (${hasil.requests.total} permintaan)\n`
      : `  PERINGATAN: ${nonDuaRatus} dari ${hasil.requests.total} jawaban BUKAN 2xx — angka di atas tak berarti\n`,
  );
}

// ===========================================================================
// JALUR TULIS (§11 `docs/TEST_BEBAN.md`), 19 November 2026.
// ===========================================================================

interface HitunganTulis {
  complaints: number;
  complaint_attachments: number;
  survey_responses: number;
  answers: number;
}

interface KonteksTulis {
  idSurveiMulti: number;
  idPertanyaan: number[];
  idOpd: number;
  idAkunBatas: number;
}

/**
 * Menjalankan skenario tulis. Dua kelompok server, bukan satu: skenario
 * kecepatan butuh batas harian dilonggarkan (kalau tidak, pengaduan ke-11
 * dijawab 429 dan yang terukur hanya penolakan), sedangkan
 * `batas-harian-serentak` justru menguji batas ASLI. Batasnya dibaca sekali
 * saat boot (konstruktor `ComplaintsService`), jadi keduanya tak dapat hidup
 * di satu proses.
 */
async function jalankanTulis(
  url: string,
  dipilih: SkenarioTulis[],
  opsi: { durasi: number; koneksi: number },
): Promise<void> {
  const konteks = await bacaKonteksTulis(url);
  const kunci = bacaKunci(
    process.env.DATA_ENCRYPTION_KEY ?? '',
    'DATA_ENCRYPTION_KEY',
    'development',
  );
  console.log(`Basis data : ${NAMA_DB_BEBAN}`);
  console.log(`Beban      : ${opsi.koneksi} koneksi, jumlah permintaan tetap per skenario`);
  console.log(`Unggahan   : ${UNGGAHAN_BEBAN}/ (dihapus sesudah jalan)\n`);

  const longgar = dipilih.filter((s) => s.batasHarianAsli !== true);
  const asli = dipilih.filter((s) => s.batasHarianAsli === true);
  const hasil: { nama: string; ketepatan: Ketepatan[] }[] = [];

  hapusUnggahanBeban();
  try {
    if (longgar.length > 0) {
      const server = await nyalakanServer(url, { UPLOAD_DIR: UNGGAHAN_BEBAN });
      try {
        const bearerAdmin = await masuk('responden');
        for (const s of longgar) {
          hasil.push({
            nama: s.nama,
            ketepatan: await ukurTulis(s, url, konteks, kunci, bearerAdmin, opsi),
          });
        }
      } finally {
        server.kill();
      }
    }
    if (asli.length > 0) {
      const server = await nyalakanServer(url, {
        UPLOAD_DIR: UNGGAHAN_BEBAN,
        COMPLAINT_DAILY_LIMIT: String(BATAS_HARIAN_PENGADUAN_BAKU),
      });
      try {
        for (const s of asli) {
          hasil.push({ nama: s.nama, ketepatan: await ukurBatasHarian(s, url, konteks) });
        }
      } finally {
        server.kill();
      }
    }
  } finally {
    hapusUnggahanBeban();
  }

  console.log('RINGKASAN KETEPATAN');
  let semuaCocok = true;
  for (const h of hasil) {
    for (const k of h.ketepatan) {
      semuaCocok &&= k.cocok;
      console.log(
        `  ${k.cocok ? 'cocok ' : 'TIDAK '} ${h.nama.padEnd(26)} ${k.tabel.padEnd(36)} ` +
          `selisih ${k.selisih}, diharapkan ${k.diharapkan}`,
      );
    }
  }
  console.log(
    semuaCocok
      ? 'Semua tulisan sampai tepat sekali.'
      : 'PERINGATAN: ada pemeriksaan yang TIDAK cocok; lihat baris di atas.',
  );
}

async function denganPrismaBeban<T>(
  url: string,
  kerja: (p: PrismaClient) => Promise<T>,
): Promise<T> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [tersambung] = await prisma.$queryRaw<{ db: string }[]>`
      SELECT current_database() AS db
    `;
    pastikanSasaranBeban(tersambung.db);
    return await kerja(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function bacaKonteksTulis(url: string): Promise<KonteksTulis> {
  return denganPrismaBeban(url, async (prisma) => {
    const [survei] = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id::int AS id FROM surveys
      WHERE allow_multiple_submit AND status = 'aktif'::survey_status ORDER BY id LIMIT 1
    `;
    const [opd] = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id::int AS id FROM opd WHERE kode LIKE 'BEBAN%' ORDER BY id LIMIT 1
    `;
    const [akun] = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id::int AS id FROM users WHERE sso_subject = ${IDENTITAS_BATAS_HARIAN}
    `;
    if (!survei || !opd || !akun) {
      throw new Error(
        'Dataset beban belum memuat survei multi-kirim, OPD beban, atau akun batas harian. ' +
          'Bangun ulang: pnpm --filter @skm-spm/api beban:data -- --survei=744 --respons=20',
      );
    }
    const pertanyaan = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id::int AS id FROM questions WHERE survey_id = ${survei.id} ORDER BY urutan
    `;
    return {
      idSurveiMulti: survei.id,
      idPertanyaan: pertanyaan.map((q) => q.id),
      idOpd: opd.id,
      idAkunBatas: akun.id,
    };
  });
}

async function hitungTulis(url: string): Promise<HitunganTulis> {
  return denganPrismaBeban(url, async (prisma) => {
    const [b] = await prisma.$queryRaw<Record<string, bigint>[]>`
      SELECT (SELECT count(*) FROM complaints)            AS complaints,
             (SELECT count(*) FROM complaint_attachments) AS complaint_attachments,
             (SELECT count(*) FROM survey_responses)      AS survey_responses,
             (SELECT count(*) FROM answers)               AS answers
    `;
    return {
      complaints: Number(b.complaints),
      complaint_attachments: Number(b.complaint_attachments),
      survey_responses: Number(b.survey_responses),
      answers: Number(b.answers),
    };
  });
}

/** Medan pengaduan yang sah sejak 4 November 2026 (`tingkat`, tanggal, lokasi wajib). */
function medanPengaduan(idOpd: number): Record<string, string> {
  // Tanggal kemarin MENURUT WIB: `parseTanggalKejadian` menolak tanggal yang
  // melampaui hari ini menurut WIB, sedangkan jam mesin bisa berbeda tanggal.
  const kemarin = new Date(Date.now() + 7 * 3600_000 - 86_400_000).toISOString().slice(0, 10);
  return {
    tingkat: 'kabupaten',
    kategori: 'kab_infrastruktur',
    opdId: String(idOpd),
    judul: '[UJI BEBAN] Jalan berlubang di depan pasar',
    uraian: 'Lubang selebar satu meter, sudah dua minggu belum ditambal. '.repeat(4),
    tanggalKejadian: kemarin,
    lokasiKejadian: 'Jl. Contoh Beban No. 1, Kecamatan Contoh',
  };
}

function berkasUnggahan(): string[] {
  const dir = path.join(AKAR_API, UNGGAHAN_BEBAN, 'complaints');
  return fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => path.join(dir, f)) : [];
}

/**
 * Menghapus `uploads-beban/`, dan HANYA itu. Jalurnya disusun dari tetapan,
 * lalu diperiksa sekali lagi sebelum dihapus: salah ketik yang menunjuk
 * `uploads/` akan memusnahkan lampiran pengembangan pengguna, dan itu tak dapat
 * dipulihkan karena lampirannya terenkripsi dan tak ada salinannya di mana pun.
 */
function hapusUnggahanBeban(): void {
  const dir = path.resolve(AKAR_API, UNGGAHAN_BEBAN);
  if (path.basename(dir) !== 'uploads-beban' || path.dirname(dir) !== AKAR_API) {
    throw new Error(`Menolak menghapus '${dir}': bukan direktori unggahan beban.`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

function cetakLatensi(hasil: autocannon.Result): void {
  const kode = Object.fromEntries(
    Object.entries(hasil.statusCodeStats ?? {}).map(([k, v]) => [k, v.count]),
  );
  console.log(
    `  p50 ${hasil.latency.p50} ms | p97,5 ${hasil.latency.p97_5} ms | p99 ${hasil.latency.p99} ms | ` +
      `maks ${hasil.latency.max} ms | ${Math.round(hasil.requests.average)} req/s`,
  );
  console.log(
    `  ${hasil.requests.sent} terkirim, ${hasil.requests.total} terjawab; 2xx ${hasil['2xx']}; per kode ${JSON.stringify(kode)}; ` +
      `galat jaringan ${hasil.errors}; habis waktu ${hasil.timeouts}`,
  );
}

async function ukurTulis(
  skenario: SkenarioTulis,
  url: string,
  konteks: KonteksTulis,
  kunci: Buffer,
  bearerAdmin: string,
  opsi: { durasi: number; koneksi: number },
): Promise<Ketepatan[]> {
  const jalur = skenario.jalur.replace(':survei', String(konteks.idSurveiMulti));
  console.log(`${skenario.nama}  ${skenario.method} ${jalur}`);
  console.log(`  ${skenario.alasan}`);

  let tubuh: Buffer;
  let contentType: string;
  let ambilBearer: () => string = () => bearerAdmin;
  let png: Buffer | undefined;
  let jumlah: number;

  if (skenario.jenis === 'jawaban') {
    tubuh = Buffer.from(
      JSON.stringify({
        answers: konteks.idPertanyaan.map((questionId, i) => ({ questionId, nilai: 1 + (i % 4) })),
      }),
    );
    contentType = 'application/json';
    process.stdout.write(`  menerbitkan ${JUMLAH_RESPONDEN_BEBAN} sesi responden`);
    const sesi: string[] = [];
    for (let i = 1; i <= JUMLAH_RESPONDEN_BEBAN; i += 1) {
      sesi.push(await masuk('responden', identitasResponden(i)));
      if (i % 10 === 0) process.stdout.write('.');
    }
    console.log(' selesai');
    ambilBearer = buatPemutar(sesi);
    // JUMLAH TETAP, bukan durasi: N akun x 10 per menit adalah batas atas yang
    // tak menyentuh `@Throttle`, dikurangi satu untuk permintaan penyelidik.
    jumlah = JUMLAH_RESPONDEN_BEBAN * BATAS_JAWABAN_PER_MENIT - 1;
  } else {
    const berkas: BerkasMultipart[] = [];
    if (skenario.jenis === 'pengaduan-lampiran') {
      png = buatPng(UKURAN_LAMPIRAN);
      berkas.push({
        medan: 'lampiran',
        namaBerkas: 'bukti-beban.png',
        tipe: 'image/png',
        isi: png,
      });
    }
    ({ isi: tubuh, contentType } = susunMultipart(medanPengaduan(konteks.idOpd), berkas));
    jumlah = angkaArgumen('jumlah', skenario.jumlahBaku ?? 1000);
  }

  const berkasSebelum = new Set(berkasUnggahan());
  const sebelum = await hitungTulis(url);

  const mulai = Date.now();
  const jawab = await fetch(`${ASAL}${jalur}`, {
    method: 'POST',
    headers: { 'content-type': contentType, authorization: ambilBearer() },
    body: new Uint8Array(tubuh),
  });
  const msPertama = Date.now() - mulai;
  if (!jawab.ok) {
    throw new Error(
      `${skenario.nama}: penyelidik menjawab ${jawab.status}, bukan 2xx. Beban tidak dijalankan. ` +
        `Jawabannya: ${(await jawab.text()).slice(0, 300)}`,
    );
  }

  const hasil = await autocannon({
    url: `${ASAL}${jalur}`,
    connections: opsi.koneksi,
    amount: jumlah,
    timeout: 120,
    requests: [
      {
        method: 'POST',
        body: tubuh,
        // Dipanggil setiap kali permintaan disusun, jadi sesi berganti per
        // permintaan. Bila autocannon ternyata menyusunnya sekali saja, satu
        // akun menerima semuanya dan 429 muncul di baris "per kode" -- itulah
        // yang membuktikan pemutarannya, bukan anggapan atas pustakanya.
        setupRequest: (req) => ({
          ...req,
          headers: { ...req.headers, 'content-type': contentType, authorization: ambilBearer() },
        }),
      },
    ],
  });

  console.log(`  pertama ${msPertama} ms (satu permintaan sebelum beban)`);
  cetakLatensi(hasil);

  // Permintaan yang terkirim tanpa pernah terjawab menulis baris tanpa 2xx
  // pasangannya. Dengan jumlah tetap seharusnya nol; bila tidak, pemeriksaan
  // ketepatan di bawah tak dapat dibaca sebagai bukti tulisan berganda.
  if (hasil.requests.sent !== hasil.requests.total) {
    console.log(
      `  PERINGATAN: ${hasil.requests.sent - hasil.requests.total} permintaan terkirim tanpa jawaban`,
    );
  }
  const sesudah = await hitungTulis(url);
  const duaRatus = hasil['2xx'] + 1;
  const ketepatan: Ketepatan[] = [];

  if (skenario.jenis === 'jawaban') {
    ketepatan.push(
      nilaiKetepatan(
        'survey_responses',
        sebelum.survey_responses,
        sesudah.survey_responses,
        duaRatus,
      ),
      nilaiKetepatan(
        'answers',
        sebelum.answers,
        sesudah.answers,
        duaRatus * konteks.idPertanyaan.length,
      ),
      nilaiKetepatan('complaints (harus tetap)', sebelum.complaints, sesudah.complaints, 0),
    );
    await cetakSebaranAkun(url, konteks.idSurveiMulti);
  } else {
    const berLampiran = skenario.jenis === 'pengaduan-lampiran' ? 1 : 0;
    ketepatan.push(
      nilaiKetepatan('complaints', sebelum.complaints, sesudah.complaints, duaRatus),
      nilaiKetepatan(
        'complaint_attachments',
        sebelum.complaint_attachments,
        sesudah.complaint_attachments,
        duaRatus * berLampiran,
      ),
    );
    const baru = berkasUnggahan().filter((f) => !berkasSebelum.has(f));
    ketepatan.push(
      nilaiKetepatan(
        `berkas ${UNGGAHAN_BEBAN}/ = baris lampiran`,
        0,
        baru.length,
        sesudah.complaint_attachments - sebelum.complaint_attachments,
      ),
    );
    if (png !== undefined) {
      ketepatan.push(periksaAmplop(baru, png, kunci));
    }
  }
  console.log('');
  return ketepatan;
}

/**
 * SETIAP berkas baru harus amplop SKM1 DAN terbuka menjadi PNG yang dikirim,
 * bita demi bita. `terenkripsi` saja hanya membaca kepalanya; dekripsi penuh
 * yang membuktikan isinya utuh (tag GCM) dan kuncinya kunci yang sama.
 */
function periksaAmplop(berkas: string[], png: Buffer, kunci: Buffer): Ketepatan {
  let sah = 0;
  for (const f of berkas) {
    const isi = fs.readFileSync(f);
    try {
      if (terenkripsi(isi) && dekripsi(isi, kunci, INFO_LAMPIRAN).equals(png)) {
        sah += 1;
      }
    } catch {
      // Tag GCM gagal atau versi tak dikenal: tak dihitung sah.
    }
  }
  return nilaiKetepatan('berkas amplop sah = PNG asli', 0, sah, berkas.length);
}

/**
 * Bukti pemutaran sesi dari sisi SERVER: respons per akun pada survei
 * multi-kirim. Maksimal di atas 10 berarti ada akun yang melewati batas
 * `@Throttle`-nya -- yang hanya mungkin bila pemutar tidak bergiliran.
 */
async function cetakSebaranAkun(url: string, idSurvei: number): Promise<void> {
  await denganPrismaBeban(url, async (prisma) => {
    const [b] = await prisma.$queryRaw<{ akun: bigint; min: bigint; maks: bigint }[]>`
      SELECT count(*) AS akun, min(n) AS min, max(n) AS maks FROM (
        SELECT count(*) AS n FROM survey_responses
        WHERE survey_id = ${idSurvei} AND user_id IS NOT NULL GROUP BY user_id
      ) t
    `;
    console.log(
      `  sebaran respons per akun (kumulatif, survei ${idSurvei}): ${Number(b.akun)} akun, ` +
        `min ${Number(b.min)}, maks ${Number(b.maks)}`,
    );
  });
}

interface JawabanMentah {
  kode: number | null;
  mulai: number;
  selesai: number;
}

/**
 * Satu permintaan lewat `http.request` dengan `agent: false`: SATU soket baru
 * per permintaan, tanpa kolam yang dapat mengantrikannya diam-diam. `fetch`
 * (undici) tidak dipakai karena kolam sambungannya membatasi soket per asal.
 */
function kirimMentah(tubuh: Buffer, contentType: string, bearer: string): Promise<JawabanMentah> {
  return new Promise((resolve) => {
    const mulai = performance.now();
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORTA,
        path: '/api/v1/complaints',
        method: 'POST',
        agent: false,
        headers: {
          'content-type': contentType,
          'content-length': tubuh.length,
          authorization: bearer,
        },
      },
      (res) => {
        res.resume();
        res.on('end', () =>
          resolve({ kode: res.statusCode ?? null, mulai, selesai: performance.now() }),
        );
      },
    );
    req.on('error', () => resolve({ kode: null, mulai, selesai: performance.now() }));
    req.end(tubuh);
  });
}

/**
 * KETEPATAN BATAS HARIAN di bawah kiriman serentak.
 *
 * `assertBelumMelewatiBatasHarian` menghitung pengaduan hari ini, lalu
 * `insertWithUniqueTicket` menulis, tanpa kunci di antara keduanya. Yang diuji:
 * berapa dari 50 kiriman serentak yang lolos ketika batasnya 10.
 *
 * `--beruntun` mengirim yang sama satu per satu. Itu PEMBUKTI ALATNYA, bukan
 * skenario: hasilnya harus tepat 10 diterima. Bila beruntun pun menerima lebih
 * dari 10, yang salah adalah server ini (batasnya bukan 10), bukan balapannya.
 *
 * Pengaduan akun batas yang tersisa dari jalan sebelumnya DIHAPUS lebih dulu,
 * di `skm_beban` saja (palang `denganPrismaBeban`). Tanpanya jalan kedua di hari
 * yang sama mulai dari 10 dan menjawab 50 x 429.
 */
async function ukurBatasHarian(
  skenario: SkenarioTulis,
  url: string,
  konteks: KonteksTulis,
): Promise<Ketepatan[]> {
  const beruntun = process.argv.includes('--beruntun');
  console.log(
    `${skenario.nama}  ${skenario.method} ${skenario.jalur}${beruntun ? '  [BERUNTUN]' : ''}`,
  );
  console.log(`  ${skenario.alasan}`);

  const dihapus = await denganPrismaBeban(
    url,
    (prisma) => prisma.$executeRaw`DELETE FROM complaints WHERE user_id = ${konteks.idAkunBatas}`,
  );
  console.log(`  pengaduan akun batas dari jalan sebelumnya dihapus: ${dihapus}`);

  const bearer = await masuk('responden', IDENTITAS_BATAS_HARIAN);
  const { isi, contentType } = susunMultipart(medanPengaduan(konteks.idOpd));
  const sebelum = await hitungTulis(url);

  let jawaban: JawabanMentah[];
  if (beruntun) {
    jawaban = [];
    for (let i = 0; i < JUMLAH_SERENTAK; i += 1) {
      jawaban.push(await kirimMentah(isi, contentType, bearer));
    }
  } else {
    jawaban = await Promise.all(
      Array.from({ length: JUMLAH_SERENTAK }, () => kirimMentah(isi, contentType, bearer)),
    );
  }

  const sesudah = await hitungTulis(url);
  const [milikAkun] = await denganPrismaBeban(
    url,
    (prisma) => prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM complaints WHERE user_id = ${konteks.idAkunBatas}
    `,
  );
  const kode = jawaban.map((j) => j.kode);
  const diterima = kode.filter((k) => k !== null && k >= 200 && k < 300).length;
  const awal = Math.min(...jawaban.map((j) => j.mulai));
  const rentang = jawaban.map((j) => ({ mulai: j.mulai - awal, selesai: j.selesai - awal }));

  console.log(`  per kode ${JSON.stringify(ringkasKode(kode))}`);
  console.log(
    `  puncak serentak ${puncakSerentak(rentang)} dari ${JUMLAH_SERENTAK}; ` +
      `berangkat terakhir +${Math.max(...rentang.map((r) => r.mulai)).toFixed(1)} ms, ` +
      `selesai pertama +${Math.min(...rentang.map((r) => r.selesai)).toFixed(1)} ms, ` +
      `selesai terakhir +${Math.max(...rentang.map((r) => r.selesai)).toFixed(1)} ms`,
  );
  console.log(`  pengaduan akun batas di basis data: ${Number(milikAkun.n)}`);
  console.log(
    diterima > BATAS_HARIAN_PENGADUAN_BAKU
      ? `  JEBOL: ${diterima} diterima, batasnya ${BATAS_HARIAN_PENGADUAN_BAKU}\n`
      : `  ditahan: ${diterima} diterima, batasnya ${BATAS_HARIAN_PENGADUAN_BAKU}\n`,
  );

  return [
    nilaiKetepatan('complaints', sebelum.complaints, sesudah.complaints, diterima),
    nilaiKetepatan(
      'diterima <= batas harian',
      0,
      Math.min(diterima, BATAS_HARIAN_PENGADUAN_BAKU),
      diterima,
    ),
  ];
}

function tidur(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (require.main === module) {
  void utama().catch((err: unknown) => {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  });
}
