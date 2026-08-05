import 'dotenv/config';
import { PrismaClient, QuestionType, Role, SurveyStatus } from '@prisma/client';
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

  // 1b) Superuser (pengelola sistem) contoh — akses penuh, melampaui kabupaten.
  const superuser = await prisma.user.upsert({
    where: { ssoSubject: 'seed-superuser' },
    update: {},
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

  console.log(
    `Seed selesai: superuser (id=${superuser.id}), admin kabupaten (id=${adminKabupaten.id}), ${opdSeed.length} OPD, template ${SKM_UNSUR.length} unsur (contoh survei).`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
