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

  // 2) Beberapa OPD contoh.
  //
  //    `externalId` & `kode` memakai NILAI ASLI dari Helpdesk (diambil langsung
  //    dari `GET /api/tenants` pada 28 Agustus 2026), BUKAN penampung `HD-00x`
  //    seperti sebelumnya. Perubahan ini memperbaiki cacat nyata, bukan sekadar
  //    kerapian:
  //
  //    - Upsert di bawah memakai `where: { kode }`, jadi setiap kali seed
  //      dijalankan ia MENIMPA `external_id` baris yang sudah tersinkron. Dengan
  //      nilai penampung, seed membatalkan hasil sinkronisasi setiap kali —
  //      terlihat 28 Agustus 2026: DINKES & DUKCAPIL kembali ke `HD-001`/`HD-003`
  //      padahal keduanya ada di Helpdesk dengan UUID asli.
  //    - Pemetaan peran SSO mencocokkan klaim `groups`/`role` ke
  //      `opd.external_id` atau `opd.kode`. Selama nilainya penampung, klaim yang
  //      membawa UUID asli TIDAK cocok, dan Admin OPD yang bersangkutan dibuatkan
  //      akun `responden` — gagal yang senyap.
  //    - `DISDIK` sebelumnya SALAH: Helpdesk memakai kode `DINDIK` untuk "Dinas
  //      Pendidikan dan Kebudayaan". Baris `DISDIK` tak pernah cocok dengan apa
  //      pun dan tak dirujuk data apa pun; ia dinonaktifkan sinkronisasi
  //      berikutnya, sebagaimana mestinya.
  //
  //    Catatan: `StubOpdSource` (dipakai bila HELPDESK_OPD_API_URL kosong) SENGAJA
  //    tetap memakai `HD-00x`. Ia fixture untuk pengembang tanpa akses Helpdesk,
  //    dan sinkronisasi stub tetap mengadopsi baris di bawah lewat kecocokan kode.
  const syncedAt = new Date();
  const opdSeed = [
    {
      externalId: 'e3152173-1ad7-424c-aed8-2cdf606a25c6',
      kode: 'DINKES',
      nama: 'Dinas Kesehatan',
      jenisLayanan: 'Kesehatan',
      penanggungJawab: 'Kepala Dinas Kesehatan',
    },
    {
      externalId: 'ee78aabd-83db-471a-b40e-c2fc89a56d5b',
      kode: 'DINDIK',
      nama: 'Dinas Pendidikan dan Kebudayaan',
      jenisLayanan: 'Pendidikan',
      penanggungJawab: 'Kepala Dinas Pendidikan dan Kebudayaan',
    },
    {
      externalId: 'd9e7d119-a598-41a8-b2fd-630e4a0c57cf',
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
  //
  //    Awalan "[SEED]" DIBUANG dari judul (31 Agustus 2026): judul survei adalah
  //    isi yang dibaca warga di /surveys dan penilai di /statistics, bukan
  //    penanda internal — penanda data contoh cukup hidup di NAMA AKUN
  //    ("Admin Kabupaten (Contoh)", "Warga Contoh"). Perhatikan `marker` di sini
  //    merangkap KUNCI IDEMPOTENSI: pencarian duplikatnya `findFirst({ judul })`,
  //    jadi judul di basis data dan konstanta ini WAJIB sama persis — kalau
  //    berbeda, seed berikutnya membuat survei kembar alih-alih melewatinya.
  const marker = 'Survei Kepuasan Masyarakat Layanan Puskesmas';
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

  // 4) Survei KEDUA, SUDAH AKTIF, di Dinas Pendidikan dan Kebudayaan -- sengaja
  //    dibiarkan TANPA respons (bukan pra-diisi) supaya penguji bisa benar-benar
  //    mencoba alur "isi survei" sendiri sbg akun responden, bukan cuma
  //    melihat data yang sudah ada. Survei #1 di atas TETAP draft (contoh
  //    builder kosong), inilah yang siap dipakai tanpa langkah tambahan.
  //    Judulnya juga tanpa "[SEED]", dengan alasan & konsekuensi idempotensi
  //    yang sama seperti `marker` di atas.
  const activeMarker = 'Survei Kepuasan Masyarakat Layanan Pendidikan Dasar';
  const existingActiveSurvey = await prisma.survey.findFirst({ where: { judul: activeMarker } });
  if (!existingActiveSurvey) {
    await prisma.survey.create({
      data: {
        opdId: opdByKode.DINDIK.id,
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
  //    Nomor tiketnya kini mengikuti format yang benar-benar dihasilkan aplikasi,
  //    `PGD{YYYYMMDD}{4 acak}` (31 Agustus 2026) -- "PGD-SEED-0001" mencolok di
  //    antara tiket lain pada daftar pengaduan. Sama seperti judul survei di
  //    atas, konstanta ini merangkap KUNCI IDEMPOTENSI (`findFirst({ ticketNo })`),
  //    jadi ia harus tetap sama persis dengan nilai di basis data.
  const complaintMarker = 'PGD20260811KT4E';
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
          'Pengurusan KTP elektronik di Disdukcapil sudah lebih dari dua minggu belum selesai dan belum ada informasi lanjutan.',
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
