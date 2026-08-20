import 'dotenv/config';
import {
  ComplaintStatus,
  JenisKelamin,
  PrismaClient,
  QuestionType,
  Role,
  SurveyStatus,
} from '@prisma/client';
import { SKM_UNSUR } from '../src/modules/reference/reference.constants';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 1) Admin Kabupaten contoh (identitas SSO disimulasikan lewat ssoSubject).
  const adminKabupaten = await prisma.user.upsert({
    where: { ssoSubject: 'seed-admin-kabupaten' },
    update: {},
    create: {
      ssoSubject: 'seed-admin-kabupaten',
      nama: 'Admin Kabupaten (Contoh)',
      email: 'admin.kabupaten@example.go.id',
      role: Role.kabupaten,
      isActive: true,
      consentAt: new Date(),
    },
  });

  // 1b) Superuser contoh (2026-08-20). Dipisahkan kembali dari Admin Kabupaten:
  //     ia mewarisi seluruh hak kabupaten DITAMBAH akses log aktivitas (audit
  //     log), yang justru TIDAK dimiliki Admin Kabupaten biasa. Perlu ada di
  //     seed supaya basis data baru bisa langsung menguji perbedaan itu -- tanpa
  //     ini, satu-satunya akun berhak audit harus dibuat manual.
  const superuser = await prisma.user.upsert({
    where: { ssoSubject: 'seed-superuser' },
    update: { role: Role.superuser },
    create: {
      ssoSubject: 'seed-superuser',
      nama: 'Superuser (Contoh)',
      email: 'superuser@example.go.id',
      role: Role.superuser,
      isActive: true,
      consentAt: new Date(),
    },
  });

  // 2) Beberapa OPD contoh — mencerminkan data hasil sinkronisasi Helpdesk:
  //    `externalId` selaras dengan fixture StubOpdSource (HD-00x) + `syncedAt` terisi,
  //    sehingga sync pertama (OPD-3) mengenalinya via externalId (bukan adopsi by-kode).
  const syncedAt = new Date();
  const opdSeed = [
    {
      externalId: 'HD-001',
      kode: 'DINKES',
      nama: 'Dinas Kesehatan',
      jenisLayanan: 'Kesehatan',
      penanggungJawab: 'Kepala Dinas Kesehatan',
    },
    {
      externalId: 'HD-002',
      kode: 'DISDIK',
      nama: 'Dinas Pendidikan',
      jenisLayanan: 'Pendidikan',
      penanggungJawab: 'Kepala Dinas Pendidikan',
    },
    {
      externalId: 'HD-003',
      kode: 'DUKCAPIL',
      nama: 'Dinas Kependudukan dan Pencatatan Sipil',
      jenisLayanan: 'Administrasi Kependudukan',
      penanggungJawab: 'Kepala Disdukcapil',
    },
  ];

  const opdByKode: Record<string, { id: number }> = {};
  for (const opd of opdSeed) {
    // `update` mem-backfill externalId/syncedAt pada baris seed lama (idempoten).
    opdByKode[opd.kode] = await prisma.opd.upsert({
      where: { kode: opd.kode },
      update: { externalId: opd.externalId, syncedAt },
      create: { ...opd, isActive: true, syncedAt },
    });
  }

  // 2b) Admin OPD contoh (2026-08-05) — SEBELUMNYA tidak ada satu pun akun
  //     ber-role `opd` yang bisa dipakai dev-login, sehingga alur "Admin OPD
  //     login" tak pernah benar-benar bisa dites end-to-end.
  const adminOpd = await prisma.user.upsert({
    where: { ssoSubject: 'seed-admin-opd' },
    update: {},
    create: {
      ssoSubject: 'seed-admin-opd',
      nama: 'Admin OPD (Contoh)',
      email: 'admin.opd@example.go.id',
      role: Role.opd,
      opdId: opdByKode.DINKES.id,
      isActive: true,
      consentAt: new Date(),
    },
  });

  // 2c) Responden contoh (2026-08-05) — SEBELUMNYA tak ada satu pun akun
  //     ber-role `responden`: SSO Helpdesk (JIT provisioning) belum aktif,
  //     dan `CreateUserDto` sengaja menolak role responden (hanya utk admin
  //     opd/kabupaten), jadi tak ada cara lain membuatnya lewat API/UI.
  const responden = await prisma.user.upsert({
    where: { ssoSubject: 'seed-responden' },
    update: {},
    create: {
      ssoSubject: 'seed-responden',
      nama: 'Warga Contoh',
      email: 'warga@example.go.id',
      role: Role.responden,
      isActive: true,
      consentAt: new Date(),
      respondentProfile: {
        create: {
          jenisKelamin: JenisKelamin.perempuan,
          kelompokUmur: '26-35',
          pendidikan: 'S1',
          pekerjaan: 'Wiraswasta',
        },
      },
    },
  });

  // 3) Template 9 unsur SKM — sebagai contoh survei draft pada Dinas Kesehatan.
  //    (Tidak ada tabel "unsur" tersendiri; template diwujudkan sebagai Question.)
  const marker = '[SEED] Contoh Survei SKM - 9 Unsur';
  const existingSurvey = await prisma.survey.findFirst({ where: { judul: marker } });
  if (!existingSurvey) {
    await prisma.survey.create({
      data: {
        opdId: opdByKode.DINKES.id,
        judul: marker,
        periode: '2026-Q1',
        status: SurveyStatus.draft,
        allowMultipleSubmit: false,
        questions: {
          create: SKM_UNSUR.map((unsur, index) => ({
            teks: unsur.teks,
            tipe: QuestionType.skala,
            isIkmUnsur: true,
            kodeUnsur: unsur.kode,
            urutan: index + 1,
          })),
        },
      },
    });
  }

  // 4) Survei KEDUA, SUDAH AKTIF, di Dinas Pendidikan (2026-08-05) -- sengaja
  //    dibiarkan TANPA respons (bukan pra-diisi) supaya penguji bisa benar-benar
  //    mencoba alur "isi survei" sendiri sbg akun responden, bukan cuma
  //    melihat data yang sudah ada. Survei #1 di atas TETAP draft (contoh
  //    builder kosong), inilah yang siap dipakai tanpa langkah tambahan.
  const activeMarker = '[SEED] Survei Kepuasan Pelayanan - Aktif';
  const existingActiveSurvey = await prisma.survey.findFirst({ where: { judul: activeMarker } });
  if (!existingActiveSurvey) {
    await prisma.survey.create({
      data: {
        opdId: opdByKode.DISDIK.id,
        judul: activeMarker,
        periode: '2026-Q3',
        status: SurveyStatus.aktif,
        allowMultipleSubmit: false,
        questions: {
          create: SKM_UNSUR.map((unsur, index) => ({
            teks: unsur.teks,
            tipe: QuestionType.skala,
            isIkmUnsur: true,
            kodeUnsur: unsur.kode,
            urutan: index + 1,
          })),
        },
      },
    });
  }

  // 5) Pengaduan contoh (2026-08-05) -- supaya dashboard/tabel admin tak
  //    terlihat kosong sama sekali pada percobaan pertama (lihat gap #9 hasil
  //    audit), status `diterima` sengaja dibiarkan agar penguji bisa mencoba
  //    alur tindak lanjut (ubah status/balas) sendiri, bukan sudah selesai.
  const complaintMarker = 'PGD-SEED-0001';
  const existingComplaint = await prisma.complaint.findFirst({
    where: { ticketNo: complaintMarker },
  });
  if (!existingComplaint) {
    await prisma.complaint.create({
      data: {
        ticketNo: complaintMarker,
        userId: responden.id,
        opdId: opdByKode.DUKCAPIL.id,
        kategori: 'lainnya',
        judul: 'Pelayanan pembuatan KTP lambat',
        uraian:
          'Contoh pengaduan seed -- pengurusan KTP elektronik di Disdukcapil sudah lebih dari 2 minggu belum selesai.',
        status: ComplaintStatus.diterima,
      },
    });
  }

  console.log(
    `Seed selesai: admin kabupaten (id=${adminKabupaten.id}), superuser (id=${superuser.id}, + akses log aktivitas), admin OPD (id=${adminOpd.id}), responden (id=${responden.id}), ${opdSeed.length} OPD, template ${SKM_UNSUR.length} unsur (2 survei: 1 draft + 1 aktif), 1 pengaduan contoh.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
