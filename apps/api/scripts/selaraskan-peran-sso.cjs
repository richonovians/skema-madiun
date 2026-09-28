#!/usr/bin/env node
'use strict';
/**
 * Menyelaraskan peran & OPD sebuah akun yang SUDAH ADA dengan pemetaan SSO
 * (28 September 2026).
 *
 * KENAPA PERLU SKRIP TERSENDIRI. `SsoService` menetapkan peran HANYA saat akun
 * dibuat, tidak pernah pada login berikutnya, dan itu pengaman yang disengaja:
 * kalau peran disinkronkan tiap login, Helpdesk yang suatu saat berhenti
 * mengirim klaim akan diam-diam menurunkan setiap Admin Kabupaten jadi warga.
 * Akibat yang benar dari pengaman itu: akun yang lahir SEBELUM
 * `HELPDESK_SSO_ROLE_MAP` diisi tidak ikut naik hanya dengan login ulang.
 * Skrip ini jalan keluarnya, dan sengaja dijalankan manusia sekali-sekali
 * alih-alih menjadi perilaku otomatis.
 *
 * TIDAK PERNAH MENURUNKAN. Peran hasil pemetaan DIGABUNGKAN dengan peran yang
 * sudah dipegang akun, bukan menggantikannya. Sifat ini menjaga hal yang sama
 * dengan pengaman di atas: sebuah payload yang kebetulan tak membawa klaim tak
 * boleh berakibat seseorang kehilangan haknya.
 *
 * SATU SUMBER KEBENARAN. Pemetaannya TIDAK ditulis ulang di sini melainkan
 * diambil dari hasil kompilasi `dist/`, modul yang sama persis dengan yang
 * dipakai alur login. Menyalin logikanya ke berkas ini berarti dua penafsiran
 * atas satu env, dan yang kedua pasti tertinggal.
 *
 * PAYLOAD DARI MANA. Berkas JSON berisi `userinfo` Helpdesk milik orang yang
 * bersangkutan. Ia hanya dibaca, tidak disimpan, dan tak satu pun nilainya
 * dicetak ke layar.
 *
 * Pemakaian:
 *   pnpm selaraskan:peran -- --payload ./payload.json --uji   (wajib lebih dulu)
 *   pnpm selaraskan:peran -- --payload ./payload.json
 */
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');

let pemetaPeran;
let pemetaOpd;
try {
  pemetaPeran = require('../dist/modules/auth/sso-role.mapper.js');
  pemetaOpd = require('../dist/modules/auth/sso-opd.mapper.js');
} catch {
  console.error(
    'Modul pemetaan di dist/ belum ada. Jalankan `pnpm --filter @skm-spm/api build` lebih dulu.\n' +
      'Skrip ini SENGAJA tidak menyalin logika pemetaan, supaya hanya ada satu penafsiran env.',
  );
  process.exitCode = 1;
  return;
}

const HANYA_LAPORAN = process.argv.includes('--uji');

function argumen(nama) {
  const i = process.argv.indexOf(nama);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** Sama persis dengan `normalizeEmail` di SsoService. */
function normalkanEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }
  const bersih = email.trim().toLowerCase();
  return bersih || null;
}

async function cariAkun(prisma, payload) {
  // Urutannya MENGIKUTI `SsoService.provision`: `sso_subject` lebih dahulu,
  // baru email. Membalikkannya berarti akun yang sudah pernah masuk lewat SSO
  // dapat tertimpa oleh orang lain yang kebetulan beralamat sama.
  if (typeof payload.sub === 'string' && payload.sub) {
    const bySub = await prisma.user.findFirst({
      where: { ssoSubject: payload.sub, deletedAt: null },
    });
    if (bySub) {
      return { akun: bySub, lewat: 'sso_subject' };
    }
  }
  const email = normalkanEmail(payload.email);
  if (email) {
    const byEmail = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (byEmail) {
      return { akun: byEmail, lewat: 'email' };
    }
  }
  return { akun: null, lewat: null };
}

async function cariOpd(prisma, payload) {
  const fields = pemetaOpd.parseOpdClaimFields(process.env.HELPDESK_SSO_OPD_CLAIM);
  const nilai = pemetaOpd.extractOpdClaimValues(payload, fields);
  if (nilai.length === 0) {
    return null;
  }
  // Hanya tingkat 1 & 2 (`external_id` / `kode`). Pencocokan NAMA sengaja tak
  // ditiru di sini: ia menuntut TEPAT SATU kecocokan dari seluruh OPD aktif,
  // dan sebuah skrip sekali-jalan bukan tempat menebak instansi seseorang.
  return prisma.opd.findFirst({
    where: {
      isActive: true,
      OR: nilai.flatMap((v) => [
        { externalId: { equals: v, mode: 'insensitive' } },
        { kode: { equals: v, mode: 'insensitive' } },
      ]),
    },
    select: { id: true, kode: true },
  });
}

async function utama() {
  const berkas = argumen('--payload');
  if (!berkas) {
    console.error('Wajib: --payload <berkas.json> berisi userinfo Helpdesk.');
    process.exitCode = 1;
    return;
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(berkas, 'utf8'));
  } catch (err) {
    console.error(`Gagal membaca ${berkas}: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const { akun, lewat } = await cariAkun(prisma, payload);
    if (!akun) {
      console.error(
        'Tak ada akun aktif yang cocok dengan payload ini, baik lewat sso_subject maupun email.\n' +
          'Akun yang belum pernah ada memang seharusnya lahir lewat login SSO biasa, bukan skrip ini.',
      );
      process.exitCode = 1;
      return;
    }

    const nilaiPeran = pemetaPeran.extractRoleClaimValues(
      payload,
      pemetaPeran.parseRoleClaimFields(process.env.HELPDESK_SSO_ROLE_CLAIM),
    );
    const dipetakan = pemetaPeran.resolveRolesFromClaims(
      nilaiPeran,
      pemetaPeran.parseRolePackages(process.env.HELPDESK_SSO_ROLE_MAP),
    );

    const opd = await cariOpd(prisma, payload);
    // Peran `opd` TANPA opdId adalah keadaan setengah jadi: dashboard OPD-nya
    // pasti gagal. Aturan yang sama dipakai `SsoService.resolveRolesAndOpd`.
    const opdIdBaru = opd ? opd.id : (akun.opdId ?? null);
    const layak = opdIdBaru === null ? dipetakan.filter((r) => r !== 'opd') : dipetakan;

    const peranBaru = [...akun.roles];
    for (const peran of layak) {
      if (!peranBaru.includes(peran)) {
        peranBaru.push(peran);
      }
    }

    const peranBerubah = peranBaru.length !== akun.roles.length;
    const opdBerubah = opdIdBaru !== null && opdIdBaru !== akun.opdId;

    console.log(`Akun ditemukan lewat ${lewat}: id=${akun.id}`);
    console.log(`  nilai klaim peran : ${nilaiPeran.join(', ') || '(tak ada yang cocok)'}`);
    console.log(`  peran  : ${akun.roles.join(',') || '(kosong)'} -> ${peranBaru.join(',')}`);
    console.log(
      `  opd_id : ${akun.opdId ?? '(kosong)'} -> ${opdIdBaru ?? '(kosong)'}` +
        (opd ? ` (${opd.kode})` : ''),
    );

    if (!peranBerubah && !opdBerubah) {
      console.log('\nTidak ada yang perlu diubah.');
      return;
    }

    if (HANYA_LAPORAN) {
      console.log(
        '\nMODE UJI: tidak ada satu baris pun ditulis. Ulangi tanpa --uji untuk menerapkan.',
      );
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: akun.id },
        data: { roles: peranBaru, ...(opdBerubah ? { opdId: opdIdBaru } : {}) },
      }),
      // Perubahan pembawa hak harus meninggalkan jejak yang dapat diperiksa,
      // sama seperti jalur SSO-nya sendiri. `sub` & email TIDAK ikut: barisnya
      // sudah menunjuk akunnya lewat `actor_id`.
      prisma.auditLog.create({
        data: {
          actorId: akun.id,
          aksi: 'sso_selaraskan_peran',
          entitas: 'auth',
          detail: {
            peranLama: akun.roles,
            peranBaru,
            opdLama: akun.opdId,
            opdBaru: opdIdBaru,
            oleh: 'scripts/selaraskan-peran-sso.cjs',
          },
        },
      }),
    ]);

    console.log('\nDiterapkan, beserta satu baris audit `sso_selaraskan_peran`.');
  } finally {
    await prisma.$disconnect();
  }
}

utama().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
