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

  // 2) Beberapa OPD contoh (idempoten via `kode` yang unik).
  const opdSeed = [
    {
      kode: 'DINKES',
      nama: 'Dinas Kesehatan',
      jenisLayanan: 'Kesehatan',
      penanggungJawab: 'Kepala Dinas Kesehatan',
    },
    {
      kode: 'DISDIK',
      nama: 'Dinas Pendidikan',
      jenisLayanan: 'Pendidikan',
      penanggungJawab: 'Kepala Dinas Pendidikan',
    },
    {
      kode: 'DUKCAPIL',
      nama: 'Dinas Kependudukan dan Pencatatan Sipil',
      jenisLayanan: 'Administrasi Kependudukan',
      penanggungJawab: 'Kepala Disdukcapil',
    },
  ];

  const opdByKode: Record<string, { id: number }> = {};
  for (const opd of opdSeed) {
    opdByKode[opd.kode] = await prisma.opd.upsert({
      where: { kode: opd.kode },
      update: {},
      create: { ...opd, isActive: true },
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
        periode: '2026',
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
    `Seed selesai: admin kabupaten (id=${adminKabupaten.id}), ${opdSeed.length} OPD, template ${SKM_UNSUR.length} unsur (contoh survei).`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
