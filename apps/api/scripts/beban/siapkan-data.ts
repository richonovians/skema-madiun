/**
 * PEMBANGUN DATASET UJI BEBAN.
 *
 * MENGAPA ADA. Proyek ini belum pernah diuji beban, dan data pengembangannya 11
 * respons. Pertanyaan yang pantas dijawab karena itu bukan "apakah sanggup
 * menampung beban yang diperkirakan" -- angka penerimaan survei TIDAK DAPAT
 * diketahui, dan pemilik produk menyatakannya sendiri: warga tak pasti mau
 * mengisi. Yang dapat dijawab adalah "pada beban berapa ia berhenti cepat", dan
 * itu menuntut kurva, bukan satu angka tunggal.
 *
 * SATU VARIABEL YANG DIGESER. Jumlah survei ditahan, sebab justru ia yang dapat
 * diperkirakan: ia lahir dari jadwal administratif OPD, bukan dari minat warga.
 * 62 OPD (jumlah nyata hasil sinkronisasi Helpdesk) x 4 triwulan x 3 tahun =
 * 744 survei. Yang digeser hanya respons per survei.
 *
 *   --survei=744 --respons=20     -> ~134 ribu baris answers
 *   --survei=744 --respons=200    -> ~1,34 juta
 *   --survei=744 --respons=1000   -> ~6,7 juta
 *
 * SQL MENTAH, BUKAN `createMany`. Barisnya dibangkitkan SERVER-SIDE lewat
 * `generate_series` dan `INSERT ... SELECT`, sehingga tak ada satu pun baris
 * yang melintasi kabel. Untuk 6,7 juta baris bedanya bukan soal gaya melainkan
 * jam versus menit. `createMany` juga tak mengembalikan id, yang berarti satu
 * pembacaan balik tambahan per survei hanya untuk merangkai jawabannya.
 *
 * Konsekuensinya berkas ini tak terikat tipe Prisma, dan itu disengaja serta
 * dibatasi: ia pembangkit data uji, bukan kode aplikasi.
 *
 * JEBAKAN SQL MENTAH YANG SUDAH MENGGIGIT SEKALI: nama tipe enum di Postgres
 * BUKAN nama enum di Prisma. `@@map` menerjemahkannya, sehingga `SurveyStatus`
 * hidup sebagai `survey_status`, `JenisSurvei` sebagai `jenis_survei`, dan
 * `QuestionType` sebagai `question_type`. Memakai nama Prisma menghasilkan
 * `ERROR: type "SurveyStatus" does not exist` -- terukur pada jalan pertama.
 * Daftar nama sebenarnya dibaca dari basis datanya, bukan dari ingatan:
 * `SELECT typname FROM pg_type JOIN pg_enum ON enumtypid = pg_type.oid`.
 *
 * BAKUNYA MENGOSONGKAN LEBIH DULU. `--tambah` menumpuk di atas yang sudah ada,
 * dan hanya itu yang menumpuk.
 *
 *   pnpm --filter @skm-spm/api beban:data -- --survei=744 --respons=20
 *   pnpm --filter @skm-spm/api beban:data -- --survei=0            # kosongkan saja
 */
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { jalankanCli } from '../lib/jalankan-cli';
import { IDENTITAS_ADMIN, PERAN_BEBAN } from './lib/akun-beban';
import {
  NAMA_DB_BEBAN,
  basisDataBelumAda,
  pastikanSasaranBeban,
  sasaranDbBeban,
} from './lib/sasaran-beban';

const AKAR_API = path.resolve(__dirname, '..', '..');

const JUMLAH_OPD = 62;
const SURVEI_BAKU = 744;
const RESPONS_BAKU = 20;
/** Sembilan unsur baku PermenPANRB 14/2017. */
const JUMLAH_UNSUR = 9;
/** Survei per pernyataan INSERT, supaya satu pernyataan tak tumbuh tanpa batas. */
const PETAK = 50;

interface BatasSurvei {
  min: number;
  max: number;
}

function angkaArgumen(nama: string, baku: number): number {
  const awalan = `--${nama}=`;
  const cocok = process.argv.find((a) => a.startsWith(awalan));
  if (cocok === undefined) {
    return baku;
  }
  const nilai = Number(cocok.slice(awalan.length));
  if (!Number.isInteger(nilai) || nilai < 0) {
    throw new Error(`${awalan} menuntut bilangan bulat tak negatif, bukan '${cocok}'`);
  }
  return nilai;
}

async function utama(): Promise<void> {
  dotenv.config({ path: path.join(AKAR_API, '.env') });

  const url = sasaranDbBeban(process.env.DATABASE_URL ?? '');
  const jumlahSurvei = angkaArgumen('survei', SURVEI_BAKU);
  const responsPerSurvei = angkaArgumen('respons', RESPONS_BAKU);
  // MENGOSONGKAN ADALAH BAKUNYA, dan `--tambah` yang harus diminta. Sebelumnya
  // kebalikannya: `--bersih` yang harus diminta. Itu salah untuk uji beban --
  // angka hanya berarti bila ukuran datasetnya diketahui, dan jalan ulang yang
  // diam-diam menumpuk membuat setiap pengukuran berikutnya diukur di atas
  // dataset yang berbeda dari yang dicetak. `--bersih` tetap diterima supaya
  // perintah lama tidak mendadak berganti arti.
  const bersih = !process.argv.includes('--tambah');

  console.log(`Basis data beban: ${NAMA_DB_BEBAN}`);

  await tegaskanSasaranSebelumMigrasi(url);

  const kodeMigrasi = jalankanCli('prisma', ['migrate', 'deploy'], {
    cwd: AKAR_API,
    databaseUrl: url,
  });
  if (kodeMigrasi !== 0) {
    throw new Error('Migrasi ke basis data beban gagal.');
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    // PALANG DI TITIK TULIS: jawaban server, bukan nama yang diurai dari string
    // yang kita susun sendiri. Alasan lengkapnya ada di `pastikanSasaranBeban`.
    const [tersambung] = await prisma.$queryRaw<{ db: string }[]>`
      SELECT current_database() AS db
    `;
    pastikanSasaranBeban(tersambung.db);

    if (bersih) {
      await kosongkan(prisma);
      console.log('Dataset dikosongkan.');
    }

    if (jumlahSurvei > 0) {
      const mulai = Date.now();
      await bangunOpd(prisma);
      await bangunPengguna(prisma);
      const batas = await bangunSurvei(prisma, jumlahSurvei);
      await bangunPertanyaan(prisma, batas);
      await bangunRespons(prisma, batas, responsPerSurvei);
      await bangunJawaban(prisma, batas);
      console.log(`\nDibangun dalam ${((Date.now() - mulai) / 1000).toFixed(1)}s.`);
    }

    console.log('Baris sekarang:');
    for (const [tabel, jumlah] of Object.entries(await hitungBaris(prisma))) {
      console.log(`  ${tabel.padEnd(18)} ${jumlah.toLocaleString('id-ID')}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Menegaskan sasaran SEBELUM `prisma migrate deploy`, bukan hanya sesudahnya.
 *
 * Mengapa perlu ada dua kali. Penegasan yang sudah ada berjalan sesudah
 * migrasi, sehingga migrasinya sendiri tak terjaga: bila teks URL menyebut
 * `skm_beban` sementara server yang menjawab basis data lain, 33 migrasi
 * mendarat di tempat yang salah sebelum palang yang lebih kuat menyala.
 * Ditemukan telaah keamanan 13 Oktober 2026 sebagai cacat ketahanan, bukan
 * kerentanan -- memicunya menuntut kendali atas `DATABASE_URL`.
 *
 * MENGAPA BUKAN SEKADAR MENUKAR URUTANNYA. `prisma migrate deploy` itulah yang
 * MEMBUAT basis data yang belum ada, jadi pada jalan pertama di mesin baru
 * sambungan di sini memang harus gagal. Kegagalan itu dilewatkan, dan hanya
 * kegagalan itu: basis data yang belum ada tak menyimpan apa pun, sehingga
 * memigrasikannya tak dapat merusak apa pun. Yang berbahaya adalah
 * memigrasikan basis data yang SUDAH ADA dan bukan sasaran, dan pada kasus itu
 * sambungannya berhasil sehingga penegasannya berjalan.
 */
async function tegaskanSasaranSebelumMigrasi(url: string): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [tersambung] = await prisma.$queryRaw<{ db: string }[]>`
      SELECT current_database() AS db
    `;
    pastikanSasaranBeban(tersambung.db);
  } catch (err) {
    // Galat sambungan lain -- server mati, kata sandi salah -- TIDAK ditelan.
    // Menelannya akan menukar palang ini dengan lubang.
    if (!basisDataBelumAda(err, NAMA_DB_BEBAN)) {
      throw err;
    }
    console.log(`Basis data '${NAMA_DB_BEBAN}' belum ada; migrasi akan membuatnya.`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * `TRUNCATE ... CASCADE`, bukan `deleteMany` berurutan. Basis data ini khusus
 * uji beban dan palang di atas sudah memastikannya, jadi tak ada data milik
 * siapa pun yang dapat hilang di sini. `opd` ikut dikosongkan supaya
 * hitungannya tidak menumpuk pada jalan berikutnya.
 */
async function kosongkan(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE answers, survey_responses, question_options, questions, ikm_results, surveys, opd CASCADE',
  );
}

/**
 * SATU AKUN ADMIN KABUPATEN, dan ia bukan hiasan.
 *
 * Jalur terukur di proyek ini memakai sesi sungguhan, bukan header `x-dev-*`:
 * `AUTH_PROVIDER` hanya mengikat `StubAuthProvider` ketika
 * `NODE_ENV === 'test'`, sedangkan pelari beban sengaja berjalan sebagai
 * `development` supaya yang diukur jalur produksi. Terukur pada jalan pertama:
 * `GET /api/v1/dashboard/ikm` menjawab 401 "Autentikasi diperlukan" dengan
 * header dev yang lengkap.
 *
 * Jadi pelarinya masuk lewat `POST /api/v1/auth/dev-login`, dan akun inilah
 * yang ia pakai. `consent_at` diisi supaya penjaga persetujuan PDP tak
 * menghalangi jalur mana pun.
 *
 * DUA PERAN pada satu akun, bukan dua akun. `dev-login` menerima `role` dan
 * menolaknya bila akunnya tak memilikinya, jadi pelarinya menerbitkan dua sesi
 * dari akun yang sama: `kabupaten` untuk jalur administratif, `responden` untuk
 * `GET /surveys/:id/fill` yang dipalang `@Roles(Role.responden)` -- terukur
 * sebagai 403 "Sumber daya ini hanya untuk peran: responden" ketika akun ini
 * hanya berperan `kabupaten`.
 *
 * `DO UPDATE`, bukan `DO NOTHING`: akun yang sudah dibuat jalan sebelumnya tak
 * akan pernah memperoleh peran baru di bawah `DO NOTHING`, dan gejalanya adalah
 * 403 yang terlihat seperti cacat penjaga.
 *
 * TIDAK ikut dikosongkan: `TRUNCATE` di atas tak menyentuh `users`, jadi akun
 * ini bertahan dan `dev-login` tetap bekerja sesudah dataset dibangun ulang.
 */
async function bangunPengguna(prisma: PrismaClient): Promise<void> {
  // Peran disusun dari `PERAN_BEBAN`, bukan ditulis dua kali di dalam SQL:
  // `jalankan.ts` menerbitkan satu sesi per nilai di daftar itu, dan dua daftar
  // yang menyimpang menghasilkan 403 yang terbaca seperti cacat penjaga.
  const peran = `ARRAY[${PERAN_BEBAN.map((p) => `'${p}'`).join(',')}]::user_role[]`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO users (sso_subject, nama, email, roles, is_active, consent_at, created_at, updated_at)
     VALUES ($1, 'Admin Kabupaten Beban', $2, ${peran}, true, now(), now(), now())
     ON CONFLICT (sso_subject)
       DO UPDATE SET roles = ${peran}, updated_at = now()`,
    IDENTITAS_ADMIN,
    `${IDENTITAS_ADMIN}@contoh.test`,
  );
}

async function bangunOpd(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO opd (kode, nama, is_active, created_at, updated_at)
     SELECT 'BEBAN' || lpad(i::text, 4, '0'), 'OPD Beban ' || i, true, now(), now()
     FROM generate_series(1, $1) AS i
     ON CONFLICT (kode) DO NOTHING`,
    JUMLAH_OPD,
  );
}

/**
 * Survei SKM, bukan custom: jalur IKM yang hendak diukur hanya hidup pada
 * `skm_permenpanrb`. Periodenya diputar triwulanan supaya penyaring periode di
 * Statistik & Laporan punya sesuatu untuk disaring.
 */
async function bangunSurvei(prisma: PrismaClient, jumlah: number): Promise<BatasSurvei> {
  // `RETURNING id`, BUKAN `SELECT MIN(id), MAX(id) FROM surveys` sesudahnya.
  // Versi pertama berkas ini memakai yang kedua dan itu CACAT TERUKUR: pada
  // jalan ulang tanpa `--bersih`, batasnya mencakup survei LAMA, sehingga
  // `bangunRespons` menambahkan `perSurvei` respons lagi ke setiap survei yang
  // sudah ada. Setelah tiga jalan, basis datanya memuat 744x60 + 744x40 +
  // 744x20 = 89.280 respons padahal diminta 20 per survei, dan angka beban yang
  // diukur di atasnya tak dapat dipertanggungjawabkan.
  const baris = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `INSERT INTO surveys (opd_id, judul, periode, status, jenis, izinkan_anonim, created_at, updated_at)
     SELECT o.id,
            'Survei Beban ' || i,
            (2024 + (((i - 1) / 4) % 3))::text || '-Q' || (((i - 1) % 4) + 1),
            'aktif'::survey_status,
            'skm_permenpanrb'::jenis_survei,
            true, now(), now()
     FROM generate_series(1, $1) AS i
     JOIN LATERAL (
       SELECT id FROM opd WHERE kode LIKE 'BEBAN%' ORDER BY id OFFSET ((i - 1) % $2) LIMIT 1
     ) AS o ON true
     RETURNING id`,
    jumlah,
    JUMLAH_OPD,
  );

  const id = baris.map((b) => Number(b.id));
  const batas: BatasSurvei = { min: Math.min(...id), max: Math.max(...id) };
  console.log(`  survei     : ${jumlah.toLocaleString('id-ID')} (id ${batas.min}..${batas.max})`);
  return batas;
}

async function bangunPertanyaan(prisma: PrismaClient, s: BatasSurvei): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO questions (survey_id, teks, tipe, is_ikm_unsur, kode_unsur, urutan, created_at, updated_at)
     SELECT s.id, 'Pertanyaan unsur U' || u, 'skala'::question_type, true, 'U' || u, u, now(), now()
     FROM surveys s CROSS JOIN generate_series(1, $1) AS u
     WHERE s.id BETWEEN $2 AND $3`,
    JUMLAH_UNSUR,
    s.min,
    s.max,
  );
  console.log(`  pertanyaan : ${JUMLAH_UNSUR} unsur per survei`);
}

async function bangunRespons(
  prisma: PrismaClient,
  s: BatasSurvei,
  perSurvei: number,
): Promise<void> {
  // `dedupe_user_id` DIBIARKAN NULL. Kendala `@@unique([surveyId, dedupeUserId])`
  // membolehkan banyak NULL di Postgres, jadi respons anonim boleh sebanyak apa
  // pun -- dan itu memang bentuk beban yang hendak diukur.
  for (let a = s.min; a <= s.max; a += PETAK) {
    const b = Math.min(a + PETAK - 1, s.max);
    await prisma.$executeRawUnsafe(
      `INSERT INTO survey_responses (survey_id, submitted_at)
       SELECT s.id, now() - (random() * interval '1000 days')
       FROM surveys s CROSS JOIN generate_series(1, $1)
       WHERE s.id BETWEEN $2 AND $3`,
      perSurvei,
      a,
      b,
    );
  }
  console.log(`  respons    : ${perSurvei.toLocaleString('id-ID')} per survei`);
}

async function bangunJawaban(prisma: PrismaClient, s: BatasSurvei): Promise<void> {
  for (let a = s.min; a <= s.max; a += PETAK) {
    const b = Math.min(a + PETAK - 1, s.max);
    await prisma.$executeRawUnsafe(
      `INSERT INTO answers (response_id, question_id, nilai)
       SELECT r.id, q.id, 1 + floor(random() * 4)::int
       FROM survey_responses r
       JOIN questions q ON q.survey_id = r.survey_id AND q.is_ikm_unsur = true
       WHERE r.survey_id BETWEEN $1 AND $2
       ON CONFLICT (response_id, question_id) DO NOTHING`,
      a,
      b,
    );
  }
  console.log(`  jawaban    : ${JUMLAH_UNSUR} per respons`);
}

async function hitungBaris(prisma: PrismaClient): Promise<Record<string, number>> {
  const [baris] = await prisma.$queryRaw<Record<string, bigint>[]>`
    SELECT (SELECT count(*) FROM opd)              AS opd,
           (SELECT count(*) FROM surveys)          AS surveys,
           (SELECT count(*) FROM questions)        AS questions,
           (SELECT count(*) FROM survey_responses) AS survey_responses,
           (SELECT count(*) FROM answers)          AS answers
  `;
  return Object.fromEntries(Object.entries(baris).map(([k, v]) => [k, Number(v)]));
}

// HANYA SEBAGAI ENTRI, bukan saat diimpor. Tanpa palang ini, berkas ini
// membangun ulang dataset setiap kali ada modul lain yang mengimpor salah satu
// nilainya -- cacat yang sudah menggigit sekali; lihat `lib/akun-beban.ts`.
if (require.main === module) {
  void utama().catch((err: unknown) => {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  });
}
