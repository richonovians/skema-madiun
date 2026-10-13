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
 */
import { spawn, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import autocannon from 'autocannon';
import * as dotenv from 'dotenv';
import { jalankanCli } from '../lib/jalankan-cli';
import { IDENTITAS_ADMIN, PERAN_BEBAN, type PeranBeban } from './lib/akun-beban';
import {
  NAMA_DB_BEBAN,
  pastikanSasaranBeban,
  redisBeban,
  sasaranDbBeban,
} from './lib/sasaran-beban';
import { SKENARIO, type Skenario } from './skenario';

const AKAR_API = path.resolve(__dirname, '..', '..');
const PORTA = 3002;
const ASAL = `http://127.0.0.1:${PORTA}`;
const KELUARAN = 'dist-beban';

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

  const diminta = process.argv.find((a) => a.startsWith('--skenario='))?.slice(11);
  const dipilih = process.argv.includes('--semua')
    ? SKENARIO
    : SKENARIO.filter((s) => s.nama === diminta);
  if (dipilih.length === 0) {
    throw new Error(
      `Skenario '${diminta ?? ''}' tak dikenal. Yang ada: ${SKENARIO.map((s) => s.nama).join(', ')}. ` +
        'Atau pakai --semua.',
    );
  }

  const { idSurvei, baris } = await periksaDataset(url);

  console.log(`Basis data : ${NAMA_DB_BEBAN}`);
  console.log(
    `Dataset    : ${baris.survey_responses.toLocaleString('id-ID')} respons, ${baris.answers.toLocaleString('id-ID')} jawaban`,
  );
  console.log(`Beban      : ${koneksi} koneksi, ${durasi}s per skenario\n`);

  const server = await nyalakanServer(url);
  try {
    const bearer: Record<string, string> = {};
    for (const peran of PERAN_BEBAN) {
      bearer[peran] = await masuk(peran);
    }
    for (const skenario of dipilih) {
      await ukur(skenario, idSurvei, { durasi, koneksi, bearer });
    }
  } finally {
    server.kill();
  }

  // DIHITUNG ULANG SESUDAH BEBAN, dan selisihnya dilaporkan. Skenario di atas
  // semuanya baca, jadi selisih nol adalah satu-satunya hasil yang boleh
  // diterima -- dan tanpa pemeriksaan ini satu set angka sempat disajikan di
  // atas dataset yang berubah di tengah pengukuran (13 Oktober 2026). Ia juga
  // yang akan memerah lebih dulu begitu skenario tulis ditambahkan, dan itu
  // disengaja: angka beban hanya berarti bila ukuran datasetnya diketahui.
  const sesudah = await periksaDataset(url);
  const berubah = (['survey_responses', 'answers'] as const).filter(
    (t) => sesudah.baris[t] !== baris[t],
  );
  console.log(
    berubah.length === 0
      ? `Dataset tetap: ${baris.survey_responses.toLocaleString('id-ID')} respons, ${baris.answers.toLocaleString('id-ID')} jawaban.`
      : 'PERINGATAN: dataset BERUBAH selama pengukuran — angka di atas tak dapat ' +
          `dipertanggungjawabkan. ${berubah
            .map((t) => `${t} ${baris[t]} -> ${sesudah.baris[t]}`)
            .join('; ')}`,
  );
}

/**
 * Menerbitkan SATU sesi PER PERAN, lalu Bearer tokennya dipakai ulang seluruh
 * pengukuran. Dua, bukan satu, karena `@Roles` tak mengenal lintas peran:
 * `GET /surveys/:id/fill` menjawab 403 "Sumber daya ini hanya untuk peran:
 * responden" bagi sesi `kabupaten`. Satu akun memegang keduanya; `dev-login`
 * menerima `role` dan menolaknya bila akunnya tak memilikinya.
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
async function masuk(peran: PeranBeban): Promise<string> {
  const jawab = await fetch(`${ASAL}/api/v1/auth/dev-login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: IDENTITAS_ADMIN, role: peran }),
  });
  if (!jawab.ok) {
    throw new Error(
      `dev-login sebagai '${IDENTITAS_ADMIN}' peran '${peran}' menjawab ${jawab.status}. ` +
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
async function periksaDataset(
  url: string,
): Promise<{ idSurvei: number; baris: Record<string, number> }> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [tersambung] = await prisma.$queryRaw<{ db: string }[]>`
      SELECT current_database() AS db
    `;
    pastikanSasaranBeban(tersambung.db);

    const [baris] = await prisma.$queryRaw<Record<string, bigint>[]>`
      SELECT (SELECT count(*) FROM survey_responses) AS survey_responses,
             (SELECT count(*) FROM answers)          AS answers
    `;
    const hitung = Object.fromEntries(Object.entries(baris).map(([k, v]) => [k, Number(v)]));
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

async function nyalakanServer(url: string): Promise<ChildProcess> {
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
  opsi: { durasi: number; koneksi: number; bearer: Record<string, string> },
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

function tidur(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (require.main === module) {
  void utama().catch((err: unknown) => {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  });
}
