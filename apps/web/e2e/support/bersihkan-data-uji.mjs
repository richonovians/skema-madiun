/**
 * Pembersih data uji — dapat dijalankan ulang kapan pun sesudah suite E2E.
 *
 * Suite ini menulis baris sungguhan ke basis data pengembangan: pengaduan,
 * respons survei, notifikasi, dan berkas unggahan. Aplikasinya sendiri TIDAK
 * dapat membersihkannya kembali — tak ada penghapusan pengaduan sama sekali,
 * dan survei hanya boleh dihapus selagi berstatus `draft`. Karena itu skrip ini
 * ada, dan karena itu pula ia menyentuh basis data langsung lewat Prisma.
 *
 * Aturan mainnya:
 *  - hapus HANYA baris berpenanda `[UJI ` — penanda itu ditulis spec & probe,
 *    tak pernah oleh data seed;
 *  - tak ada survei yang dikecualikan: fixture E2E pun ikut, sebab
 *    `globalSetup` membuatnya kembali (dengan id baru) pada jalan berikutnya;
 *  - JANGAN sentuh audit_logs — jejak wajib menurut rancangan (UU PDP);
 *  - urutan penting: respons dulu, survei belakangan. `Answer -> Question`
 *    berperilaku RESTRICT, jadi menghapus survei lebih dulu ditolak Postgres
 *    dan seluruh transaksinya berguling balik;
 *  - notifikasi menaut pengaduan lewat TEKS `link`, bukan FK: ia tak ikut
 *    cascade dan harus disapu terpisah, SEBELUM induknya hilang — begitu
 *    tiketnya lenyap, tak ada lagi cara mengenali notifikasi mana miliknya.
 *
 * Pemakaian (dari mana pun):
 *   node apps/web/e2e/support/bersihkan-data-uji.mjs --dry   # lihat dulu
 *   node apps/web/e2e/support/bersihkan-data-uji.mjs         # hapus
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Jalur dihitung dari letak berkas ini, bukan dari direktori kerja pemanggil:
// skrip ini dijalankan dari akar repo maupun dari `apps/web`, dan jalur relatif
// terhadap cwd akan pecah pada salah satunya.
const SINI = path.dirname(fileURLToPath(import.meta.url));
const AKAR_API = path.resolve(SINI, '../../../api');
const UNGGAHAN = path.join(AKAR_API, 'uploads/complaints');

// `@prisma/client` milik apps/api dan tak terpasang di apps/web. `createRequire`
// yang berjangkar ke package.json-nya membuatnya dapat dimuat dari sini tanpa
// menambah kebergantungan backend ke ruang kerja frontend.
const require = createRequire(path.join(AKAR_API, 'package.json'));
const { PrismaClient } = require('@prisma/client');

// Prisma membaca `DATABASE_URL` dari process.env. Dijalankan dari apps/web ia
// tak menemukan .env milik apps/api, dan palang di bawah kehilangan separuh
// pemeriksaannya — jadi berkasnya dibaca sendiri di sini, tanpa menimpa nilai
// yang sudah disetel pemanggil.
if (!process.env.DATABASE_URL) {
  const berkasEnv = path.join(AKAR_API, '.env');
  if (fs.existsSync(berkasEnv)) {
    for (const baris of fs.readFileSync(berkasEnv, 'utf8').split('\n')) {
      const cocok = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/.exec(baris);
      if (cocok) {
        process.env.DATABASE_URL = cocok[1].replace(/^["']|["']$/g, '');
        break;
      }
    }
  }
}

const p = new PrismaClient();
const UJI = { contains: '[UJI ' };
const KERING = process.argv.includes('--dry');

/**
 * Palang keselamatan: skrip ini MENGHAPUS baris, jadi ia menolak jalan kalau
 * sambungannya bukan basis data pengembangan lokal. Diperiksa dua sisi — URL
 * yang diminta DAN alamat server yang benar-benar menjawab — karena URL bisa
 * saja `localhost` sementara portnya diterowongkan ke tempat lain.
 */
const HOST_AMAN = ['localhost', '127.0.0.1', '::1', 'db'];
const NAMA_DB_AMAN = 'skm_db';

async function pastikanBasisDataPengembangan() {
  const url = process.env.DATABASE_URL ?? '';
  if (url) {
    const u = new URL(url.replace(/^postgres(ql)?:/, 'http:'));
    const namaDb = u.pathname.replace(/^\//, '');
    if (!HOST_AMAN.includes(u.hostname) || namaDb !== NAMA_DB_AMAN) {
      throw new Error(
        `DITOLAK: DATABASE_URL menunjuk ${u.hostname}/${namaDb}, bukan basis data ` +
          `pengembangan lokal (${HOST_AMAN.join('|')})/${NAMA_DB_AMAN}.`,
      );
    }
  }
  const [info] = await p.$queryRawUnsafe(
    'SELECT current_database() AS db, inet_server_addr()::text AS alamat',
  );
  const lokal =
    info.alamat === null ||
    /^(127\.|::1$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(info.alamat);
  if (info.db !== NAMA_DB_AMAN || !lokal) {
    throw new Error(
      `DITOLAK: server yang menjawab adalah ${info.alamat ?? 'soket lokal'} basis data ` +
        `"${info.db}" — bukan Postgres pengembangan lokal. Tidak ada yang dihapus.`,
    );
  }
  console.log(
    `sasaran: ${info.db} @ ${info.alamat ?? 'soket lokal'} (pengembangan) — lolos palang\n`,
  );
}

const run = async () => {
  await pastikanBasisDataPengembangan();

  const pengaduan = await p.complaint.findMany({
    where: { judul: UJI },
    select: { id: true, ticketNo: true, judul: true },
  });
  const survei = await p.survey.findMany({
    where: { judul: UJI },
    select: { id: true, judul: true, status: true },
  });
  const tiket = pengaduan.map((c) => c.ticketNo);
  const tautanSurvei = survei.map((s) => ({ link: { contains: `/surveys/${s.id}` } }));
  const penyaringNotif = [...tiket.map((t) => ({ link: { contains: t } })), ...tautanSurvei];
  const notif = penyaringNotif.length
    ? await p.notification.count({ where: { OR: penyaringNotif } })
    : 0;

  console.log('Ditemukan:');
  pengaduan.forEach((c) =>
    console.log(`  pengaduan ${c.id} ${c.ticketNo} "${c.judul.slice(0, 55)}"`),
  );
  survei.forEach((s) => console.log(`  survei    ${s.id} [${s.status}] "${s.judul.slice(0, 55)}"`));
  console.log(`  notifikasi bertaut data uji : ${notif}`);

  if (KERING) {
    console.log('\n(--dry) tidak ada yang dihapus.');
    await p.$disconnect();
    return;
  }

  const hasil = await p.$transaction(async (tx) => {
    const n = penyaringNotif.length
      ? await tx.notification.deleteMany({ where: { OR: penyaringNotif } })
      : { count: 0 };
    const c = await tx.complaint.deleteMany({ where: { id: { in: pengaduan.map((x) => x.id) } } });
    const r = await tx.surveyResponse.deleteMany({
      where: { surveyId: { in: survei.map((x) => x.id) } },
    });
    const s = await tx.survey.deleteMany({ where: { id: { in: survei.map((x) => x.id) } } });
    return { notif: n.count, pengaduan: c.count, respons: r.count, survei: s.count };
  });
  console.log('\nTerhapus:', JSON.stringify(hasil));

  // Berkas unggahan tak ikut terhapus bersama barisnya. Yang disapu hanya yang
  // sudah tak ditunjuk lampiran mana pun — jadi aman dijalankan kapan saja.
  const dipakai = new Set(
    (await p.complaintAttachment.findMany({ select: { fileUrl: true } })).map((a) =>
      path.basename(a.fileUrl),
    ),
  );
  let berkas = 0;
  let byte = 0;
  if (fs.existsSync(UNGGAHAN)) {
    for (const f of fs.readdirSync(UNGGAHAN)) {
      if (dipakai.has(f)) continue;
      byte += fs.statSync(path.join(UNGGAHAN, f)).size;
      fs.unlinkSync(path.join(UNGGAHAN, f));
      berkas += 1;
    }
  }
  console.log(`Berkas unggahan yatim dihapus: ${berkas} (${byte} byte)`);

  console.log(
    'Sisa di basis data:',
    JSON.stringify({
      pengaduan: await p.complaint.count(),
      survei: await p.survey.count(),
      respons: await p.surveyResponse.count(),
      pengguna: await p.user.count(),
      audit: await p.auditLog.count(),
      opd: await p.opd.count(),
      notifikasi: await p.notification.count(),
    }),
  );

  await p.$disconnect();
};

run().catch(async (e) => {
  console.error('GAGAL:', e);
  await p.$disconnect();
  process.exit(1);
});
